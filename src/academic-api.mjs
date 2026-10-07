function fail(status, code) { const error = new Error(code); error.status = status; error.code = code; throw error; }
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'content-length':Buffer.byteLength(body), 'cache-control':'no-store' });
  res.end(body); return true;
}
async function readBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail(415,'json_required');
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>65536)fail(413,'request_too_large'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400,'invalid_json'); }
}
function manager(auth) { return ['college_admin','registrar'].includes(auth.college_role); }
function academicRole(auth) { return manager(auth)||auth.college_role==='faculty'; }
function validText(value,min,max) { return typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max; }
function validDate(value) {
  if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00.000Z'); return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;
}
const uuid=value=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);

export async function handleAcademicApi(req,res,url,auth,{pool,csrf,limit}) {
  const path=url.pathname,method=req.method;
  if(!path.startsWith('/api/academic/')&&path!=='/api/attendance')return false;
  if(!auth)fail(401,'authentication_required');

  if(path==='/api/academic/terms'&&method==='GET') {
    if(!academicRole(auth))fail(403,'forbidden');
    const rows=await pool.query('SELECT id,code,name,starts_on,ends_on,status FROM academic_terms WHERE college_id=$1 ORDER BY starts_on DESC LIMIT 100',[auth.college_id]);
    return json(res,200,{terms:rows.rows});
  }
  if(path==='/api/academic/terms'&&method==='POST') {
    csrf(req,auth);if(!manager(auth))fail(403,'forbidden');limit(req,'term_write',30,60000);
    const d=await readBody(req),code=String(d.code||'').trim(),name=String(d.name||'').trim();
    if(!validText(code,1,32)||!validText(name,2,100)||!validDate(d.startsOn)||!validDate(d.endsOn)||d.endsOn<d.startsOn)fail(400,'invalid_term');
    try {
      const row=await pool.query('INSERT INTO academic_terms(college_id,code,name,starts_on,ends_on) VALUES($1,$2,$3,$4,$5) RETURNING id,code,name,starts_on,ends_on,status',[auth.college_id,code,name,d.startsOn,d.endsOn]);
      await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'academic.term_created','academic_term',row.rows[0].id]);
      return json(res,201,{term:row.rows[0]});
    } catch(error) { if(error.code==='23505')fail(409,'term_code_exists');throw error; }
  }
  if(path==='/api/academic/courses'&&method==='GET') {
    if(!academicRole(auth))fail(403,'forbidden');
    const rows=await pool.query('SELECT id,code,title,credits FROM courses WHERE college_id=$1 ORDER BY code LIMIT 500',[auth.college_id]);
    return json(res,200,{courses:rows.rows});
  }
  if(path==='/api/academic/courses'&&method==='POST') {
    csrf(req,auth);if(!manager(auth))fail(403,'forbidden');limit(req,'course_write',30,60000);
    const d=await readBody(req),code=String(d.code||'').trim(),title=String(d.title||'').trim(),credits=Number(d.credits||0);
    if(!validText(code,1,32)||!validText(title,2,140)||!Number.isFinite(credits)||credits<0||credits>99)fail(400,'invalid_course');
    try {
      const row=await pool.query('INSERT INTO courses(college_id,code,title,credits) VALUES($1,$2,$3,$4) RETURNING id,code,title,credits',[auth.college_id,code,title,credits]);
      await pool.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'academic.course_created','course',row.rows[0].id]);
      return json(res,201,{course:row.rows[0]});
    }catch(error){if(error.code==='23505')fail(409,'course_code_exists');throw error}
  }
  if(path==='/api/academic/faculty'&&method==='GET') {
    if(!manager(auth))fail(403,'forbidden');
    const rows=await pool.query("SELECT u.id,u.display_name,u.email FROM college_memberships m JOIN users u ON u.id=m.user_id WHERE m.college_id=$1 AND m.role='faculty' ORDER BY lower(u.display_name) LIMIT 500",[auth.college_id]);
    return json(res,200,{faculty:rows.rows});
  }
  if(path==='/api/academic/sections'&&method==='GET') {
    if(!academicRole(auth))fail(403,'forbidden');
    const rows=await pool.query(
      'SELECT s.id,s.section_code,s.capacity,s.course_id,s.term_id,s.instructor_id,c.code AS course_code,c.title AS course_title,t.code AS term_code,t.name AS term_name,u.display_name AS instructor_name,count(e.student_id) FILTER (WHERE e.status=$4)::int AS enrolled_count FROM academic_sections s JOIN courses c ON c.id=s.course_id AND c.college_id=s.college_id JOIN academic_terms t ON t.id=s.term_id AND t.college_id=s.college_id LEFT JOIN users u ON u.id=s.instructor_id LEFT JOIN section_enrollments e ON e.section_id=s.id AND e.college_id=s.college_id WHERE s.college_id=$1 AND ($2::boolean OR s.instructor_id=$3) GROUP BY s.id,c.code,c.title,t.code,t.name,u.display_name ORDER BY t.starts_on DESC,c.code,s.section_code LIMIT 500',
      [auth.college_id,manager(auth),auth.user_id,'enrolled']);
    return json(res,200,{sections:rows.rows});
  }
  if(path==='/api/academic/sections'&&method==='POST') {
    csrf(req,auth);if(!manager(auth))fail(403,'forbidden');limit(req,'section_write',60,60000);
    const d=await readBody(req),courseId=String(d.courseId||''),termId=String(d.termId||''),sectionCode=String(d.sectionCode||'').trim(),instructorId=d.instructorId?String(d.instructorId):null,capacity=Number(d.capacity||60);
    if(!uuid(courseId)||!uuid(termId)||!validText(sectionCode,1,32)||!Number.isInteger(capacity)||capacity<1||capacity>1000||(instructorId&&!uuid(instructorId)))fail(400,'invalid_section');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const valid=await client.query("SELECT EXISTS(SELECT 1 FROM courses WHERE id=$1 AND college_id=$3) AS course_ok,EXISTS(SELECT 1 FROM academic_terms WHERE id=$2 AND college_id=$3) AS term_ok,($4::uuid IS NULL OR EXISTS(SELECT 1 FROM college_memberships WHERE user_id=$4 AND college_id=$3 AND role='faculty')) AS faculty_ok",[courseId,termId,auth.college_id,instructorId]);
      if(!valid.rows[0].course_ok||!valid.rows[0].term_ok)fail(400,'academic_resource_not_found');
      if(!valid.rows[0].faculty_ok)fail(400,'faculty_membership_required');
      const row=await client.query('INSERT INTO academic_sections(college_id,course_id,term_id,section_code,instructor_id,capacity) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,section_code,capacity,course_id,term_id,instructor_id',[auth.college_id,courseId,termId,sectionCode,instructorId,capacity]);
      await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4,$5)',[auth.college_id,auth.user_id,'academic.section_created','section',row.rows[0].id]);
      await client.query('COMMIT');return json(res,201,{section:row.rows[0]});
    }catch(error){try{await client.query('ROLLBACK')}catch{}if(error.code==='23505')fail(409,'section_code_exists');throw error}finally{client.release()}
  }
  const enrollment=path.match(/^\/api\/academic\/sections\/([0-9a-f-]{36})\/enrollments$/i);
  if(enrollment&&method==='POST') {
    csrf(req,auth);if(!manager(auth))fail(403,'forbidden');limit(req,'enrollment_write',30,60000);
    const d=await readBody(req),ids=Array.isArray(d.studentIds)?[...new Set(d.studentIds.map(String))]:[];
    if(!ids.length||ids.length>300||ids.some(id=>!uuid(id)))fail(400,'invalid_student_selection');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const section=await client.query('SELECT capacity FROM academic_sections WHERE id=$1 AND college_id=$2 FOR UPDATE',[enrollment[1],auth.college_id]);
      if(!section.rowCount)fail(404,'section_not_found');
      const valid=await client.query("SELECT id FROM students WHERE college_id=$1 AND id=ANY($2::uuid[]) AND status='active' AND archived_at IS NULL",[auth.college_id,ids]);
      if(valid.rowCount!==ids.length)fail(400,'student_selection_invalid');
      const already=await client.query("SELECT student_id FROM section_enrollments WHERE college_id=$1 AND section_id=$2 AND status='enrolled' AND student_id=ANY($3::uuid[])",[auth.college_id,enrollment[1],ids]);
      const newIds=ids.filter(id=>!already.rows.some(row=>row.student_id===id));
      const total=await client.query("SELECT count(*)::int AS n FROM section_enrollments WHERE college_id=$1 AND section_id=$2 AND status='enrolled'",[auth.college_id,enrollment[1]]);
      if(total.rows[0].n+newIds.length>section.rows[0].capacity)fail(409,'section_capacity_exceeded');
      for(const id of newIds)await client.query("INSERT INTO section_enrollments(college_id,section_id,student_id) VALUES($1,$2,$3) ON CONFLICT(section_id,student_id) DO UPDATE SET status='enrolled'",[auth.college_id,enrollment[1],id]);
      await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[auth.college_id,auth.user_id,'academic.students_enrolled','section',enrollment[1],{count:newIds.length}]);
      await client.query('COMMIT');return json(res,200,{enrolled:newIds.length});
    }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
  }
  if(path==='/api/attendance'&&(method==='GET'||method==='PUT')) {
    const sectionId=url.searchParams.get('sectionId')||'',date=url.searchParams.get('date')||'';
    if(!uuid(sectionId)||!validDate(date))fail(400,'invalid_attendance_query');
    if(method==='PUT'){csrf(req,auth);if(!academicRole(auth))fail(403,'forbidden');limit(req,'attendance_write',120,60000)}
    else if(!academicRole(auth))fail(403,'forbidden');
    const allowed=await pool.query('SELECT id FROM academic_sections WHERE id=$1 AND college_id=$2 AND ($3::boolean OR instructor_id=$4)',[sectionId,auth.college_id,manager(auth),auth.user_id]);
    if(!allowed.rowCount)fail(404,'section_not_found');
    if(method==='GET') {
      const rows=await pool.query("SELECT st.id AS student_id,st.student_number,st.first_name,st.last_name,COALESCE(ar.status,'unmarked') AS status FROM section_enrollments e JOIN students st ON st.id=e.student_id AND st.college_id=e.college_id LEFT JOIN attendance_sessions ats ON ats.section_id=e.section_id AND ats.session_date=$3 AND ats.college_id=e.college_id LEFT JOIN attendance_records ar ON ar.session_id=ats.id AND ar.student_id=st.id AND ar.college_id=e.college_id WHERE e.section_id=$1 AND e.college_id=$2 AND e.status='enrolled' AND st.archived_at IS NULL ORDER BY lower(st.last_name),lower(st.first_name)",[sectionId,auth.college_id,date]);
      return json(res,200,{sectionId,date,students:rows.rows});
    }
    const d=await readBody(req),records=Array.isArray(d.records)?d.records:[];
    if(records.length>500||records.some(r=>!r||!uuid(String(r.studentId||''))||!['present','absent','late','excused'].includes(r.status)))fail(400,'invalid_attendance_records');
    const marks=new Map(records.map(r=>[String(r.studentId),r.status]));
    if(marks.size!==records.length)fail(400,'duplicate_attendance_student');
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      const locked=await client.query('SELECT id FROM academic_sections WHERE id=$1 AND college_id=$2 AND ($3::boolean OR instructor_id=$4) FOR UPDATE',[sectionId,auth.college_id,manager(auth),auth.user_id]);if(!locked.rowCount)fail(404,'section_not_found');const roster=await client.query("SELECT student_id FROM section_enrollments WHERE section_id=$1 AND college_id=$2 AND status='enrolled' FOR UPDATE",[sectionId,auth.college_id]);
      const enrolled=new Set(roster.rows.map(r=>r.student_id));
      if(marks.size!==enrolled.size||[...marks.keys()].some(id=>!enrolled.has(id)))fail(400,'attendance_roster_mismatch');
      const session=await client.query("INSERT INTO attendance_sessions(college_id,section_id,session_date,note,recorded_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(section_id,session_date) DO UPDATE SET note=EXCLUDED.note,recorded_by=EXCLUDED.recorded_by,updated_at=now() RETURNING id",[auth.college_id,sectionId,date,String(d.note||'').trim().slice(0,500),auth.user_id]);
      for(const [studentId,status] of marks)await client.query('INSERT INTO attendance_records(college_id,session_id,student_id,status,marked_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(session_id,student_id) DO UPDATE SET status=EXCLUDED.status,marked_by=EXCLUDED.marked_by,marked_at=now()',[auth.college_id,session.rows[0].id,studentId,status,auth.user_id]);
      await client.query('INSERT INTO audit_events(college_id,actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[auth.college_id,auth.user_id,'attendance.saved','section',sectionId,{date,records:marks.size}]);
      await client.query('COMMIT');return json(res,200,{saved:marks.size,date});
    }catch(error){try{await client.query('ROLLBACK')}catch{}throw error}finally{client.release()}
  }
  return false;
}

