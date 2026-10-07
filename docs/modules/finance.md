# Finance

**Status:** planned · **Owner:** Finance · **Version:** 0.1.0 · **Reviewed:** 2026-10-07

## Scope

Fee schedules, invoices, discounts/waivers, payment-provider checkout, receipts, reconciliation, refunds and finance reporting.

## Safeguards

Never store raw payment-card details. Verify signed webhooks, use idempotent payment commands, reconcile settlements and restrict refunds/exports by role. Keep correction entries rather than silently editing financial records.

## Data and release notes

Release notes include accounting impact, provider changes, migration and reconciliation steps. Every release must record changes here and in the project changelog.
