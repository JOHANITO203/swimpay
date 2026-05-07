# Real Notification Shadow Dry Run

This document prepares a future controlled dry run. It is not authorization to process real bank notifications now.

SwimPay is a Payment Signal Engine. SwimPay does not provide official bank confirmation. Any webhook disclosure must keep `official_bank_confirmation=false` and `confirmation_type=notification_signal`.

## Safe Defaults

- `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED=false`
- `SWIMPAY_REQUIRE_REAL_NOTIFICATION_CONSENT=true`
- `SWIMPAY_REAL_BANK_AUTO_CONFIRM=false`
- `SWIMPAY_SHADOW_AUTO_CONFIRM_PREDICTION=true`
- `SWIMPAY_RAW_NOTIFICATION_STORAGE=false`

Real bank notification capture is blocked unless the operator explicitly enables shadow mode and the consent gate passes.

## Required Gate

Before one selected bank can enter real-notification shadow mode, verify:

1. operator consent recorded;
2. merchant consent recorded;
3. one selected bank profile;
4. selected bank is review-only ready;
5. Android Notification Listener Access enabled;
6. backend health available;
7. Receiver outbox healthy;
8. auto-confirm disabled;
9. raw notification storage disabled.

## Manual Dry-run Commands

1. Verify backend health:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
```

2. Verify ADB device:

```powershell
adb devices -l
```

3. Establish reverse proxy for the phone:

```powershell
adb -s <SERIAL> reverse tcp:8080 tcp:8080
```

4. Verify Notification Listener Access manually on the phone:

```powershell
adb -s <SERIAL> shell am start -a android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS
```

Do not bypass Android settings.

5. Select exactly one review-only bank profile in the Receiver.

6. Enable shadow mode for the controlled run only:

```powershell
$env:SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED="true"
$env:SWIMPAY_REQUIRE_REAL_NOTIFICATION_CONSENT="true"
$env:SWIMPAY_REAL_BANK_AUTO_CONFIRM="false"
$env:SWIMPAY_SHADOW_AUTO_CONFIRM_PREDICTION="true"
$env:SWIMPAY_RAW_NOTIFICATION_STORAGE="false"
```

7. Perform a controlled merchant/operator test payment or transfer only if separately authorized.

8. Verify redaction before upload/outbox:

- no raw phone;
- no raw notification title/body;
- no raw notification text;
- `raw_text_present=false`;
- HMAC or masked hints only.

9. Verify review queue:

- real bank signal routes to review/shadow;
- order does not become `manual_confirmed` without merchant action;
- shadow prediction, if present, is metadata only.

10. Verify manual-review webhook only after operator action:

- `decision=manual_confirmed` only after review;
- `official_bank_confirmation=false`;
- `confirmation_type=notification_signal`.

11. Disable shadow mode immediately after the run:

```powershell
Remove-Item Env:\SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED -ErrorAction SilentlyContinue
```

## Emergency Stop

If raw PII appears, Notification Listener behavior is unstable, or a webhook confirms without manual review:

1. disable `SWIMPAY_REAL_NOTIFICATION_SHADOW_ENABLED`;
2. remove ADB reverse if using a phone;
3. stop the Receiver or disable Notification Listener Access;
4. stop local services if needed;
5. preserve redacted logs only;
6. open a blocker before any further shadow run.

## Forbidden

- no SMS reading;
- no bank app scraping;
- no installed-app enumeration;
- no raw notification storage;
- no real bank auto-confirm;
- no official bank confirmation wording;
- no fulfillment release from shadow prediction.
