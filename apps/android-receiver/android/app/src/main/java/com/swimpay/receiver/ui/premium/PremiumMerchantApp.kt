package com.swimpay.receiver.ui.premium

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.swimpay.receiver.MerchantConfigurationChecklist
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun PremiumMerchantApp(
    runtime: PremiumMerchantRuntime,
    onboardingCompletionStore: PremiumOnboardingCompletionStore = InMemoryPremiumOnboardingStateStore(),
    notificationAccessEnabled: Boolean = true,
    onOpenNotificationSettings: () -> Unit = {}
) {
    var route by remember(onboardingCompletionStore) {
        mutableStateOf(PremiumNavigation.initialRoute(onboardingCompletionStore.isCompleted()))
    }
    var dashboardState by remember { mutableStateOf(PremiumDashboardUiState.preview()) }
    var reviewsState by remember { mutableStateOf(PremiumReviewsUiState.preview()) }
    var paymentDetailState by remember { mutableStateOf(PremiumPaymentDetailUiState.preview()) }
    var connectedSiteState by remember { mutableStateOf(PremiumConnectedSiteUiState.preview()) }
    var configurationState by remember { mutableStateOf(PremiumConfigurationUiState.preview()) }

    LaunchedEffect(route) {
        when (val currentRoute = route) {
            is PremiumRoute.Main -> {
                when (currentRoute.tab) {
                    PremiumMainTab.Home -> dashboardState = withContext(Dispatchers.IO) { runtime.loadDashboard() }
                    PremiumMainTab.Reviews -> reviewsState = withContext(Dispatchers.IO) { runtime.loadReviews() }
                    PremiumMainTab.Menu -> {
                        connectedSiteState = withContext(Dispatchers.IO) { runtime.loadConnectedSite() }
                        configurationState = withContext(Dispatchers.IO) {
                            runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady())
                        }
                    }
                    PremiumMainTab.Orders -> Unit
                }
            }
            is PremiumRoute.PaymentDetail -> {
                paymentDetailState = withContext(Dispatchers.IO) { runtime.loadPaymentDetail(currentRoute.reviewId) }
            }
            PremiumRoute.ConnectedSite -> {
                connectedSiteState = withContext(Dispatchers.IO) { runtime.loadConnectedSite() }
            }
            PremiumRoute.ConfigurationTest -> {
                configurationState = withContext(Dispatchers.IO) {
                    runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady())
                }
            }
            PremiumRoute.Landing,
            PremiumRoute.Onboarding,
            PremiumRoute.ReceivingMethods,
            PremiumRoute.Banks,
            PremiumRoute.ReceiverHealth,
            is PremiumRoute.OrderDetail -> Unit
        }
    }

    when (val currentRoute = route) {
        PremiumRoute.Landing -> PremiumLandingScreen { route = PremiumRoute.Onboarding }
        PremiumRoute.Onboarding -> PremiumOnboardingFlow(
            notificationAccessEnabled = notificationAccessEnabled,
            openNotificationSettings = onOpenNotificationSettings,
            onDone = {
                onboardingCompletionStore.markCompleted()
                route = PremiumNavigation.afterOnboarding()
            }
        )
        is PremiumRoute.PaymentDetail -> PremiumPaymentDetailScreen(
            state = paymentDetailState,
            onBack = {
                route = PremiumNavigation.backFromPaymentDetail()
            },
            onConfirm = {
                paymentDetailState = runtime.confirm(currentRoute.reviewId)
            },
            onRejectSignal = {
                paymentDetailState = runtime.rejectSignal(currentRoute.reviewId)
            },
            onRejectOrder = {
                paymentDetailState = runtime.rejectOrder(currentRoute.reviewId)
            }
        )
        is PremiumRoute.Main -> PremiumAppShell(
            selectedTab = currentRoute.tab,
            onTab = { route = PremiumRoute.Main(it) },
            content = {
                when (currentRoute.tab) {
                    PremiumMainTab.Home -> PremiumDashboardScreen(dashboardState)
                    PremiumMainTab.Reviews -> PremiumReviewsScreen(
                        state = reviewsState,
                        onOpenReview = {
                            route = PremiumNavigation.openReview(it)
                        }
                    )
                    PremiumMainTab.Orders -> PremiumOrdersScreen()
                    PremiumMainTab.Menu -> PremiumSettingsScreen(connectedSiteState, configurationState)
                }
            }
        )
        PremiumRoute.ConnectedSite -> {
            PremiumConnectedSiteStateScreen(connectedSiteState) {
                route = PremiumRoute.Main(PremiumMainTab.Menu)
            }
        }
        PremiumRoute.ConfigurationTest -> {
            PremiumConfigurationStateScreen(configurationState) {
                route = PremiumRoute.Main(PremiumMainTab.Menu)
            }
        }
        PremiumRoute.ReceivingMethods,
        PremiumRoute.Banks,
        PremiumRoute.ReceiverHealth,
        is PremiumRoute.OrderDetail -> PremiumAppShell(
            selectedTab = PremiumMainTab.Menu,
            onTab = { route = PremiumRoute.Main(it) },
            content = {
                PremiumStatePanel(
                    state = PremiumScreenState.actionRequired<Unit>(
                        title = "Action nécessaire",
                        message = "Cet écran sera disponible dans la prochaine étape."
                    )
                )
            }
        )
    }
}
