package com.swimpay.receiver.ui.premium

import android.util.Log
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
import com.swimpay.receiver.AndroidReceiverDeviceApiRepository
import com.swimpay.receiver.AuthenticatedMerchantSession
import com.swimpay.receiver.MerchantConfigurationChecklist
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverRuntimeConfig
import com.swimpay.receiver.ReceiverRuntimeConfigStore
import com.swimpay.receiver.ReceiverRuntimeRegistrationCoordinator
import com.swimpay.receiver.security.AndroidKeystorePayloadSigner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PremiumMerchantApp(
    runtime: PremiumMerchantRuntime,
    onboardingCompletionStore: PremiumOnboardingCompletionStore = InMemoryPremiumOnboardingStateStore(),
    mobileMerchantSessionStore: PremiumMobileMerchantSessionStore = InMemoryPremiumMobileMerchantSessionStore(),
    accountAuthRepository: AndroidMerchantAuthApiRepository? = null,
    receiverDeviceRepository: AndroidReceiverDeviceApiRepository? = null,
    receiverDeviceStateStore: PersistentDeviceStateStore? = null,
    receiverRuntimeConfigStore: ReceiverRuntimeConfigStore? = null,
    receiverAppVersion: String = "0.1.0",
    receiverAndroidVersion: String = "unknown",
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
    var receivingMethodClearDraftSignal by remember { mutableStateOf(0) }
    var ordersState by remember { mutableStateOf<PremiumScreenState<PremiumOrdersUiState>>(PremiumScreenState.loading()) }
    val receiverPayloadSigner = remember { AndroidKeystorePayloadSigner() }
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

    LaunchedEffect(activeRuntime, notificationAccessEnabled) {
        val session = mobileMerchantSessionStore.currentSession()
        if (
            session != null &&
            onboardingCompletionStore.isCompleted() &&
            receiverDeviceRepository != null &&
            receiverDeviceStateStore != null &&
            receiverRuntimeConfigStore != null
        ) {
            val refresh = withContext(Dispatchers.IO) {
                ReceiverRuntimeRegistrationCoordinator(
                    registrationClient = receiverDeviceRepository,
                    deviceStateStore = receiverDeviceStateStore,
                    runtimeConfigStore = receiverRuntimeConfigStore,
                    payloadSigner = receiverPayloadSigner
                ).ensureCurrentAsymmetricRegistration(
                    session = AuthenticatedMerchantSession.mobile(session),
                    notificationAccessEnabled = notificationAccessEnabled,
                    appVersion = receiverAppVersion,
                    androidVersion = receiverAndroidVersion
                )
            }
            Log.i(
                "SwimPayReceiverRegistration",
                "registration_fresh=${refresh.success} registered=${refresh.registered} message=${refresh.safeMessage}"
            )
        }
    }

    fun finishOnboarding(completedState: PremiumOnboardingSessionState) {
        val session = mobileMerchantSessionStore.currentSession()
        if (
            session == null ||
            receiverDeviceRepository == null ||
            receiverDeviceStateStore == null ||
            receiverRuntimeConfigStore == null
        ) {
            onboardingCompletionStore.markCompleted()
            route = PremiumNavigation.afterOnboarding()
            return
        }

        route = PremiumNavigation.openAccountRecovery(
            PremiumAccountRecoveryUiState.receiverSetup(),
            returnRoute = PremiumRoute.Onboarding
        )
        scope.launch {
            val receivingMethodSubmission = completedState.receivingMethodSubmission
            if (receivingMethodSubmission == null) {
                route = PremiumNavigation.openAccountRecovery(
                    PremiumAccountRecoveryUiState.receiverError(
                        "Ajoutez un moyen de reception avant de terminer l'onboarding."
                    ),
                    returnRoute = PremiumRoute.Onboarding
                )
                return@launch
            }
            val receivingMethodResult = withContext(Dispatchers.IO) {
                activeRuntime.createReceivingMethod(receivingMethodSubmission)
            }
            val receivingMethodError = when (receivingMethodResult) {
                is PremiumScreenState.Content -> ""
                is PremiumScreenState.ActionRequired -> receivingMethodResult.message
                is PremiumScreenState.Empty -> receivingMethodResult.message
                is PremiumScreenState.Error -> receivingMethodResult.message
                is PremiumScreenState.Offline -> receivingMethodResult.message
                is PremiumScreenState.Loading -> "Moyen de reception en cours d'enregistrement."
            }
            if (receivingMethodError.isNotBlank()) {
                route = PremiumNavigation.openAccountRecovery(
                    PremiumAccountRecoveryUiState.receiverError(
                        receivingMethodError.ifBlank { "Moyen de reception indisponible. Reessayez." }
                    ),
                    returnRoute = PremiumRoute.Onboarding
                )
                return@launch
            }
            val selectedBankIds = completedState.selectedBankIds
            val receiverKeyInfo = withContext(Dispatchers.IO) {
                receiverPayloadSigner.getOrCreateKeyPair()
            }
            val result = withContext(Dispatchers.IO) {
                receiverDeviceRepository.registerAndHeartbeat(
                    session = AuthenticatedMerchantSession.mobile(session),
                    enabledBankProfileIds = selectedBankIds,
                    publicKeyPem = receiverKeyInfo.publicKeyPem,
                    notificationAccessEnabled = notificationAccessEnabled,
                    appVersion = receiverAppVersion,
                    androidVersion = receiverAndroidVersion
                )
            }

            if (result.status == AndroidMerchantAuthResultStatus.SUCCESS && result.deviceState != null) {
                receiverRuntimeConfigStore.save(
                    ReceiverRuntimeConfig(
                        enabledBankProfileIds = selectedBankIds,
                        merchantId = session.merchantId
                    )
                )
                receiverDeviceStateStore.save(result.deviceState.copy(receiverKeyId = receiverKeyInfo.keyId))
                onboardingCompletionStore.markCompleted()
                route = PremiumNavigation.afterOnboarding()
            } else {
                route = PremiumNavigation.openAccountRecovery(
                    PremiumAccountRecoveryUiState.receiverError(
                        result.safeMessage.ifBlank { "Receiver staging indisponible. Verifiez la connexion et reessayez." }
                    ),
                    returnRoute = PremiumRoute.Onboarding
                )
            }
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
                banksState = withContext(Dispatchers.IO) {
                    activeRuntime.loadBanks(enabledBankProfileIds = receiverRuntimeConfigStore?.load()?.enabledBankProfileIds ?: emptySet())
                }
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
                banksState = withContext(Dispatchers.IO) {
                    activeRuntime.loadBanks(enabledBankProfileIds = receiverRuntimeConfigStore?.load()?.enabledBankProfileIds ?: emptySet())
                }
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
                                message = result?.safeMessage ?: "Création du compte indisponible. Réessayez dans quelques instants."
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
                    val lookup = withContext(Dispatchers.IO) {
                        accountAuthRepository?.lookupDevice(AndroidMerchantDeviceLookupIntent.RECOVER_ACCOUNT)
                    }
                    if (lookup == null || lookup.status == AndroidMerchantAuthResultStatus.ERROR) {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.error(
                                message = lookup?.safeMessage ?: "Impossible de vérifier ce téléphone pour le moment."
                            )
                        )
                        return@launch
                    }
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
                                message = result?.safeMessage ?: "Connexion Google annulée ou indisponible."
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
            onDone = { completedState -> finishOnboarding(completedState) }
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
            content = {
                PremiumReceivingMethodsStateScreen(
                    receivingMethodsState,
                    clearDraftSignal = receivingMethodClearDraftSignal,
                    onSaveDraft = { submission ->
                        receivingMethodsState = PremiumScreenState.loading()
                        scope.launch {
                            val mutation = withContext(Dispatchers.IO) {
                                activeRuntime.createReceivingMethod(submission)
                            }
                            if (mutation is PremiumScreenState.Content) {
                                receivingMethodClearDraftSignal += 1
                            }
                            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                        }
                    }
                )
            }
        )
        PremiumRoute.ConnectedSite -> PremiumConnectedSiteStateScreen(
            state = connectedSiteState,
            onBack = { route = PremiumRoute.Main(PremiumMainTab.Menu) },
            onCreateApiKey = {
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.createDeveloperApiKey() }
                }
            },
            onRotateApiKey = {
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.rotateDeveloperApiKey() }
                }
            },
            onRotateWebhookSecret = {
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.rotateDeveloperWebhookSecret() }
                }
            },
            onSaveWebhookUrl = { webhookUrl ->
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.updateDeveloperWebhookUrl(webhookUrl) }
                }
            },
            onTestWebhook = {
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.testDeveloperWebhook() }
                }
            }
        )
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
                                        message = result?.safeMessage ?: "Association Google annulée ou indisponible."
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
