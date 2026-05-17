# Checkout + SDK Prod Audit

generated_at: 2026-05-17

## Scope

Audit only. No runtime code was changed.

Surfaces checked:

- hosted checkout web/API flow;
- `@swimpay/node`;
- `@swimpay/android`;
- public webhook contract consumed by SDKs;
- developer integration docs and examples;
- relevant checkout/payment-session tests.

Core SwimPay boundary remains the audit lens:

- no official bank confirmation claim;
- no Android/browser fulfillment;
- no auto-confirmation;
- public fulfillment only after merchant manual action;
- raw buyer credentials must not be stored or exposed.

## High-Signal Result

Status: `prod_close_but_not_clean`.

The checkout and SDK architecture is broadly aligned:

- Node SDK creates orders server-side only.
- Android SDK opens checkout and parses return links only.
- Hosted checkout keeps Step 4 `claimed-paid` as a buyer claim, not a confirmation.
- Review/manual confirmation is backend-owned.
- Public webhook payloads are normalized to `confirmation_type=notification_signal` and `official_bank_confirmation=false`.

However, four areas should be hardened or explicitly verified before calling this production-ready.

## Findings

### 1. Step 1 sensitive-field rejection is not recursive

Severity: high

Files:

- `apps/api/src/orders.ts`
- `packages/contracts/src/index.ts`
- `apps/api/src/payment-sessions.test.ts`

What I found:

- `validateExpectedPaymentProfileBody` rejects forbidden fields such as `cvv`, `pin`, `sms_code`, `expiry` only at top-level.
- Later checkout actions use a recursive guard through `findForbiddenCheckoutActionCredentialField`, so Step 2/3/4 are stricter than Step 1.
- The accepted Step 1 contract only persists known fields, so nested unsafe data is not intentionally stored, but the request would still be accepted instead of rejected.

Why it matters:

- Task 719 says no CVV/expiry/PIN/SMS accepted.
- Current code proves top-level rejection, not nested rejection.
- Prod-grade behavior should fail closed for `{ metadata: { cvv: "123" } }`, `{ nested: { sms_code: "..." } }`, etc.

Recommended action:

- Reuse or centralize a recursive forbidden-field scanner for Expected Payment Profile.
- Add regression tests for nested unsafe fields in `/v1/checkout/:id/expected-payment-profile`.

### 2. Android SDK checkout URL validation is permissive for production

Severity: medium-high

File:

- `packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayCheckout.kt`

What I found:

- `SwimPayCheckoutOptions.environment` exists but is not used.
- `requestTimeoutMs` exists but is not used.
- `validateCheckoutUri` accepts both `https` and `http`.
- `allowedHosts` defaults to empty, which means any host is accepted unless the merchant explicitly sets a host allowlist.

Why it matters:

- The Android app should receive `checkout_url` from the merchant backend, so this is not an immediate payment-decision risk.
- But for prod SDK ergonomics, the safe default should help merchants avoid opening an insecure or wrong checkout URL.

Recommended action:

- In `Production`, accept only `https`.
- Consider default allowed hosts or a documented `SwimPayEnvironment` host policy.
- Keep `Local` as the only mode that allows `http`.
- Add JVM/static guardrail tests.

### 3. Android bank launcher handoff trusts callback parameters

Severity: medium

File:

- `packages/swimpay-android/src/main/kotlin/com/swimpay/sdk/SwimPayBankLauncher.kt`

What I found:

- `parseHandoffUri` accepts `package_name`, `explicit_activity_class_name` and `launch_uri` from the merchant return scheme when host is `swimpay-bank-launch`.
- It does not include amount/card/phone/reference extras, which is good.
- It does not verify the requested package against an SDK-side allowlist or a checkout-issued session binding.

Why it matters:

- Any app/browser able to invoke the merchant scheme could ask the merchant app to open an arbitrary package/deeplink.
- This does not confirm payment and does not expose secrets, but it is still loose handoff behavior.

Recommended action:

- Add optional `allowedPackages` or make handoff parsing require expected package IDs from the active checkout state.
- Add tests proving malicious package names are rejected when allowlist is configured.

### 4. `payment.expired` is documented and parsed, but runtime emission is not proven

Severity: medium

Files:

- `apps/job-worker/src/consumers.ts`
- `apps/job-worker/src/webhook-runtime.ts`
- `apps/job-worker/src/webhooks.ts`
- `packages/swimpay-node/src/webhooks.ts`
- `docs/12_WEBHOOKS.md`

What I found:

- Public contract advertises `payment.expired`.
- Node SDK parses `payment.expired`.
- Webhook delivery worker can deliver an already-created `payment.expired` event.
- I did not find an actual runtime handler that converts `order.expired` or `payment_session.expired` into a public `payment.expired` webhook.
- Current job-worker consumers register expiry event types, but the implemented final-review webhook handler only covers review confirmed/rejected.

Why it matters:

- Merchants may rely on `payment.expired` if the SDK/docs list it.
- If runtime does not enqueue it, expiry becomes polling-only from the merchant perspective.

Recommended action:

- Either wire an expiry-to-public-webhook handler, or document `payment.expired` as pending/not emitted in V1 private beta.
- Add an integration test from session expiry to webhook delivery creation.

## Aligned Areas

### Checkout API

Aligned:

- order creation requires merchant API key or allowed dev auth;
- API-key order creation checks merchant payment readiness;
- checkout actions are buyer-safe and do not require merchant API keys;
- Step 1 creates expected payment profile with masked/HMAC sender hints;
- receiving routes are filtered to active checkout-allowed routes;
- route lock/pending-disable handling protects active sessions;
- `continue-to-bank` arms receiver and does not confirm;
- `claimed-paid` does not confirm and is idempotent around final states;
- status endpoints return `official_bank_confirmation=false`.

### Hosted checkout web

Aligned:

- guided four-step flow exists;
- no raw destination is rendered in HTML;
- copy details endpoint is explicit and no-store;
- return scheme is preserved through redirects;
- unsafe return schemes fall back safely;
- final return is not treated as fulfillment proof.

### Node SDK

Aligned:

- server-side order creation only;
- recursive forbidden field scanning on SDK order payload;
- idempotency key support;
- typed API errors without leaking auth details;
- raw-body webhook signature verification;
- rejects unsupported public event types such as `payment.needs_review`;
- rejects truthy official-bank-confirmation payloads;
- rejects raw PII-like public webhook fields.

Watch:

- Default `apiBaseUrl` is `https://www.swimpay.pro`.
- This is only correct if prod Caddy routes `/v1/*` on that host. Staging proof currently uses `https://staging.swimpay.pro`.

### Android SDK

Aligned:

- source helper is separate from Receiver internals;
- contains no secret key handling;
- contains no webhook handling;
- contains no fulfillment/payment-confirmation code;
- return result has `returnDoesNotConfirm=true`;
- bank launcher result has `launchDoesNotConfirm=true`;
- no package enumeration, SMS, notification listener or accessibility behavior in SDK helper.

Watch:

- This is a Kotlin source helper, not a Maven/AAR installable SDK package yet.
- If external merchants expect "install the SDK", publication/packaging remains a separate task.

## Verification Run

Command:

```bash
npm test -- packages/swimpay-node/src/index.test.ts tests/sdk-android-product-truth.test.ts apps/api/src/payment-sessions.test.ts apps/web/src/checkout.test.ts apps/job-worker/src/webhook-runtime.test.ts apps/job-worker/src/webhooks.test.ts
```

Result:

- 6 test files passed.
- 168 tests passed.

## Production Gate Recommendation

Before prod/pilot:

1. Fix recursive forbidden-field validation for Expected Payment Profile.
2. Decide and test the production API base URL: `www.swimpay.pro` with `/v1/*` routing, or a dedicated API host.
3. Harden Android SDK production URL validation.
4. Either wire `payment.expired` emission or remove it from the live promise until implemented.
5. Run one live staging SDK order -> hosted checkout -> review -> manual confirm -> signed webhook rehearsal with the merchant backend.

Decision:

`not_blocked_for_internal_staging`, but `not_ready_to_call_prod_clean` until the four findings above are handled or explicitly accepted.
