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
    val country: String,
    /** Brand-color ARGB used for the vector wallet badge. */
    val brandArgb: Long,
    /** Short monogram drawn on the badge. */
    val monogram: String,
    /** When true, the badge uses dark ink (light brand colors like MTN yellow / Wave cyan). */
    val darkInk: Boolean = false
)

object WestAfricaReceivingCatalog {
    val wallets: List<WestAfricaReceivingOption> = listOf(
        WestAfricaReceivingOption("orange_money_sn", "Orange Money", "Sénégal", 0xFFFF7900, "OM"),
        WestAfricaReceivingOption("wave_sn", "Wave", "Sénégal", 0xFF1DC8FF, "W", darkInk = true),
        WestAfricaReceivingOption("free_money_sn", "Free Money", "Sénégal", 0xFFD6122B, "F"),
        WestAfricaReceivingOption("wizall_sn", "Wizall", "Sénégal", 0xFF00A86B, "Wz"),
        WestAfricaReceivingOption("orange_money_ci", "Orange Money", "Côte d'Ivoire", 0xFFFF7900, "OM"),
        WestAfricaReceivingOption("mtn_momo_ci", "MTN MoMo", "Côte d'Ivoire", 0xFFFFCB05, "MTN", darkInk = true),
        WestAfricaReceivingOption("moov_money_ci", "Moov Money", "Côte d'Ivoire", 0xFF2B6CB0, "M"),
        WestAfricaReceivingOption("djamo_ci", "Djamo", "Côte d'Ivoire", 0xFF6C5CE7, "Dj"),
        WestAfricaReceivingOption("ecobank_ci", "Ecobank", "Côte d'Ivoire", 0xFF004A8F, "Eco"),
        WestAfricaReceivingOption("sg_connect_ci", "SG Connect", "Côte d'Ivoire", 0xFFE60028, "SG")
    )

    fun byId(bankProfileId: String): WestAfricaReceivingOption? =
        wallets.firstOrNull { it.bankProfileId == bankProfileId }

    val bankProfileIds: Set<String> = wallets.map { it.bankProfileId }.toSet()
}
