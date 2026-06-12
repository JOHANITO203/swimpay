package com.swimpay.receiver.ui.premium

import com.swimpay.receiver.BankTargetLock
import com.swimpay.receiver.ReceivingMethodType

data class PremiumReceivingMethodBankOption(
    val bankProfileId: String,
    val displayName: String,
    val configurable: Boolean = true
)

object PremiumReceivingMethodBankCatalog {
    val availableBanks: List<PremiumReceivingMethodBankOption> = BankTargetLock.supportedTargets.map {
        PremiumReceivingMethodBankOption(
            bankProfileId = it.bankProfileId,
            displayName = it.displayName
        )
    }
}

/** Region a receiving method belongs to in the unified catalog. */
enum class ReceivingRegion {
    RU,
    WEST_AFRICA,
    INTERNATIONAL
}

/**
 * One entry in the unified receiving-method catalog. Carries the stable id
 * ([bankProfileId]), the merchant-facing [displayName], its [region], the
 * receiving [methodType], and the [notificationPackage] used to derive the
 * notification allowlist. [notificationPackage] is null for wallets that have no
 * receiver notification capture yet (e.g. Wave / Orange Money CI — manual model).
 * The official logo is derived from [bankProfileId] by the existing
 * bankIconResource() mapping; the entry intentionally exposes the id rather than
 * an Int resource so this stays free of an Android R reference.
 */
data class ReceivingMethodCatalogEntry(
    val bankProfileId: String,
    val displayName: String,
    val region: ReceivingRegion,
    val methodType: ReceivingMethodType,
    val notificationPackage: String?
)

/**
 * T1 — Unified receiving-method catalog (single source of truth, all regions).
 *
 * Aggregates the two previously split sources behind one surface:
 *  - [BankTargetLock.supportedTargets] → RU banks, INTERNATIONAL neobanks, and the
 *    MTN MoMo CI wallet (which carries the real receiver notification package), and
 *  - [WestAfricaReceivingCatalog.wallets] → the package-less WA wallets (Wave,
 *    Orange Money CI) that BankTargetLock does not list.
 *
 * It does NOT re-declare any bank fact: ids, names and packages are read from the
 * existing source objects. `mtn_momo_ci` exists in both sources; it is taken from
 * BankTargetLock (which holds its notification package) and the WA source is only
 * consulted for the wallets BankTargetLock lacks, so the entry is never duplicated.
 *
 * This is purely ADDITIVE: [PremiumReceivingMethodBankCatalog.availableBanks] and
 * its current consumers (onboarding, receiving screens) are unchanged. T2 will
 * migrate those consumers onto this catalog.
 */
object ReceivingCatalog {

    private fun regionFor(bankProfileId: String): ReceivingRegion = when {
        bankProfileId.endsWith("_int") -> ReceivingRegion.INTERNATIONAL
        bankProfileId in WestAfricaReceivingCatalog.bankProfileIds -> ReceivingRegion.WEST_AFRICA
        else -> ReceivingRegion.RU
    }

    private fun methodTypeFor(region: ReceivingRegion): ReceivingMethodType = when (region) {
        ReceivingRegion.WEST_AFRICA -> ReceivingMethodType.MOBILE_MONEY
        ReceivingRegion.RU, ReceivingRegion.INTERNATIONAL -> ReceivingMethodType.CARD_TRANSFER
    }

    val allMethods: List<ReceivingMethodCatalogEntry> = buildList {
        // 1) Everything BankTargetLock knows (RU + INT + MTN with its real package).
        for (target in BankTargetLock.supportedTargets) {
            val region = regionFor(target.bankProfileId)
            add(
                ReceivingMethodCatalogEntry(
                    bankProfileId = target.bankProfileId,
                    displayName = target.displayName,
                    region = region,
                    methodType = methodTypeFor(region),
                    notificationPackage = target.packageName
                )
            )
        }
        // 2) WA wallets BankTargetLock does not list (Wave, Orange Money CI). These
        //    have no receiver notification capture yet → notificationPackage = null.
        val alreadyCovered = BankTargetLock.supportedTargets.map { it.bankProfileId }.toSet()
        for (wallet in WestAfricaReceivingCatalog.wallets) {
            if (wallet.bankProfileId in alreadyCovered) continue
            add(
                ReceivingMethodCatalogEntry(
                    bankProfileId = wallet.bankProfileId,
                    displayName = wallet.displayName,
                    region = ReceivingRegion.WEST_AFRICA,
                    methodType = ReceivingMethodType.MOBILE_MONEY,
                    notificationPackage = null
                )
            )
        }
    }

    fun byRegion(region: ReceivingRegion): List<ReceivingMethodCatalogEntry> =
        allMethods.filter { it.region == region }

    /**
     * Notification allowlist derivation T2 reuses: the notification package names
     * for a set of chosen method ids. Delegates to [BankTargetLock] so the result
     * includes a target's primary AND alternate packages (e.g. MTN MoMo CI ships as
     * com.consumerug on real devices) — exactly the set BankTargetLock would allow.
     * Package-less WA wallets (Wave, Orange Money CI) and unknown ids contribute
     * nothing.
     */
    fun packagesFor(selectedIds: Set<String>): Set<String> =
        BankTargetLock.supportedTargets
            .filter { it.bankProfileId in selectedIds }
            .flatMap { listOf(it.packageName) + it.alternatePackageNames }
            .toSet()
}
