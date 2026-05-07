# 04 — Services Specification

## `swimpay-api`

### Responsibilities

- Merchant account management;
- API key management;
- order creation/read;
- payment session creation/read;
- receiver device registration;
- receiver heartbeat endpoint;
- checkout status endpoint;
- merchant dashboard API;
- review action endpoints.

### Must emit events

- `order.created`;
- `payment_session.created`;
- `payment_session.receiver_arming_requested`;
- `buyer.identity_submitted`;
- `buyer.claimed_paid`;
- `review.confirmed`;
- `review.rejected`.

## `swimpay-signal-worker`

### Responsibilities

- Receive signed signal events;
- verify device signature;
- verify `event_id` uniqueness;
- verify `notification_hash` uniqueness;
- verify local counter monotonicity;
- parse signal;
- match bank template;
- compute signal quality;
- find candidate payment sessions;
- detect collisions;
- compute score;
- emit decision.

### Must emit events

- `signal.received`;
- `signal.verified`;
- `signal.parsed`;
- `signal.quality_scored`;
- `template.observed`;
- `match.candidates_found`;
- `match.collision_detected`;
- `match.scored`;
- `decision.needs_review`;
- `decision.rejected`.

## `swimpay-job-worker`

### Responsibilities

- Deliver webhooks;
- retry failed webhooks;
- expire orders;
- expire payment sessions;
- cleanup old temporary data;
- run drift checks;
- promote/degrade templates;
- produce operational summaries.

### Must emit events

- `webhook.delivery_requested`;
- `webhook.delivered`;
- `webhook.failed`;
- `order.expired`;
- `payment_session.expired`;
- `template.promoted`;
- `template.degraded`.

## `swimpay-web`

### Responsibilities

- Hosted checkout;
- buyer payment instructions;
- status polling/live updates;
- merchant dashboard;
- review queue UI;
- receiver device UI;
- connected banks UI;
- webhook delivery UI.

## Android Receiver App

### Responsibilities

- Merchant onboarding;
- Notification Access permission guide;
- bank app allowlist;
- bank app package/cert verification;
- notification snapshot extraction;
- signal coalescing;
- local entity extraction;
- privacy firewall;
- encrypted outbox;
- signed upload;
- heartbeat;
- device health display.

### Explicit non-responsibility

Android must not make final payment confirmation decisions.
