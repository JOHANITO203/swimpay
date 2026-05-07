# Task 521 - Production no-dev-bearer guard

Status: completed

Implementation:
- Extended API `parseMerchantId` with an `allowTestBearer` option.
- Applied the production `allowTestBearer=false` guard to `/v1/merchant/integration*` endpoints.
- Added API tests proving production rejects `Bearer test_*` for:
  - integration read;
  - key creation;
  - key rotation;
  - webhook secret rotation;
  - webhook URL update;
  - webhook test;
  - delivery history;
  - delivery retry.

Non-goal:
- Full production API key authentication for every merchant endpoint remains a follow-up sprint.
