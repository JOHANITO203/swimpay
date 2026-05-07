# Android Receiver Staging Setup Report

generated_at: 2026-05-08T00:00:00+03:00

## Local Device Status

Device `R5CWA0FEPZW` was previously reachable in CR-4 and local debug APK install/launch/UIAutomator smoke passed. This sprint has not yet installed a staging-configured Receiver build because staging backend URL and receiver credentials are not available.

## Required Staging Checks

- APK installed on `R5CWA0FEPZW`.
- App launched.
- Notification Listener Access enabled.
- Staging backend URL configured.
- Receiver registered against staging.
- Heartbeat reaches staging.
- Selected supported bank target enabled.
- Unsupported package notifications ignored.

## Blocker

No reachable staging API, receiver registration credentials or staging Android runtime configuration was available. Real bank notification capture must remain stopped until these checks pass.
