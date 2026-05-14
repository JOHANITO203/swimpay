package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumDesignGuardrailsTest {
    private val premiumUiRoot = File("src/main/java/com/swimpay/receiver/ui/premium")

    @Test
    fun premiumUiMustNotContainSwimvpnSpecificBranding() {
        val corpus = premiumUiRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { it.readText() }
        assertFalse(corpus.contains("swimvpn", ignoreCase = true))
    }

    @Test
    fun onboardingMustUsePremiumSemanticTransferIcons() {
        val source = File(premiumUiRoot, "PremiumOnboardingScreens.kt").readText()
        assertTrue(source.contains("PremiumIcons.CardTransfer"))
        assertTrue(source.contains("PremiumIcons.PhoneTransfer"))
        assertFalse(source.contains("ReceivingMethodOption(\n            icon = Icons.Default.ShoppingCart"))
    }

    @Test
    fun reviewAndDashboardMustUseSharedReviewStatusIconography() {
        val reviewSource = File(premiumUiRoot, "PremiumReviewScreens.kt").readText()
        assertTrue(reviewSource.contains("PremiumIcons.ToConfirm"))
        assertTrue(reviewSource.contains("PremiumIcons.Confirmed"))
        assertTrue(reviewSource.contains("PremiumIcons.Rejected"))
    }

    @Test
    fun reviewsFilterShouldUseCardSegmentStyle() {
        val reviewSource = File(premiumUiRoot, "PremiumReviewScreens.kt").readText()
        assertTrue(reviewSource.contains("StatusChip(\""))
        assertTrue(reviewSource.contains("PremiumCard("))
        assertFalse(reviewSource.contains("Modifier.weight(filter.weight)"))
    }

    @Test
    fun settingsAndSupportMustUseSharedPremiumIconography() {
        val dashboardSource = File(premiumUiRoot, "PremiumDashboardScreens.kt").readText()
        assertTrue(dashboardSource.contains("PremiumSettingsRow(PremiumIcons.Bank"))
        assertTrue(dashboardSource.contains("PremiumSettingsRow(PremiumIcons.CardTransfer"))
        assertTrue(dashboardSource.contains("PremiumSettingsRow(PremiumIcons.ConnectedSite"))
        assertTrue(dashboardSource.contains("PremiumSettingsRow(PremiumIcons.Support"))
        assertTrue(dashboardSource.contains("SettingsChoiceRow(PremiumIcons.Support"))
        assertTrue(dashboardSource.contains("SettingsChoiceRow(PremiumIcons.Language"))
    }

    @Test
    fun premiumSubscreensMustUseUnifiedIntroComponent() {
        val dashboardSource = File(premiumUiRoot, "PremiumDashboardScreens.kt").readText()
        assertTrue(dashboardSource.contains("private fun PremiumSubscreenIntro("))
        assertTrue(dashboardSource.contains("title = \"Contacter le support\""))
        assertTrue(dashboardSource.contains("title = \"Securite\""))
        assertTrue(dashboardSource.contains("icon = PremiumIcons.HelpCenter"))
    }

    @Test
    fun accountEntryMustUseSharedSecurityIconography() {
        val accountEntrySource = File(premiumUiRoot, "PremiumAccountEntryScreens.kt").readText()
        assertTrue(accountEntrySource.contains("PremiumIcons.Security"))
        assertFalse(accountEntrySource.contains("Icons.Default.Security"))
    }
}
