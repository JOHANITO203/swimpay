# SwimPay Android SDK Quickstart

This guide is for a merchant Android app that wants to open SwimPay Checkout.

The merchant Android app is not the SwimPay Receiver. It does not listen to bank notifications and does not make payment decisions.

## Flow

1. Your Android app asks your merchant backend to create a SwimPay order.
2. Your merchant backend creates the order with the SwimPay server API or `@swimpay/node`.
3. Your merchant backend returns `checkout_url` to your Android app.
4. Your Android app opens the `checkout_url` with `SwimPayCheckout.open`.
5. The buyer completes the guided checkout.
6. The checkout returns to your Android app through your return scheme.
7. Your Android app must refresh order status from your backend.
8. The SwimPay webhook is delivered to your backend after merchant manual confirmation.

The return does not confirm payment.

## Install

Sprint 9C ships a Kotlin source helper at:

```text
packages/swimpay-android/src/main/kotlin/com/swimpay/sdk
```

A later sprint can package it for Maven or Gradle publication.

## Android usage

```kotlin
class CheckoutActivity : AppCompatActivity() {
    fun payWithSwimPay(orderId: String) {
        lifecycleScope.launch {
            val checkoutUrl = merchantBackend.createSwimPayCheckout(orderId)
            val result = SwimPayCheckout.open(
                activity = this@CheckoutActivity,
                checkoutUrl = checkoutUrl,
                options = SwimPayCheckoutOptions(returnScheme = "merchantapp")
            )

            if (result.status == SwimPayCheckoutStatus.Error) {
                showSafeCheckoutError(result)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val result = SwimPayCheckout.parseReturnIntent(
            intent,
            SwimPayCheckoutOptions(returnScheme = "merchantapp")
        )

        if (result != null) {
            refreshOrderStatusFromBackend()
        }
    }
}
```

## Return scheme

```xml
<activity
    android:name=".CheckoutActivity"
    android:exported="true"
    android:launchMode="singleTop">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="merchantapp" android:host="swimpay-return" />
    </intent-filter>
</activity>
```

## Security notes

- The merchant Android app calls your merchant backend.
- Your backend creates the SwimPay order and returns `checkout_url`.
- never put a SwimPay secret in the APK.
- Never fulfill an order from Android return alone.
- Always refresh order status from your backend after return.
- The webhook is delivered to your backend, not the Android app.
- `payment.confirmed` is sent only after merchant manual confirmation.
- Public SwimPay events include `official_bank_confirmation=false`.
- SwimPay is not a bank and does not provide official bank confirmation.
- Do not collect CVV, bank password, SMS code or PIN in the Android merchant app.
