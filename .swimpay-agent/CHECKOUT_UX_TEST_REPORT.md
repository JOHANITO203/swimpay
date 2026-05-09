# Checkout UX Test Report

Date: 2026-05-09

## Targeted Tests Run

Command:

```powershell
npx vitest run apps/web/src/checkout.test.ts apps/web/src/copy-guardrails.test.ts
```

Result:
- passed;
- 2 test files;
- 23 tests.

## Coverage Added / Updated

- Intro renders the guided buyer cards.
- Buyer identity panel exposes card and phone/SBP methods.
- Card method shows card sender input only.
- Phone method shows phone sender input only.
- Instructions show copy controls and countdown.
- Waiting states show timeline and safe status copy.
- Signal detected does not imply confirmation.
- Buyer paid claim does not confirm payment.
- Receiver arming does not confirm payment.
- Form POSTs redirect into the flow instead of exposing JSON.
- Raw receiver destination is not embedded in checkout HTML.

## Pending

None for local code validation.

## Full Root Validation

Passed:
- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 76 files, 573 tests passed
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
