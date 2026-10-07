# College Management System

Project board: [College Management System](https://github.com/users/microBabaComp/projects/1).

A cross-platform, multi-college operations application. Windows and Linux use the same Docker Compose stack; developers can run the Node.js app directly with PostgreSQL in Docker. This repository is separate from SchoolOS.

## Start

- Windows: Docker Desktop in WSL2 Linux-container mode, then `./scripts/up.ps1` in PowerShell.
- Linux: Docker Engine and Docker Compose plugin, then `./scripts/up.sh`.
- Open `http://localhost:8080`, enter the one-time installer token, and create the first college administrator.

See [cross-platform install](docs/deployment/cross-platform.md) for development, backups and platform guidance, and the [release artifact contract](docs/deployment/release-artifacts.md) for separate Windows Server, Linux and Docker deliverables required for each release.

## Implemented foundation (0.5.0)

Token-protected first setup; scrypt passwords and random opaque sessions; CSRF token rotation, same-origin checks, security headers and request limits; college membership and verified switching; PostgreSQL migrations and append-only audit records; college-scoped student directory; academic terms, course catalog, sections, faculty assignment, roster enrollment and attendance register; admissions programs/intakes, public applications, private tracking tokens and registrar review; college-admin invitations for registrar/faculty/finance/student-services roles with hashed single-use tokens; role-based section access; Docker health checks, private service network, persistent PostgreSQL volume, non-root read-only app container, dropped capabilities and file-backed secrets.

## Scope and security

The dashboard’s finance, timetable and analytics remain placeholders. Invitation links must be delivered privately by an administrator; email delivery, email verification, MFA/SSO, password recovery and membership removal are not implemented. Academic setup, enrollment, attendance, admission intake and review, plus college membership invitations, are now working application paths; this is still an early release, not a complete ERP, independent security audit, or guarantee against vulnerabilities. Do not load production student data until the institution has reviewed privacy, authorization, backups, TLS, monitoring and incident response.

## Documents

- [Architecture](docs/architecture/overview.md) · [Cross-platform install](docs/deployment/cross-platform.md) · [Tenant onboarding](docs/product/tenant-onboarding.md)
- [Security baseline](docs/security/security-baseline.md) · [Module specifications](docs/modules/README.md) · [Versioning](docs/governance/versioning.md) · [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md)

Runtime baseline: Node.js 24 LTS, PostgreSQL 18, Docker Compose. [Node.js release schedule](https://nodejs.org/en/about/previous-releases) · [PostgreSQL support policy](https://www.postgresql.org/support/versioning/) · [Docker Compose install](https://docs.docker.com/compose/install/).

