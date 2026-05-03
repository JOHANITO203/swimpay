# Real Bank Evidence Dry-run Runbook

SwimPay is a Payment Signal Engine. This dry run collects package/certificate metadata only. It does not process real bank notifications and it does not confirm payments.

## Purpose

The dry run verifies that an operator can collect Android PackageManager evidence for one explicitly selected package name and submit that metadata for backend operator review.

This workflow does not create production trust automatically. It does not enable auto-confirmation.

## Required Input

The operator or user must provide exactly one package name.

Allowed input example shape:

```text
operator.provided.package.name
```

The runbook intentionally does not provide real bank package names. SwimPay must not guess or invent package names.

Forbidden inputs:

- blank package name;
- wildcard package name;
- `TO_VERIFY`;
- `synthetic_debug_only` when collecting real evidence;
- any request to list all installed apps.

## Android Collection

The debug/operator action is:

```text
submit_explicit_package_evidence
```

It requires:

```text
package_name=<operator supplied package>
bank_profile_id=<target bank profile, defaults to sber_ru in debug>
```

The Android Receiver must:

- call PackageManager for that exact package only;
- return `package_not_found` if the package is absent;
- collect `package_name`, `cert_sha256`, `app_version` if available and `install_source` if available;
- set evidence source to `android_packagemanager` on backend submission;
- submit only after explicit operator/user action.

The Android Receiver must not:

- enumerate installed apps;
- scrape bank app internals;
- read bank app data;
- read SMS;
- process notifications for evidence collection;
- upload raw phone or raw notification text.

## Local Backend Setup

```powershell
docker compose --env-file .env.example -f infra/docker-compose.yml ps
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
```

For a connected device:

```powershell
adb devices -l
adb -s <SERIAL> reverse tcp:8080 tcp:8080
adb -s <SERIAL> install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk
adb -s <SERIAL> shell am start -n com.swimpay.receiver/.MainActivity
```

## Submit Evidence

Debug broadcast shape:

```powershell
adb -s <SERIAL> shell am broadcast `
  -n com.swimpay.receiver/.DebugSmokeBroadcastReceiver `
  -a com.swimpay.receiver.DEBUG_SMOKE `
  --es action submit_explicit_package_evidence `
  --es package_name "<operator.provided.package>" `
  --es bank_profile_id "sber_ru"
```

Expected backend result:

- `pending_operator_review`;
- `trusted: false`;
- `auto_confirm_enabled: false`;
- evidence accepted for operator review.

If the package is absent, expected result:

- `package_not_found`;
- no evidence submitted;
- no trust evidence created.

## Admin Review

Use local dev admin auth only in local development:

```powershell
$headers = @{ Authorization = "Bearer change_me_local_admin_token" }
```

List and inspect:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/v1/admin/bank-evidence -Headers $headers
Invoke-WebRequest -UseBasicParsing http://localhost:8080/v1/admin/bank-evidence/<evidence-id> -Headers $headers
```

Approve review-only:

```powershell
Invoke-WebRequest -UseBasicParsing `
  http://localhost:8080/v1/admin/bank-evidence/<evidence-id>/approve-review-only `
  -Headers $headers `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"reason":"operator reviewed explicit PackageManager evidence; review-only only"}'
```

Review-only means the evidence can support review-mode operations. It does not establish production trust and it does not enable auto-confirmation.

## Production Trust

Production trust is separate and governed by `docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md`.

It requires:

- review-only approval first;
- request production trust;
- approval by a different owner/admin actor;
- revocation support;
- redacted audit.

Production trust still means verified app metadata only. It is not a payment confirmation and it does not enable auto-confirmation by itself.

## Forbidden During This Dry Run

- no real bank notifications;
- no customer data;
- no SMS;
- no bank app scraping;
- no installed-app enumeration;
- no raw phone;
- no raw notification text;
- no automatic trust;
- no automatic auto-confirmation;
- no official bank confirmation wording.
