# Academics, timetable & attendance

**Status:** in progress · **Owner:** Academic affairs · **Spec version:** 0.2.0 · **Release:** 0.4.0 · **Reviewed:** 2026-10-07

## Current delivery

College-scoped academic terms, course catalog entries, course sections, optional section faculty assignments, active-student section enrollment and daily attendance registers. College administrators and registrars can maintain terms/courses/sections/rosters. Faculty can view and record attendance only for assigned sections. Administrators and registrars can record attendance for college sections.

APIs: \`GET/POST /api/academic/terms\`, \`GET/POST /api/academic/courses\`, \`GET/POST /api/academic/sections\`, \`GET /api/academic/faculty\`, \`POST /api/academic/sections/{id}/enrollments\`, and \`GET/PUT /api/attendance?sectionId={id}&date=YYYY-MM-DD\`. The web workspace is \`/academics.html\`.

## Data and tenant boundaries

Migration \`002_academics_attendance.sql\` adds terms, courses, sections, enrollments, attendance sessions and attendance records. Composite foreign keys include \`college_id\` on section/course/term/student relationships, so PostgreSQL rejects cross-college links. Course codes and term codes are unique within a college. Attendance is unique per section/date and student/session.

All API reads derive the tenant from the authenticated session. Creating sections checks the selected course, term and optional faculty membership in that tenant. Enrollment accepts only active students in that tenant and respects section capacity. Attendance writes require an exact match with the currently enrolled section roster and run in one transaction.

## Roles, audit and correction

College administrators and registrars can configure catalog and roster data. Faculty access is limited to assigned sections. Term, course, section, enrollment and attendance writes create append-only audit events. Saving attendance again for the same section/date updates the register; each changed record’s actor and timestamp are refreshed. This supports corrections while preserving the operational audit trail, though it does not yet retain field-level before/after values or a reason code.

## Migration and rollback

The normal startup migrator applies this migration once and records it in \`schema_migrations\`. It is additive. Before rollback, stop writes and take a verified backup. Dropping these tables would permanently remove academic and attendance data; rollback is therefore a restore from backup or a separately reviewed forward migration, not an automatic destructive script.

## Known gaps

Timetable slots/rooms, course prerequisites, student self-service, waitlists, gradebooks, assessment, attendance absence notifications, correction reason workflow, term lifecycle transitions, imports/exports and reporting are not implemented. The current roster picker loads up to the existing student-directory API limit (100). Production use also requires operational backup/restore verification, security review, and jurisdiction-specific privacy approval.

