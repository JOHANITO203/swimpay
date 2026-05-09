# Task 724 - Ozon Bank Manager Integration

Status: completed_package_validation_pending

Objective:
Add Ozon Bank through the bank profile/registry mechanism without enabling runtime capture until the exact Android package is validated.

Current State:
- `bank_id=ozon_bank`;
- display name: `Ozon Bank`;
- status: `review_only`;
- package: `TO_VERIFY`;
- source: `package_unknown_needs_device_validation`;
- runtime behavior remains non-trusted and auto-confirm disabled.

Rules:
- not parser-only;
- no runtime package gate until exact package is validated;
- no broad enumeration;
- no `QUERY_ALL_PACKAGES`;
- no auto-confirmation.

Evidence:
- `packages/bank-templates/banks/ozon_bank/profile.yml`
- `packages/bank-templates/src/registry.test.ts`
- `packages/database/migrations/015_no_notification_fallback_and_ozon_bank.sql`

