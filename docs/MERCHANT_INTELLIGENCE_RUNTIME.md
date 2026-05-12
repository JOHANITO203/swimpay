# Merchant Intelligence Runtime

SwimPay Merchant Intelligence is an action-support layer for the merchant app. It does not confirm payments automatically and does not claim official bank confirmation.

## Receiver Runtime States

- `idle`: no active payment intent is being observed.
- `armed`: checkout is valid and the receiver has been armed.
- `listening`: notification access, listener, backend heartbeat and bank targets are usable.
- `degraded`: one required capability is missing or weak.
- `offline`: backend synchronization is unavailable.
- `manual_check_required`: a payment needs merchant bank verification.

## Active Notification Window

Android notification observation is allowed only when all of these are true:

- payment session is active;
- receiver is armed;
- Expected Payment Profile exists;
- receiving route is locked;
- package is an exact supported bank package.

Unsupported packages are ignored before extraction. Android Notification History is not treated as a programmatic source of truth.

## Redacted Recent Buffer

The local recent buffer is short-retention and redacted-only. Allowed fields are package name, bank id, observation time, notification hash, semantic hash, category guess, safe amount metadata and `raw_text_present=false`.

Forbidden values include raw title/body/big text/text lines, raw phone, raw card, PAN, SMS codes, PIN and secrets.

## No-Notification Fallback

If a checkout is armed and no matching signal arrives after the configured timeout, the job worker may create a merchant review for manual bank check.

The fallback:

- creates review action only;
- sets `official_bank_confirmation=false`;
- does not confirm payment;
- does not emit public webhooks;
- requires merchant manual confirm/reject.

Merchant notification copy:

- title: `Commande à vérifier`;
- message: `Aucun signal bancaire détecté. Vérifiez votre banque puis confirmez ou rejetez dans SwimPay.`

## Staging Runtime Check

Before controlled staging rehearsal, confirm:

```bash
NO_NOTIFICATION_FALLBACK_WORKER_ENABLED=true
NO_NOTIFICATION_FALLBACK_MIN_SECONDS=120
```

Then verify `swimpay-job-worker` logs for `no_notification_fallback_poll_completed`.
