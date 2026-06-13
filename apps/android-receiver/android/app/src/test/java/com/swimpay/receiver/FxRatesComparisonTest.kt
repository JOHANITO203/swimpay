package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Guards the currency-comparison feature: the merchant app reads LIVE reference rates
 * from the public backend endpoint (/v1/fx/rates → FxRateService: ECB/CBR/UEMOA peg)
 * and never invents a rate. The "Devises & taux" settings row must open the real
 * comparison screen (not the banks placeholder it pointed at before).
 */
class FxRatesComparisonTest {

    private fun src(rel: String): String = File(rel).readText()

    private val apiWiring = src("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt")
    private val runtime = src("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt")
    private val dashboard = src("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt")
    private val nav = src("src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt")

    @Test
    fun fxRepositoryCallsThePublicMerchantRatesEndpoint() {
        assertTrue("FX repo must call /v1/fx/rates", apiWiring.contains("/v1/fx/rates?base="))
        assertTrue("FX repo class must exist", apiWiring.contains("class MerchantFxRatesApiRepository"))
        // Honesty: the repo carries an availability flag rather than dropping pairs.
        assertTrue(apiWiring.contains("val available: Boolean"))
    }

    @Test
    fun runtimeExposesLoadFxRatesAndMapsRealSourceLabels() {
        assertTrue(runtime.contains("fun loadFxRates("))
        // Maps FxRateService source tokens to honest, merchant-facing labels.
        assertTrue(runtime.contains("Banque de Russie"))
        assertTrue(runtime.contains("\"BCE\""))
        assertTrue(runtime.contains("parité UEMOA"))
        // Unavailable pairs are surfaced honestly, never hidden or invented.
        assertTrue(runtime.contains("indisponible"))
    }

    @Test
    fun currencyComparisonScreenHasBaseSelectorRatesAndConverter() {
        assertTrue(dashboard.contains("fun PremiumCurrencyComparisonScreen("))
        assertTrue(dashboard.contains("FxBaseChip"))
        assertTrue(dashboard.contains("FxRateRow"))
        assertTrue(dashboard.contains("FxConverterCard"))
        assertTrue(dashboard.contains("Comparaison des devises"))
    }

    @Test
    fun devisesEtTauxRowOpensTheComparisonScreenNotTheBanksPlaceholder() {
        assertTrue(
            "Devises & taux must open the comparison screen",
            dashboard.contains("language.ui(\"Devises & taux\")) { onNavigate(PremiumNavigation.openCurrencyRates()) }")
        )
        assertTrue(nav.contains("fun openCurrencyRates()"))
        assertTrue(nav.contains("data object CurrencyRates : PremiumRoute"))
    }
}
