# Identity & access

**Status:** in progress · **Owner:** Platform security · **Spec version:** 0.3.0 · **Reviewed:** 2026-10-07

## Scope and current delivery

The first slice provides email/password login, scrypt password hashes, opaque random server sessions, HttpOnly/SameSite cookies, CSRF token rotation, same-origin checks, session expiry and college-scoped membership roles. Roles currently include platform administrator and college administrator, registrar, faculty, finance and student services.

## Authorization model

Authentication identifies a user. Every resource operation separately checks verified membership, tenant and role. Student reads/writes are currently limited to college administrators and registrars. Platform administrator is a separate platform capability and does not implicitly grant access to arbitrary records without an active membership. Deny by default; audit changes to memberships and roles.

Migration 003 is additive. Revocation or expiration prevents acceptance; accepted memberships currently have no removal workflow. The invitation API returns the raw token only in the create response, so operators must copy it at that time.

## Gaps and release notes

College administrators can invite an email into a college role (college administrator, registrar, faculty, finance or student services). Invitations expire after seven days, can be revoked, store only a token hash, and emit audit events. New invitees create a password-protected account; existing accounts must authenticate as the invited email and confirm with CSRF protection. Links are displayed once to the inviter and must be delivered through a private channel. No email delivery or email verification exists. SSO, MFA, password recovery, account lockout policy, delegated role management and membership offboarding are not implemented. Do not present the current login as enterprise SSO or a complete identity lifecycle. Document credential/session impacts, permission diffs, migrations, recovery and security advisories in every release.
