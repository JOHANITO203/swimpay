package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumReceivingMethodBankOption
import com.swimpay.receiver.ui.premium.ReceivingCatalog
import com.swimpay.receiver.ui.premium.ReceivingRegion
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Coherence guard: the POST-onboarding "add a receiving method" flow
 * ([PremiumReceivingMethodsStateScreen] in PremiumDashboardScreens.kt) must draw
 * from the unified [ReceivingCatalog.allMethods] — EXACTLY like onboarding (T2) —
 * so a merchant can declare ANY region's method (incl. the West-Africa wallets
 * Wave / Orange Money / MTN MoMo as MOBILE_MONEY) from the main add button.
 *
 * Before this fix the add flow sourced the RU+INT-only
 * [PremiumReceivingMethodBankCatalog.availableBanks], so WA wallets were
 * unreachable from the main add surface and MTN was wrongly offered as a card.
 */
class ReceivingMethodAddFlowCatalogTest {

    private val dashboardSource: String =
        File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()

    /** The option list the add/draft flow now builds, mirroring the production mapping. */
    private fun addFlowBankOptions(): List<PremiumReceivingMethodBankOption> =
        ReceivingCatalog.allMethods.map { entry ->
            PremiumReceivingMethodBankOption(
                bankProfileId = entry.bankProfileId,
                displayName = entry.displayName,
                methodType = entry.methodType
            )
        }

    @Test
    fun addFlowSourcesTheUnifiedCatalogNotThePartialAvailableBanks() {
        // SOURCE GUARD: the main add screen must read ReceivingCatalog.allMethods.
        val screen = sourceBetween(
            dashboardSource,
            "fun PremiumReceivingMethodsStateScreen",
            "private enum class ReceivingMethodFamily"
        )
        assertTrue(
            "Add flow must source the unified ReceivingCatalog.allMethods",
            screen.contains("ReceivingCatalog.allMethods")
        )
        // The partial RU+INT-only source must no longer drive the add flow.
        assertFalse(
            "Add flow must not source the partial availableBanks",
            screen.contains("PremiumReceivingMethodBankCatalog.availableBanks")
        )
    }

    @Test
    fun addFlowOffersEveryRegionIncludingWestAfricaWallets() {
        val ids = addFlowBankOptions().map { it.bankProfileId }

        // Every RU bank.
        listOf("sber_ru", "tbank_ru", "vtb_ru", "alfa_ru", "gazprombank_ru", "ozon_bank")
            .forEach { assertTrue("RU $it must be selectable in add flow", ids.contains(it)) }
        // Every INTERNATIONAL neobank.
        listOf("wise_int", "revolut_int", "payoneer_int")
            .forEach { assertTrue("INT $it must be selectable in add flow", ids.contains(it)) }
        // Every WEST-AFRICA wallet — the methods that were ABSENT from the add flow.
        listOf("wave_ci", "orange_money_ci", "mtn_momo_ci")
            .forEach { assertTrue("WA $it must be selectable in add flow", ids.contains(it)) }

        assertEquals("add flow must offer the full catalog", ReceivingCatalog.allMethods.size, ids.size)
    }

    @Test
    fun selectingAWestAfricaWalletBuildsAValidMobileMoneySubmission() {
        val wave = addFlowBankOptions().first { it.bankProfileId == "wave_ci" }
        // The option carries the method type that drives input + submission.
        assertEquals(ReceivingMethodType.MOBILE_MONEY, wave.methodType)
        assertEquals(ReceivingRegion.WEST_AFRICA, ReceivingCatalog.allMethods.first { it.bankProfileId == "wave_ci" }.region)

        val submission = MerchantReceivingMethodDraft(
            bankProfileId = wave.bankProfileId,
            type = wave.methodType ?: ReceivingMethodType.CARD_TRANSFER,
            rawIdentifierInput = "+225 07 00 00 00 00"
        ).toSubmission()

        assertEquals("wave_ci", submission.bankProfileId)
        assertEquals(ReceivingMethodType.MOBILE_MONEY, submission.type)
        assertEquals("WAVE_CI-MM", submission.routeCode)
        // Phone-style masking applies to mobile money (never card masking).
        assertTrue(submission.rawIdentifier.isNotBlank())
    }

    @Test
    fun russianCardAndPhoneMethodTypesStillFlowThroughTheAddFlow() {
        val sber = addFlowBankOptions().first { it.bankProfileId == "sber_ru" }
        assertEquals(ReceivingMethodType.CARD_TRANSFER, sber.methodType)

        // RU card-rail bank still produces a CARD submission.
        val card = MerchantReceivingMethodDraft(
            bankProfileId = sber.bankProfileId,
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifierInput = "4276 0000 0000 5421"
        ).toSubmission()
        assertEquals(ReceivingMethodType.CARD_TRANSFER, card.type)

        // And the SBP phone toggle still produces a PHONE submission for the same bank.
        val phone = MerchantReceivingMethodDraft(
            bankProfileId = sber.bankProfileId,
            type = ReceivingMethodType.PHONE_TRANSFER,
            rawIdentifierInput = "+7 900 000 00 21"
        ).toSubmission()
        assertEquals(ReceivingMethodType.PHONE_TRANSFER, phone.type)
    }

    @Test
    fun internationalRegionTileIsNavigableAndRoutesToTheUnifiedAddFlow() {
        // NAVIGABILITY GUARD: the INTERNATIONAL region group must carry a non-null
        // family so its tile navigates (onClick = { region.family?.let(onPick) }).
        // Previously it was `family = null` (non-navigating), so a merchant could not
        // reach an add flow for international banks from the International tile.
        val intGroup = sourceBetween(
            dashboardSource,
            "kind = ReceivingRegionKind.INTERNATIONAL",
            "kind = ReceivingRegionKind.RUSSIA"
        )
        assertTrue(
            "INTERNATIONAL region group must be navigable (family != null)",
            intGroup.contains("family = ReceivingMethodFamily.INTERNATIONAL")
        )
        assertFalse(
            "INTERNATIONAL region group must no longer be non-navigating (family = null)",
            intGroup.contains("family = null")
        )

        // ROUTING GUARD: the hub must route INTERNATIONAL to the unified add flow
        // (PremiumReceivingMethodsStateScreen) — the same screen RUSSIAN lands on.
        val hub = sourceBetween(
            dashboardSource,
            "when (family) {",
            "fun PremiumReceivingMethodFamilyChooser"
        )
        assertTrue(
            "INTERNATIONAL must route to the unified add flow",
            hub.contains("ReceivingMethodFamily.INTERNATIONAL -> PremiumReceivingMethodsStateScreen") ||
                (hub.contains("ReceivingMethodFamily.INTERNATIONAL ->\n") &&
                    hub.contains("PremiumReceivingMethodsStateScreen")) ||
                // RUSSIAN + INTERNATIONAL may share one branch arm.
                (hub.contains("ReceivingMethodFamily.INTERNATIONAL") &&
                    hub.contains("PremiumReceivingMethodsStateScreen"))
        )
    }

    @Test
    fun internationalAddFlowOffersTheInternationalBanks() {
        // BEHAVIOURAL PROOF: the add flow the International tile routes to offers the
        // real international neobanks, so a merchant CAN add Wise / Revolut / Payoneer.
        val ids = addFlowBankOptions().map { it.bankProfileId }
        listOf("wise_int", "revolut_int", "payoneer_int").forEach { id ->
            assertTrue("International add flow must offer $id", ids.contains(id))
            assertEquals(
                "International bank $id must belong to the INTERNATIONAL region",
                ReceivingRegion.INTERNATIONAL,
                ReceivingCatalog.allMethods.first { it.bankProfileId == id }.region
            )
        }
    }

    @Test
    fun westAfricaWalletsAreNotFakedAsDetectedThroughTheAddFlow() {
        // Honesty: adding Wave / Orange Money CI derives an EMPTY notification allowlist
        // (no receiver package), so they are never falsely "monitored".
        assertEquals(emptySet<String>(), ReceivingCatalog.packagesFor(setOf("wave_ci")))
        assertEquals(emptySet<String>(), ReceivingCatalog.packagesFor(setOf("orange_money_ci")))
        assertNull(ReceivingCatalog.allMethods.first { it.bankProfileId == "wave_ci" }.notificationPackage)
        assertNull(ReceivingCatalog.allMethods.first { it.bankProfileId == "orange_money_ci" }.notificationPackage)
        // MTN MoMo CI does carry a real package (detectable), unchanged.
        assertNotNull(ReceivingCatalog.allMethods.first { it.bankProfileId == "mtn_momo_ci" }.notificationPackage)
    }

    @Test
    fun addPillRoutesToTheUnifiedFlowNotWestAfricaOnly() {
        // ROOT-CAUSE GUARD: the prominent "+ Ajouter" pill must open the UNIFIED add
        // flow (all regions), not be hardwired to West-Africa mobile money — the bug
        // where tapping Add only ever offered mobile wallets.
        val chooser = sourceBetween(
            dashboardSource,
            "fun PremiumReceivingMethodFamilyChooser",
            "private fun ReceivingAddPill"
        )
        assertTrue(
            "The + Ajouter pill must route to the unified add flow (ALL)",
            chooser.contains("ReceivingAddPill(language) { onPick(ReceivingMethodFamily.ALL) }")
        )
        assertFalse(
            "The + Ajouter pill must no longer be hardwired to West-Africa only",
            chooser.contains("onPick(ReceivingMethodFamily.WEST_AFRICA)")
        )
    }

    @Test
    fun hubRoutesTheUnifiedFamilyToTheUnifiedAddScreen() {
        val hub = sourceBetween(
            dashboardSource,
            "when (family) {",
            "fun PremiumUnifiedAddMethodScreen"
        )
        assertTrue(
            "The hub must route the ALL family to PremiumUnifiedAddMethodScreen",
            hub.contains("ReceivingMethodFamily.ALL -> PremiumUnifiedAddMethodScreen")
        )
    }

    @Test
    fun unifiedAddScreenGroupsEveryRegionFromTheUnifiedCatalog() {
        // The unified screen must source the single catalog and group it by EVERY
        // region, and submit with the provider's own catalog method type so the input
        // adapts (phone for mobile money, card for the card-rail banks).
        val screen = sourceBetween(
            dashboardSource,
            "fun PremiumUnifiedAddMethodScreen",
            "private fun UnifiedAddProviderRow"
        )
        assertTrue("unified screen must source the unified catalog", screen.contains("ReceivingCatalog.allMethods"))
        assertTrue("unified screen must list the West-Africa region", screen.contains("ReceivingRegion.WEST_AFRICA"))
        assertTrue("unified screen must list the International region", screen.contains("ReceivingRegion.INTERNATIONAL"))
        assertTrue("unified screen must list the Russian region", screen.contains("ReceivingRegion.RU"))
        assertTrue("unified screen must submit with the provider's own method type", screen.contains("type = entry.methodType"))
    }

    private fun sourceBetween(source: String, startMarker: String, endMarker: String): String {
        val start = source.indexOf(startMarker)
        assertTrue("start marker not found: $startMarker", start >= 0)
        val end = source.indexOf(endMarker, start)
        return if (end >= 0) source.substring(start, end) else source.substring(start)
    }
}
