package com.swimpay.receiver.ui.premium

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.swimpay.receiver.MerchantConfigurationChecklist
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun PremiumMerchantApp(
    runtime: PremiumMerchantRuntime
) {
    var route by remember { mutableStateOf("landing") }
    var tab by remember { mutableIntStateOf(0) }
    var selectedReviewId by remember { mutableStateOf("rev_demo_1") }
    var dashboardState by remember { mutableStateOf(PremiumDashboardUiState.preview()) }
    var reviewsState by remember { mutableStateOf(PremiumReviewsUiState.preview()) }
    var paymentDetailState by remember { mutableStateOf(PremiumPaymentDetailUiState.preview()) }
    var connectedSiteState by remember { mutableStateOf(PremiumConnectedSiteUiState.preview()) }
    var configurationState by remember { mutableStateOf(PremiumConfigurationUiState.preview()) }

    LaunchedEffect(route, tab, selectedReviewId) {
        if (route == "main") {
            when (tab) {
                0 -> dashboardState = withContext(Dispatchers.IO) { runtime.loadDashboard() }
                1 -> reviewsState = withContext(Dispatchers.IO) { runtime.loadReviews() }
                3 -> {
                    connectedSiteState = withContext(Dispatchers.IO) { runtime.loadConnectedSite() }
                    configurationState = withContext(Dispatchers.IO) {
                        runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady())
                    }
                }
            }
        }
        if (route == "payment_detail") {
            paymentDetailState = withContext(Dispatchers.IO) { runtime.loadPaymentDetail(selectedReviewId) }
        }
    }

    when (route) {
        "landing" -> PremiumLandingScreen { route = "onboarding" }
        "onboarding" -> PremiumOnboardingFlow(onDone = {
            tab = 0
            route = "main"
        })
        "payment_detail" -> PremiumPaymentDetailScreen(
            state = paymentDetailState,
            onBack = {
                tab = 1
                route = "main"
            },
            onConfirm = {
                paymentDetailState = runtime.confirm(selectedReviewId)
            },
            onRejectSignal = {
                paymentDetailState = runtime.rejectSignal(selectedReviewId)
            },
            onRejectOrder = {
                paymentDetailState = runtime.rejectOrder(selectedReviewId)
            }
        )
        "main" -> PremiumAppShell(
            selectedTab = tab,
            onTab = { tab = it },
            content = {
                when (tab) {
                    0 -> PremiumDashboardScreen(dashboardState)
                    1 -> PremiumReviewsScreen(
                        state = reviewsState,
                        onOpenReview = {
                            selectedReviewId = it
                            route = "payment_detail"
                        }
                    )
                    2 -> PremiumOrdersScreen()
                    else -> PremiumSettingsScreen(connectedSiteState, configurationState)
                }
            }
        )
    }
}
