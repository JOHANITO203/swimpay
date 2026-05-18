# Payment Review Checkout Style Report

generated_at: 2026-05-18

## Scope

Updated the Android Compose payment review surfaces to follow the structure of the referenced checkout-form layout while preserving SwimPay's product contract.

Changed file:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/ui/premium/PaymentReviewCheckoutStyleScreenshotTest.kt`

## Surfaces Updated

- Review list cards in `PremiumReviewsScreen`.
- Payment review detail screen in `PremiumPaymentDetailScreen`.
- Compose previews for light and dark review detail states.

## Design Direction

The new review UI uses a checkout-style structure:

- strong top status;
- large amount panel;
- clear receiving/signal/control rows;
- timeline when available;
- explicit manual-review contract panel;
- primary confirm action;
- secondary signal rejection;
- destructive order cancellation kept visually separate.

The component now aligns better with the app themes:

- light/blue sibling theme uses the existing blue-night premium surfaces;
- dark/Oni theme uses the existing red/black token palette;
- no new hardcoded brand/payment-network logos were added.

## Product Contract Preserved

No backend, API, payment runtime, webhook or receiver logic was changed.

The existing actions remain wired through the same callbacks:

- `onConfirmReceived`;
- `onRejectSignal`;
- `onRejectOrder`.

The UI copy keeps the V1 boundary:

- Android captures the signal;
- backend decides;
- merchant manually confirms;
- no official bank confirmation wording was added.

## Added Previews

- `PremiumReviewsCheckoutStylePreview`
- `PremiumPaymentDetailCheckoutStylePreview`
- `PremiumPaymentDetailCheckoutStyleDarkPreview`

## Screenshots

Generated with Roborazzi:

```powershell
.\gradlew.bat :app:recordRoborazziStaging --tests com.swimpay.receiver.ui.premium.PaymentReviewCheckoutStyleScreenshotTest --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Output files:

- `.swimpay-agent/screenshots/payment_review_checkout_style_light_390.png`
- `.swimpay-agent/screenshots/payment_review_checkout_style_dark_390.png`
- `.swimpay-agent/screenshots/payment_review_list_checkout_style_light_390.png`

Visual result:

- detail card is visible end-to-end in light and dark themes;
- title/header no longer wraps into the status chip;
- amount, receiving rows, signal rows, contract panel and action buttons remain readable;
- no network card logo or real card number was introduced.

## Verification

Passed:

```powershell
.\gradlew.bat :app:assembleStaging --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Passed:

```powershell
.\gradlew.bat :app:testStagingUnitTest --tests com.swimpay.receiver.AndroidMerchantVisualArchitectureTest --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

Passed:

```powershell
.\gradlew.bat :app:recordRoborazziStaging --tests com.swimpay.receiver.ui.premium.PaymentReviewCheckoutStyleScreenshotTest --no-daemon --stacktrace --max-workers=1 --no-watch-fs
```

## Remaining Visual QA

Recommended next check on device:

- open review list;
- open a payment review;
- verify text readability on light and dark themes;
- verify primary/secondary/destructive action hierarchy;
- verify no content is hidden behind bottom navigation or system bars.
