# SwimPay Intelligence Source Truth Guardrails

Date: 2026-05-08

## Added / Updated

1. `apps/api/src/signals.test.ts`
   - Added regression for legacy receiver signal payloads carrying nested raw notification fields.
   - Red result observed before fix: the request reached `201`.
   - Green result after fix: rejected with `raw_notification_rejected`.

2. `apps/api/src/signals.ts`
   - Added legacy raw-field rejection before payload normalization.
   - Rejects raw notification, raw phone, raw card and bank credential keys.

3. `tests/swimpay-intelligence-source-truth.test.ts`
   - Ensures the central source-of-truth document, tool-boundary map and final report exist.
   - Reasserts Android Receiver boundaries: NotificationListener only, no SMS, no Accessibility, no `QUERY_ALL_PACKAGES`, no broad installed-app enumeration, no Android order confirmation and no Android developer webhook.
   - Reasserts public webhook worker/SDK final-event-only boundary.

## Existing Guardrails Still Active

- `tests/product-truth-runtime-neutralization.test.ts`
- `tests/receiver-intelligence-prod-guardrails.test.ts`
- `tests/sdk-web-product-truth.test.ts`
- `tests/sdk-android-product-truth.test.ts`
- job-worker public webhook taxonomy tests

## Protected Failures

Tests should fail if:
- active runtime can auto-confirm;
- `payment.confirmed` can happen before manual merchant confirmation;
- `payment.signal_detected` or `payment.needs_review` become public fulfillment webhooks;
- Android Receiver stores/uploads raw notification text;
- Android Receiver confirms orders;
- Android sends developer webhooks;
- feedback mutates runtime rules;
- unknown-shapes promote profiles;
- SDK Android contains a secret key;
- SDK/browser snippets contain a secret key;
- official-bank-confirmation truthy examples appear in public event examples;
- SMS, Accessibility, `QUERY_ALL_PACKAGES` or broad enumeration are added.

