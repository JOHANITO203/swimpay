# Bank Evidence Operator Runbook

This runbook describes how SwimPay operators rehearse and later review Android PackageManager bank package/certificate evidence.

SwimPay is a Payment Signal Engine. Evidence review does not make SwimPay a bank, PSP or official bank confirmation system.

## Safety Rules

- no auto trust;
- no auto-confirm;
- no real notification processing during evidence review;
- no SMS reading;
- no bank app scraping;
- no installed-app enumeration;
- no raw phone;
- no raw notification text;
- human/operator verification required for any production trust step.

`approve-review-only` means the evidence was reviewed for operational review-only readiness. It does not mark a bank profile trusted, does not verify a production bank app signature and does not enable payment auto-confirmation.

## Synthetic Dry-run Flow

Synthetic dry-run flow: this path validates operator workflow mechanics without real bank apps, real bank notifications or production trust.

Use this flow for local validation only.

1. Start local Compose and verify:

```powershell
docker compose --env-file .env.example -f infra/docker-compose.yml up -d --build
Invoke-WebRequest -UseBasicParsing http://localhost:8080/api-health
```

2. If the Postgres volume already existed before Sprint 4M, apply the additive evidence migration once:

```powershell
Get-Content packages/database/migrations/004_bank_package_evidence.sql |
  docker compose --env-file .env.example -f infra/docker-compose.yml exec -T postgres psql -U swimpay -d swimpay
```

3. Prepare the real device:

```powershell
adb devices -l
adb -s R5CWA0FEPZW reverse tcp:8080 tcp:8080
adb -s R5CWA0FEPZW install -r apps/android-receiver/android/app/build/outputs/apk/debug/app-debug.apk
adb -s R5CWA0FEPZW shell am start -n com.swimpay.receiver/.MainActivity
```

4. Trigger the debug-only synthetic evidence flow:

```powershell
adb -s R5CWA0FEPZW shell am broadcast `
  -n com.swimpay.receiver/.DebugSmokeBroadcastReceiver `
  -a com.swimpay.receiver.DEBUG_SMOKE `
  --es action register_receiver

adb -s R5CWA0FEPZW shell am broadcast `
  -n com.swimpay.receiver/.DebugSmokeBroadcastReceiver `
  -a com.swimpay.receiver.DEBUG_SMOKE `
  --es action submit_synthetic_bank_evidence
```

Expected result:

- evidence accepted for operator review;
- `trusted: false`;
- `auto_confirm_enabled: false`;
- package/cert values include `synthetic_debug_only`;
- no raw PII.

## Admin Review Steps

Use local dev admin auth only in development:

```powershell
$headers = @{ Authorization = "Bearer change_me_local_admin_token" }
```

List and inspect evidence:

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
  -Body '{"reason":"operator reviewed PackageManager evidence; review-only only"}'
```

Reject evidence:

```powershell
Invoke-WebRequest -UseBasicParsing `
  http://localhost:8080/v1/admin/bank-evidence/<evidence-id>/reject `
  -Headers $headers `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"reason":"operator rejected evidence"}'
```

Common rejection reasons:

- `package_mismatch`
- `certificate_mismatch`
- `source_not_operator_controlled`
- `synthetic_only`
- `stale_evidence`
- `other`

## Audit Expectations

Evidence review must write redacted audit events:

- `bank_evidence.submitted`
- `bank_evidence.reviewed`
- `bank_evidence.approved_review_only`
- `bank_evidence.rejected`

Query:

```powershell
Invoke-WebRequest -UseBasicParsing `
  "http://localhost:8080/v1/admin/audit-events?object_type=bank_package_evidence" `
  -Headers $headers
```

Audit payloads must show masked certificate data only. They must not expose raw notification text, raw phone, secrets, API keys or private keys.

## Future Real Package/Cert Dry Run

Real evidence collection must be explicit:

1. Operator selects or enters one package name.
2. Android checks that specific package with PackageManager.
3. Android submits only package/cert metadata.
4. Backend stores `pending_operator_review`.
5. Operator reviews evidence and may mark it `approved_for_review_only`.

Sprint 4P adds the debug/operator action `submit_explicit_package_evidence`. It requires an explicit `package_name` and returns `package_not_found` without submitting evidence if Android PackageManager cannot find that exact package.

See `docs/REAL_BANK_EVIDENCE_DRY_RUN_RUNBOOK.md`.

Production trust remains a separate future policy. It must require explicit human/operator verification and additional controls. Evidence review alone must never make a bank package trusted for auto-confirmation.

## Production Trust Policy Foundation

Production trust is now modeled as a separate metadata workflow. It is not the same as `approve-review-only`.

Allowed path:

```text
pending_operator_review
-> approved_for_review_only
-> production_trust_requested
-> production_trust_approved
```

Revocation path:

```text
production_trust_approved -> production_trust_revoked
```

Production trust means only:

```text
this bank app package/cert evidence is accepted as verified app metadata
```

It still does not enable auto-confirmation.

Operator commands:

```powershell
Invoke-WebRequest -UseBasicParsing `
  http://localhost:8080/v1/admin/bank-evidence/<evidence-id>/request-production-trust `
  -Headers $headers `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"reason":"request production metadata trust after review-only approval"}'

Invoke-WebRequest -UseBasicParsing `
  http://localhost:8080/v1/admin/bank-evidence/<evidence-id>/approve-production-trust `
  -Headers $headers `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"reason":"second operator approved package/cert metadata"}'

Invoke-WebRequest -UseBasicParsing `
  http://localhost:8080/v1/admin/bank-evidence/<evidence-id>/revoke-production-trust `
  -Headers $headers `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"reason":"package/cert metadata drifted or was superseded"}'
```

Guardrails:

- the requester cannot approve the same production trust request;
- `TO_VERIFY` cannot request production trust;
- `synthetic_debug_only` cannot request production trust;
- rejected or deprecated evidence cannot request production trust;
- production trust approval does not mark a payment confirmed;
- production trust approval does not set `auto_confirm_enabled`;
- real notifications must not be processed during package/cert trust review.

See `docs/BANK_EVIDENCE_PRODUCTION_TRUST_POLICY.md`.
