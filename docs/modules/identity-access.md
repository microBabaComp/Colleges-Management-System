# Identity & access

**Status:** planned · **Owner:** Platform · **Version:** 0.1.0 · **Reviewed:** 2026-10-07

## Scope

Identity provider integration, college memberships, invitations, MFA posture, session revocation, role assignment and time-limited support access.

## Safeguards

Use a maintained OIDC/SAML provider. Separate authentication from authorization; check tenant membership, action and resource scope on every request. Avoid shared accounts. Require stronger authorization and immutable audit records for role changes, refunds, grade changes and bulk exports.

## Data and release notes

Store provider subject IDs and minimum profile attributes. Document each permission/schema change, migration, session impact and recovery path. Every release must record changes here and in the project changelog.
