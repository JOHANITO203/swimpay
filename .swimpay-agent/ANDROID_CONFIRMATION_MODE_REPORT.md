# Android confirmation mode report

generated_at: 2026-05-09T00:08:00+03:00

Updated Mode de confirmation while preserving the user's IA direction.

## Product decision

- IA confirmation remains visible as an assumed future direction.
- It is marked only as "Prochaine mise a jour" and "Inactive" in the Android screen.
- The verbose explanatory copy was removed from the UI per product direction.

## V1 behavior

- Manual review remains mandatory.
- Android does not confirm payments.
- No auto-confirmation toggle is exposed.
- `allow_auto_confirmation` is always false in the backend confirmation settings response.
- `official_bank_confirmation` is false.

## Backend

- Added:
  - `GET /v1/android-merchant/confirmation-settings`
  - `PUT /v1/android-merchant/confirmation-settings`
- PUT rejects auto-confirmation payloads.

## Tests

- Added Android guardrails proving the old active "Activer la confirmation IA" copy is absent.
- Added API tests for manual-only confirmation settings.
