package com.swimpay.receiver

object AndroidMerchantBackendConfig {
    fun configuredBaseUrl(): String = normalizeBaseUrl(BuildConfig.SWIMPAY_BACKEND_BASE_URL)

    fun normalizeBaseUrl(value: String): String {
        val normalized = value.trim().trimEnd('/')
        require(normalized.isNotBlank()) { "Android merchant backend base URL cannot be blank" }
        require(!normalized.any { it.isWhitespace() }) { "Android merchant backend base URL cannot contain whitespace" }
        require(normalized.startsWith("http://127.0.0.1:") || normalized.startsWith("https://")) {
            "Android merchant backend base URL must use HTTPS outside adb reverse localhost."
        }
        return normalized
    }
}
