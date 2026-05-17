package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35])
class HomeCardDragonQaScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun capturesHomeCardLegacyBlueFallbackScreenshot() {
        capture("home_card_legacy_blue_fallback_390.png", width = 390) {
            HomeCardQaCard(CardVisualDefaults.HomeDashboard)
        }
    }

    @Test
    fun capturesHomeCardDragonGoldScreenshot() {
        capture("home_card_dragon_gold_390.png", width = 390) {
            HomeCardQaCard(CardVisualDefaults.DragonGoldPreview)
        }
    }

    @Test
    fun capturesHomeCardDragonGoldDefaultCandidateScreenshot() {
        capture("home_card_dragon_gold_default_candidate_390.png", width = 390) {
            HomeCardQaCard(CardVisualDefaults.HomeDashboardDragonGoldCandidate)
        }
    }

    @Test
    fun capturesHomeCardDragonGoldDefaultCandidateSmallWidthScreenshot() {
        capture("home_card_dragon_gold_default_candidate_320.png", width = 320) {
            HomeCardQaCard(CardVisualDefaults.HomeDashboardDragonGoldCandidate)
        }
    }

    @Test
    fun capturesHomeCardDragonGoldSmallWidthScreenshot() {
        capture("home_card_dragon_gold_320.png", width = 320) {
            HomeCardQaCard(CardVisualDefaults.DragonGoldPreview)
        }
    }

    private fun capture(name: String, width: Int, content: @Composable () -> Unit) {
        PremiumColors.useDarkTheme(false)
        composeRule.setContent {
            Box(
                Modifier
                    .size(width = width.dp, height = 260.dp)
                    .background(PremiumColors.Background)
                    .padding(16.dp)
            ) {
                content()
            }
        }
        composeRule.onRoot().captureRoboImage(filePath = "../../../../.swimpay-agent/screenshots/$name")
    }
}

@Composable
private fun HomeCardQaCard(theme: CardVisualTheme) {
    CardVisual(
        modifier = Modifier
            .fillMaxWidth()
            .height(214.dp),
        theme = theme
    ) {
        MonthlyActivityCardDetails("Paiements reçus", "12 450 RUB", true, PremiumLanguageOption.FR)
    }
}
