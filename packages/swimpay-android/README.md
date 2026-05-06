# @swimpay/android

Small Android merchant helper for opening a SwimPay `checkout_url`.

This package is not the SwimPay Receiver. It does not listen to bank notifications, does not process payment signals, and does not confirm payments.

## Boundary

Your merchant Android app must call your merchant backend. Your merchant backend creates the SwimPay order and returns the `checkout_url`.

The Android app opens the `checkout_url`, handles the return URI, then must refresh order status from your backend.

The return does not confirm payment. The webhook is delivered to your backend after merchant manual confirmation. Public events include `official_bank_confirmation=false`.

never put a SwimPay secret in the APK.

## Minimal usage

```kotlin
val openResult = SwimPayCheckout.open(
    activity = this,
    checkoutUrl = checkoutUrl,
    options = SwimPayCheckoutOptions(returnScheme = "merchantapp")
)
```

```kotlin
val result = SwimPayCheckout.parseReturnIntent(intent, SwimPayCheckoutOptions(returnScheme = "merchantapp"))
if (result != null) {
    refreshOrderStatusFromBackend()
}
```

## Publication note

Sprint 9C ships this as a Kotlin source helper with static guardrails. Maven/Gradle publication can be added in a later sprint without changing the public boundary.
