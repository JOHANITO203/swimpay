# Review Action Actor Identity Root Cause Audit

Date: 2026-05-12

## Symptom

Android Merchant displayed an open `manual_bank_check` review with action buttons:

- `CONFIRMER RECU`
- `REJETER LE SIGNAL`
- `Rejeter la commande`

The real device flow returned the safe UI state:

- `Paiement a synchroniser`
- `Action indisponible`

## Root Cause

The review action payload and database schema disagreed about actor identity.

Android sent a legacy marker:

```json
{
  "actor_id": "android_merchant"
}
```

But `review_actions.actor_id` is a PostgreSQL `UUID`.

The old backend validation accepted any non-empty `actor_id` string and forwarded it to persistence. That allowed `"android_merchant"` to reach a UUID column and fail at insert time. Android then collapsed the backend failure into the generic safe message `Action indisponible`.

## Actor Identity Model

The corrected contract separates durable identity from source/type metadata:

- `actor_id`: nullable UUID, only when a real merchant/admin/user UUID exists.
- `actor_type`: required runtime actor class for review decisions:
  - `android_merchant`
  - `dashboard_merchant`
  - `system`
  - `job_worker`
  - `receiver_device`
  - `admin`
- `actor_source`: optional safe source label, for example `android_mobile_session` or `bff_session`.
- `actor_display`: optional safe UI/debug label, for example `Android Merchant`.

Runtime labels are never inserted into UUID columns.

## Paths Audited

| Path | Result |
| --- | --- |
| `POST /v1/reviews/:id/confirm` | Backend derives actor from authenticated merchant context, not request body. Android mobile and dashboard sessions are both supported. |
| `POST /v1/reviews/:id/reject` | Backend derives actor from authenticated merchant context, supports Android mobile and dashboard sessions. |
| `manual_bank_check` confirm | Confirm action keeps `confirmation_type=manual_bank_check`, `official_bank_confirmation=false`, and stores traceable actor metadata. |
| `notification_signal` confirm | Confirm action keeps `confirmation_type=notification_signal`, `official_bank_confirmation=false`, and stores traceable actor metadata. |
| Review action insert | Writes `actor_id` only for UUID-backed actors; writes `actor_type`, `actor_source`, `actor_display` separately. |
| Audit events | Include safe `actor_type` and optional real `actor_id`; review action payload includes safe actor metadata. |
| Webhook payloads | Do not expose actor internals. Public webhook semantics unchanged. |
| Android action payloads | No longer send `actor_id`; backend infers Android actor from mobile session token. |
| Worker/system fallback | No-notification fallback audit events use `actor_type=job_worker`. |

## Schema Change

Added additive migration:

```txt
packages/database/migrations/020_review_action_actor_identity.sql
```

It adds:

- `review_actions.actor_type TEXT`
- `review_actions.actor_source TEXT`
- `review_actions.actor_display TEXT`
- allowed actor-type check constraint
- index `idx_review_actions_actor_type_created`
- backfill: existing rows with a real `actor_id` become `dashboard_merchant`

No destructive migration was added.

## Why This Is Not A Minimal Shim

The fix does not merely strip `android_merchant`.

It defines a permanent actor model, updates persistence, derives actor identity server-side from authentication, keeps traceability in review actions and audit events, preserves dashboard real-user UUIDs, keeps worker/system attribution, and prevents invalid actor markers from crashing the backend.

## Guardrails Added

- Android confirm with legacy `actor_id=android_merchant` no longer crashes and persists `actor_type=android_merchant`.
- Dashboard confirm preserves the real authenticated user UUID as `actor_id` and stores `actor_type=dashboard_merchant`.
- Worker fallback attribution is explicitly `job_worker`.
- Invalid UUID actor markers are ignored as UUIDs and cannot crash persistence.
- Audit events record `actor_type`.
- Android review action payloads no longer include `actor_id`.
- Public webhook payloads do not include unsafe actor internals.

## Product Truth Preserved

- Android still does not confirm locally.
- `payment.confirmed` remains backend merchant-manual-decision-only.
- `official_bank_confirmation=false`.
- `manual_bank_check` remains a manual review, not bank proof.
- No raw notification, PAN, phone or secret exposure.
- No real bank notification processing was introduced.
