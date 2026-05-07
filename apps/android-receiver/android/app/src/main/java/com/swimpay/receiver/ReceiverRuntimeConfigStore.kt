package com.swimpay.receiver

import android.content.Context

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
}
