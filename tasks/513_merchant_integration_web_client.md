# Task 513 - Merchant Integration Web Client

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Goal

Add a narrow server-side web client for the Sprint 9E merchant integration lifecycle endpoints.

## Requirements

- Add `MerchantIntegrationClient` interface.
- Add API-backed implementation for:
  - `GET /v1/merchant/integration`
  - key generation/rotation
  - webhook secret rotation
  - webhook URL update
  - webhook test
  - delivery history retry
- Use server-side bearer auth only.
- Keep browser and Android snippets secret-free.
- Add tests or fake-client coverage through `buildWebServer`.

## Safety

- No secrets in logs.
- No raw webhook payloads.
- No raw card/phone/notification text.
- No public internal signal/review fulfillment events.
