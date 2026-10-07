# Release artifact contract

**Policy version:** 0.1.0 · **Applies to:** the next and every subsequent tagged release · **Status:** required release gate; implementation pending

Every application release must offer separately downloadable installation options for Windows Server, Linux and Docker. They are alternative deployment packages for the same application version and schema migrations.

| Target | Required artifact | Runtime model | Operator entry point |
|---|---|---|---|
| Windows Server | Versioned .zip containing PowerShell install, upgrade, backup and uninstall scripts, service configuration, config template and checksums | Supported Windows Server with Node.js LTS; PostgreSQL may be externally managed or supplied as a separately documented service | Install-CollegeOS.ps1 |
| Linux | Versioned .tar.gz containing POSIX install, upgrade, backup and uninstall scripts, systemd example, config template and checksums | Supported Linux distribution with Node.js LTS; PostgreSQL may be externally managed or separately managed | install.sh |
| Docker | OCI image tagged with the release and immutable digest, plus a Compose bundle and config template | Linux containers on Linux or Windows Server host/container runtime that supports the published image architecture | docker compose up -d |

## Release gates

1. Build all three options from one signed source tag and one migration set. Document architecture (for example amd64/arm64) and minimum OS/runtime/database versions per artifact.
2. Include a concise first-run guide, upgrade guide, backup/restore guide, health endpoint, environment/configuration reference, secret creation instructions, data directory locations, logs, and rollback limitations.
3. Never package real credentials. Generate unique secrets during installation; restrict local file/service-account permissions; support TLS termination and explain APP_ORIGIN.
4. Publish SHA-256 checksums and an SPDX or CycloneDX software bill of materials for every artifact. Add signed provenance/artifact verification before production release.
5. Verify each package on its named platform with clean install, initial tenant setup, migration upgrade, backup/restore and uninstall/data-retention checks. A Docker-only check does not qualify Windows Server or Linux native packages.
6. Keep the browser UI, API behavior and migrations functionally equivalent across packages. Mark a platform unsupported for a release if its artifact has not passed its release checks.

## Current status

The project currently provides Docker Compose startup scripts for Windows PowerShell and Linux shell, both using Linux containers, plus direct-development scripts. These do not yet constitute native Windows Server or Linux production release bundles. Version 0.5.0 does not publish the three separate release artifacts. The first implementation step is a release workflow and platform-specific install/upgrade scripts, followed by native platform validation; until that is complete, do not advertise native installers as available.

## Per-release update record

For every future release, append a dated entry to the changelog documenting artifact filenames, target platforms/architectures, runtime versions, checksums/SBOM locations, migration range, upgrade/rollback behavior, and platform verification status. Keep each installation guide aligned with the release package.