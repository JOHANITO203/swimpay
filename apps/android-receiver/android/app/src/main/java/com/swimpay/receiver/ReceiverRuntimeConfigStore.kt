package com.swimpay.receiver

import android.content.Context
import java.security.SecureRandom
import java.util.Base64

data class ReceiverRuntimeConfig(
    val enabledBankProfileIds: Set<String>,
    val merchantId: String,
    val signingKey: String
) {
    val enabledBankPackages: Set<String> = BankTargetLock.supportedTargets
        .filter { it.bankProfileId in enabledBankProfileIds }
        .map { it.packageName }
        .toSet()
}

class ReceiverRuntimeConfigStore(context: Context) {
    private val preferences = context.getSharedPreferences("swimpay_receiver_runtime_config", Context.MODE_PRIVATE)

    fun load(): ReceiverRuntimeConfig {
        val enabledBankProfileIds = preferences.getStringSet("enabled_bank_profile_ids", emptySet()).orEmpty()
            .filter { id -> BankTargetLock.supportedTargets.any { it.bankProfileId == id } }
            .toSet()
        return ReceiverRuntimeConfig(
            enabledBankProfileIds = enabledBankProfileIds,
            merchantId = preferences.getString("merchant_id", "") ?: "",
            signingKey = preferences.getString("signing_key", "") ?: ""
        )
    }

    fun save(config: ReceiverRuntimeConfig) {
        val safeBankProfileIds = config.enabledBankProfileIds
            .filter { id -> BankTargetLock.supportedTargets.any { it.bankProfileId == id } }
            .toSet()
        require(safeBankProfileIds.isNotEmpty()) { "at least one supported bank target must be enabled" }
        require(config.merchantId.isNotBlank()) { "merchant id is required for receiver runtime config" }
        require(config.signingKey.startsWith(SIGNING_KEY_PREFIX)) { "receiver signing key must be app-generated" }
        preferences.edit()
            .putStringSet("enabled_bank_profile_ids", safeBankProfileIds)
            .putString("merchant_id", config.merchantId)
            .putString("signing_key", config.signingKey)
            .apply()
    }

    fun clear() {
        preferences.edit().clear().apply()
    }

    fun signingKeyOrCreate(): String {
        val existing = load().signingKey
        return if (existing.startsWith(SIGNING_KEY_PREFIX)) existing else generateSigningKey()
    }

    companion object {
        const val SIGNING_KEY_PREFIX = "spk_"

        fun generateSigningKey(): String {
            val bytes = ByteArray(32)
            SecureRandom().nextBytes(bytes)
            return SIGNING_KEY_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        }
    }
}
