package com.swimpay.receiver.ui.premium

/**
 * West Africa (UEMOA / XOF) mobile money receiving wallets — the Android mirror
 * of the backend WestAfricaReceiverBankProfiles. Used by the WA receiving
 * sub-screen so a merchant can add a mobile money receiving method. Ids match the
 * backend bank_profile_id exactly (validated server-side).
 */
data class WestAfricaReceivingOption(
    val bankProfileId: String,
    val displayName: String,
    val country: String
)

object WestAfricaReceivingCatalog {
    val wallets: List<WestAfricaReceivingOption> = listOf(
        WestAfricaReceivingOption("orange_money_sn", "Orange Money", "Sénégal"),
        WestAfricaReceivingOption("wave_sn", "Wave", "Sénégal"),
        WestAfricaReceivingOption("free_money_sn", "Free Money", "Sénégal"),
        WestAfricaReceivingOption("wizall_sn", "Wizall", "Sénégal"),
        WestAfricaReceivingOption("orange_money_ci", "Orange Money", "Côte d'Ivoire"),
        WestAfricaReceivingOption("mtn_momo_ci", "MTN MoMo", "Côte d'Ivoire"),
        WestAfricaReceivingOption("moov_money_ci", "Moov Money", "Côte d'Ivoire"),
        WestAfricaReceivingOption("djamo_ci", "Djamo", "Côte d'Ivoire"),
        WestAfricaReceivingOption("ecobank_ci", "Ecobank", "Côte d'Ivoire"),
        WestAfricaReceivingOption("sg_connect_ci", "SG Connect", "Côte d'Ivoire")
    )

    fun byId(bankProfileId: String): WestAfricaReceivingOption? =
        wallets.firstOrNull { it.bankProfileId == bankProfileId }

    val bankProfileIds: Set<String> = wallets.map { it.bankProfileId }.toSet()
}
