# 01 — Product Requirements

## V1 goal

Build a first stable version of SwimPay able to:

- create orders;
- create payment sessions;
- arm a merchant Android Receiver;
- capture authorized bank notifications;
- parse incoming payment signals;
- match signals to pending sessions;
- auto-confirm low-risk cases;
- send ambiguous cases to merchant review;
- deliver signed webhooks;
- audit every important decision.

## V1 users

### Buyer

The buyer wants to buy a digital product and pay by bank transfer with minimal friction.

### Merchant

The merchant wants to stop manually checking every bank notification.

### Developer

The developer wants an API and webhooks that tell their system when a payment signal has been recognized.

### SwimPay operator

The operator monitors templates, drift, false positives, reviews, webhooks and device health.

## V1 product modules

- Android Receiver App;
- Hosted Checkout;
- Merchant Dashboard;
- Developer API;
- Signal Ingestion;
- Matching Engine;
- Review Queue;
- Webhook Delivery;
- Bank Template Learning;
- Admin Console Minimal;
- Audit Log.

## V1 non-goals

Do not build in V1:

- SBP;
- PSP integrations;
- bank APIs;
- payment initiation;
- wallet/custody;
- payouts;
- SMS reading;
- bank app scraping;
- iOS Receiver App;
- LLM-based payment decisions;
- high-ticket auto-confirmation;
- Kubernetes;
- Kafka;
- multi-country expansion.

## Required buyer flow

```text
checkout summary
→ buyer identity
→ payment instructions
→ waiting confirmation
→ result
```

Buyer must see:

- product name;
- exact amount;
- recipient details;
- reference code if available;
- timer;
- copy buttons;
- status updates.

## Required merchant flow

```text
install Receiver App
→ enable Notification Access
→ select bank apps
→ verify receiver health
→ create/use orders
→ review ambiguous payments
→ monitor webhooks
```

## Required developer flow

```text
POST /v1/orders
→ receive checkout_url
→ buyer pays
→ receive payment.confirmed or payment.needs_review webhook
```

## Acceptance criteria

A V1 release is acceptable only if:

- a merchant can connect an Android Receiver App;
- an order can be created through API;
- a payment session is created automatically;
- the Receiver can capture a bank notification from an allowed bank app;
- the signal is signed and uploaded;
- the backend verifies anti-replay and signature;
- the parser classifies incoming/outgoing/cashback/refund/promo/failed;
- amount-only signals do not auto-confirm;
- collisions go to review;
- webhooks are signed and retried;
- all important transitions are audited.
