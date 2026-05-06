# Android Merchant Basic Example

This example shows how a merchant Android app opens SwimPay Checkout.

## Architecture

The Android app calls the merchant backend. The merchant backend creates the SwimPay order and returns `checkout_url`.

After checkout returns to the app, refresh order status from your backend.

The return does not confirm payment. The webhook is delivered to your backend after merchant manual confirmation. Public events include `official_bank_confirmation=false`.

never put a SwimPay secret in the APK.

## Files

- `CheckoutActivity.kt` - minimal Kotlin usage.
- `AndroidManifest.xml` - return deep-link setup.
