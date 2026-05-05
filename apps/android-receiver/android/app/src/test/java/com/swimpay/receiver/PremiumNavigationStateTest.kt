package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumMainTab
import com.swimpay.receiver.ui.premium.PremiumNavigation
import com.swimpay.receiver.ui.premium.PremiumRoute
import com.swimpay.receiver.ui.premium.PremiumScreenState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumNavigationStateTest {
    @Test
    fun premiumNavigationUsesTypedRoutesAndTabs() {
        assertEquals(PremiumRoute.Landing, PremiumNavigation.initialRoute(onboardingCompleted = false))
        assertEquals(PremiumRoute.Main(PremiumMainTab.Home), PremiumNavigation.initialRoute(onboardingCompleted = true))
        assertEquals(PremiumRoute.Main(PremiumMainTab.Home), PremiumNavigation.afterOnboarding())

        val detail = PremiumNavigation.openReview("rev_42")
        assertEquals(PremiumRoute.PaymentDetail("rev_42"), detail)
        assertEquals(PremiumRoute.Main(PremiumMainTab.Reviews), PremiumNavigation.backFromPaymentDetail())
        assertEquals(PremiumRoute.ReceivingMethods, PremiumNavigation.openReceivingMethods())
        assertEquals(PremiumRoute.Banks, PremiumNavigation.openBanks())
        assertEquals(PremiumRoute.ReceiverHealth, PremiumNavigation.openReceiverHealth())
        assertEquals(PremiumRoute.ConnectedSite, PremiumNavigation.openConnectedSite())
        assertEquals(PremiumRoute.ConfigurationTest, PremiumNavigation.openConfigurationTest())
    }

    @Test
    fun premiumTabsHaveStableMerchantLabelsAndNoInvalidFallback() {
        assertEquals(
            listOf(PremiumMainTab.Home, PremiumMainTab.Reviews, PremiumMainTab.Orders, PremiumMainTab.Menu),
            PremiumMainTab.entries
        )
        assertEquals(listOf("HOME", "REVUES", "VENTES", "MENU"), PremiumMainTab.entries.map { it.navLabel })
        assertEquals(listOf("Accueil", "Revues", "Ventes", "Menu"), PremiumMainTab.entries.map { it.accessibilityLabel })
    }

    @Test
    fun premiumScreenStatesUseSafeMerchantCopy() {
        val states = listOf(
            PremiumScreenState.loading<String>(),
            PremiumScreenState.empty("Aucun paiement à vérifier", "Les nouveaux paiements apparaîtront ici."),
            PremiumScreenState.actionRequired("Action nécessaire", "Le téléphone n’est pas connecté."),
            PremiumScreenState.error("Données indisponibles", "Réessayez dans quelques instants."),
            PremiumScreenState.offline("Hors ligne", "Vérifiez la connexion de ce téléphone.")
        )
        val rendered = states.joinToString(" ") { it.title + " " + it.message + " " + (it.actionLabel ?: "") }

        assertTrue(rendered.contains("Chargement"))
        assertTrue(rendered.contains("Aucun paiement à vérifier"))
        assertFalse(rendered.contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(rendered.contains("webhook_secret", ignoreCase = true))
        assertFalse(rendered.contains("receiver route", ignoreCase = true))
        assertFalse(rendered.contains("2200123412344821"))
        assertFalse(rendered.contains("+79991234567"))
    }
}
