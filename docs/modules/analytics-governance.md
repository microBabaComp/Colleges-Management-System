# Analytics, audit & governance

**Status:** in progress · **Owner:** Data governance · **Spec version:** 0.2.0 · **Reviewed:** 2026-10-07

## Current delivery

An append-only PostgreSQL audit event table captures college bootstrap, login/logout and student creation/status changes. The dashboard displays only the live student count; attendance, finance and admissions remain unavailable placeholders. Health/readiness endpoints expose no personal data.

## Planned scope

Role-scoped operational dashboards, aggregate trends, governed exports, audit search, retention automation, privacy requests and policy configuration.

## Safeguards

Apply tenant scope before aggregation. Suppress small groups when re-identification is possible, log export actor and purpose, expire generated files, minimize personal data in telemetry and keep audit events append-only. Audit data must not be editable through routine app workflows.

## Release notes

Record metric definitions, permission diffs, retention and deletion rules, export behavior, data migration and support impact. The current event list has no user-facing audit browser.
