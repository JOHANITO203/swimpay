# Buyer Checkout 4-Step Closeout

## Summary

The hosted buyer checkout is now aligned with the V1 four-step product flow:

1. buyer identity and sender method;
2. exact payment instructions;
3. open bank / arm receiver;
4. buyer paid claim and waiting state.

## Results

- Step 1 creates a durable Expected Payment Profile.
- Buyer identity normalization is deterministic and local.
- Card and phone sender hints are masked/HMACed and never returned raw.
- Step 2 filters merchant receiving routes by selected buyer method.
- Step 2 records payment instructions shown.
- Step 3 requires Step 2 and arms the receiver without confirming.
- Step 4 requires receiver armed and remains buyer claim only.
- Signal runtime carries expected profile data into Payment Intent Gate candidates.

## Boundaries Preserved

- No real bank notification processed.
- No auto-confirmation.
- No public webhook semantic change.
- No Android Receiver final confirmation.
- No raw notification text, raw phone/card, API keys or webhook secrets exposed.

## Remaining Follow-up

- Native Android bank package/deeplink launching is not implemented in this hosted-web sprint.
- Deeper card/name variant scoring can be handled in a dedicated matching sprint now that the data is persisted and carried into runtime candidates.

## Commands Run

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npx vitest run packages/contracts/src/payment-intent.test.ts apps/api/src/payment-sessions.test.ts apps/web/src/checkout.test.ts --reporter=dot`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`

