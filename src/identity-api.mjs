import { hashPassword, newToken, sha256 } from './security.mjs';

function fail(status,code){const e=new Error(code);e.status=status;e.code=code;throw e}
function json(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store'});res.end(body);return true}
async function readBody(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'json_required');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32768)fail(413,'request_too_large');chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail(400,'invalid_json')}}
function validText(v,min,max){return typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max}
function validEmail(v){return typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
const canAdmin=auth=>auth?.college_role==='college_admin';
const roles=new Set(['college_admin','registrar','faculty','finance','student_services']);

export async function handleIdentityApi(req,res,url,auth,{pool,csrf,limit,checkOrigin}){
 const path=url.pathname,method=req.method;
 if(path==='/api/invitations/resolve'&&method==='GET'){
  const token=url.searchParams.get('token')||'';
  if(token.length<32||token.length>128)return json(res,404,{error:'invitation_not_found'});
  const row=await pool.query("SELECT i.email,i.role,i.expires_at,c.name AS college_name FROM college_invitations i JOIN colleges c ON c.id=i.college_id WHERE i.token_hash=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now()",[sha256(token)]);
  if(!row.rowCount)return json(res,404,{error:'invitation_not_found'});
  return json(res,200,{invitation:row.rows[0]});
 }
 if(path==='/api/invitations/accept'&&method==='POST'){
  checkOrigin(req);limit(req,'invitation_accept',8,60000);
  const d=await readBody(req),token=String(d.token||'');
  if(token.length<32||token.length>128)fail(404,'invitation_not_found');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const row=await client.query("SELECT i.id,i.college_id,i.email,i.role,c.name AS college_name FROM college_invitations i JOIN colleges c ON c.id=i.college_id WHERE i.token_hash=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>now() FOR UPDATE OF i",[sha256(token)]);
   if(!row.rowCount)fail(404,'invitation_not_found');
   const invite=row.rows[0],existing=await client.query('SELECT id FROM users WHERE lower(email)=lower($1)',[invite.email]);
   let userId,accountCreated=false;
   if(existing.rowCount){
    if(!auth)fail(401,'sign_in_required');
    csrf(req,auth);
    if(auth.user_id!==existing.rows[0].id)fail(403,'invitation_account_mismatch');
    userId=existing.rows[0].id;
   }else{
    if(auth)fail(409,'invitation_account_state_changed');
    const name=String(d.displayName||'').trim(),password=d.password;
    if(!validText(name,2,120)||typeof password!=='string'||password.length<12||password.length>256)fail(400,'invalid_account_details');
    const passwordHash=await hashPassword(password);
    const user=await client.query("INSERT INTO users(email,display_name,password_hash,platform_role) VALUES(lower($1),$2,$3,'user') RETURNING id",[invite.email,name,passwordHash]);
    userId=user.rows[0].id;accountCreated=true;
   }
   if((await client.query('SELECT 1 FROM college_memberships WHERE college_id=$1 AND user_id=$2',[invite.college_id,userId])).rowCount)fail(409,'already_college_member');
   await client.query('INSERT INTO college_memberships(college_id,user_id,role) VALUES($1,$2,$3)',[invite.college_id,userId,invite.role]);
   await client.query('UPDATE college_invitations SET accepted_at=now() WHERE id=$1',[invite.id]);
   await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[invite.college_id,userId,'identity.invitation_accepted','membership',userId,{email:invite.email,role:invite.role}]);
   await client.query('COMMIT');return json(res,200,{accepted:true,accountCreated,collegeName:invite.college_name,role:invite.role});
  }catch(error){try{await client.query('ROLLBACK')}catch{}if(error.code==='23505')fail(409,'account_exists_sign_in');throw error}finally{client.release()}
 }
 if(!path.startsWith('/api/members')&&!path.startsWith('/api/invitations'))return false;
 if(!auth)fail(401,'authentication_required');
 if(path==='/api/members'&&method==='GET'){
  if(!canAdmin(auth))fail(403,'forbidden');
  const [members,invitations]=await Promise.all([
   pool.query('SELECT u.id,u.email,u.display_name,m.role,m.created_at FROM college_memberships m JOIN users u ON u.id=m.user_id WHERE m.college_id=$1 ORDER BY lower(u.display_name) LIMIT 500',[auth.college_id]),
   pool.query('SELECT id,email,role,expires_at,accepted_at,revoked_at,created_at FROM college_invitations WHERE college_id=$1 ORDER BY created_at DESC LIMIT 100',[auth.college_id])
  ]);
  return json(res,200,{members:members.rows,invitations:invitations.rows});
 }
 if(path==='/api/invitations'&&method==='POST'){
  csrf(req,auth);if(!canAdmin(auth))fail(403,'forbidden');limit(req,'invitation_create',20,60000);
  const d=await readBody(req),email=String(d.email||'').trim().toLowerCase(),role=String(d.role||'');
  if(!validEmail(email)||!roles.has(role))fail(400,'invalid_invitation');
  const token=newToken(),tokenHash=sha256(token),expiresAt=new Date(Date.now()+7*24*60*60*1000),client=await pool.connect();
  try{
   await client.query('BEGIN');
   const member=await client.query('SELECT 1 FROM college_memberships m JOIN users u ON u.id=m.user_id WHERE m.college_id=$1 AND lower(u.email)=lower($2)',[auth.college_id,email]);
   if(member.rowCount)fail(409,'already_college_member');
   await client.query('UPDATE college_invitations SET revoked_at=now() WHERE college_id=$1 AND lower(email)=lower($2) AND accepted_at IS NULL AND revoked_at IS NULL',[auth.college_id,email]);
   const row=await client.query('INSERT INTO college_invitations(college_id,email,role,invited_by,token_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,email,role,expires_at',[auth.college_id,email,role,auth.user_id,tokenHash,expiresAt]);
   await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[auth.college_id,auth.user_id,'identity.invitation_created','invitation',row.rows[0].id,{email,role}]);
   await client.query('COMMIT');return json(res,201,{invitation:row.rows[0],token});
  }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
 }
 const revoke=path.match(/^\/api\/invitations\/([0-9a-f-]{36})$/i);
 if(revoke&&method==='DELETE'){
  csrf(req,auth);if(!canAdmin(auth))fail(403,'forbidden');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const row=await client.query("UPDATE college_invitations SET revoked_at=now() WHERE id=$1 AND college_id=$2 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id",[revoke[1],auth.college_id]);
   if(!row.rowCount)fail(404,'invitation_not_found');
   await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'identity.invitation_revoked','invitation',revoke[1]]);
   await client.query('COMMIT');return json(res,200,{revoked:true});
  }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
 }
 return false;
}
