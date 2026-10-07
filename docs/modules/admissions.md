# Admissions

**Status:** in progress · **Owner:** Registrar · **Spec version:** 0.2.0 · **Release:** 0.5.0 · **Reviewed:** 2026-10-07

## Current delivery
Administrators and registrars configure programs and dated intakes, review tenant-scoped submissions, and record auditable decisions. Public applicants use the college-specific link from the admissions workspace. Staff screen: /admissions.html. Public application: /apply.html?college={slug}.

The public form collects full name, email, optional phone, selected program/intake and an optional statement. No attachments are accepted. Submission returns an application number and private tracking token once; only the token hash is stored. Tracking exposes only college, program, intake, status and timestamps.

APIs: GET/POST /api/admissions/programs, GET/POST /api/admissions/intakes, GET /api/admissions/applications, PATCH /api/admissions/applications/{id}, GET/POST /api/public/colleges/{slug}/admissions, and GET /api/public/admissions/track?token=....

## Tenant and access boundaries
Public submission resolves the college from its slug and verifies that the selected program and open intake both belong to that college. Applications include college_id and use composite foreign keys. Staff queries derive college from the authenticated session; only college administrators and registrars can configure or review. Cross-tenant ids do not disclose whether a record exists.

Submissions are rate-limited per process. Decision transitions are constrained and require a review reason. The append-only audit event includes actor and old/new status.

## Migration and rollback
Migration 004_admissions.sql is additive. Stop public intake before rollback. Dropping these tables destroys submitted applications and decision history; recovery requires an approved backup or forward migration.

## Limitations
Email delivery/verification, applicant accounts, attachments and malware scanning, reviewer assignment, offer acceptance and student conversion, timezone-aware deadlines, CAPTCHA/shared distributed rate limits, privacy notices and retention automation are not implemented. Do not use real applicant data before institution privacy, legal, security and operations review.
