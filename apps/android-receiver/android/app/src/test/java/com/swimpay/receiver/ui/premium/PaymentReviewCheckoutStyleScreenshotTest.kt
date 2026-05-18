package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
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
@Config(sdk = [35], qualifiers = "w390dp-h1300dp")
class PaymentReviewCheckoutStyleScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun capturesPaymentReviewDetailCheckoutStyleLight() {
        capture("payment_review_checkout_style_light_390.png", dark = false, height = 1300) {
            PremiumPaymentDetailScreen(PremiumScreenState.content(paymentReviewDetailState()))
        }
    }

    @Test
    fun capturesPaymentReviewDetailCheckoutStyleDark() {
        capture("payment_review_checkout_style_dark_390.png", dark = true, height = 1300) {
            PremiumPaymentDetailScreen(PremiumScreenState.content(paymentReviewDetailState()))
        }
    }

    @Test
    fun capturesPaymentReviewListCheckoutStyleLight() {
        capture("payment_review_list_checkout_style_light_390.png", dark = false, height = 844) {
            PremiumAppShell(selectedTab = PremiumMainTab.Reviews, onTab = {}, profileInitials = "SP") {
                PremiumReviewsScreen(PremiumScreenState.content(paymentReviewsState()))
            }
        }
    }

    private fun capture(name: String, dark: Boolean, height: Int, content: @Composable () -> Unit) {
        PremiumColors.useDarkTheme(dark)
        composeRule.setContent {
            Box(
                Modifier
                    .size(width = 390.dp, height = height.dp)
                    .background(PremiumColors.Background)
            ) {
                content()
            }
        }
        composeRule.onRoot().captureRoboImage(filePath = "../../../../.swimpay-agent/screenshots/$name")
    }

    private fun paymentReviewDetailState(): PremiumPaymentDetailUiState {
        return PremiumPaymentDetailUiState(
            reviewId = "rev_checkout_demo",
            statusTitle = "Paiement a verifier",
            statusText = "Ce signal demande une decision manuelle marchand.",
            summaryRows = listOf(
                "Montant affiche" to "299.00 RUB",
                "Montant exact attendu" to "299.07 RUB",
                "Montant detecte" to "299.07 RUB",
                "Ecart" to "0.00 RUB",
                "Risque" to "Montant exact reconnu",
                "Banque" to "Sberbank",
                "Moyen de reception" to "Carte - 4821",
                "Reference" to "TANGO ALFA",
                "Signal recu" to "Il y a 2 min"
            ),
            reasons = listOf(
                "Signal operationnel reconnu",
                "Validation manuelle requise"
            ),
            timeline = listOf("Checkout arme", "Signal recu", "Review creee"),
            actionMessage = "Decision manuelle uniquement",
            usesLiveApi = true
        )
    }

    private fun paymentReviewsState(): PremiumReviewsUiState {
        return PremiumReviewsUiState(
            items = listOf(
                PremiumReviewUiItem(
                    reviewId = "rev_1",
                    amount = "299.07 RUB",
                    bank = "Sberbank",
                    reviewStatus = ReviewUiStatus.TO_CONFIRM,
                    status = "A verifier",
                    helper = "Signal detecte il y a 2 min",
                    reasons = listOf("Montant exact reconnu"),
                    valid = true
                ),
                PremiumReviewUiItem(
                    reviewId = "rev_2",
                    amount = "149.00 RUB",
                    bank = "T-Bank",
                    reviewStatus = ReviewUiStatus.TO_CONFIRM,
                    status = "A verifier",
                    helper = "Reference non visible",
                    reasons = listOf("Action marchand requise"),
                    valid = false
                )
            ),
            usesLiveApi = true
        )
    }
}
