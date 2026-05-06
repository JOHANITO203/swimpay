package com.swimpay.sdk

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import java.util.Locale

enum class SwimPayEnvironment {
    Production,
    Sandbox,
    Local
}

enum class SwimPayCheckoutStatus {
    Returned,
    Cancelled,
    Expired,
    Rejected,
    Unknown,
    Error
}

enum class SwimPayCheckoutError {
    InvalidCheckoutUrl,
    NoBrowserAvailable,
    ActivityNotFound,
    InvalidReturnUri,
    UnsupportedScheme,
    Cancelled,
    Unknown
}

data class SwimPayCheckoutOptions(
    val returnScheme: String? = null,
    val allowedHosts: Set<String> = emptySet(),
    val environment: SwimPayEnvironment = SwimPayEnvironment.Production,
    val requestTimeoutMs: Long? = null
)

data class SwimPayCheckoutResult(
    val status: SwimPayCheckoutStatus,
    val error: SwimPayCheckoutError? = null,
    val returnUri: Uri? = null,
    val shouldRefreshBackend: Boolean = false,
    val returnDoesNotConfirm: Boolean = true,
    val safeMessage: String? = null
)

data class SwimPayCheckoutIntentResult(
    val intent: Intent? = null,
    val error: SwimPayCheckoutError? = null,
    val safeMessage: String? = null
)

object SwimPayCheckout {
    fun open(
        activity: Activity,
        checkoutUrl: String,
        options: SwimPayCheckoutOptions = SwimPayCheckoutOptions()
    ): SwimPayCheckoutResult {
        val uri = validateCheckoutUri(checkoutUrl, options)
            ?: return errorResult(SwimPayCheckoutError.InvalidCheckoutUrl, "Invalid checkout URL.")

        try {
            CustomTabsIntent.Builder()
                .build()
                .launchUrl(activity, uri)

            return SwimPayCheckoutResult(
                status = SwimPayCheckoutStatus.Unknown,
                safeMessage = "Checkout opened."
            )
        } catch (_: ActivityNotFoundException) {
            return openWithBrowserIntent(activity, uri)
        } catch (_: RuntimeException) {
            return openWithBrowserIntent(activity, uri)
        }
    }

    fun createIntent(
        context: Context,
        checkoutUrl: String,
        options: SwimPayCheckoutOptions = SwimPayCheckoutOptions()
    ): SwimPayCheckoutIntentResult {
        val uri = validateCheckoutUri(checkoutUrl, options)
            ?: return SwimPayCheckoutIntentResult(
                error = SwimPayCheckoutError.InvalidCheckoutUrl,
                safeMessage = "Invalid checkout URL."
            )

        val intent = Intent(Intent.ACTION_VIEW, uri)
            .addCategory(Intent.CATEGORY_BROWSABLE)

        if (intent.resolveActivity(context.packageManager) == null) {
            return SwimPayCheckoutIntentResult(
                error = SwimPayCheckoutError.NoBrowserAvailable,
                safeMessage = "No browser is available."
            )
        }

        return SwimPayCheckoutIntentResult(intent = intent)
    }

    fun parseReturnUri(
        uri: Uri?,
        options: SwimPayCheckoutOptions = SwimPayCheckoutOptions()
    ): SwimPayCheckoutResult {
        if (uri == null) {
            return errorResult(SwimPayCheckoutError.InvalidReturnUri, "Invalid return URI.")
        }

        val expectedScheme = options.returnScheme
        if (expectedScheme != null && !uri.scheme.equals(expectedScheme, ignoreCase = true)) {
            return errorResult(SwimPayCheckoutError.UnsupportedScheme, "Unsupported return scheme.", uri)
        }

        val status = uri.getQueryParameter("status")
            ?.trim()
            ?.lowercase(Locale.US)

        return when (status) {
            null, "", "returned", "return", "success", "completed" -> returned(uri, SwimPayCheckoutStatus.Returned)
            "cancelled", "canceled", "cancel" -> returned(uri, SwimPayCheckoutStatus.Cancelled, SwimPayCheckoutError.Cancelled)
            "expired" -> returned(uri, SwimPayCheckoutStatus.Expired)
            "rejected" -> returned(uri, SwimPayCheckoutStatus.Rejected)
            "error" -> returned(uri, SwimPayCheckoutStatus.Error, SwimPayCheckoutError.Unknown)
            else -> returned(uri, SwimPayCheckoutStatus.Unknown)
        }
    }

    fun parseReturnIntent(
        intent: Intent?,
        options: SwimPayCheckoutOptions = SwimPayCheckoutOptions()
    ): SwimPayCheckoutResult? {
        val uri = intent?.data ?: return null
        return parseReturnUri(uri, options)
    }

    private fun openWithBrowserIntent(activity: Activity, uri: Uri): SwimPayCheckoutResult {
        val intent = Intent(Intent.ACTION_VIEW, uri)
            .addCategory(Intent.CATEGORY_BROWSABLE)

        if (intent.resolveActivity(activity.packageManager) == null) {
            return errorResult(SwimPayCheckoutError.NoBrowserAvailable, "No browser is available.")
        }

        return try {
            activity.startActivity(intent)
            SwimPayCheckoutResult(
                status = SwimPayCheckoutStatus.Unknown,
                safeMessage = "Checkout opened."
            )
        } catch (_: ActivityNotFoundException) {
            errorResult(SwimPayCheckoutError.ActivityNotFound, "Checkout could not be opened.")
        }
    }

    private fun validateCheckoutUri(checkoutUrl: String, options: SwimPayCheckoutOptions): Uri? {
        val uri = runCatching { Uri.parse(checkoutUrl.trim()) }.getOrNull() ?: return null
        val scheme = uri.scheme?.lowercase(Locale.US) ?: return null

        if (scheme != "https" && scheme != "http") {
            return null
        }

        val host = uri.host ?: return null
        if (options.allowedHosts.isNotEmpty() && !options.allowedHosts.contains(host)) {
            return null
        }

        return uri
    }

    private fun errorResult(
        error: SwimPayCheckoutError,
        message: String,
        uri: Uri? = null
    ): SwimPayCheckoutResult {
        return SwimPayCheckoutResult(
            status = SwimPayCheckoutStatus.Error,
            error = error,
            returnUri = uri,
            safeMessage = message
        )
    }

    private fun returned(
        uri: Uri,
        status: SwimPayCheckoutStatus,
        error: SwimPayCheckoutError? = null
    ): SwimPayCheckoutResult {
        return SwimPayCheckoutResult(
            status = status,
            error = error,
            returnUri = uri,
            shouldRefreshBackend = true,
            returnDoesNotConfirm = true,
            safeMessage = "Refresh order status from your backend."
        )
    }
}
