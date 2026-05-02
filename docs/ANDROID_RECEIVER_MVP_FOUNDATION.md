# Android Receiver MVP Foundation

Sprint: `3B_android_receiver_mvp_foundation`

## Scope

Sprint 3B prepares the Android Receiver MVP without building payment confirmation on Android.

Implemented foundations:

- Kotlin-source-ready Android skeleton.
- TypeScript notification listener boundary.
- Bank allowlist and package/cert trust model.
- Snapshot extraction.
- Snapshot coalescing and dedupe.
- Privacy firewall.
- Local parser hints.
- Signed upload envelope.

## Android Tooling

No Gradle wrapper or Android build toolchain is currently present in this repo. Android platform tests were not run. The current executable validation uses TypeScript tests under:

```text
apps/android-receiver/src
```

## Safety

Android Receiver must not:

- confirm a payment;
- auto-confirm a payment;
- read SMS;
- scrape bank apps;
- upload non-bank notifications;
- upload raw phone;
- upload raw notification text;
- trust `TO_VERIFY` package/cert metadata.

Backend remains the final decision maker.

## Synthetic Package Data

Tests and examples use synthetic package/cert values only:

```text
test.bank.synthetic
synthetic_cert_sha256_v1
```

No real bank package names or certificate fingerprints are introduced.
