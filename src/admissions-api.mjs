import { randomUUID } from 'node:crypto';
import { newToken, sha256 } from './security.mjs';

function fail(status,code){const e=new Error(code);e.status=status;e.code=code;throw e}
function json(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(body),'cache-control':'no-store'});res.end(body);return true}
async function readBody(req){if(!String(req.headers['content-type']||'').startsWith('application/json'))fail(415,'json_required');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32768)fail(413,'request_too_large');chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{fail(400,'invalid_json')}}
function validText(v,min,max){return typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max}
function validEmail(v){return typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validDate(v){if(typeof v!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00.000Z');return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===v}
const uuid=v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v);
const canManage=auth=>['college_admin','registrar'].includes(auth?.college_role);
const transitions={submitted:['under_review','rejected','withdrawn'],under_review:['offered','rejected','withdrawn'],offered:['rejected','withdrawn'],rejected:[],withdrawn:[]};

export async function handleAdmissionsApi(req,res,url,auth,{pool,csrf,limit,checkOrigin}){
 const path=url.pathname,method=req.method;
 const publicCollege=path.match(/^\/api\/public\/colleges\/([a-z0-9-]{1,70})\/admissions$/);
 if(publicCollege&&method==='GET'){
  const college=await pool.query("SELECT id,name FROM colleges WHERE slug=$1",[publicCollege[1]]);
  if(!college.rowCount)return json(res,404,{error:'college_not_found'});
  const [programs,intakes]=await Promise.all([
   pool.query('SELECT id,code,title FROM admission_programs WHERE college_id=$1 AND active=true ORDER BY title',[college.rows[0].id]),
   pool.query("SELECT id,code,name,opens_on,closes_on FROM admission_intakes WHERE college_id=$1 AND status='open' AND opens_on<=CURRENT_DATE AND closes_on>=CURRENT_DATE ORDER BY opens_on",[college.rows[0].id])
  ]);
  return json(res,200,{college:college.rows[0],programs:programs.rows,intakes:intakes.rows});
 }
 if(publicCollege&&method==='POST'){
  checkOrigin(req);limit(req,'admission_submit',8,60000);
  const d=await readBody(req),name=String(d.name||'').trim(),email=String(d.email||'').trim().toLowerCase(),phone=String(d.phone||'').trim(),statement=String(d.statement||'').trim(),programId=String(d.programId||''),intakeId=String(d.intakeId||'');
  if(!validText(name,2,120)||!validEmail(email)||phone.length>40||statement.length>1200||!uuid(programId)||!uuid(intakeId))fail(400,'invalid_application');
  const college=await pool.query("SELECT id FROM colleges WHERE slug=$1",[publicCollege[1]]);
  if(!college.rowCount)fail(404,'college_not_found');
  const collegeId=college.rows[0].id,trackingToken=newToken(),applicationNumber='ADM-'+new Date().getUTCFullYear()+'-'+randomUUID().replaceAll('-','').slice(0,8).toUpperCase(),client=await pool.connect();
  try{
   await client.query('BEGIN');
   const valid=await client.query("SELECT EXISTS(SELECT 1 FROM admission_programs WHERE id=$1 AND college_id=$3 AND active=true) AS program_ok, EXISTS(SELECT 1 FROM admission_intakes WHERE id=$2 AND college_id=$3 AND status='open' AND opens_on<=CURRENT_DATE AND closes_on>=CURRENT_DATE) AS intake_ok",[programId,intakeId,collegeId]);
   if(!valid.rows[0].program_ok||!valid.rows[0].intake_ok)fail(409,'intake_not_available');
   const result=await client.query('INSERT INTO admission_applications(college_id,intake_id,program_id,application_number,applicant_name,applicant_email,phone,statement,tracking_token_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING application_number,status,created_at',[collegeId,intakeId,programId,applicationNumber,name,email,phone,statement,sha256(trackingToken)]);
   await client.query("INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,NULL,'admissions.application_submitted','application',$2,$3)",[collegeId,result.rows[0].application_number,{intakeId,programId}]);
   await client.query('COMMIT');return json(res,201,{application:result.rows[0],trackingToken});
  }catch(error){try{await client.query('ROLLBACK')}catch{}if(error.code==='23505')fail(409,'application_already_received');throw error}finally{client.release()}
 }
 if(path==='/api/public/admissions/track'&&method==='GET'){
  const token=url.searchParams.get('token')||'';if(token.length<32||token.length>128)return json(res,404,{error:'application_not_found'});
  const result=await pool.query('SELECT a.application_number,a.status,a.created_at,a.updated_at,p.title AS program,i.name AS intake,c.name AS college FROM admission_applications a JOIN admission_programs p ON p.id=a.program_id AND p.college_id=a.college_id JOIN admission_intakes i ON i.id=a.intake_id AND i.college_id=a.college_id JOIN colleges c ON c.id=a.college_id WHERE a.tracking_token_hash=$1',[sha256(token)]);
  if(!result.rowCount)return json(res,404,{error:'application_not_found'});
  return json(res,200,{application:result.rows[0]});
 }
 if(!path.startsWith('/api/admissions/'))return false;
 if(!auth)fail(401,'authentication_required');
 if(path==='/api/admissions/programs'&&method==='GET'){
  if(!canManage(auth))fail(403,'forbidden');
  const rows=await pool.query('SELECT id,code,title,active,created_at FROM admission_programs WHERE college_id=$1 ORDER BY title',[auth.college_id]);
  return json(res,200,{programs:rows.rows});
 }
 if(path==='/api/admissions/programs'&&method==='POST'){
  csrf(req,auth);if(!canManage(auth))fail(403,'forbidden');limit(req,'admission_program_write',30,60000);
  const d=await readBody(req),code=String(d.code||'').trim(),title=String(d.title||'').trim();
  if(!validText(code,1,32)||!validText(title,2,140))fail(400,'invalid_program');
  try{const row=await pool.query('INSERT INTO admission_programs(college_id,code,title) VALUES($1,$2,$3) RETURNING id,code,title,active',[auth.college_id,code,title]);await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'admissions.program_created','admission_program',row.rows[0].id]);return json(res,201,{program:row.rows[0]})}catch(error){if(error.code==='23505')fail(409,'program_code_exists');throw error}
 }
 if(path==='/api/admissions/intakes'&&method==='GET'){
  if(!canManage(auth))fail(403,'forbidden');
  const rows=await pool.query('SELECT id,code,name,opens_on,closes_on,status,created_at FROM admission_intakes WHERE college_id=$1 ORDER BY opens_on DESC LIMIT 100',[auth.college_id]);
  return json(res,200,{intakes:rows.rows});
 }
 if(path==='/api/admissions/intakes'&&method==='POST'){
  csrf(req,auth);if(!canManage(auth))fail(403,'forbidden');limit(req,'admission_intake_write',30,60000);
  const d=await readBody(req),code=String(d.code||'').trim(),name=String(d.name||'').trim(),opensOn=d.opensOn,closesOn=d.closesOn,status=['draft','open','closed'].includes(d.status)?d.status:'draft';
  if(!validText(code,1,32)||!validText(name,2,120)||!validDate(opensOn)||!validDate(closesOn)||closesOn<opensOn)fail(400,'invalid_intake');
  try{const row=await pool.query('INSERT INTO admission_intakes(college_id,code,name,opens_on,closes_on,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,code,name,opens_on,closes_on,status',[auth.college_id,code,name,opensOn,closesOn,status]);await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'admissions.intake_created','admission_intake',row.rows[0].id]);return json(res,201,{intake:row.rows[0]})}catch(error){if(error.code==='23505')fail(409,'intake_code_exists');throw error}
 }
 if(path==='/api/admissions/applications'&&method==='GET'){
  if(!canManage(auth))fail(403,'forbidden');
  const status=url.searchParams.get('status')||'',values=[auth.college_id];let filter='';
  if(['submitted','under_review','offered','rejected','withdrawn'].includes(status)){values.push(status);filter=' AND a.status=$2'}
  const rows=await pool.query("SELECT a.id,a.application_number,a.applicant_name,a.applicant_email,a.phone,a.statement,a.status,a.review_note,a.created_at,a.updated_at,p.code AS program_code,p.title AS program_title,i.name AS intake_name FROM admission_applications a JOIN admission_programs p ON p.id=a.program_id AND p.college_id=a.college_id JOIN admission_intakes i ON i.id=a.intake_id AND i.college_id=a.college_id WHERE a.college_id=$1"+filter+" ORDER BY a.created_at DESC LIMIT 200",values);
  return json(res,200,{applications:rows.rows});
 }
 const match=path.match(/^\/api\/admissions\/applications\/([0-9a-f-]{36})$/i);
 if(match&&method==='PATCH'){
  csrf(req,auth);if(!canManage(auth))fail(403,'forbidden');limit(req,'admission_decision',120,60000);
  const d=await readBody(req),next=String(d.status||''),reason=String(d.reason||'').trim();
  if(!['under_review','offered','rejected','withdrawn'].includes(next)||!validText(reason,5,500))fail(400,'invalid_admission_decision');
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const current=await client.query('SELECT status FROM admission_applications WHERE id=$1 AND college_id=$2 FOR UPDATE',[match[1],auth.college_id]);
   if(!current.rowCount)fail(404,'application_not_found');
   if(!transitions[current.rows[0].status]?.includes(next))fail(409,'invalid_status_transition');
   const row=await client.query('UPDATE admission_applications SET status=$1,review_note=$2,reviewed_by=$3,updated_at=now() WHERE id=$4 AND college_id=$5 RETURNING application_number,status,updated_at',[next,reason,auth.user_id,match[1],auth.college_id]);
   await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[auth.college_id,auth.user_id,'admissions.application_status_changed','application',match[1],{from:current.rows[0].status,to:next,reason}]);
   await client.query('COMMIT');return json(res,200,{application:row.rows[0]});
  }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
 }
 return false;
}
