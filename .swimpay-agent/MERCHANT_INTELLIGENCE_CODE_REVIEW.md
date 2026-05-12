# Merchant Intelligence Code Review

generated_at: 2026-05-12T07:00:00+03:00

## Review Summary

No blocker found in the modified code paths during local review.

## Architecture Review

- Sender/receiver/payment decision separation remains intact.
- Android listener and sweep are now bounded by payment intent state and receiving route lock.
- Backend heartbeat response is additive and does not remove existing fields.
- Worker fallback remains owned by backend/job-worker and protected by idempotency ledger.

## Security And Privacy Review

- Live listener checks the active window before notification snapshot extraction.
- Unsupported packages are still ignored before extraction in sweeps.
- Recent observation buffer stores only package/bank/hash/category/amount metadata and explicitly rejects raw notification markers, phone-like values and card-like values.
- Merchant notification copy does not claim confirmation or proof.
- No public webhook emission path was added.

## Android UX Review

- Receiver health now surfaces a short state: listening, degraded, offline or manual bank check required.
- Merchant local notification is action-oriented: “Commande à vérifier”.
- Review queue maps no-notification fallback to “Vérification banque requise”.

## Test Review

Added/updated coverage for:

- route lock requirement before active sweep;
- live listener active-window gate before extraction;
- redacted buffer TTL, deduplication and raw value rejection;
- receiver runtime state derivation;
- heartbeat `receiver_health`;
- no-notification fallback review queue wording;
- merchant notification copy guardrails.

## Residual Risk

- ADB device validation still needs to confirm notification permission/channel behavior on the actual merchant phone.
- Staging worker environment must be checked before relying on the 120-second fallback in staging.

## Validation Review

- Full root validation passed.
- Full Android JVM tests passed.
- Android debug APK assembly passed.
- ADB smoke remains pending because no device was attached.
