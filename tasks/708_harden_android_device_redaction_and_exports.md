# Task 708 - Harden Android device proof, redaction and sensitive UI exports

Goal: make Android safer before real notification testing and developer export use.

Requirements:

- Android account device proof should be backed by Android Keystore-style signing where possible.
- The private signing material must never leave the device.
- Redaction must cover phone, amount, references, card masks and person-like sender fragments.
- Derived hashes must not be based on raw notification text without a privacy boundary.
- App lock should prevent sensitive loads/actions while UI is locked.
- Developer show-once export material should be cleared after copy/navigation/timeout where practical.
- Android still never confirms payments.

Validation:

- Add JVM/static tests for redaction variants.
- Add tests for device proof signature shape and non-shared-secret behavior.
- Add tests for developer export clearing.
- Add tests that no SMS/Accessibility/QUERY_ALL_PACKAGES is introduced.
