# 148 — Bank Package Evidence Contract

## Goal

Define the receiver-side dry-run contract for Android package/certificate evidence without trusting it automatically.

## Scope

- Represent PackageManager evidence as observed metadata.
- Support `bank_profile_id`, `package_name`, `package_cert_sha256`, evidence source, capture timestamp and safe label.
- Keep `TO_VERIFY` and placeholder metadata untrusted.
- Require operator review for concrete package/cert evidence.

## Safety Rules

- Do not invent real bank package names or certificate fingerprints.
- Do not claim official bank confirmation.
- Do not make Android payment decisions.
