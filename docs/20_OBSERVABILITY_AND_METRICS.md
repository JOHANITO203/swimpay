# 20 — Observability and Metrics

## V1 goal

Keep monitoring simple but sufficient for reliability.

## Required metrics

### Receiver health

- active receivers;
- offline receivers;
- heartbeat age;
- notification access disabled count;
- local queue length;
- last signal age.

### Signal metrics

- signals received per bank;
- signal quality average;
- incoming/outgoing/cashback/refund/promo counts;
- unknown rate;
- parse failures;
- duplicate signals rejected.

### Matching metrics

- matches scored;
- auto-confirm count;
- review count;
- reject count;
- collision count;
- amount-only review count.

### Template metrics

- new templates;
- template reliability;
- false positive count;
- drift events;
- templates in review_only.

### Webhook metrics

- deliveries attempted;
- delivered;
- failed;
- retry queue length;
- average delivery time.

## Required logs

Use structured logs with redacted payloads.

Never log:

- raw phone numbers;
- API keys;
- webhook secrets;
- raw unredacted notifications.

## Alerts for V1

Minimum alerts:

- PostgreSQL down;
- disk usage high;
- API down;
- signal worker down;
- webhook queue stuck;
- receiver heartbeat missing for active merchant;
- bank unknown rate spike;
- false positive reported.
