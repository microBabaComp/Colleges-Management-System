# Cross-platform install and development

**Status:** first-run guide · **Version:** 0.3.0 · **Reviewed:** 2026-10-07

## Supported installation model

The shared install uses Docker Compose with Linux containers. Windows users install Docker Desktop and enable the WSL2 Linux-container engine; Linux users install Docker Engine and the Docker Compose plugin. The same `compose.yaml` works on both. The app runs Node.js 24 LTS and PostgreSQL 18. The PostgreSQL 18 data volume mounts at `/var/lib/postgresql`, matching the official image's version-specific data directory. Update runtime and database patch versions routinely.

## First start — Windows PowerShell

1. Install Docker Desktop and start it in Linux-container mode.
2. From the repository folder, run `./scripts/up.ps1` in PowerShell.
3. Open `http://localhost:8080`. The script prints a one-time setup token on its first run. Keep it private and paste it into the first-run screen.
4. Create the college and first administrator using a unique password of at least 12 characters.

## First start — Linux shell

1. Install Docker Engine and the Compose plugin.
2. Run `chmod +x scripts/up.sh` once if needed, then run `./scripts/up.sh`.
3. The script creates owner-only local secrets and prints the one-time installer token on first run. Keep it private.
4. Open `http://localhost:8080` and complete setup.

The installer token and database password are kept in `.secrets/`, which is ignored by Git. Preserve them securely for container recreation. Never paste secrets into an issue or commit them.

## Direct development

Install Node.js 24 LTS. Run `scripts/dev.ps1` in PowerShell or `./scripts/dev.sh` on Linux. These start PostgreSQL in Docker, install the pinned npm dependency, run migrations and start the Node watcher. Browse at `http://localhost:8080`.

## Useful operations

- View services: `docker compose ps`
- Follow logs: `docker compose logs -f app db`
- Stop without deleting data: `docker compose down`
- Back up: `docker compose exec -T db pg_dump -U collegeos collegeos > backup-collegeos.sql`
- Restore after verifying the target and backup: `docker compose exec -T db psql -U collegeos -d collegeos < backup-collegeos.sql`

Avoid `docker compose down -v` unless you intend to delete the database volume. The app port binds to loopback only. For LAN or internet access, add an HTTPS reverse proxy, set `APP_ORIGIN` to the exact external origin, and review firewall, backups, residency and operator access. Never expose PostgreSQL publicly. The included in-memory login limiter is single-process defense-in-depth; use an edge/WAF rate limit for multi-replica or public deployments.

## Platform notes and current scope

Docker Desktop on Windows runs Linux containers through WSL2; Linux hosts use the Compose plugin. The browser client has no platform-specific native component. The first slice includes one-time protected setup, sign-in, college membership context and switching, student creation/search/status, audit events, health endpoints and a responsive dashboard. Admissions, attendance, fees, integrations, staff invitations, automated backups, production TLS and high availability remain planned. This is not yet a complete college ERP or security certification.
