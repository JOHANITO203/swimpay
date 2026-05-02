# SwimPay

SwimPay is a **Payment Signal Engine** for merchant-side bank notification reconciliation.

SwimPay transforms authorized bank notifications received on the merchant Android device into operational payment signals that can be matched with orders and exposed through an API/webhook workflow.

SwimPay is not:

- a bank;
- a PSP;
- an SBP integration;
- an official bank confirmation system;
- a payment initiator;
- a wallet;
- a custody system;
- a system that reads the buyer phone;
- a system that reads SMS;
- a system that scrapes banking apps.

## V1 scope

V1 supports a single-server deployment and focuses on five Russian banks:

- Sberbank;
- Tinkoff / T-Bank;
- VTB Bank;
- Alfa-Bank;
- Gazprombank.

All bank package names and signing certificate fingerprints must be verified from real installed apps before being marked as trusted. Do not invent or hardcode unverified package/cert values as trusted.

## Runtime services for V1

V1 is microservice-ready but deployed compactly on one Ubuntu server:

- `swimpay-api` — public API, dashboard API, orders, payment sessions, merchants;
- `swimpay-signal-worker` — signal ingestion, parser, matching, risk, decisions;
- `swimpay-job-worker` — webhooks, retries, expirations, cleanup, drift checks;
- `swimpay-web` — hosted checkout and merchant dashboard;
- Android Receiver App — merchant-side notification receiver;
- PostgreSQL — source of truth;
- Valkey — cache, short locks, rate limits;
- NATS JetStream — internal durable event bus;
- Caddy or Nginx — HTTPS reverse proxy.

## Core flow

```text
Developer/Merchant creates order
→ SwimPay creates payment session
→ Receiver App is armed
→ Buyer pays manually from bank app
→ Merchant bank app sends notification
→ Android Receiver captures authorized bank notification
→ Receiver extracts, redacts, signs and uploads signal
→ Backend verifies signature and anti-replay
→ Parser/template engine classifies signal
→ Matching engine links signal to payment session
→ Decision engine auto-confirms, reviews or rejects
→ Webhook is delivered
```

## Critical product language

Use:

- payment signal;
- notification signal;
- operational confirmation;
- SwimPay-recognized payment;
- signal of received payment detected by merchant device.

Never use:

- official bank confirmation;
- bank-confirmed payment;
- guaranteed payment;
- PSP confirmation;
- irreversible payment.

## Documentation index

Start here:

- `AGENTS.md` — mandatory rules for Codex/AI agents;
- `CODEX_START_HERE.md` — how to use Codex with this repo;
- `docs/01_PRODUCT_REQUIREMENTS.md`;
- `docs/02_SYSTEM_ARCHITECTURE.md`;
- `docs/05_DATABASE_SCHEMA.md`;
- `docs/06_API_SPEC.md`;
- `docs/08_ANDROID_RECEIVER_SPEC.md`;
- `docs/10_MATCHING_AND_SCORING.md`;
- `docs/11_SECURITY_AND_PRIVACY.md`;
- `tasks/README.md`.

## Development principle

The system must be deterministic, auditable and conservative.

Auto-confirmation is allowed only when the signal is strong. Ambiguity must route to review.

`Android captures; backend decides.`
