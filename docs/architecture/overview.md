# Architecture overview

**Status:** proposed · **Version:** 0.1.0 · **Owner:** Platform

## Product boundary

One product serves independent colleges. Each request resolves a verified college membership before accessing tenant-owned records. Platform operations are separate from college administration. Deployment may use shared storage with strong tenant controls or isolated databases for customers with residency or regulatory needs.

## Logical layers

1. Accessible responsive web client with college-specific navigation and configuration.
2. Identity edge using OIDC/SAML, MFA policy, secure sessions, rate limits and request validation.
3. Modular application services with centralized authorization and explicit tenant context.
4. Relational source of truth; private object storage for documents; durable queue for background work.
5. Append-only audit events, metrics/traces, alerting, encrypted backups and tested recovery.

Begin as a modular monolith with clear boundaries. Split services only when measured scale or team ownership justifies it.

## Tenant isolation

Resolve tenant from authenticated identity and verified membership, never from an untrusted body parameter alone. Bind it to request context; scope every query, transaction, cache key, object path, export, event and asynchronous job. Use database row policies as defense in depth and ensure pooled connections cannot leak tenant context. Cross-tenant requests fail closed. Test these boundaries at service and data layers.

A college subdomain is a routing hint, not authorization. Provisioning is idempotent, resumable and audited; do not expose setup secrets in logs.

## Data and reliability

Use reviewed schema migrations with backup and rollback plans. Keep student documents private and authorize downloads after resource checks; validate file type/size and scan uploads. Use signed webhooks and idempotency for financial integrations; never store raw payment-card data. Minimize personal data, define retention, and redact telemetry. Bound retries, set timeouts, add queue back-pressure and define per-college usage limits.

## Decisions needed

Hosting region and privacy jurisdiction; shared versus dedicated tenant tier; identity provider; data retention and deletion; availability, RPO/RTO and backup region; payment, LMS, mail, library and reporting integrations.
