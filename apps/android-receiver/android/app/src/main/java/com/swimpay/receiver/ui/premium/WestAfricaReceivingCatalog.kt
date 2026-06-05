package com.swimpay.receiver.ui.premium

/**
 * West Africa (UEMOA / XOF) mobile money receiving wallets — the Android mirror
 * of the backend WestAfricaReceiverBankProfiles. Used by the WA receiving
 * sub-screen so a merchant can add a mobile money receiving method. Ids match the
 * backend bank_profile_id exactly (validated server-side).
 * Reduced 2026-06-05 to the Côte d'Ivoire trio mirroring the backend registry reduction.
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
        WestAfricaReceivingOption("wave_ci", "Wave", "Côte d'Ivoire", 0xFF1DC8FF, "W", darkInk = true),
        WestAfricaReceivingOption("orange_money_ci", "Orange Money", "Côte d'Ivoire", 0xFFFF7900, "OM"),
        WestAfricaReceivingOption("mtn_momo_ci", "MTN MoMo", "Côte d'Ivoire", 0xFFFFCB05, "MTN", darkInk = true)
    )

    fun byId(bankProfileId: String): WestAfricaReceivingOption? =
        wallets.firstOrNull { it.bankProfileId == bankProfileId }

    val bankProfileIds: Set<String> = wallets.map { it.bankProfileId }.toSet()
}
