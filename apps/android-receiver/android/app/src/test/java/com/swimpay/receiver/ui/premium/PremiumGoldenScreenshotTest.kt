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
@Config(sdk = [35])
class PremiumGoldenScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun dashboardGolden() {
        capture("premium_dashboard.png") {
            PremiumAppShell(selectedTab = PremiumMainTab.Home, onTab = {}, profileInitials = "SP") {
                PremiumDashboardScreen(PremiumScreenState.content(goldenDashboardState()))
            }
        }
    }

    @Test
    fun reviewListGolden() {
        capture("premium_review_list.png") {
            PremiumAppShell(selectedTab = PremiumMainTab.Reviews, onTab = {}, profileInitials = "SP") {
                PremiumReviewsScreen(PremiumScreenState.content(goldenReviewsState()))
            }
        }
    }

    @Test
    fun reviewDetailGolden() {
        capture("premium_review_detail.png") {
            PremiumPaymentDetailScreen(PremiumScreenState.content(goldenReviewDetailState()))
        }
    }

    @Test
    fun receiverHealthGolden() {
        capture("premium_receiver_health.png") {
            PremiumAppShell(selectedTab = PremiumMainTab.Menu, onTab = {}, profileInitials = "SP") {
                PremiumReceiverHealthStateScreen(PremiumScreenState.content(goldenReceiverHealthState()))
            }
        }
    }

    @Test
    fun receivingMethodsGolden() {
        capture("premium_receiving_methods.png") {
            PremiumAppShell(selectedTab = PremiumMainTab.Menu, onTab = {}, profileInitials = "SP") {
                PremiumReceivingMethodsStateScreen(PremiumScreenState.content(goldenReceivingMethodsState()))
            }
        }
    }

    @Test
    fun developerIntegrationGolden() {
        capture("premium_developer_integration.png") {
            PremiumConnectedSiteStateScreen(
                state = PremiumScreenState.content(goldenConnectedSiteState()),
                onBack = {}
            )
        }
    }

    @Test
    fun confirmationModeGolden() {
        capture("premium_confirmation_mode.png") {
            PremiumAppShell(selectedTab = PremiumMainTab.Menu, onTab = {}, profileInitials = "SP") {
                PremiumConfirmationModeScreen()
            }
        }
    }

    private fun capture(name: String, content: @Composable () -> Unit) {
        PremiumColors.useDarkTheme(false)
        composeRule.setContent {
            Box(
                Modifier
                    .size(width = 390.dp, height = 844.dp)
                    .background(PremiumColors.Background)
            ) {
                content()
            }
        }
        composeRule.onRoot().captureRoboImage(filePath = "src/test/snapshots/$name")
    }

    private fun goldenDashboardState(): PremiumDashboardUiState {
        return PremiumDashboardUiState(
            readyTitle = "SwimPay Intelligence actif",
            readyText = "Le telephone marchand est connecte et pret pour les paiements a verifier.",
            mainMetricLabel = "Montant confirme",
            monthlyAmount = "12 450 RUB",
            metrics = listOf(
                PremiumMetricUiState("3", "A confirmer"),
                PremiumMetricUiState("18", "Confirmes"),
                PremiumMetricUiState("1", "Rejetes"),
                PremiumMetricUiState("0", "Expires"),
                PremiumMetricUiState("0", "Echecs"),
                PremiumMetricUiState("94 %", "Taux")
            ),
            chartPoints = listOf(
                PremiumChartPointUiState("Lun", 120000, 74),
                PremiumChartPointUiState("Mar", 180000, 81),
                PremiumChartPointUiState("Mer", 142000, 77),
                PremiumChartPointUiState("Jeu", 220000, 90),
                PremiumChartPointUiState("Ven", 198000, 86)
            ),
            chartConfirmedAmountLabel = "8 600 RUB",
            chartConfirmationRateLabel = "86 %",
            recentPayments = listOf(
                PremiumRecentPaymentUiState("299.00 RUB", "Commande SWP-97DBEF3C", "A verifier"),
                PremiumRecentPaymentUiState("149.00 RUB", "Confirmation manuelle", "Confirme")
            ),
            usesLiveApi = true,
            localSystemCards = listOf(
                PremiumLocalSystemUiState("Receiver", "Connecte", "Heartbeat recent"),
                PremiumLocalSystemUiState("Notifications", "Autorisees", "Listener actif"),
                PremiumLocalSystemUiState("Outbox", "0", "Synchronise"),
                PremiumLocalSystemUiState("Banques", "5", "Routes actives")
            )
        )
    }

    private fun goldenReviewsState(): PremiumReviewsUiState {
        return PremiumReviewsUiState(
            items = listOf(
                PremiumReviewUiItem(
                    reviewId = "rev_1",
                    amount = "299.00 RUB",
                    bank = "Sberbank",
                    reviewStatus = ReviewUiStatus.TO_CONFIRM,
                    status = "A verifier",
                    helper = "Manual bank check",
                    reasons = listOf("Aucun signal bancaire detecte"),
                    valid = false
                ),
                PremiumReviewUiItem(
                    reviewId = "rev_2",
                    amount = "149.00 RUB",
                    bank = "T-Bank",
                    reviewStatus = ReviewUiStatus.TO_CONFIRM,
                    status = "A verifier",
                    helper = "Signal prudent",
                    reasons = listOf("Montant exact reconnu"),
                    valid = true
                ),
                PremiumReviewUiItem(
                    reviewId = "rev_3",
                    amount = "499.00 RUB",
                    bank = "VTB",
                    reviewStatus = ReviewUiStatus.CONFIRMED,
                    status = "Confirme",
                    helper = "Decision marchand",
                    reasons = listOf("Confirmation manuelle"),
                    valid = true
                )
            ),
            usesLiveApi = true
        )
    }

    private fun goldenReviewDetailState(): PremiumPaymentDetailUiState {
        return PremiumPaymentDetailUiState(
            reviewId = "rev_1",
            statusTitle = "Paiement a verifier",
            statusText = "Aucun signal bancaire officiel. Confirmez seulement apres verification.",
            summaryRows = listOf(
                "Montant affiche" to "299.00 RUB",
                "Montant exact attendu" to "299.07 RUB",
                "Montant detecte" to "Non detecte",
                "Ecart" to "A verifier",
                "Risque" to "Verification banque requise",
                "Banque receiver" to "Sberbank",
                "Route" to "Carte - 4821",
                "Reference" to "SWP-97DBEF3C"
            ),
            reasons = listOf(
                "Aucune notification recue apres arming.",
                "Action marchand requise."
            ),
            timeline = listOf("Checkout arme", "Timeout 120s", "Review creee"),
            actionMessage = "Decision manuelle uniquement",
            usesLiveApi = true
        )
    }

    private fun goldenReceiverHealthState(): PremiumReceiverHealthUiState {
        return PremiumReceiverHealthUiState(
            statusTitle = "Receiver healthy",
            statusText = "Le telephone marchand peut recevoir les alertes SwimPay.",
            rows = listOf(
                "Acces notifications" to "Actif",
                "Listener" to "Connecte",
                "Dernier heartbeat" to "Il y a 24 s",
                "Outbox chiffree" to "0 en attente",
                "Routes bancaires" to "5 actives",
                "Integrite app" to "Recente"
            ),
            notices = listOf(
                "SwimPay ne confirme jamais automatiquement.",
                "Les notifications restent redacted-only."
            )
        )
    }

    private fun goldenReceivingMethodsState(): PremiumReceivingMethodsUiState {
        return PremiumReceivingMethodsUiState(
            items = listOf(
                PremiumReceivingMethodUiItem(
                    routeId = "route_card_sber",
                    title = "Carte - 4821",
                    subtitle = "Sberbank - 4821",
                    helper = "Montant exact avec micro-reconciliation",
                    badge = "Defaut",
                    status = "Active",
                    enabled = true,
                    recommended = true,
                    actions = listOf("Modifier", "Desactiver")
                ),
                PremiumReceivingMethodUiItem(
                    routeId = "route_phone_tbank",
                    title = "Telephone - 42",
                    subtitle = "T-Bank - **42",
                    helper = "Review manuelle V1",
                    badge = null,
                    status = "Active",
                    enabled = true,
                    recommended = false,
                    actions = listOf("Modifier", "Defaut", "Supprimer")
                )
            ),
            usesLiveApi = true
        )
    }

    private fun goldenConnectedSiteState(): PremiumConnectedSiteUiState {
        return PremiumConnectedSiteUiState(
            statusTitle = "Integration prete",
            statusText = "Le test webhook est gere par le backend SwimPay.",
            rows = listOf(
                "Site connecte" to "swimvpn.example",
                "Paiements" to "Disponibles apres route active"
            ),
            usesLiveApi = true,
            developerRows = listOf(
                "SDK" to "Configure cote serveur",
                "Webhook" to "https://merchant.example/swimpay/webhook",
                "Dernier test" to "Reussi"
            ),
            exportLines = listOf(
                "SWIMPAY_ENV=staging",
                "SWIMPAY_API_URL=https://staging.swimpay.pro"
            ),
            copyExportLines = listOf(
                "SWIMPAY_ENV=staging",
                "SWIMPAY_API_URL=https://staging.swimpay.pro"
            ),
            webhookUrl = "https://merchant.example/swimpay/webhook",
            actionButtonsEnabled = true
        )
    }
}
