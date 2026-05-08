package com.swimpay.receiver.ui.premium

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.swimpay.receiver.AndroidMerchantAccountProfileType
import com.swimpay.receiver.AndroidMerchantAuthApiRepository
import com.swimpay.receiver.AndroidMerchantAuthResultStatus
import com.swimpay.receiver.AndroidMerchantDeviceLookupIntent
import com.swimpay.receiver.AndroidMerchantDeviceLookupStatus
import com.swimpay.receiver.AuthenticatedMerchantSession
import com.swimpay.receiver.MerchantConfigurationChecklist
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PremiumMerchantApp(
    runtime: PremiumMerchantRuntime,
    onboardingCompletionStore: PremiumOnboardingCompletionStore = InMemoryPremiumOnboardingStateStore(),
    mobileMerchantSessionStore: PremiumMobileMerchantSessionStore = InMemoryPremiumMobileMerchantSessionStore(),
    accountAuthRepository: AndroidMerchantAuthApiRepository? = null,
    googleIdTokenProvider: suspend () -> String? = { null },
    mobileRuntimeFactory: (PremiumMobileMerchantSession) -> PremiumMerchantRuntime = { PremiumMerchantRuntime.mobileSession(it) },
    notificationAccessEnabled: Boolean = true,
    onOpenNotificationSettings: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var activeRuntime by remember(mobileMerchantSessionStore) {
        mutableStateOf(mobileMerchantSessionStore.currentSession()?.let(mobileRuntimeFactory) ?: runtime)
    }
    var route by remember(onboardingCompletionStore, mobileMerchantSessionStore) {
        mutableStateOf(
            PremiumNavigation.initialRoute(
                onboardingCompleted = onboardingCompletionStore.isCompleted(),
                mobileMerchantSessionValid = mobileMerchantSessionStore.hasValidSession()
            )
        )
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

    LaunchedEffect(route, activeRuntime) {
        when (val currentRoute = route) {
            is PremiumRoute.Main -> {
                when (currentRoute.tab) {
                    PremiumMainTab.Home -> dashboardState = withContext(Dispatchers.IO) {
                        activeRuntime.loadDashboard(notificationAccessEnabled)
                    }
                    PremiumMainTab.Reviews -> reviewsState = withContext(Dispatchers.IO) { activeRuntime.loadReviews() }
                    PremiumMainTab.Orders -> ordersState = withContext(Dispatchers.IO) { activeRuntime.loadOrders() }
                    PremiumMainTab.Menu -> {
                        connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.loadConnectedSite() }
                        configurationState = withContext(Dispatchers.IO) {
                            activeRuntime.runConfigurationTest(MerchantConfigurationChecklist.allReady())
                        }
                    }
                }
            }
            is PremiumRoute.PaymentDetail -> {
                paymentDetailState = withContext(Dispatchers.IO) { activeRuntime.loadPaymentDetail(currentRoute.reviewId) }
            }
            PremiumRoute.ReceivingMethods -> {
                receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
            }
            PremiumRoute.Banks -> {
                banksState = withContext(Dispatchers.IO) { activeRuntime.loadBanks() }
            }
            PremiumRoute.ReceiverHealth -> {
                receiverHealthState = withContext(Dispatchers.IO) { activeRuntime.loadReceiverHealth(notificationAccessEnabled) }
            }
            PremiumRoute.ConnectedSite -> {
                connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.loadConnectedSite() }
            }
            PremiumRoute.ConfigurationTest -> {
                configurationState = withContext(Dispatchers.IO) {
                    activeRuntime.runConfigurationTest(MerchantConfigurationChecklist.allReady())
                }
            }
            PremiumRoute.Landing,
            PremiumRoute.AccountEntry,
            PremiumRoute.AccountProfileChoice,
            PremiumRoute.LoginProviderChoice,
            is PremiumRoute.AccountRecovery,
            PremiumRoute.ConfirmationMode,
            PremiumRoute.Security,
            is PremiumRoute.OrderDetail -> Unit
            PremiumRoute.Onboarding -> {
                banksState = withContext(Dispatchers.IO) { activeRuntime.loadBanks() }
            }
        }
    }

    when (val currentRoute = route) {
        PremiumRoute.AccountEntry -> PremiumAccountEntryScreen(
            onCreateAccount = { route = PremiumNavigation.openAccountProfileChoice() },
            onSignIn = { route = PremiumNavigation.openLoginProviderChoice() }
        )
        PremiumRoute.AccountProfileChoice -> PremiumAccountProfileChoiceScreen(
            onSelectProfile = { profileType ->
                route = PremiumNavigation.openAccountRecovery(
                    PremiumAccountRecoveryUiState.creating(),
                    returnRoute = PremiumRoute.AccountProfileChoice
                )
                scope.launch {
                    val repository = accountAuthRepository
                    val lookup = withContext(Dispatchers.IO) {
                        repository?.lookupDevice(AndroidMerchantDeviceLookupIntent.CREATE_ACCOUNT)
                    }
                    if (
                        lookup == null ||
                        lookup.status == AndroidMerchantAuthResultStatus.ERROR ||
                        lookup.deviceStatus == AndroidMerchantDeviceLookupStatus.RECOVERY_REQUIRED ||
                        lookup.deviceStatus == AndroidMerchantDeviceLookupStatus.KNOWN_DEVICE
                    ) {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.error(
                                message = if (lookup?.deviceStatus == AndroidMerchantDeviceLookupStatus.KNOWN_DEVICE) {
                                    "Ce telephone semble deja lie. Utilisez Se connecter."
                                } else {
                                    "Impossible de verifier ce telephone pour le moment."
                                }
                            ),
                            returnRoute = PremiumRoute.AccountProfileChoice
                        )
                        return@launch
                    }
                    val result = withContext(Dispatchers.IO) {
                        repository?.createAccount(profileType.toAndroidAuthProfileType())
                    }
                    if (result?.status == AndroidMerchantAuthResultStatus.SUCCESS && result.mobileSession != null) {
                        mobileMerchantSessionStore.save(result.mobileSession)
                        activeRuntime = mobileRuntimeFactory(result.mobileSession)
                        route = PremiumNavigation.afterAccountProfileSelected(profileType)
                    } else {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.error(
                                message = result?.safeMessage ?: "La création du compte sera disponible après connexion au backend."
                            ),
                            returnRoute = PremiumRoute.AccountProfileChoice
                        )
                    }
                }
            },
            onBack = { route = PremiumRoute.AccountEntry }
        )
        PremiumRoute.LoginProviderChoice -> PremiumAccountLoginProviderScreen(
            onGoogleRecovery = {
                route = PremiumNavigation.openAccountRecovery(PremiumAccountRecoveryUiState.pending())
                scope.launch {
                    val idToken = withContext(Dispatchers.IO) { googleIdTokenProvider() }
                    val result = if (!idToken.isNullOrBlank()) {
                        withContext(Dispatchers.IO) { accountAuthRepository?.googleExchange(idToken) }
                    } else {
                        null
                    }
                    if (result?.status == AndroidMerchantAuthResultStatus.SUCCESS && result.mobileSession != null) {
                        mobileMerchantSessionStore.save(result.mobileSession)
                        activeRuntime = mobileRuntimeFactory(result.mobileSession)
                        route = PremiumNavigation.initialRoute(
                            onboardingCompleted = onboardingCompletionStore.isCompleted(),
                            mobileMerchantSessionValid = true
                        )
                    } else {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.error(
                                message = result?.safeMessage ?: "Google sera branche comme moyen de recuperation."
                            )
                        )
                    }
                }
            },
            onBack = { route = PremiumRoute.AccountEntry }
        )
        is PremiumRoute.AccountRecovery -> PremiumAccountRecoveryScreen(
            state = currentRoute.state,
            onBack = { route = currentRoute.returnRoute }
        )
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
            onRejectSignal = {
                paymentDetailState = activeRuntime.rejectSignal(currentRoute.reviewId)
            },
            onRejectOrder = {
                paymentDetailState = activeRuntime.rejectOrder(currentRoute.reviewId)
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
            content = {
                PremiumSecurityScreen(
                    onGoogleRecoveryLink = {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.pending(),
                            returnRoute = PremiumRoute.Security
                        )
                        scope.launch {
                            val session = mobileMerchantSessionStore.currentSession()
                            val idToken = withContext(Dispatchers.IO) { googleIdTokenProvider() }
                            val result = if (session != null && !idToken.isNullOrBlank()) {
                                withContext(Dispatchers.IO) {
                                    accountAuthRepository?.googleLink(AuthenticatedMerchantSession.mobile(session), idToken)
                                }
                            } else {
                                null
                            }
                            route = if (result?.status == AndroidMerchantAuthResultStatus.SUCCESS) {
                                PremiumNavigation.openAccountRecovery(
                                    PremiumAccountRecoveryUiState.success(),
                                    returnRoute = PremiumRoute.Security
                                )
                            } else {
                                PremiumNavigation.openAccountRecovery(
                                    PremiumAccountRecoveryUiState.error(
                                        message = result?.safeMessage ?: "Google sera disponible apres connexion au backend."
                                    ),
                                    returnRoute = PremiumRoute.Security
                                )
                            }
                        }
                    }
                )
            }
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

private fun PremiumMerchantProfileType.toAndroidAuthProfileType(): AndroidMerchantAccountProfileType {
    return when (this) {
        PremiumMerchantProfileType.PERSONAL -> AndroidMerchantAccountProfileType.PERSONAL
        PremiumMerchantProfileType.COMMERCE -> AndroidMerchantAccountProfileType.BUSINESS
    }
}
