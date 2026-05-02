# SwimPay Android Receiver

This app owns merchant-side Android notification capture for SwimPay V1.

Android captures, filters, redacts, signs and uploads operational payment signals. The backend verifies, matches and decides.

## Current Shape

This repository currently contains:

- TypeScript MVP core used by local tests.
- Kotlin-source-ready skeleton under `android/app/src/main`.
- Configuration placeholders under `config`.

No Gradle wrapper or Android build toolchain is currently present in this repo, so Android platform tests are documented as unavailable. The executable checks are the TypeScript tests in `src`.

## Commands

```bash
npm test -- --run apps/android-receiver/src
npm run typecheck
npm run build
```

## Guardrails

- Do not implement Android payment confirmation.
- Do not implement Android auto-confirmation.
- Do not read SMS.
- Do not scrape bank apps.
- Do not upload non-bank notifications.
- Do not upload raw phone numbers.
- Do not upload raw notification text.
- Do not invent real bank package names or signing certificate fingerprints.

## MVP Components

- Notification listener boundary.
- Bank allowlist and package/cert trust model.
- Snapshot extraction.
- Snapshot coalescing.
- Privacy firewall.
- Local parser hints.
- Encrypted outbox foundation.
- Signed upload envelope.

All package/cert values in examples are synthetic.
