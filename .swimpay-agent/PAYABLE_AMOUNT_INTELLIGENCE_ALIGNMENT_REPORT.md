# Payable Amount Intelligence Alignment Report

Date: 2026-05-10

## Objective

Align SwimPay Intelligence, merchant Android surfaces and review contracts on the new amount truth:

- `display_amount_minor` is the visible product/order amount.
- `reconciliation_delta_minor` is the micro-delta used to reduce collisions.
- `payable_amount_minor` is the exact amount the buyer must transfer and the authoritative amount for matching.

No real bank notification was processed. No auto-confirmation or public webhook semantics were changed.

## Runtime Result

- Payment Intent Gate now emits explicit amount reason labels:
  - `PAYABLE_AMOUNT_EXACT_MATCH`
  - `DISPLAY_AMOUNT_ONLY_MATCH`
  - `PAYABLE_AMOUNT_MISMATCH`
  - `RECONCILIATION_AMOUNT_EXPECTED`
- A signal matching `payable_amount_minor` can become a strong manual-review candidate.
- A signal matching only `display_amount_minor` when a micro-reconciliation exists is not a strong candidate and does not create a review.
- Signal runtime candidate loading now includes display-amount-only candidates for explanation, but final matching still requires `payable_amount_minor`.

## Merchant Surface Result

- Android merchant payment detail now shows:
  - montant affiché;
  - montant exact attendu;
  - montant détecté;
  - écart;
  - risk label.
- Android review queue avoids strong “payment detected” wording for amount-mismatch/display-only cases.
- Backend Android payment detail response now returns `amount_displayed`, `amount_expected`, `amount_detected`, `amount_delta_minor`, `amount_delta` and `risk_label`.

## Webhook Guardrail

- No public webhook is emitted before merchant manual confirmation.
- `payment.confirmed` behavior remains unchanged and manual-confirmation-only.
- Public disclosure stays `confirmation_type=notification_signal` and `official_bank_confirmation=false` for notification-signal review surfaces.

## Tests Added / Updated

- Payable exact amount creates manual-review candidate.
- Display amount only does not create strong review when payable amount differs.
- Unrelated amount mismatch is labelled as payable mismatch.
- Android merchant payment detail exposes displayed/expected/detected/delta/risk fields.
- Webhook tests remain final-only.

## Validation

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `npm run test:replay`
- `npm run test:matching`
- `npm run test:privacy`
- `npm run test:webhooks`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleDebug --no-daemon --stacktrace --max-workers=1`

Android Gradle commands require:

```powershell
$env:ANDROID_HOME='C:\Users\Lenovo\AppData\Local\Android\Sdk'
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
```

## Blockers

- No local code blocker remains for payable amount matching.
- Staging must be redeployed before the online SWIMVPN+ / external-app checkout can observe these corrections.
- Real bank notification testing remains out of scope until the explicit real-notification validation sprint.
