package com.swimpay.receiver

data class DebugBackendConfig(
    val baseUrl: String = DEFAULT_BASE_URL,
    val healthPath: String = "/api-health",
    val merchantId: String = DEFAULT_SMOKE_MERCHANT_ID,
    val deviceName: String = "SwimPay Receiver Debug Device",
    val appVersion: String = "0.1.0-debug",
    val androidVersion: String = "debug",
    val publicKey: String = DEFAULT_SMOKE_PUBLIC_KEY,
    val installId: String = "swimpay-debug-install"
) {
    init {
        require(baseUrl.startsWith("http://127.0.0.1:")) {
            "Debug backend config must use adb reverse localhost."
        }
    }

    companion object {
        const val DEFAULT_BASE_URL = "http://127.0.0.1:8080"
        const val DEFAULT_SMOKE_MERCHANT_ID = "00000000-0000-4000-8000-000000000001"
        const val DEFAULT_SMOKE_PUBLIC_KEY = "swimpay_debug_hmac_key_do_not_use_in_production"
    }
}

