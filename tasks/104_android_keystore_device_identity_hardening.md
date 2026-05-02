# 104 - Android Keystore Device Identity Hardening

Status: completed

Scope:
- Harden Android device identity signing boundaries.
- Keep JVM tests on a fake signer while production signing has no dev bypass.

Acceptance:
- Canonical signed payload includes event id, device id, merchant id, notification hash, local counter, observed timestamp and payload hash.
- Production mode cannot use the fake signer.
- Local counter persists across state reloads.
