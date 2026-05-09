package com.example.merchant

import android.content.Intent
import android.os.Bundle
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.swimpay.sdk.SwimPayButton
import com.swimpay.sdk.SwimPayButtonState
import com.swimpay.sdk.SwimPayCheckout
import com.swimpay.sdk.SwimPayCheckoutOptions
import com.swimpay.sdk.SwimPayCheckoutStatus
import kotlinx.coroutines.launch

class CheckoutActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val swimPayButton = SwimPayButton.create(this) {
            payWithSwimPay(orderId = "ORDER_1048", button = it as android.widget.Button)
        }
        setContentView(LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            addView(swimPayButton)
        })
    }

    fun payWithSwimPay(orderId: String) {
        payWithSwimPay(orderId, button = null)
    }

    private fun payWithSwimPay(orderId: String, button: android.widget.Button?) {
        lifecycleScope.launch {
            button?.let { SwimPayButton.bind(it, SwimPayButtonState.Loading) }
            val checkoutUrl = merchantBackend.createSwimPayCheckout(orderId)
            val result = SwimPayCheckout.open(
                activity = this@CheckoutActivity,
                checkoutUrl = checkoutUrl,
                options = SwimPayCheckoutOptions(returnScheme = "merchantapp")
            )
            button?.let { SwimPayButton.bind(it, SwimPayButtonState.Ready) }

            if (result.status == SwimPayCheckoutStatus.Error) {
                showSafeCheckoutError(result.safeMessage)
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

    private val merchantBackend = MerchantBackendClient()

    private fun refreshOrderStatusFromBackend() {
        // Ask your own backend for the final order status.
    }

    private fun showSafeCheckoutError(message: String?) {
        // Show a short merchant-controlled error.
    }
}

class MerchantBackendClient {
    suspend fun createSwimPayCheckout(orderId: String): String {
        // Call your own backend. The backend returns checkout_url.
        return "https://pay.swimpay.app/checkout/example"
    }
}
