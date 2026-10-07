# Student records

**Status:** in progress · **Owner:** Registrar · **Spec version:** 0.2.0 · **Reviewed:** 2026-10-07

## Current delivery

PostgreSQL-backed student rows with college ID, unique college-scoped student number, first/last name, optional email, program label, status, timestamps and archive timestamp. The directory supports authorized search, creation, and status changes. API: `GET/POST /api/students`, `PATCH /api/students/{id}`; current reads and changes are restricted to college administrators and registrars.

## Safeguards

Every list and update includes the active college ID from the session. Composite uniqueness prevents a duplicate student number inside one college while allowing the same number in another tenant. Queries use parameters; the UI uses text nodes for untrusted values. Status changes are recorded as append-only audit events. No hard delete endpoint is provided.

## Gaps

Program is currently a text label. Not implemented: guardians/contacts, documents, consent, enrollment history, transcripts, merge/correction workflow, retention automation, import/export approvals or student self-service. Each addition needs field-level privacy review, migration and rollback notes.
