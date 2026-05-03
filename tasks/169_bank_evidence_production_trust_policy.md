# Task 169 - Bank Evidence Production Trust Policy

Status: completed

Implemented a production trust policy foundation for bank package/certificate evidence.

Rules:

- concrete package name required;
- concrete certificate SHA-256 required;
- source must be `android_packagemanager`;
- evidence must be submitted by a registered Receiver device;
- evidence must be approved for review-only first;
- production trust requires explicit request and second-actor approval;
- `TO_VERIFY` and `synthetic_debug_only` cannot become production trusted;
- rejected/deprecated/pending evidence cannot request production trust;
- production trust never enables auto-confirmation.
