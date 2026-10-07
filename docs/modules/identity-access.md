# Identity & access

**Status:** in progress · **Owner:** Platform security · **Spec version:** 0.2.0 · **Reviewed:** 2026-10-07

## Scope and current delivery

The first slice provides email/password login, scrypt password hashes, opaque random server sessions, HttpOnly/SameSite cookies, CSRF token rotation, same-origin checks, session expiry and college-scoped membership roles. Roles currently include platform administrator and college administrator, registrar, faculty, finance and student services.

## Authorization model

Authentication identifies a user. Every resource operation separately checks verified membership, tenant and role. Student reads/writes are currently limited to college administrators and registrars. Platform administrator is a separate platform capability and does not implicitly grant access to arbitrary records without an active membership. Deny by default; audit changes to memberships and roles.

## Gaps and release notes

SSO, MFA, invitations, password recovery, user offboarding, account lockout policy and delegated role management are not implemented. Do not present the current login as enterprise SSO or a complete identity lifecycle. Document credential/session impacts, permission diffs, migrations, recovery and security advisories in every release.
