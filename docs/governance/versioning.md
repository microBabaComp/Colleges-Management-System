# Versioning policy

**Policy version:** 0.1.0

Once API compatibility is defined, use Semantic Versioning. During pre-release, use 0.x and call out breaking changes. Major means incompatible API/data behavior; minor adds backward-compatible capabilities; patch is a compatible fix/security correction. Tag releases `vX.Y.Z`; never rewrite a published tag.

For every module change, record the release version/date/owner, user-facing behavior, permission changes, schema/migration/rollback, integrations, risks and operational notes. Security advisories should not expose exploit details before coordinated disclosure. Each release gate reviews tenant isolation, permissions, accessibility, migration, monitoring and rollback. Prototype UI changes are not production module releases.
