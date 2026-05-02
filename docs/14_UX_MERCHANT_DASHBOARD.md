# 14 — UX Merchant Dashboard

## Pages

- Home;
- Orders;
- Detected Payments;
- Review Queue;
- Receiver Devices;
- Connected Banks;
- API & Webhooks;
- Settings.

## Home

Show:

- Receiver online/offline;
- Notification Access status;
- orders pending;
- payments detected today;
- auto-confirmed today;
- reviews pending;
- webhook health;
- bank reliability.

## Orders

Columns:

- Order ID;
- External ID;
- Product;
- Amount;
- Status;
- Time remaining;
- Signal associated;
- Decision;
- Webhook status.

## Detected Payments

Columns:

- Signal ID;
- Bank;
- Amount;
- Direction;
- Phone masked;
- Reference masked;
- Signal quality;
- Template;
- Status.

## Review Queue

Each review item must show:

- amount;
- bank;
- candidate order;
- signal quality;
- score;
- positive reasons;
- negative reasons;
- recommended action.

Buttons:

- Confirm;
- Reject;
- Associate to another order;
- Report false positive;
- Report true payment.

## Receiver Devices

Show:

- device name;
- status;
- notification access;
- last heartbeat;
- queue length;
- app version;
- Android version;
- trust score;
- battery warning.

## Connected Banks

Show:

- bank name;
- status;
- reliability index;
- last signal;
- unknown rate;
- drift status;
- auto-confirm status.

V1 bank statuses:

- learning;
- shadow_testing;
- trusted_low_amount;
- trusted;
- degraded;
- review_only;
- disabled.

## API & Webhooks

Show:

- API key list;
- webhook URLs;
- enabled events;
- delivery status;
- failed deliveries;
- replay button;
- signature secret status.

Do not display secrets after creation.
