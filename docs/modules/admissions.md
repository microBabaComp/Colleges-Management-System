# Admissions

**Status:** planned · **Owner:** Registrar · **Spec version:** 0.1.0 · **Reviewed:** 2026-10-07

## Scope

Configurable application forms, program selection, document checklist, reviewer assignment, decision workflow, offer acceptance and conversion into an enrolled student record.

## Access and data

Applicants may see only their own application. Reviewers need explicit program/intake scope and server-side authorization. Store private documents only after file type/size validation and malware scanning; define retention for incomplete and rejected applications. Avoid unnecessary sensitive fields.

## Release checklist

Log decisions and exports; prevent duplicate conversion to a student; support correction and accessibility; record status model, deadlines, permissions, schema/migration, provider integration and rollback in release notes. No admissions records are implemented in the current application.
