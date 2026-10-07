# Security baseline

**Status:** required design baseline; not an audit or certification · **Version:** 0.1.0

- **Identity:** maintained OIDC/SAML provider; MFA for privileged roles; secure recovery; session revocation after credential reset or staff departure.
- **Authorization:** deny by default; enforce role, college membership and resource-level policy server-side; separate platform support from college roles; time-limit and audit exceptional support access.
- **Tenant isolation:** verified membership determines tenant context; scope every query, cache, file, export, job and event; negative cross-tenant cases are release-blocking.
- **Web defenses:** schema validation, parameterized queries, output encoding, CSRF protection for cookie sessions, restrictive CORS/CSP, secure headers and bounded/scanned uploads.
- **Secrets and privacy:** TLS, managed encryption and secret rotation; no secrets or unnecessary personal data in source or logs; data minimization, retention and access/deletion workflows.
- **Audit:** append-only events for authentication, permissions, fees, grade changes, exports and configuration; actor, tenant, resource, action, timestamp and correlation ID; exclude credentials and sensitive payloads.
- **Operations:** dependency/secret/static scans in CI, reviewed changes, protected branches, least-privilege deploy identities, alerts, tested encrypted backups and incident runbooks.

## Threats to model

Cross-college IDOR, compromised administrator, insider misuse, session theft, phishing, credential stuffing, malicious document upload, unsafe import/export, payment webhook spoofing, queue replay, exposed backup, third-party outage, destructive migration and peak-period denial of service.

## Production release gate

Threat model each module; review authorization and tenant scoping; resolve scan findings; obtain independent penetration test; test backup restoration; approve privacy/legal obligations for target jurisdictions; exercise incident response. Track accepted risks with owner and expiry. No system can be guaranteed “unhackable”; security is ongoing risk reduction and response.
