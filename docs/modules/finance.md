# Finance

**Status:** planned · **Owner:** Finance · **Spec version:** 0.1.0 · **Reviewed:** 2026-10-07

## Scope

Fee schedules, invoices, discounts/waivers, payment-provider checkout, receipts, reconciliation, refunds and finance reporting.

## Access and safeguards

Never store raw payment-card details. Verify provider signatures, make commands idempotent, reconcile settlement events and restrict refunds/exports by role. Record correction entries rather than silently editing posted transactions. Follow accounting retention rules for the selected jurisdiction.

## Release notes

Describe accounting impact, provider configuration, permissions, schema and migrations, reconciliation steps and rollback. No payment or fee records are implemented yet.
