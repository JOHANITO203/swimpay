# Payment Compatibility Pair Closeout

Date: 2026-05-10

## Summary

The checkout/backend model now treats merchant receiver route, buyer sender bank and bank launcher as separate business concepts.

## Implemented

- Shared `PaymentCompatibilityPair` contract.
- Checkout status exposes compatibility pairs and fallback actions.
- Expected Payment Profile persists exact merchant receiving route.
- Receiver bank comes from the merchant route, not the buyer sender bank.
- Payer launcher comes from the buyer sender bank.
- Forced incompatible methods return structured `409`.
- Hosted checkout catches structured method errors and renders an actionable fallback.
- Early PAN plausibility/Luhn validation now returns `400` before route checks.

## Validation

Passed:
- `npm run android:doctor`;
- `npm run typecheck`;
- `npm run lint`;
- `npm test` - 77 files, 611 tests passed;
- `npm run build`;
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`;
- `npm run test:replay`;
- `npm run test:matching`;
- `npm run test:privacy`;
- `npm run test:webhooks`.

Android Gradle was not run because Android source was not touched.

## Blockers

No local blocker remains for this refactor.

## Next Recommended Step

Commit and push, then let Dokploy redeploy staging before testing the online SWIMVPN+ checkout flow again.

