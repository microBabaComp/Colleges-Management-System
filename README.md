# College Management System

Project board: [College Management System](https://github.com/users/microBabaComp/projects/1).

A cross-platform, multi-college operations application. Windows and Linux use the same Docker Compose stack; developers can run the Node.js app directly with PostgreSQL in Docker. This repository is separate from SchoolOS.

## Start
- Windows: Docker Desktop in WSL2 Linux-container mode, then ./scripts/up.ps1 in PowerShell.
- Linux: Docker Engine and Docker Compose plugin, then ./scripts/up.sh.
- Open http://localhost:8080, use the one-time installer token, and create the first college administrator.

## Current release (0.5.0)
Cross-platform Docker install; protected setup, sessions, college workspaces, student directory and academic/attendance workflows. This feature branch adds admissions programs, dated intakes, public applications with private status tracking, and audited registrar decisions. Application uploads, email delivery, and offer-to-student conversion are not included.

## Security and data
This is an early working foundation, not a complete ERP or independently audited production system. Do not use real student or applicant data until privacy, authorization, backup/restore, TLS, monitoring, incident response, legal and security reviews are complete. Public applications are rate-limited in-process only and require additional anti-spam measures before opening externally.

## Documentation
[Architecture](docs/architecture/overview.md) · [Cross-platform install](docs/deployment/cross-platform.md) · [Security baseline](docs/security/security-baseline.md) · [Module specifications](docs/modules/README.md) · [Versioning](docs/governance/versioning.md) · [Roadmap](docs/roadmap.md) · [Changelog](CHANGELOG.md)

Runtime baseline: Node.js 24 LTS, PostgreSQL 18, Docker Compose.
