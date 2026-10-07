# College Management System

Project board: [College Management System](https://github.com/users/microBabaComp/projects/1).

A cross-platform, multi-college operations application. Windows and Linux use the same Docker Compose stack; developers can run the Node.js app directly with PostgreSQL in Docker. This repository is separate from SchoolOS.

## Start

- Windows: Docker Desktop in WSL2 Linux-container mode, then `./scripts/up.ps1` in PowerShell.
- Linux: Docker Engine and Docker Compose plugin, then `./scripts/up.sh`.
- Open `http://localhost:8080`, enter the one-time installer token, and create the first college administrator.

See [cross-platform install](docs/deployment/cross-platform.md) for development, backups and platform guidance.

## Implemented foundation (0.3.0)

One-time token-protected setup; scrypt password hashes; random opaque sessions; HttpOnly/SameSite cookies; CSRF token rotation and origin checks; college memberships and verified switching; platform-admin college provisioning; PostgreSQL migrations for colleges, memberships, sessions, students and append-only audit events; role-restricted student create/search/status APIs and UI; health/readiness endpoints; security headers; Docker health checks, private service network, persistent database volume, non-root read-only app container, dropped capabilities and file-backed secrets.

## Scope and security

The dashboard’s attendance, finance and admissions charts remain placeholders. This is an early working foundation, not a complete ERP, independent security audit, or guarantee against vulnerabilities. Do not load production student data until the institution has reviewed privacy, access, backups, TLS, monitoring and incident response.

## Documents

- [Architecture](docs/architecture/overview.md) · [Cross-platform install](docs/deployment/cross-platform.md) · [Tenant onboarding](docs/product/tenant-onboarding.md)
- [Security baseline](docs/security/security-baseline.md) · [Module specifications](docs/modules/README.md) · [Versioning](docs/governance/versioning.md) · [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md)

Runtime baseline: Node.js 24 LTS, PostgreSQL 18, Docker Compose. [Node.js release schedule](https://nodejs.org/en/about/previous-releases) · [PostgreSQL support policy](https://www.postgresql.org/support/versioning/) · [Docker Compose install](https://docs.docker.com/compose/install/).
