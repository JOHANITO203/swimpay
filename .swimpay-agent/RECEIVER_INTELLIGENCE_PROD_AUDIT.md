# Receiver and Intelligence Production Readiness Audit

generated_at: 2026-05-06

## Result

Status: partially ready.

Sprint 8A and 8B foundations are present and should be preserved. The Receiver/Intelligence stack is close to V1 architecture, but still needs a production hardening sprint before real multi-bank learning or SDK production launch.

## Confirmed Present

- Notification Listener is the declared Android listening API.
- No SMS permission was found in Android source/manifest.
- No Accessibility service was found.
- No `QUERY_ALL_PACKAGES` was found.
- No broad `getInstalledPackages` / `getInstalledApplications` scan was found in active Android source.
- Bank Target Lock probes only known supported package names.
- Supported V1 bank package names exist for:
  - Sberbank;
  - T-Bank;
  - VTB;
  - Alfa-Bank;
  - Gazprombank.
- Android deterministic `BankNotificationAgentV1` exists.
- Privacy Firewall and redacted payload contracts exist.
- Direction-aware shape hashing exists.
- Static bank profiles exist and reject auto-confirm-enabled profiles.
- Deterministic parser/classifier exists with `auto_confirm_allowed=false`.
- Redacted receiver signal upload contract exists.
- Passive feedback collector exists.
- Unknown shape monitoring exists.
- Local drift guard exists.
- Payment Intent Gate exists in `packages/matching-core`.
- Signal worker includes no-active-intent no-review behavior.
- Review and webhook ownership remain backend-side.

## Production Gaps

- Production-grade asymmetric receiver/device signature verification is still documented as future hardening in implementation notes.
- Real multi-bank shadow validation is not complete for all five V1 banks.
- Raw-notification-off policy is present, but needs one final operational verification before real notification tests.
- Bank package evidence/trust language still exists around future auto-confirm readiness and should be fenced as future-only.
- Some docs and tests still exercise legacy auto-confirm scenarios.
- Durable passive learning persistence exists, but retention/export/cleanup policy is not yet production-ready.
- Device smoke was previously successful, but a fresh production audit should include install/launch/UI dump after validation.

## Production Verdict

Receiver/Intelligence is architecturally aligned, but not yet production-ready. Recommended next hardening before real notification expansion:

1. Receiver device signing and key lifecycle.
2. Production raw-data kill-switch verification.
3. Five-bank exact package visibility and shadow-readiness checklist.
4. Retention policy for feedback/unknown-shape records.
5. Public docs cleanup to remove V1 auto-confirm ambiguity.

