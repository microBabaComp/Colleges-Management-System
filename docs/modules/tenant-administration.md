# Tenant setup & college administration

**Status:** in progress · **Owner:** Platform · **Spec version:** 0.2.0 · **Reviewed:** 2026-10-07

## Scope and current delivery

A verified college is the tenant boundary. The first-run workflow requires a one-time installer token, captures college name/country/academic year and creates the initial platform and college administrator. Platform administrators can create additional college workspaces; their membership is added to each tenant. Users may list and switch only among their verified memberships.

Current API: `GET /api/bootstrap/status`, one-time `POST /api/bootstrap`, `GET/POST /api/colleges`, and membership-checked `POST /api/session/college`. Database tables: `colleges`, `college_memberships`, `sessions`.

## Access rules

The installer token is generated on the host and compared server-side. Initial setup is serialized and can succeed only before any user exists. Tenant selection is accepted only if the authenticated user has a matching membership. The active tenant is stored in the session; requests derive tenant scope from that server-verified session. Never accept a college ID from a form as sufficient authorization.

## Data, migration and next work

College rows hold display name, URL slug, country, time zone and academic year. Schema changes use numbered SQL migrations. Next: invite other administrators, campus/faculty management, configurable calendars, tenant lifecycle/archival and audit views. Record data exports, membership changes, defaults, migration/backout and support impact in release notes.
