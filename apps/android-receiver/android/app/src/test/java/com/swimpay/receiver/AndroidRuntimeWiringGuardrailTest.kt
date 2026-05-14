package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidRuntimeWiringGuardrailTest {
    private val premiumRoot = File("src/main/java/com/swimpay/receiver/ui/premium")

    @Test
    fun runtimeScreensMustNotForcePreviewFixturesForDebugOrStaging() {
        val dashboard = File(premiumRoot, "PremiumDashboardScreens.kt").readText(Charsets.UTF_8)
        val reviews = File(premiumRoot, "PremiumReviewScreens.kt").readText(Charsets.UTF_8)

        assertFalse(dashboard.contains("BuildConfig.BUILD_TYPE == \"debug\""))
        assertFalse(dashboard.contains("BuildConfig.BUILD_TYPE == \"staging\""))
        assertFalse(dashboard.contains("PremiumScreenState.content(premiumConnectedSitePreviewState())"))
        assertFalse(dashboard.contains("PremiumScreenState.content(premiumReceivingMethodsPreviewState())"))
        assertFalse(dashboard.contains("PremiumScreenState.content(premiumReceiverHealthPreviewState())"))
        assertFalse(reviews.contains("BuildConfig.BUILD_TYPE == \"debug\""))
        assertFalse(reviews.contains("BuildConfig.BUILD_TYPE == \"staging\""))
        assertFalse(reviews.contains("val visualState ="))
    }

    @Test
    fun runtimeIntegrationViewsMustUseHonestFallbacksInsteadOfMerchantExampleData() {
        val source = File(premiumRoot, "PremiumDashboardScreens.kt").readText(Charsets.UTF_8)
        val listCard = source.section("private fun IntegrationListPrimaryCard", "@Composable\nfun PremiumConnectedSiteStateScreen")
        val detail = source.section("private fun PremiumConnectedSiteMockDetail", "@Composable\nprivate fun IntegrationDetailValueRow")

        listOf(listCard, detail).forEach { runtimeSection ->
            assertFalse(runtimeSection.contains("merchant.example"))
            assertFalse(runtimeSection.contains("sp_live_********"))
            assertFalse(runtimeSection.contains("whsec_********"))
            assertFalse(runtimeSection.contains("98.6%"))
            assertFalse(runtimeSection.contains("200 OK"))
        }

        assertTrue(detail.contains("Webhook non configuré"))
        assertTrue(detail.contains("Aucune livraison récente disponible"))
    }

    @Test
    fun securitySettingsMustNotShowFakeDevicesOrFakeIps() {
        val source = File(premiumRoot, "PremiumDashboardScreens.kt").readText(Charsets.UTF_8)
        val section = source.section("Sessions & appareils", "Confidentialité")

        assertFalse(section.contains("Pixel 7 Pro"))
        assertFalse(section.contains("Windows"))
        assertFalse(section.contains("176.59"))
        assertFalse(section.contains("2 actives"))
        assertTrue(section.contains("Session locale"))
        assertTrue(section.contains("Gestion des sessions indisponible"))
    }

    @Test
    fun dashboardOfflineMetricsMustNotPretendZeroLoadedRevenue() {
        val source = File(premiumRoot, "PremiumMerchantRuntime.kt").readText(Charsets.UTF_8)
        val fallback = source.section("private fun livelyDashboardFallback", "private fun receivingMethodsDashboardValue")
        val metrics = source.section("private fun dashboardMetricCards", "private fun formatDashboardChartAmount")

        assertFalse(fallback.contains("monthlyAmount = \"0 RUB\""))
        assertTrue(fallback.contains("monthlyAmount = \"Données indisponibles\""))
        assertTrue(metrics.contains("if (summary == null)"))
        assertTrue(metrics.contains("PremiumMetricUiState(\"—\", \"À confirmer\")"))
    }
}

private fun String.section(start: String, end: String): String {
    val startIndex = indexOf(start)
    val endIndex = indexOf(end, startIndex.coerceAtLeast(0))
    require(startIndex >= 0) { "Missing section start: $start" }
    require(endIndex > startIndex) { "Missing section end: $end" }
    return substring(startIndex, endIndex)
}
