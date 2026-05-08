# Developer Integration Wizard Staging Flow Report

generated_at: 2026-05-08T22:00:00+03:00

## Result

The Developer Integration Wizard is complete enough to prepare the SDK/webhook rehearsal for a staging merchant.

Verified:

1. Private API key lifecycle is show-once on create/rotate, masked on normal reads.
2. Webhook secret lifecycle is show-once on create/rotate, masked on normal reads.
3. Webhook URL is saved through the merchant-scoped backend integration API.
4. Test webhook is backend-owned, test-only and cannot trigger fulfillment.
5. Web snippets use `@swimpay/node` server-side order creation and webhook verification.
6. Android snippets open `checkout_url`, parse the return intent and never include secrets or webhook handling.
7. The wizard now renders an external-app export block for staging values.

## Export Block

The wizard now shows:

```text
SWIMPAY_STAGING_API_BASE_URL=<api base url>
SWIMPAY_STAGING_SECRET_KEY=<show-once raw key immediately after create/rotate, otherwise masked key>
SWIMPAY_STAGING_WEBHOOK_SECRET=<show-once raw secret immediately after create/rotate, otherwise masked secret>
SWIMPAY_WEBHOOK_URL=<configured webhook url>
EXTERNAL_APP_BASE_URL=https://<merchant-staging-endpoint>
SWIMPAY_PUBLIC_WEBHOOK_EVENTS=payment.confirmed,payment.rejected,payment.expired
```

Raw secrets still appear only in immediate action responses. Normal reads remain masked.

## Safety

- No Android/browser snippet contains `SWIMPAY_SECRET_KEY` or `SWIMPAY_WEBHOOK_SECRET`.
- Public events remain only `payment.confirmed`, `payment.rejected`, `payment.expired`.
- Test webhook keeps `test_only=true`, `triggers_fulfillment=false`, `official_bank_confirmation=false`.
- No real bank notification was processed.
- No auto-confirmation or public webhook semantics were changed.

## Validation

Passed:

- `npm test -- apps/web/src/developer-wizard.test.ts`
- `npm test -- apps/api/src/developer-integration.test.ts`
- `npm run typecheck -- --pretty false`

Pending before final closeout:

- root lint
- full test suite
- build
- compose config
