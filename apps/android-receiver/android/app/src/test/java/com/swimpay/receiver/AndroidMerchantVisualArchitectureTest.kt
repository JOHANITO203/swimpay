package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantVisualArchitectureTest {
    @Test
    fun premiumUiIsTheOnlyAndroidMerchantVisualSourceOfTruth() {
        val premiumDir = File("src/main/java/com/swimpay/receiver/ui/premium")
        val legacyScreensDir = File("src/main/java/com/swimpay/receiver/ui/screens")
        val legacyRenderer = File("src/main/java/com/swimpay/receiver/AndroidMerchantScreenRenderer.kt")
        val legacyViewComponents = File("src/main/java/com/swimpay/receiver/AndroidMerchantViewComponents.kt")
        val legacyVisualDesign = File("src/main/java/com/swimpay/receiver/AndroidMerchantVisualDesign.kt")

        assertTrue(premiumDir.exists())
        assertTrue(File(premiumDir, "PremiumMerchantApp.kt").exists())
        assertTrue(File(premiumDir, "PremiumComponents.kt").exists())
        assertTrue(File(premiumDir, "PremiumOnboardingScreens.kt").exists())
        assertTrue(File(premiumDir, "PremiumDashboardScreens.kt").exists())
        assertTrue(File(premiumDir, "PremiumReviewScreens.kt").exists())
        assertTrue(File(premiumDir, "PremiumDesignTokens.kt").exists())
        val legacyScreenFiles = if (legacyScreensDir.exists()) {
            legacyScreensDir.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
        } else {
            emptyList()
        }
        assertTrue("legacy ui/screens package must not contain Kotlin visual files", legacyScreenFiles.isEmpty())
        assertFalse("legacy renderer must be removed", legacyRenderer.exists())
        assertFalse("legacy view components must be removed", legacyViewComponents.exists())
        assertFalse("legacy visual design must be removed", legacyVisualDesign.exists())
    }

    @Test
    fun mainActivityDelegatesVisualRenderingToComposeScreens() {
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val premiumComponents = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumReviews = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt").readText()
        val premiumRuntime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()
        val readiness = File("src/main/java/com/swimpay/receiver/ReceiverOnboardingReadiness.kt").readText()
        val theme = File("src/main/java/com/swimpay/receiver/ui/theme/Theme.kt").readText()

        assertTrue(mainActivity.contains("setContent"))
        assertTrue(mainActivity.contains("PremiumMerchantRuntime.forAppBuild()"))
        assertTrue(mainActivity.contains("PremiumMerchantApp("))
        assertTrue(mainActivity.contains("NotificationAccessStatusReader"))
        assertTrue(mainActivity.contains("SharedPreferencesPremiumOnboardingStateStore"))
        assertTrue(premiumApp.contains("fun PremiumMerchantApp("))
        assertTrue(premiumApp.contains("PremiumNavigation.initialRoute"))
        assertTrue(premiumApp.contains("PremiumRoute.PaymentDetail"))
        assertTrue(premiumApp.contains("PremiumMainTab.Home"))
        assertFalse(premiumApp.contains("mutableIntStateOf"))
        assertFalse(premiumApp.contains("route =="))
        assertFalse(premiumApp.contains("""route = "payment_detail""""))
        assertTrue(premiumApp.contains("markCompleted"))
        assertFalse(premiumApp.contains("""mutableStateOf("landing")"""))
        assertFalse(premiumApp.contains("AndroidMerchantScreenRenderer"))
        assertFalse(premiumApp.contains("AndroidMerchantViewComponents"))
        assertFalse(premiumApp.contains("ui.screens"))
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
        assertTrue(premiumComponents.contains("PremiumMainTab.Home"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Reviews"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Orders"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Menu"))
        assertTrue(premiumComponents.contains("fun <T> PremiumStatePanel"))
        assertTrue(premiumDashboard.contains("fun PremiumDashboardScreen"))
        assertTrue(premiumReviews.contains("fun PremiumReviewsScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumOrdersScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumSettingsScreen"))
        assertTrue(premiumReviews.contains("onConfirm"))
        assertTrue(premiumReviews.contains("onRejectSignal"))
        assertTrue(premiumReviews.contains("onRejectOrder"))
        assertTrue(premiumRuntime.contains("fun rejectSignal"))
        assertTrue(premiumRuntime.contains("fun rejectOrder"))
        assertTrue(premiumRuntime.contains("fun disconnected()"))
        assertTrue(premiumRuntime.contains("NoopMerchantApiTransport"))
        assertFalse(premiumRuntime.contains("sendsDeveloperWebhookDirectly = true"))
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

    @Test
    fun premiumSourceDoesNotExposeRawPiiSecretsOrOfficialBankConfirmationClaims() {
        val premiumText = File("src/main/java/com/swimpay/receiver/ui/premium")
            .walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { it.readText() }

        val forbiddenPublicTerms = listOf(
            "package/cert",
            "TO_VERIFY",
            "approved_for_review_only",
            "webhook_secret",
            "raw notification",
            "raw_notification",
            "confirmation bancaire officielle",
            "bank_confirmed",
            "psp_confirmed",
            "guaranteed_payment"
        )

        forbiddenPublicTerms.forEach { term ->
            assertFalse("premium UI exposed forbidden term $term", premiumText.contains(term, ignoreCase = true))
        }
        assertFalse(premiumText.contains("official_bank_confirmation = true", ignoreCase = true))
        assertFalse(premiumText.contains("2200123412344821"))
        assertFalse(premiumText.contains("+79991234567"))
    }
}
