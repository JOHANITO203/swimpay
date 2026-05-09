package com.swimpay.receiver

import android.content.Context

data class ReceiverRuntimeConfig(
    val enabledBankProfileIds: Set<String>,
    val merchantId: String,
    val paymentIntentActive: Boolean = false,
    val receiverArmed: Boolean = false,
    val expectedPaymentProfilePresent: Boolean = false
) {
    val enabledBankPackages: Set<String> = BankTargetLock.supportedTargets
        .filter { it.bankProfileId in enabledBankProfileIds }
        .map { it.packageName }
        .toSet()

    val activeIntentWindow: ActiveIntentWindow = ActiveIntentWindow(
        paymentIntentActive = paymentIntentActive,
        receiverArmed = receiverArmed,
        expectedPaymentProfilePresent = expectedPaymentProfilePresent
    )
}

interface ReceiverRuntimeConfigReader {
    fun load(): ReceiverRuntimeConfig
}

class ReceiverRuntimeConfigStore(context: Context) : ReceiverRuntimeConfigReader {
    private val preferences = context.getSharedPreferences("swimpay_receiver_runtime_config", Context.MODE_PRIVATE)

    override fun load(): ReceiverRuntimeConfig {
        val enabledBankProfileIds = preferences.getStringSet("enabled_bank_profile_ids", emptySet()).orEmpty()
            .filter { id -> BankTargetLock.supportedTargets.any { it.bankProfileId == id } }
            .toSet()
        return ReceiverRuntimeConfig(
            enabledBankProfileIds = enabledBankProfileIds,
            merchantId = preferences.getString("merchant_id", "") ?: "",
            paymentIntentActive = preferences.getBoolean("payment_intent_active", false),
            receiverArmed = preferences.getBoolean("receiver_armed", false),
            expectedPaymentProfilePresent = preferences.getBoolean("expected_payment_profile_present", false)
        )
    }

    fun save(config: ReceiverRuntimeConfig) {
        val safeBankProfileIds = config.enabledBankProfileIds
            .filter { id -> BankTargetLock.supportedTargets.any { it.bankProfileId == id } }
            .toSet()
        require(safeBankProfileIds.isNotEmpty()) { "at least one supported bank target must be enabled" }
        require(config.merchantId.isNotBlank()) { "merchant id is required for receiver runtime config" }
        preferences.edit()
            .putStringSet("enabled_bank_profile_ids", safeBankProfileIds)
            .putString("merchant_id", config.merchantId)
            .putBoolean("payment_intent_active", config.paymentIntentActive)
            .putBoolean("receiver_armed", config.receiverArmed)
            .putBoolean("expected_payment_profile_present", config.expectedPaymentProfilePresent)
            .remove(legacySharedKeyPreferenceName())
            .apply()
    }

    fun saveActiveIntentWindow(window: ActiveIntentWindow) {
        preferences.edit()
            .putBoolean("payment_intent_active", window.paymentIntentActive)
            .putBoolean("receiver_armed", window.receiverArmed)
            .putBoolean("expected_payment_profile_present", window.expectedPaymentProfilePresent)
            .apply()
    }

    fun clear() {
        preferences.edit().clear().apply()
    }

    private fun legacySharedKeyPreferenceName(): String {
        return listOf("signing", "key").joinToString("_")
    }
}
