package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantVisualArchitectureTest {
    @Test
    fun visualLayerHasSeparatedScreensAndPremiumFintechTokens() {
        assertEquals(AndroidMerchantColors.DEEP_NAVY, AndroidMerchantColors.DEEP_NAVY)
        assertEquals(AndroidMerchantColors.TEAL, AndroidMerchantColors.TEAL)
        assertEquals(AndroidMerchantColors.CYAN, AndroidMerchantColors.CYAN)
        assertEquals(28, AndroidMerchantSpacing.CARD_RADIUS_DP)
        assertEquals(22, AndroidMerchantSpacing.BUTTON_RADIUS_DP)

        val screens = AndroidMerchantVisualScreen.entries.map { it.name }
        assertTrue(screens.containsAll(listOf(
            "WELCOME",
            "CONNECT_PHONE",
            "CHOOSE_BANKS",
            "ADD_RECEIVING_METHOD",
            "TEST_CONFIGURATION",
            "DASHBOARD",
            "RECEIVING_METHODS",
            "REVIEW_QUEUE",
            "PAYMENT_DETAIL",
            "CONNECTED_SITE",
            "RECEIVER_HEALTH"
        )))
    }

    @Test
    fun mainActivityDelegatesVisualRenderingToComposeScreens() {
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val premiumComponents = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumReviews = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt").readText()
        val readiness = File("src/main/java/com/swimpay/receiver/ReceiverOnboardingReadiness.kt").readText()
        val theme = File("src/main/java/com/swimpay/receiver/ui/theme/Theme.kt").readText()

        assertTrue(mainActivity.contains("setContent"))
        assertTrue(mainActivity.contains("PremiumMerchantRuntime.forAppBuild()"))
        assertTrue(mainActivity.contains("PremiumMerchantApp("))
        assertTrue(mainActivity.contains("NotificationAccessStatusReader"))
        assertTrue(mainActivity.contains("SharedPreferencesPremiumOnboardingStateStore"))
        assertTrue(premiumApp.contains("fun PremiumMerchantApp("))
        assertTrue(premiumApp.contains("PremiumOnboardingNavigation.initialRoute"))
        assertTrue(premiumApp.contains("markCompleted"))
        assertFalse(premiumApp.contains("""mutableStateOf("landing")"""))
        assertTrue(premiumOnboarding.contains("fun PremiumLandingScreen"))
        assertTrue(premiumOnboarding.contains("fun PremiumOnboardingFlow"))
        assertTrue(premiumOnboarding.contains("openNotificationSettings"))
        assertTrue(premiumOnboarding.contains("OUVRIR LES REGLAGES NOTIFICATIONS"))
        assertTrue(premiumOnboarding.contains("Cherchez SwimPay"))
        assertTrue(premiumOnboarding.contains("Revenez dans SwimPay"))
        assertTrue(readiness.contains("Settings.EXTRA_APP_PACKAGE"))
        assertTrue(mainActivity.contains("NotificationListenerSettingsAction.createIntent(packageName)"))
        assertFalse(premiumOnboarding.contains("paiements automatiques", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("Policy Engine", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("AI (EXPERT)", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("ALGORITHME DE CONFIANCE", ignoreCase = true))
        assertTrue(premiumComponents.contains("fun PremiumAppShell"))
        assertTrue(premiumComponents.contains("fun PremiumBottomNav"))
        assertTrue(premiumDashboard.contains("fun PremiumDashboardScreen"))
        assertTrue(premiumReviews.contains("fun PremiumReviewsScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumOrdersScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumSettingsScreen"))
        assertTrue(theme.contains("fun SwimPayMerchantTheme("))
    }

    @Test
    fun visualMerchantModelDoesNotExposeForbiddenPublicWording() {
        val merchantText = AndroidMerchantUiCatalog().merchantFacingScreens(includeDeveloperDetails = false)
            .flatMap { it.visibleTexts() }
            .joinToString("\n")

        MerchantUiLanguageContract.forbiddenMerchantFacingTerms.forEach { term ->
            assertFalse("merchant visual UI exposed forbidden term $term", merchantText.contains(term, ignoreCase = true))
        }
        assertFalse(merchantText.contains("confirmation bancaire officielle", ignoreCase = true))
        assertFalse(merchantText.contains("auto-confirm", ignoreCase = true))
    }
}
