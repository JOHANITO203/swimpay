# 01 - Product Requirements

## V1 goal

Build a first stable version of SwimPay able to:

- create orders;
- create payment sessions;
- collect safe buyer recognition hints;
- show exact bank-transfer payment instructions;
- arm a merchant Android Receiver when the buyer clicks `Continuer vers ma banque`;
- capture authorized merchant-side bank notifications from activated supported bank targets;
- redact, sign and upload minimal payment signals;
- match signals only against active payment intents;
- route matching candidates to merchant review;
- require merchant manual confirmation for V1;
- deliver signed public webhooks only after merchant confirmation or terminal outcome;
- audit every important decision.

## V1 users

### Buyer

The buyer wants to buy a digital product and pay by bank transfer with minimal friction.

### Merchant

The merchant wants SwimPay to recognize likely bank-transfer payments and present them for fast confirmation.

### Developer

The developer wants an API, checkout URL and signed webhooks that notify their backend when a payment is manually confirmed, rejected or expired.

### SwimPay operator

The operator monitors bank profiles, drift, false positives, reviews, webhooks, learning feedback and device health.

## V1 product modules

- Android Receiver App;
- Hosted Checkout;
- Merchant Dashboard;
- Developer API;
- Signal Ingestion;
- Payment Intent Gate;
- Matching Engine;
- Review Queue;
- Webhook Delivery;
- Passive Bank Notification Learning;
- Admin Console Minimal;
- Audit Log.

## V1 non-goals

Do not build in V1:

- SBP official rail;
- PSP integrations;
- bank APIs;
- payment initiation;
- wallet/custody;
- payouts;
- SMS reading;
- bank app scraping;
- Accessibility scraping;
- broad installed-app enumeration;
- iOS Receiver App;
- LLM-based payment decisions;
- auto-confirmation;
- Kubernetes;
- Kafka;
- multi-country expansion.

## Required buyer flow

```text
checkout summary
-> buyer recognition hints
-> choose bank and receiving method
-> exact payment instructions
-> continue to bank / receiver armed
-> buyer claimed paid
-> waiting for merchant-side signal
-> merchant review
-> result
```

Buyer must see:

- product name;
- exact expected payment amount;
- recipient details required to pay;
- generated human-readable reference;
- timer;
- copy buttons;
- status updates;
- `J'ai paye` as a non-confirming action.

Buyer recognition hints may include first name, last name, phone number and source card number used to send the payment.

Buyer recognition hints must not include CVV, expiration date, PIN, SMS code or bank password.

## Required merchant flow

```text
install Receiver App
-> enable Notification Access
-> activate supported bank targets
-> configure receiving methods
-> create/use orders
-> review matching payment candidates
-> confirm or reject
-> monitor webhooks and receiver health
```

## Required developer flow

```text
POST /v1/orders
-> receive checkout_url
-> redirect buyer to SwimPay checkout
-> buyer continues to bank, which arms the Receiver
-> merchant reviews any matching signal
-> receive payment.confirmed, payment.rejected or payment.expired webhook
```

## Acceptance criteria

A V1 release is acceptable only if:

- a merchant can connect an Android Receiver App;
- an order can be created through API;
- a payment session is created automatically;
- `Continuer vers ma banque` arms the Receiver;
- `J'ai paye` never confirms payment;
- the Receiver can capture a bank notification from an allowed activated bank app;
- the signal is redacted, signed and uploaded;
- the backend verifies anti-replay and signature;
- the parser classifies incoming/outgoing/cashback/refund/promo/failed;
- no active payment intent creates no merchant payment review;
- amount-only signals do not confirm payment;
- collisions go to merchant review;
- `Matching 100 %` still requires merchant manual confirmation;
- public webhooks are signed and retried;
- fulfillment webhooks are emitted only after merchant confirmation or terminal outcome;
- all important transitions are audited.

## V1 manual-confirmation rule

V1 must not auto-confirm payments.

`Matching 100 %` is merchant review copy only. It means SwimPay found a strong payment candidate, but the merchant still confirms or rejects the payment manually.

Auto-confirmation concepts may remain in internal or future architecture documents only when clearly marked disabled or out-of-scope for V1.
