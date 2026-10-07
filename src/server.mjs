import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pool } from './db.mjs';
import { migrate } from './migrate.mjs';
import { hashPassword, newToken, parseCookies, safeEqual, sha256, verifyPassword } from './security.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8080);
const sessionHours = Math.min(Math.max(Number(process.env.SESSION_TTL_HOURS || 12), 1), 24);
const origin = process.env.APP_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : `http://localhost:${port}`);
const staticFiles = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/login.html', 'login.html'], ['/students.html', 'students.html'], ['/colleges.html', 'colleges.html'], ['/about.html', 'about.html'], ['/styles.css', 'styles.css'], ['/auth.css', 'auth.css'], ['/app.js', 'app.js'], ['/login.js', 'login.js'], ['/students.js', 'students.js'], ['/colleges.js', 'colleges.js']]);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const attempts = new Map();
const MAX_BODY = 32 * 1024;
const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const bootstrapPath = process.env.BOOTSTRAP_TOKEN_FILE;
const bootstrapToken = bootstrapPath ? (await readFile(bootstrapPath,'utf8')).trim() : String(process.env.BOOTSTRAP_TOKEN || '');
if (bootstrapToken.length < 32) throw new Error('A 32-character bootstrap token is required.');

function response(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, { 'content-type': typeof data === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', ...headers });
  res.end(body);
}
function fail(status, code) { const error = new Error(code); error.status = status; error.code = code; throw error; }
function securityHeaders(res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
}
async function bodyJson(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail(415, 'json_required');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) fail(413, 'request_too_large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'invalid_json'); }
}
function checkOrigin(req) {
  if (!origin) fail(503, 'origin_not_configured');
  if (req.headers.origin !== origin) fail(403, 'origin_rejected');
}
function limit(req, key, max = 12, windowMs = 60_000) {
  const ip = req.socket.remoteAddress || 'unknown'; const now = Date.now();
  if (attempts.size > 3000) for (const [k, value] of attempts) if (value.expires < now) attempts.delete(k);
  const id = `${ip}:${key}`, entry = attempts.get(id);
  if (!entry || entry.expires < now) attempts.set(id, { count: 1, expires: now + windowMs });
  else if (++entry.count > max) fail(429, 'rate_limited');
}
function cookieHeader(token, clear = false) {
  return `sid=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : sessionHours * 3600}${secureCookie}`;
}
async function authenticate(req) {
  const token = parseCookies(req.headers.cookie).get('sid');
  if (!token || token.length > 128) return null;
  const result = await pool.query(`SELECT s.token_hash,s.csrf_hash,s.user_id,s.college_id,s.expires_at,
    u.email,u.display_name,u.platform_role,c.name AS college_name,c.slug AS college_slug,
    m.role AS college_role FROM sessions s JOIN users u ON u.id=s.user_id
    JOIN colleges c ON c.id=s.college_id
    JOIN college_memberships m ON m.user_id=s.user_id AND m.college_id=s.college_id
    WHERE s.token_hash=$1 AND s.expires_at>now()`, [sha256(token)]);
  return result.rowCount ? { ...result.rows[0], rawToken: token } : null;
}
function requireRole(auth, roles) { if (!auth || !roles.includes(auth.college_role)) fail(403, 'forbidden'); }
function csrf(req, auth) {
  checkOrigin(req);
  const supplied = req.headers['x-csrf-token'];
  if (!auth || typeof supplied !== 'string' || !safeEqual(sha256(supplied), auth.csrf_hash)) fail(403, 'csrf_rejected');
}
function validString(value, min, max) { return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max; }
function validEmail(value) { return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function slugify(value) { return value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70); }
async function audit(client, collegeId, actorId, action, entityType, entityId = '', metadata = {}) {
  await client.query('INSERT INTO audit_events (college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)', [collegeId,actorId,action,entityType,entityId,metadata]);
}

async function handleApi(req, res, url) {
  const { pathname } = url, method = req.method;
  if (method === 'GET' && pathname === '/api/health/live') return response(res, 200, { status: 'live' });
  if (method === 'GET' && pathname === '/api/health/ready') { await pool.query('SELECT 1'); return response(res, 200, { status: 'ready' }); }
  if (method === 'GET' && pathname === '/api/bootstrap/status') {
    const result = await pool.query('SELECT EXISTS(SELECT 1 FROM users) AS initialized');
    return response(res, 200, { setupRequired: !result.rows[0].initialized });
  }
  if (method === 'POST' && pathname === '/api/bootstrap') {
    checkOrigin(req); limit(req,'bootstrap',5,60_000);
    const d=await bodyJson(req), suppliedToken=String(d.bootstrapToken||'');
    if(!safeEqual(sha256(suppliedToken),sha256(bootstrapToken)))fail(403,'bootstrap_token_invalid');
    const name=String(d.collegeName||'').trim(),display=String(d.displayName||'').trim(),email=String(d.email||'').trim().toLowerCase(),password=d.password;
    if (!validString(name,2,120) || !validString(display,2,120) || !validEmail(email) || typeof password !== 'string' || password.length < 12 || password.length > 256) fail(400,'invalid_setup_details');
    const passHash = await hashPassword(password), base = slugify(name);
    if (!base) fail(400,'invalid_college_name');
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(84920973)');
      if ((await client.query('SELECT 1 FROM users LIMIT 1')).rowCount) fail(409,'setup_already_completed');
      let slug=base, n=1; while ((await client.query('SELECT 1 FROM colleges WHERE slug=$1',[slug])).rowCount) slug=`${base}-${++n}`;
      const college=(await client.query('INSERT INTO colleges(name,slug,country,timezone,academic_year) VALUES($1,$2,$3,$4,$5) RETURNING id,name,slug,country,timezone,academic_year',[name,slug,String(d.country||'').slice(0,80),String(d.timezone||'UTC').slice(0,80),String(d.academicYear||'').slice(0,20)])).rows[0];
      const user=(await client.query('INSERT INTO users(email,display_name,password_hash,platform_role) VALUES($1,$2,$3,$4) RETURNING id,email,display_name',[email,display,passHash,'platform_admin'])).rows[0];
      await client.query('INSERT INTO college_memberships(college_id,user_id,role) VALUES($1,$2,$3)',[college.id,user.id,'college_admin']);
      await audit(client,college.id,user.id,'college.bootstrap','college',college.id);
      const token=newToken(), csrfToken=newToken(24), expires=new Date(Date.now()+sessionHours*3600_000);
      await client.query('INSERT INTO sessions(token_hash,csrf_hash,user_id,college_id,expires_at) VALUES($1,$2,$3,$4,$5)',[sha256(token),sha256(csrfToken),user.id,college.id,expires]);
      await client.query('COMMIT'); res.setHeader('set-cookie',cookieHeader(token));
      return response(res,201,{user,college,csrfToken,expiresAt:expires.toISOString()});
    } catch(error) { try{await client.query('ROLLBACK')}catch{} throw error; } finally { client.release(); }
  }
  if (method === 'POST' && pathname === '/api/login') {
    checkOrigin(req); limit(req,'login',8,60_000);
    const d=await bodyJson(req), email=String(d.email||'').trim().toLowerCase();
    if(!validEmail(email)||typeof d.password!=='string'||d.password.length>256)fail(401,'invalid_credentials');
    const result=await pool.query(`SELECT u.id,u.email,u.display_name,u.password_hash,u.platform_role,c.id AS college_id,c.name AS college_name,c.slug AS college_slug,m.role AS college_role
      FROM users u JOIN college_memberships m ON m.user_id=u.id JOIN colleges c ON c.id=m.college_id
      WHERE lower(u.email)=$1 ORDER BY m.created_at LIMIT 1`,[email]);
    const row=result.rows[0], valid=row?await verifyPassword(d.password,row.password_hash):false;
    if(!valid)fail(401,'invalid_credentials');
    const token=newToken(), csrfToken=newToken(24), expires=new Date(Date.now()+sessionHours*3600_000);
    await pool.query('INSERT INTO sessions(token_hash,csrf_hash,user_id,college_id,expires_at) VALUES($1,$2,$3,$4,$5)',[sha256(token),sha256(csrfToken),row.id,row.college_id,expires]);
    await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[row.college_id,row.id,'auth.login','user',row.id]);
    res.setHeader('set-cookie',cookieHeader(token));
    return response(res,200,{user:{id:row.id,email:row.email,displayName:row.display_name},college:{id:row.college_id,name:row.college_name,slug:row.college_slug,role:row.college_role},csrfToken,expiresAt:expires.toISOString()});
  }

  const auth=await authenticate(req);
  if(method==='GET'&&pathname==='/api/session'){
    if(!auth)return response(res,401,{error:'authentication_required'});
    const csrfToken=newToken(24);
    await pool.query('UPDATE sessions SET csrf_hash=$1 WHERE token_hash=$2',[sha256(csrfToken),auth.token_hash]);
    return response(res,200,{user:{id:auth.user_id,email:auth.email,displayName:auth.display_name,platformRole:auth.platform_role},college:{id:auth.college_id,name:auth.college_name,slug:auth.college_slug,role:auth.college_role},csrfToken});
  }
  if(method==='POST'&&pathname==='/api/logout'){
    if(!auth){res.setHeader('set-cookie',cookieHeader('',true));return response(res,204,'')}
    csrf(req,auth);await pool.query('DELETE FROM sessions WHERE token_hash=$1',[auth.token_hash]);
    await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'auth.logout','user',auth.user_id]);
    res.setHeader('set-cookie',cookieHeader('',true));return response(res,204,'');
  }
  if(!auth)return response(res,401,{error:'authentication_required'});
  if(method==='GET'&&pathname==='/api/colleges'){
    const result=await pool.query('SELECT c.id,c.name,c.slug,m.role FROM college_memberships m JOIN colleges c ON c.id=m.college_id WHERE m.user_id=$1 ORDER BY c.name LIMIT 100',[auth.user_id]);
    return response(res,200,{colleges:result.rows});
  }
  if(method==='POST'&&pathname==='/api/colleges'){
    csrf(req,auth);if(auth.platform_role!=='platform_admin')fail(403,'forbidden');limit(req,'college_create',10,60_000);
    const d=await bodyJson(req),name=String(d.name||'').trim(),country=String(d.country||'').trim(),timezone=String(d.timezone||'UTC').trim(),academicYear=String(d.academicYear||'').trim();
    if(!validString(name,2,120))fail(400,'invalid_college_name');
    const base=slugify(name);if(!base)fail(400,'invalid_college_name');
    const client=await pool.connect();
    try{await client.query('BEGIN');let slug=base,n=1;while((await client.query('SELECT 1 FROM colleges WHERE slug=$1',[slug])).rowCount)slug=`${base}-${++n}`;
      const college=(await client.query('INSERT INTO colleges(name,slug,country,timezone,academic_year) VALUES($1,$2,$3,$4,$5) RETURNING id,name,slug,country,timezone,academic_year',[name,slug,country.slice(0,80),timezone.slice(0,80),academicYear.slice(0,20)])).rows[0];
      await client.query('INSERT INTO college_memberships(college_id,user_id,role) VALUES($1,$2,$3)',[college.id,auth.user_id,'college_admin']);
      await audit(client,college.id,auth.user_id,'college.created','college',college.id);
      await client.query('COMMIT');return response(res,201,{college});
    }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
  }
  if(method==='POST'&&pathname==='/api/session/college'){
    csrf(req,auth);const d=await bodyJson(req),id=String(d.collegeId||'');
    const member=await pool.query('SELECT c.id,c.name,c.slug,m.role FROM college_memberships m JOIN colleges c ON c.id=m.college_id WHERE m.user_id=$1 AND c.id=$2',[auth.user_id,id]);
    if(!member.rowCount)fail(403,'college_membership_required');
    const csrfToken=newToken(24);
    await pool.query('UPDATE sessions SET college_id=$1,csrf_hash=$2 WHERE token_hash=$3',[id,sha256(csrfToken),auth.token_hash]);
    return response(res,200,{college:member.rows[0],csrfToken});
  }
  if(method==='GET'&&pathname==='/api/dashboard'){
    const count=await pool.query('SELECT count(*)::int AS student_count FROM students WHERE college_id=$1 AND archived_at IS NULL',[auth.college_id]);
    return response(res,200,{college:auth.college_name,studentCount:count.rows[0].student_count,attendanceRate:null,feeCollection:null,openApplications:null});
  }
  if(method==='GET'&&pathname==='/api/audit'){
    requireRole(auth,['college_admin']);const rows=await pool.query('SELECT action,entity_type,entity_id,metadata,created_at FROM audit_events WHERE college_id=$1 ORDER BY created_at DESC LIMIT 100',[auth.college_id]);
    return response(res,200,{events:rows.rows});
  }
  if(pathname==='/api/students'&&method==='GET'){
    requireRole(auth,['college_admin','registrar']);
    const q=String(url.searchParams.get('q')||'').trim().slice(0,80),values=[auth.college_id];let clause='';
    if(q){values.push(`%${q}%`);clause=' AND (student_number ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2 OR program ILIKE $2)';}
    const rows=await pool.query(`SELECT id,student_number,first_name,last_name,email,program,status,created_at FROM students WHERE college_id=$1 AND archived_at IS NULL${clause} ORDER BY lower(last_name),lower(first_name) LIMIT 100`,values);
    return response(res,200,{students:rows.rows});
  }
  if(pathname==='/api/students'&&method==='POST'){
    csrf(req,auth);requireRole(auth,['college_admin','registrar']);limit(req,'student_write',60,60_000);
    const d=await bodyJson(req),studentNumber=String(d.studentNumber||'').trim(),first=String(d.firstName||'').trim(),last=String(d.lastName||'').trim(),email=String(d.email||'').trim().toLowerCase(),program=String(d.program||'').trim();
    if(!validString(studentNumber,1,40)||!validString(first,1,80)||!validString(last,1,80)||!validString(program,1,120)||(email&&!validEmail(email)))fail(400,'invalid_student_details');
    const client=await pool.connect();
    try{await client.query('BEGIN');const row=(await client.query('INSERT INTO students(college_id,student_number,first_name,last_name,email,program) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,student_number,first_name,last_name,email,program,status,created_at',[auth.college_id,studentNumber,first,last,email,program])).rows[0];await audit(client,auth.college_id,auth.user_id,'student.created','student',row.id);await client.query('COMMIT');return response(res,201,{student:row})}
    catch(error){try{await client.query('ROLLBACK')}catch{}if(error.code==='23505')fail(409,'student_number_exists');throw error}finally{client.release()}
  }
  const match=pathname.match(/^\/api\/students\/([0-9a-f-]{36})$/i);
  if(match&&method==='PATCH'){
    csrf(req,auth);requireRole(auth,['college_admin','registrar']);const d=await bodyJson(req),status=String(d.status||'');
    if(!['active','on_leave','graduated','withdrawn'].includes(status))fail(400,'invalid_student_status');
    const row=await pool.query('UPDATE students SET status=$1,updated_at=now() WHERE id=$2 AND college_id=$3 AND archived_at IS NULL RETURNING id,student_number,first_name,last_name,status',[status,match[1],auth.college_id]);
    if(!row.rowCount)fail(404,'student_not_found');
    await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[auth.college_id,auth.user_id,'student.status_changed','student',match[1],{status}]);
    return response(res,200,{student:row.rows[0]});
  }
  return response(res,404,{error:'not_found'});
}

const server=createServer(async(req,res)=>{
  const requestId=randomUUID();securityHeaders(res);
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/'))return await handleApi(req,res,url);
    const filename=staticFiles.get(url.pathname);if(!filename)return response(res,404,'Not found');
    const content=await readFile(join(root,filename));
    res.writeHead(200,{'content-type':mime[filename.slice(filename.lastIndexOf('.'))]||'application/octet-stream','content-length':content.length,'cache-control':filename.endsWith('.html')?'no-cache':'public, max-age=300'});
    return res.end(content);
  }catch(error){
    if(res.headersSent){res.destroy();return}
    const status=Number(error.status)||500,code=error.code||'internal_error';
    if(status>=500)console.error(JSON.stringify({level:'error',requestId,event:'request_failed'}));
    return response(res,status,{error:code,requestId});
  }
});
server.headersTimeout=10_000;server.requestTimeout=15_000;server.keepAliveTimeout=5_000;
try{await migrate()}catch{console.error(JSON.stringify({level:'error',event:'startup_failed'}));await pool.end();process.exit(1)}
server.listen(port,'0.0.0.0',()=>console.info(JSON.stringify({level:'info',event:'server_started',port,originConfigured:Boolean(origin)})));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0)});setTimeout(()=>process.exit(1),10_000).unref()}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
