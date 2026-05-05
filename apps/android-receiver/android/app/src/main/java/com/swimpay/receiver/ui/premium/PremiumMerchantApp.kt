package com.swimpay.receiver.ui.premium

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
    var dashboardState by remember { mutableStateOf<PremiumScreenState<PremiumDashboardUiState>>(PremiumScreenState.loading()) }
    var reviewsState by remember { mutableStateOf<PremiumScreenState<PremiumReviewsUiState>>(PremiumScreenState.loading()) }
    var paymentDetailState by remember { mutableStateOf<PremiumScreenState<PremiumPaymentDetailUiState>>(PremiumScreenState.loading()) }
    var connectedSiteState by remember { mutableStateOf<PremiumScreenState<PremiumConnectedSiteUiState>>(PremiumScreenState.loading()) }
    var configurationState by remember { mutableStateOf<PremiumScreenState<PremiumConfigurationUiState>>(PremiumScreenState.loading()) }
    var receivingMethodsState by remember { mutableStateOf<PremiumScreenState<PremiumReceivingMethodsUiState>>(PremiumScreenState.loading()) }
    var ordersState by remember { mutableStateOf<PremiumScreenState<PremiumOrdersUiState>>(PremiumScreenState.loading()) }
    var banksState by remember { mutableStateOf<PremiumScreenState<PremiumBanksUiState>>(PremiumScreenState.loading()) }
    var receiverHealthState by remember { mutableStateOf<PremiumScreenState<PremiumReceiverHealthUiState>>(PremiumScreenState.loading()) }
    val navigateFromMenu: (PremiumRoute) -> Unit = { target ->
        route = when (target) {
            PremiumRoute.ReceivingMethods -> PremiumNavigation.openReceivingMethods()
            PremiumRoute.Banks -> PremiumNavigation.openBanks()
            PremiumRoute.ReceiverHealth -> PremiumNavigation.openReceiverHealth()
            PremiumRoute.ConnectedSite -> PremiumNavigation.openConnectedSite()
            PremiumRoute.ConfigurationTest -> PremiumNavigation.openConfigurationTest()
            PremiumRoute.ConfirmationMode -> PremiumNavigation.openConfirmationMode()
            PremiumRoute.Security -> PremiumNavigation.openSecurity()
            else -> target
        }
    }

    LaunchedEffect(route) {
        when (val currentRoute = route) {
            is PremiumRoute.Main -> {
                when (currentRoute.tab) {
                    PremiumMainTab.Home -> dashboardState = withContext(Dispatchers.IO) {
                        runtime.loadDashboard(notificationAccessEnabled)
                    }
                    PremiumMainTab.Reviews -> reviewsState = withContext(Dispatchers.IO) { runtime.loadReviews() }
                    PremiumMainTab.Orders -> ordersState = withContext(Dispatchers.IO) { runtime.loadOrders() }
                    PremiumMainTab.Menu -> {
                        connectedSiteState = withContext(Dispatchers.IO) { runtime.loadConnectedSite() }
                        configurationState = withContext(Dispatchers.IO) {
                            runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady())
                        }
                    }
                }
            }
            is PremiumRoute.PaymentDetail -> {
                paymentDetailState = withContext(Dispatchers.IO) { runtime.loadPaymentDetail(currentRoute.reviewId) }
            }
            PremiumRoute.ReceivingMethods -> {
                receivingMethodsState = withContext(Dispatchers.IO) { runtime.loadReceivingMethods() }
            }
            PremiumRoute.Banks -> {
                banksState = withContext(Dispatchers.IO) { runtime.loadBanks() }
            }
            PremiumRoute.ReceiverHealth -> {
                receiverHealthState = withContext(Dispatchers.IO) { runtime.loadReceiverHealth(notificationAccessEnabled) }
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
            PremiumRoute.ConfirmationMode,
            PremiumRoute.Security,
            is PremiumRoute.OrderDetail -> Unit
            PremiumRoute.Onboarding -> {
                banksState = withContext(Dispatchers.IO) { runtime.loadBanks() }
            }
        }
    }

    when (val currentRoute = route) {
        PremiumRoute.Landing -> PremiumLandingScreen { route = PremiumRoute.Onboarding }
        PremiumRoute.Onboarding -> PremiumOnboardingFlow(
            notificationAccessEnabled = notificationAccessEnabled,
            bankTargetsState = banksState,
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
                    PremiumMainTab.Orders -> PremiumOrdersScreen(ordersState)
                    PremiumMainTab.Menu -> PremiumSettingsScreen(
                        connectedSite = connectedSiteState,
                        configuration = configurationState,
                        onNavigate = navigateFromMenu
                    )
                }
            }
        )
        PremiumRoute.ReceivingMethods -> PremiumAppShell(
            selectedTab = PremiumMainTab.Menu,
            onTab = { route = PremiumRoute.Main(it) },
            content = { PremiumReceivingMethodsStateScreen(receivingMethodsState) }
        )
        PremiumRoute.ConnectedSite -> PremiumConnectedSiteStateScreen(connectedSiteState) {
            route = PremiumRoute.Main(PremiumMainTab.Menu)
        }
        PremiumRoute.ConfigurationTest -> PremiumConfigurationStateScreen(configurationState) {
            route = PremiumRoute.Main(PremiumMainTab.Menu)
        }
        PremiumRoute.ConfirmationMode -> PremiumAppShell(
            selectedTab = PremiumMainTab.Menu,
            onTab = { route = PremiumRoute.Main(it) },
            content = { PremiumConfirmationModeScreen() }
        )
        PremiumRoute.Security -> PremiumAppShell(
            selectedTab = PremiumMainTab.Menu,
            onTab = { route = PremiumRoute.Main(it) },
            content = { PremiumSecurityScreen() }
        )
        PremiumRoute.Banks -> PremiumAppShell(
            selectedTab = PremiumMainTab.Menu,
            onTab = { route = PremiumRoute.Main(it) },
            content = { PremiumBanksStateScreen(banksState) }
        )
        PremiumRoute.ReceiverHealth -> PremiumAppShell(
            selectedTab = PremiumMainTab.Menu,
            onTab = { route = PremiumRoute.Main(it) },
            content = { PremiumReceiverHealthStateScreen(receiverHealthState, onOpenNotificationSettings) }
        )
        is PremiumRoute.OrderDetail -> PremiumAppShell(
            selectedTab = PremiumMainTab.Orders,
            onTab = { route = PremiumRoute.Main(it) },
            content = {
                PremiumStatePanel(
                    PremiumScreenState.empty<Unit>(
                        title = "Commande à synchroniser",
                        message = "Les détails seront synchronisés dès que SwimPay sera connecté."
                    )
                )
            }
        )
    }
}
