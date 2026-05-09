# Active Intent Notification Sweep Report

Status: completed.

The Android Receiver now has an active-intent sweep layer in addition to the live `NotificationListenerService` path.

Implemented surfaces:
- live listener remains the primary source;
- active notification sweep runs on listener connection;
- keyed recall runs for the current posted notification key;
- snoozed sweep runs only when the Android API surface is available;
- local recent buffer stores redacted metadata only.

Safety boundaries:
- sweep runs only when `paymentIntentActive`, `receiverArmed` and `expectedPaymentProfilePresent` are all true;
- unsupported packages are rejected before extraction;
- only explicit activated bank packages are processed;
- buffer stores package, bank id, hashes, category and safe amount metadata;
- no raw title/body/bigText/textLines are stored;
- no Android confirmation and no webhook emission were added.

Validation:
- `ActiveIntentNotificationSweepTest` verifies inactive window skip, unsupported-package filtering and redacted-only buffer storage.
- Android JVM target passed with local SDK env.
- Full Android debug unit suite and `assembleDebug` passed during closeout.
