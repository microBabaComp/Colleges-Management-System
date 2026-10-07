# First-run college onboarding

**Status:** product specification · **Version:** 0.1.0

1. Create workspace: official/display name, country/region, time zone, locale and primary domain.
2. Verify the first administrator through the identity provider; verify domain ownership before domain-wide invitations; require MFA for privileged setup.
3. Configure campuses, address, contacts, logo, brand colors and privacy notice.
4. Set academic year/terms, faculties/departments, programs and grading policy; review before publishing.
5. Enable modules according to entitlements/dependencies and show required configuration/data collected.
6. Import or start clean: template, field mapping, validation preview, duplicate report and rollback; never silently merge.
7. Invite staff with least-privilege role selection and expiring invitations.
8. Review tenant, data region, retention defaults, administrator and enabled modules; log activation.

Branding, locale, calendar, module settings and role policy are tenant configuration. Feature flags control rollout; server authorization still controls access. A college cannot configure access to another college's data. Provisioning is idempotent, resumable and leaves no active partial tenant after failure.
