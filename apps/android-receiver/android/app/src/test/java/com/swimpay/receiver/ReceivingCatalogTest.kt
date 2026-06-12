package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.ReceivingCatalog
import com.swimpay.receiver.ui.premium.ReceivingRegion
import com.swimpay.receiver.ui.premium.PremiumReceivingMethodBankCatalog
import com.swimpay.receiver.ui.premium.WestAfricaReceivingCatalog
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * T1 — unified ReceivingCatalog: single source of truth across RU / WEST_AFRICA /
 * INTERNATIONAL. The catalog must aggregate BankTargetLock (RU + INT + the MTN
 * receiver package) with WestAfricaReceivingCatalog (the package-less WA wallets
 * Wave / Orange Money), without re-declaring bank facts and without duplicating
 * MTN (which lives in both source objects).
 */
class ReceivingCatalogTest {

    private val all get() = ReceivingCatalog.allMethods
    private fun id(bankProfileId: String) = all.first { it.bankProfileId == bankProfileId }

    @Test
    fun allMethodsCoversEveryRuBankEveryIntNeobankAndEveryWaWalletWithoutMtnDuplicate() {
        val ids = all.map { it.bankProfileId }

        // Every RU bank from BankTargetLock.
        val ruIds = listOf("sber_ru", "tbank_ru", "vtb_ru", "alfa_ru", "gazprombank_ru", "ozon_bank")
        ruIds.forEach { assertTrue("missing RU id $it", ids.contains(it)) }

        // Every INTERNATIONAL neobank.
        val intIds = listOf("wise_int", "revolut_int", "payoneer_int")
        intIds.forEach { assertTrue("missing INT id $it", ids.contains(it)) }

        // Every WEST_AFRICA wallet — including wave_ci / orange_money_ci which were
        // ABSENT from the onboarding catalog before unification.
        val waIds = listOf("wave_ci", "orange_money_ci", "mtn_momo_ci")
        waIds.forEach { assertTrue("missing WA id $it", ids.contains(it)) }

        // No duplicate ids (mtn_momo_ci lives in BOTH sources — must appear once).
        assertEquals("catalog ids must be unique", ids.distinct().size, ids.size)
        assertEquals("mtn_momo_ci must appear exactly once", 1, ids.count { it == "mtn_momo_ci" })

        // Total = 6 RU + 3 WA + 3 INT = 12 distinct receiving methods.
        assertEquals(12, all.size)
        assertEquals(6, ReceivingCatalog.byRegion(ReceivingRegion.RU).size)
        assertEquals(3, ReceivingCatalog.byRegion(ReceivingRegion.WEST_AFRICA).size)
        assertEquals(3, ReceivingCatalog.byRegion(ReceivingRegion.INTERNATIONAL).size)
    }

    @Test
    fun regionAndMethodTypeTaggingIsCorrectAcrossAllThreeRegions() {
        // RU banks → RU region, card rail.
        assertEquals(ReceivingRegion.RU, id("sber_ru").region)
        assertEquals(ReceivingMethodType.CARD_TRANSFER, id("sber_ru").methodType)

        // Neobanks → INTERNATIONAL, card rail.
        assertEquals(ReceivingRegion.INTERNATIONAL, id("wise_int").region)
        assertEquals(ReceivingRegion.INTERNATIONAL, id("revolut_int").region)
        assertEquals(ReceivingRegion.INTERNATIONAL, id("payoneer_int").region)
        assertEquals(ReceivingMethodType.CARD_TRANSFER, id("revolut_int").methodType)

        // WA wallets → WEST_AFRICA, mobile money.
        assertEquals(ReceivingRegion.WEST_AFRICA, id("wave_ci").region)
        assertEquals(ReceivingRegion.WEST_AFRICA, id("orange_money_ci").region)
        assertEquals(ReceivingRegion.WEST_AFRICA, id("mtn_momo_ci").region)
        assertEquals(ReceivingMethodType.MOBILE_MONEY, id("wave_ci").methodType)
        assertEquals(ReceivingMethodType.MOBILE_MONEY, id("mtn_momo_ci").methodType)
    }

    @Test
    fun displayNamesComeFromTheExistingSourcesNotReDeclared() {
        assertEquals("Sberbank", id("sber_ru").displayName)
        assertEquals("Wise", id("wise_int").displayName)
        assertEquals("Wave", id("wave_ci").displayName)
        assertEquals("Orange Money", id("orange_money_ci").displayName)
        assertEquals("MTN MoMo", id("mtn_momo_ci").displayName)
    }

    @Test
    fun notificationPackageComesFromBankTargetLockAndIsNullForPackagelessWaWallets() {
        // MTN's receiver package is the real one from BankTargetLock (not redeclared).
        assertEquals("mtnft.momo.consumer", id("mtn_momo_ci").notificationPackage)
        assertEquals("ru.sberbankmobile", id("sber_ru").notificationPackage)
        assertEquals("com.transferwise.android", id("wise_int").notificationPackage)
        // Wave / Orange Money CI have no receiver notification package yet (manual model).
        assertNull(id("wave_ci").notificationPackage)
        assertNull(id("orange_money_ci").notificationPackage)
    }

    @Test
    fun packagesForDerivesAllowlistFromSelectedMethodIdsReusingBankTargetLock() {
        // A single chosen RU bank → its package.
        assertEquals(setOf("ru.sberbankmobile"), ReceivingCatalog.packagesFor(setOf("sber_ru")))

        // MTN → primary AND alternate package (the allowlist must accept both, exactly
        // as BankTargetLock.enabledPackages would).
        val mtnPkgs = ReceivingCatalog.packagesFor(setOf("mtn_momo_ci"))
        assertTrue(mtnPkgs.contains("mtnft.momo.consumer"))
        assertTrue(mtnPkgs.contains("com.consumerug"))

        // A package-less WA wallet contributes nothing to the allowlist.
        assertEquals(emptySet<String>(), ReceivingCatalog.packagesFor(setOf("wave_ci")))

        // Mixed selection unions packages and ignores package-less wallets.
        val mixed = ReceivingCatalog.packagesFor(setOf("sber_ru", "wave_ci", "wise_int"))
        assertEquals(setOf("ru.sberbankmobile", "com.transferwise.android"), mixed)

        // Unknown ids are ignored.
        assertEquals(emptySet<String>(), ReceivingCatalog.packagesFor(setOf("does_not_exist")))
    }

    @Test
    fun catalogAggregatesTheTwoExistingSourceObjectsAsSingleSourceOfTruth() {
        // Every WA wallet id from the existing WA source is present in the unified catalog.
        WestAfricaReceivingCatalog.bankProfileIds.forEach { waId ->
            assertTrue("WA id $waId must be in unified catalog", all.any { it.bankProfileId == waId })
        }
        // The legacy onboarding surface (availableBanks) stays a STRICT SUBSET of the
        // unified catalog — proving the unified catalog is additive, never narrower.
        val unifiedIds = all.map { it.bankProfileId }.toSet()
        PremiumReceivingMethodBankCatalog.availableBanks.forEach { option ->
            assertTrue(unifiedIds.contains(option.bankProfileId))
        }
        // And the unified catalog adds exactly the WA wallets that availableBanks lacked.
        val legacyIds = PremiumReceivingMethodBankCatalog.availableBanks.map { it.bankProfileId }.toSet()
        assertFalse(legacyIds.contains("wave_ci"))
        assertFalse(legacyIds.contains("orange_money_ci"))
        assertTrue(unifiedIds.contains("wave_ci"))
        assertTrue(unifiedIds.contains("orange_money_ci"))
    }

    @Test
    fun legacyAvailableBanksApiIsUnchangedByUnification() {
        // T1 is additive: the onboarding/receiving consumers see exactly the same list.
        assertEquals(
            listOf("Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Gazprombank", "Ozon Банк", "MTN MoMo", "Wise", "Revolut", "Payoneer"),
            PremiumReceivingMethodBankCatalog.availableBanks.map { it.displayName }
        )
    }
}
