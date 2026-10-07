# Changelog

## [0.5.0] — 2026-10-07

### Added
- College-scoped admissions programs and dated application intakes.
- Public applications with private status tracking tokens.
- Registrar/college-admin application review with constrained decisions and audit reasons.

### Security and limitations
- Tenant-aware foreign keys and per-process submission rate limits.
- No file uploads, email delivery, applicant accounts or offer-to-student conversion.



## [0.4.0] — 2026-10-07

### Added
- Tenant-scoped academic terms, course catalog, sections and faculty assignments.
- Section enrollment with college membership checks, active-student validation and capacity enforcement.
- Daily attendance registers for administrators, registrars and assigned faculty, with atomic saves and audit events.
- Responsive academics and attendance workspace linked from the dashboard.

### Security and data
- Composite college-aware database foreign keys prevent cross-college academic relationships.
- Faculty section visibility and attendance recording are assignment-scoped.
- The migration is additive; destructive rollback requires a reviewed data restore.

## [0.3.0] — 2026-10-07

### Added
- Token-protected first-run setup; multi-college workspace creation, listing and membership-verified switching.
- Role-restricted student records and Windows/Linux Docker and direct-development scripts.
- PostgreSQL migrations, tenant-scoped student data and append-only audit records.

## [0.2.0] — 2026-10-07

### Added
- Cross-platform Docker Compose deployment; secure sessions; student directory; health checks and deployment guide.

## [0.1.0] — 2026-10-07

### Added
- College dashboard prototype, architecture, security, module map and release documents.
