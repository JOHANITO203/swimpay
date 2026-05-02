# Sprint 3B Report - Android Receiver MVP Foundation

completed_at: 2026-05-02T18:45:00+03:00

## Tasks Created

- `037_android_project_setup`
- `038_notification_listener_service`
- `039_bank_allowlist_and_package_verification`
- `040_snapshot_extractor_and_coalescer`
- `041_privacy_firewall_and_local_parser`

## Tasks Completed

- `037_android_project_setup`
- `038_notification_listener_service`
- `039_bank_allowlist_and_package_verification`
- `040_snapshot_extractor_and_coalescer`
- `041_privacy_firewall_and_local_parser`

## Android Foundation Behavior

- `apps/android-receiver` has a README, config placeholder and Kotlin-source-ready Android skeleton.
- The executable MVP core remains TypeScript until Gradle/Android tooling is added.
- `AndroidReceiverNotificationListener` defines the notification callback boundary.
- Non-allowlisted notifications are ignored locally.
- The listener explicitly does not make payment decisions.
- Backend remains the final decision maker.

## Bank Allowlist Behavior

- Allowlist entries include `bankProfileId`, `packageName`, `packageCertSha256`, `verificationStatus` and `strictVerification`.
- `TO_VERIFY`, pending, rejected and revoked package/cert metadata remain untrusted locally.
- Unknown packages are ignored.
- Mismatched certs are ignored.
- Tests use synthetic package/cert values only.

## Snapshot And Coalescing

- Snapshot DTO supports package, id, tag, post time, channel, group, sort key, title, text, big text, sub text, summary, text lines and ticker.
- Coalescer dedupes duplicate snapshots and records first/last timestamps.
- Coalescing window defaults in docs/config to `1500 ms`.
- Stable notification, semantic and coalesced hashes are produced.

## Privacy Firewall And Local Parser

- Phone-like values are redacted to `<PHONE>`.
- Amount/currency values are redacted to `<AMOUNT> <CURRENCY>`.
- Card masks and SwimPay-style references are redacted.
- Upload payloads set `raw_text_present: false`.
- Local parser emits hints only: amount minor units, currency, masked phone, masked reference, direction hint and negative keywords.
- Android does not confirm or auto-confirm payment.

## Tests Added Or Strengthened

- `apps/android-receiver/src/android-receiver-mvp.test.ts`
- Updated `apps/android-receiver/src/android-receiver-core.test.ts` to use synthetic package/cert values.

## Validation

- `npm test -- --run apps/android-receiver/src`: PASS
- `npm run typecheck --workspace @swimpay/android-receiver`: PASS
- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS (`32` test files, `214` tests)
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS
- Android/Gradle tests: not run because no Gradle wrapper or Android SDK build configuration is present yet.

## Blockers

No current critical blockers.

Known limitation: no Gradle wrapper or Android SDK build configuration is present in the repo, so Android platform tests were not run.

## Next Recommended Sprint

Sprint 3C should connect the Android Receiver MVP foundation to backend lifecycle APIs:

- device registration client;
- signed heartbeat client;
- signed signal upload client;
- encrypted outbox retry loop;
- notification access setup UX;
- local Docker Compose integration smoke.
