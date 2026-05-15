# Android Feature Restoration Closeout

## Scope completed

- Pre-design Android Merchant feature inventory created from commit `2149c8e`.
- Current feature access audited.
- Existing hidden/misrouted features identified.
- Previously hidden settings features restored in the current working tree.

## Main restored features

- Settings menu.
- Language.
- Appearance/theme.
- Security/App Lock.
- Confirmation Mode.
- Help Center.
- Contact Support.
- Dashboard quick action navigation.
- Receiving method runtime actions.

## Main remaining restoration blocker

- `OrderDetail` still renders a generic placeholder; the list-level `Orders/Ventes` feature is restored.

## Validation already run after restoration edits

- `npm run android:compile` passed.
- `.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidRuntimeWiringGuardrailTest` passed.
- `npm run android:assemble:staging` passed.
- `git diff --check` passed.
- Staging APK installed and launched on connected device.

## Next action

Audit whether `OrderDetail` had a complete pre-design contract before restoring it.
