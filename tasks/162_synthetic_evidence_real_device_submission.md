# 162 - Synthetic Evidence Real-device Submission

Status: completed

Goal: submit synthetic bank package/certificate evidence from the debug Android Receiver on a real device through the local backend.

Requirements:

- Use authorized real device `R5CWA0FEPZW` or the only authorized replacement.
- Verify `http://localhost:8080/api-health`.
- Re-establish `adb reverse tcp:8080 tcp:8080`.
- Build, install and launch the debug APK.
- Trigger debug action `submit_synthetic_bank_evidence` through the debug-only broadcast receiver.
- Use only `synthetic_debug_only` package/cert metadata.
- Record the backend evidence id when observable.
- Confirm returned semantics remain operator-review-only with `trusted: false` and `auto_confirm_enabled: false`.

Out of scope:

- Real bank packages/certificates.
- Real bank notifications.
- Installed app enumeration.
- Android payment confirmation or auto-confirmation.
