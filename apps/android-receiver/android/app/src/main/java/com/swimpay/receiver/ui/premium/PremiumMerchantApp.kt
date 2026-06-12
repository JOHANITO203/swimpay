package com.swimpay.receiver.ui.premium

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.swimpay.receiver.AndroidMerchantAccountCreateResult
import com.swimpay.receiver.AndroidMerchantAccountProfileType
import com.swimpay.receiver.AndroidMerchantAuthApiRepository
import com.swimpay.receiver.AndroidMerchantAuthResultStatus
import com.swimpay.receiver.AndroidMerchantBackendConfig
import com.swimpay.receiver.AndroidMerchantDeviceLookupIntent
import com.swimpay.receiver.AndroidMerchantDeviceLookupStatus
import com.swimpay.receiver.AndroidReceiverDeviceApiRepository
import com.swimpay.receiver.AuthenticatedMerchantSession
import com.swimpay.receiver.MerchantConfigurationChecklist
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverRuntimeConfig
import com.swimpay.receiver.ReceiverRuntimeConfigStore
import com.swimpay.receiver.ReceiverRuntimeRegistrationCoordinator
import com.swimpay.receiver.security.AndroidKeystorePayloadSigner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

interface PremiumMerchantReviewNotifier {
    fun notifyActionRequired(review: PremiumReviewUiItem)
}

object NoopPremiumMerchantReviewNotifier : PremiumMerchantReviewNotifier {
    override fun notifyActionRequired(review: PremiumReviewUiItem) {
        // Local notification delivery is provided by the Android runtime shell.
    }
}

@Composable
fun PremiumMerchantApp(
    runtime: PremiumMerchantRuntime,
    merchantSettingsStore: PremiumMerchantSettingsStore = InMemoryPremiumMerchantSettingsStore(),
    uiLocked: Boolean = false,
    onRequestUnlock: (onUnlocked: () -> Unit) -> Unit = { onUnlocked -> onUnlocked() },
    onRequestSecretReveal: (onAuthorized: () -> Unit, onUnavailable: (String) -> Unit) -> Unit =
        { onAuthorized, _ -> onAuthorized() },
    onThemeModeChanged: (PremiumThemeMode) -> Unit = {},
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
    merchantReviewNotifier: PremiumMerchantReviewNotifier = NoopPremiumMerchantReviewNotifier,
    onOpenNotificationSettings: () -> Unit = {}
) {
    val context = LocalContext.current
    val developerGuidePdfUrl = remember { resolveDeveloperGuidePdfUrl() }
    val scope = rememberCoroutineScope()
    var activeRuntime by remember(mobileMerchantSessionStore) {
        mutableStateOf(mobileMerchantSessionStore.currentSession()?.let(mobileRuntimeFactory) ?: runtime)
    }
    LaunchedEffect(mobileMerchantSessionStore, accountAuthRepository) {
        // Sliding session renewal: every app start extends the mobile session so an
        // active merchant never hits the fixed TTL wall and loses the binding.
        val repository = accountAuthRepository ?: return@LaunchedEffect
        val session = mobileMerchantSessionStore.currentSession() ?: return@LaunchedEffect
        val refreshed = withContext(Dispatchers.IO) {
            runCatching { repository.refreshMobileSession(session) }.getOrNull()
        }
        if (refreshed != null) {
            mobileMerchantSessionStore.save(refreshed)
        }
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
    var walletDetailState by remember { mutableStateOf<PremiumScreenState<PremiumWalletDetailUiState>>(PremiumScreenState.loading()) }
    var connectedSiteState by remember { mutableStateOf<PremiumScreenState<PremiumConnectedSiteUiState>>(PremiumScreenState.loading()) }
    var configurationState by remember { mutableStateOf<PremiumScreenState<PremiumConfigurationUiState>>(PremiumScreenState.loading()) }
    var receivingMethodsState by remember { mutableStateOf<PremiumScreenState<PremiumReceivingMethodsUiState>>(PremiumScreenState.loading()) }
    var receivingMethodClearDraftSignal by remember { mutableStateOf(0) }
    var receivingMethodActionMessage by remember { mutableStateOf<String?>(null) }
    var ordersState by remember { mutableStateOf<PremiumScreenState<PremiumOrdersUiState>>(PremiumScreenState.loading()) }
    val receiverPayloadSigner = remember { AndroidKeystorePayloadSigner() }
    var banksState by remember { mutableStateOf<PremiumScreenState<PremiumBanksUiState>>(PremiumScreenState.loading()) }
    var receiverHealthState by remember { mutableStateOf<PremiumScreenState<PremiumReceiverHealthUiState>>(PremiumScreenState.loading()) }
    var merchantSettings by remember(merchantSettingsStore) { mutableStateOf(merchantSettingsStore.load()) }
    var supportResult by remember { mutableStateOf<PremiumSupportTicketResult?>(null) }
    var showStartupSplash by remember { mutableStateOf(true) }
    val notifiedReviewIds = remember { mutableSetOf<String>() }
    fun notifyNewActionRequiredReviews(state: PremiumScreenState<PremiumReviewsUiState>) {
        if (state !is PremiumScreenState.Content) return
        state.value.items
            .filter { !it.valid && notifiedReviewIds.add(it.reviewId) }
            .forEach { merchantReviewNotifier.notifyActionRequired(it) }
    }
    fun updateSettings(next: PremiumMerchantSettings) {
        merchantSettings = next
        onThemeModeChanged(next.themeMode)
    }
    fun receivingMutationMessage(state: PremiumScreenState<PremiumReceivingMethodMutationUiState>): String {
        return when (state) {
            is PremiumScreenState.Content -> state.value.message
            else -> state.message
        }
    }
    fun replaceReceivingMethod(routeId: String, submission: MerchantReceivingMethodSubmission) {
        receivingMethodActionMessage = null
        receivingMethodsState = PremiumScreenState.loading()
        scope.launch {
            val created = withContext(Dispatchers.IO) {
                activeRuntime.createReceivingMethod(submission)
            }
            if (created is PremiumScreenState.Content) {
                val deleted = withContext(Dispatchers.IO) {
                    activeRuntime.deleteReceivingMethod(routeId)
                }
                receivingMethodActionMessage = if (deleted is PremiumScreenState.Content) {
                    "Moyen modifié"
                } else {
                    "Nouveau moyen ajouté. Ancien moyen à supprimer manuellement."
                }
                receivingMethodClearDraftSignal += 1
            } else {
                receivingMethodActionMessage = receivingMutationMessage(created)
            }
            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
        }
    }
    fun currentMerchantProfileUiState(): PremiumMerchantProfileUiState {
        return PremiumMerchantProfileUiState.fromSession(mobileMerchantSessionStore.currentSession())
    }
    fun enabledReceiverBankProfileIds(): Set<String> {
        return receiverRuntimeConfigStore?.load()?.enabledBankProfileIds ?: emptySet()
    }
    fun currentConfigurationChecklist(): MerchantConfigurationChecklist {
        return activeRuntime.loadConfigurationChecklist(
            notificationAccessEnabled = notificationAccessEnabled,
            enabledBankProfileIds = enabledReceiverBankProfileIds()
        )
    }
    val navigateFromMenu: (PremiumRoute) -> Unit = { target ->
        if (target != PremiumRoute.ConnectedSite) {
            activeRuntime.clearDeveloperShowOnceExport()
        }
        route = when (target) {
            PremiumRoute.SignOut -> {
                mobileMerchantSessionStore.clear()
                activeRuntime = runtime
                PremiumRoute.AccountEntry
            }
            PremiumRoute.ReceivingMethods -> PremiumNavigation.openReceivingMethods()
            PremiumRoute.Banks -> PremiumNavigation.openBanks()
            PremiumRoute.ReceiverHealth -> PremiumNavigation.openReceiverHealth()
            PremiumRoute.ConnectedSite -> PremiumNavigation.openConnectedSite()
            PremiumRoute.ConfigurationTest -> PremiumNavigation.openConfigurationTest()
            PremiumRoute.ConfirmationMode -> PremiumNavigation.openConfirmationMode()
            PremiumRoute.Security -> PremiumNavigation.openSecurity()
            PremiumRoute.HelpCenter -> PremiumNavigation.openHelpCenter()
            PremiumRoute.SupportContact -> PremiumNavigation.openSupportContact()
            PremiumRoute.Language -> PremiumNavigation.openLanguage()
            PremiumRoute.Appearance -> PremiumNavigation.openAppearance()
            else -> target
        }
    }

    LaunchedEffect(activeRuntime, notificationAccessEnabled, uiLocked) {
        if (uiLocked) return@LaunchedEffect
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
                        result.safeMessage.ifBlank { "Receiver staging indisponible. Vérifiez la connexion et réessayez." }
                    ),
                    returnRoute = PremiumRoute.Onboarding
                )
            }
        }
    }

    LaunchedEffect(route, activeRuntime, uiLocked) {
        if (uiLocked) return@LaunchedEffect
        when (val currentRoute = route) {
            is PremiumRoute.Main -> {
                when (currentRoute.tab) {
                    PremiumMainTab.Home -> dashboardState = withContext(Dispatchers.IO) {
                        activeRuntime.loadDashboard(notificationAccessEnabled)
                    }
                    PremiumMainTab.Reviews -> {
                        reviewsState = withContext(Dispatchers.IO) { activeRuntime.loadReviews() }
                        notifyNewActionRequiredReviews(reviewsState)
                    }
                    PremiumMainTab.Payment -> receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                    PremiumMainTab.Business -> ordersState = withContext(Dispatchers.IO) { activeRuntime.loadOrders() }
                    PremiumMainTab.Settings -> {
                        connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.loadConnectedSite() }
                        configurationState = withContext(Dispatchers.IO) {
                            activeRuntime.runConfigurationTest(currentConfigurationChecklist())
                        }
                    }
                }
            }
            is PremiumRoute.PaymentDetail -> {
                paymentDetailState = withContext(Dispatchers.IO) { activeRuntime.loadPaymentDetail(currentRoute.reviewId) }
            }
            is PremiumRoute.WalletDetail -> {
                walletDetailState = withContext(Dispatchers.IO) { activeRuntime.loadWalletDetail(currentRoute.methodId) }
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
                receiverHealthState = withContext(Dispatchers.IO) {
                    activeRuntime.loadReceiverHealth(
                        notificationAccessEnabled = notificationAccessEnabled,
                        enabledBankProfileIds = enabledReceiverBankProfileIds(),
                        listenerConnected = notificationAccessEnabled,
                        outboxDepth = null
                    )
                }
            }
            PremiumRoute.ConnectedSite -> {
                connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.loadConnectedSite() }
            }
            PremiumRoute.ConfigurationTest -> {
                configurationState = withContext(Dispatchers.IO) {
                    activeRuntime.runConfigurationTest(currentConfigurationChecklist())
                }
            }
            PremiumRoute.Landing,
            PremiumRoute.AccountEntry,
            PremiumRoute.AccountProfileChoice,
            PremiumRoute.LoginProviderChoice,
            is PremiumRoute.AccountRecovery,
            is PremiumRoute.GoogleAccountLink,
            PremiumRoute.ConfirmationMode,
            PremiumRoute.Security,
            PremiumRoute.HelpCenter,
            PremiumRoute.SupportContact,
            PremiumRoute.Language,
            PremiumRoute.Appearance,
            PremiumRoute.SignOut,
            is PremiumRoute.OrderDetail -> Unit
            PremiumRoute.Onboarding -> {
                banksState = withContext(Dispatchers.IO) {
                    activeRuntime.loadBanks(enabledBankProfileIds = receiverRuntimeConfigStore?.load()?.enabledBankProfileIds ?: emptySet())
                }
            }
        }
    }

    LaunchedEffect(activeRuntime, uiLocked, route) {
        if (uiLocked) return@LaunchedEffect
        while (true) {
            val state = withContext(Dispatchers.IO) { activeRuntime.loadReviews() }
            notifyNewActionRequiredReviews(state)
            val currentRoute = route
            if (currentRoute is PremiumRoute.Main && currentRoute.tab == PremiumMainTab.Reviews) {
                reviewsState = state
            }
            delay(30_000)
        }
    }

    LaunchedEffect(Unit) {
        delay(1_450)
        showStartupSplash = false
    }

    if (uiLocked) {
        PremiumUnlockRequiredScreen(
            appLock = merchantSettings.appLock,
            language = merchantSettings.language,
            onUnlock = { onRequestUnlock {} }
        )
        return
    }

    Box(Modifier.fillMaxSize()) {
        when (val currentRoute = route) {
            PremiumRoute.SignOut,
            PremiumRoute.AccountEntry -> PremiumAccountEntryScreen(
            language = merchantSettings.language,
            onLanguageSelected = { updateSettings(merchantSettingsStore.saveLanguage(it)) },
            onCreateAccount = { route = PremiumNavigation.openAccountProfileChoice() },
            onSignIn = {
                route = PremiumNavigation.openAccountRecovery(PremiumAccountRecoveryUiState.checkingDevice())
                scope.launch {
                    val repository = accountAuthRepository
                    val lookup = withContext(Dispatchers.IO) {
                        repository?.lookupDevice(AndroidMerchantDeviceLookupIntent.RECOVER_ACCOUNT)
                    }
                    if (lookup == null || lookup.status == AndroidMerchantAuthResultStatus.ERROR) {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.error(
                                message = lookup?.safeMessage ?: "Impossible de vérifier ce téléphone pour le moment."
                            )
                        )
                        return@launch
                    }
                    if (lookup.deviceStatus == AndroidMerchantDeviceLookupStatus.KNOWN_DEVICE) {
                        route = PremiumNavigation.openAccountRecovery(PremiumAccountRecoveryUiState.restoringDevice())
                        val result = withContext(Dispatchers.IO) { repository?.recoverKnownDevice() }
                        if (result?.status == AndroidMerchantAuthResultStatus.SUCCESS && result.mobileSession != null) {
                            mobileMerchantSessionStore.save(result.mobileSession)
                            activeRuntime = mobileRuntimeFactory(result.mobileSession)
                            route = PremiumNavigation.initialRoute(
                                onboardingCompleted = onboardingCompletionStore.isCompleted(),
                                mobileMerchantSessionValid = true
                            )
                        } else {
                            route = PremiumNavigation.openLoginProviderChoice()
                        }
                    } else {
                        route = PremiumNavigation.openLoginProviderChoice()
                    }
                }
            }
            )
        PremiumRoute.AccountProfileChoice -> PremiumAccountProfileChoiceScreen(
            language = merchantSettings.language,
            onLanguageSelected = { updateSettings(merchantSettingsStore.saveLanguage(it)) },
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
                                    "Ce téléphone semble déjà lié. Utilisez Se connecter."
                                } else {
                                    "Impossible de vérifier ce téléphone pour le moment."
                                }
                            ),
                            returnRoute = PremiumRoute.AccountProfileChoice
                        )
                        return@launch
                    }
                    val idToken = googleIdTokenProvider()
                    if (idToken.isNullOrBlank()) {
                        route = PremiumNavigation.openAccountRecovery(
                            PremiumAccountRecoveryUiState.error(
                                message = "Connexion Google annulée ou indisponible."
                            ),
                            returnRoute = PremiumRoute.AccountProfileChoice
                        )
                        return@launch
                    }
                    val result = withContext(Dispatchers.IO) {
                        repository?.createAccount(idToken, profileType.toAndroidAuthProfileType())
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
            language = merchantSettings.language,
            onLanguageSelected = { updateSettings(merchantSettingsStore.saveLanguage(it)) },
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
                    val idToken = googleIdTokenProvider()
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
            language = merchantSettings.language,
            onLanguageSelected = { updateSettings(merchantSettingsStore.saveLanguage(it)) },
            onBack = { route = currentRoute.returnRoute }
        )
        is PremiumRoute.GoogleAccountLink -> PremiumGoogleAccountLinkScreen(
            state = currentRoute.state,
            language = merchantSettings.language,
            onLanguageSelected = { updateSettings(merchantSettingsStore.saveLanguage(it)) },
            onBack = { route = currentRoute.returnRoute }
        )
        PremiumRoute.Landing -> PremiumLandingScreen { route = PremiumRoute.Onboarding }
        PremiumRoute.Onboarding -> PremiumOnboardingFlow(
            notificationAccessEnabled = notificationAccessEnabled,
            bankTargetsState = banksState,
            language = merchantSettings.language,
            openNotificationSettings = onOpenNotificationSettings,
            onDone = { completedState -> finishOnboarding(completedState) }
        )
        is PremiumRoute.PaymentDetail -> PremiumPaymentDetailScreen(
            state = paymentDetailState,
            onBack = {
                route = PremiumNavigation.backFromPaymentDetail()
            },
            onConfirmReceived = {
                scope.launch {
                    paymentDetailState = PremiumScreenState.loading()
                    paymentDetailState = withContext(Dispatchers.IO) {
                        activeRuntime.confirmReceived(currentRoute.reviewId)
                    }
                }
            },
            onRejectSignal = {
                scope.launch {
                    paymentDetailState = PremiumScreenState.loading()
                    paymentDetailState = withContext(Dispatchers.IO) {
                        activeRuntime.rejectSignal(currentRoute.reviewId)
                    }
                }
            },
            onRejectOrder = {
                scope.launch {
                    paymentDetailState = PremiumScreenState.loading()
                    paymentDetailState = withContext(Dispatchers.IO) {
                        activeRuntime.rejectOrder(currentRoute.reviewId)
                    }
                }
            },
            language = merchantSettings.language
        )
        is PremiumRoute.Main -> PremiumAppShell(
            selectedTab = currentRoute.tab,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                when (currentRoute.tab) {
                    PremiumMainTab.Home -> PremiumDashboardScreen(
                        dashboardState,
                        onOpenReviews = { route = PremiumRoute.Main(PremiumMainTab.Reviews) },
                        onOpenBusiness = { route = PremiumRoute.Main(PremiumMainTab.Business) },
                        language = merchantSettings.language
                    )
                    PremiumMainTab.Reviews -> PremiumReviewsScreen(
                        state = reviewsState,
                        onOpenReview = {
                            route = PremiumNavigation.openReview(it)
                        },
                        language = merchantSettings.language
                    )
                    PremiumMainTab.Payment -> PremiumReceivingMethodsHub(
                        receivingMethodsState,
                        clearDraftSignal = receivingMethodClearDraftSignal,
                        actionMessage = receivingMethodActionMessage,
                        language = merchantSettings.language,
                        onOpenWalletDetail = { route = PremiumNavigation.openWalletDetail(it) },
                        onSaveDraft = { submission ->
                            receivingMethodActionMessage = null
                            receivingMethodsState = PremiumScreenState.loading()
                            scope.launch {
                                val mutation = withContext(Dispatchers.IO) {
                                    activeRuntime.createReceivingMethod(submission)
                                }
                                receivingMethodActionMessage = receivingMutationMessage(mutation)
                                if (mutation is PremiumScreenState.Content) {
                                    receivingMethodClearDraftSignal += 1
                                }
                                receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                            }
                        },
                        onEditMethod = { routeId, label ->
                            receivingMethodActionMessage = null
                            receivingMethodsState = PremiumScreenState.loading()
                            scope.launch {
                                val mutation = withContext(Dispatchers.IO) {
                                    activeRuntime.updateReceivingMethodLabel(routeId, label)
                                }
                                receivingMethodActionMessage = receivingMutationMessage(mutation)
                                receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                            }
                        },
                        onReplaceMethod = { routeId, submission ->
                            replaceReceivingMethod(routeId, submission)
                        },
                        onDisableMethod = { routeId ->
                            receivingMethodActionMessage = null
                            receivingMethodsState = PremiumScreenState.loading()
                            scope.launch {
                                val mutation = withContext(Dispatchers.IO) {
                                    activeRuntime.disableReceivingMethod(routeId)
                                }
                                receivingMethodActionMessage = receivingMutationMessage(mutation)
                                receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                            }
                        },
                        onSetDefaultMethod = { routeId ->
                            receivingMethodActionMessage = null
                            receivingMethodsState = PremiumScreenState.loading()
                            scope.launch {
                                val mutation = withContext(Dispatchers.IO) {
                                    activeRuntime.markReceivingMethodRecommended(routeId)
                                }
                                receivingMethodActionMessage = receivingMutationMessage(mutation)
                                receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                            }
                        },
                        onDeleteMethod = { routeId ->
                            receivingMethodActionMessage = null
                            receivingMethodsState = PremiumScreenState.loading()
                            scope.launch {
                                val mutation = withContext(Dispatchers.IO) {
                                    activeRuntime.deleteReceivingMethod(routeId)
                                }
                                receivingMethodActionMessage = receivingMutationMessage(mutation)
                                receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                            }
                        }
                    )
                    PremiumMainTab.Business -> PremiumOrdersScreen(
                        ordersState,
                        onOpenReviews = { route = PremiumRoute.Main(PremiumMainTab.Reviews) },
                        language = merchantSettings.language
                    )
                    PremiumMainTab.Settings -> PremiumSettingsScreen(
                        connectedSite = connectedSiteState,
                        configuration = configurationState,
                        merchantProfile = currentMerchantProfileUiState(),
                        language = merchantSettings.language,
                        onNavigate = navigateFromMenu
                    )
                }
            }
        )
        PremiumRoute.ReceivingMethods -> PremiumAppShell(
            selectedTab = PremiumMainTab.Payment,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                PremiumReceivingMethodsHub(
                    receivingMethodsState,
                    clearDraftSignal = receivingMethodClearDraftSignal,
                    actionMessage = receivingMethodActionMessage,
                    language = merchantSettings.language,
                    onOpenWalletDetail = { route = PremiumNavigation.openWalletDetail(it) },
                    onSaveDraft = { submission ->
                        receivingMethodActionMessage = null
                        receivingMethodsState = PremiumScreenState.loading()
                        scope.launch {
                            val mutation = withContext(Dispatchers.IO) {
                                activeRuntime.createReceivingMethod(submission)
                            }
                            receivingMethodActionMessage = receivingMutationMessage(mutation)
                            if (mutation is PremiumScreenState.Content) {
                                receivingMethodClearDraftSignal += 1
                            }
                            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                        }
                    },
                    onEditMethod = { routeId, label ->
                        receivingMethodActionMessage = null
                        receivingMethodsState = PremiumScreenState.loading()
                        scope.launch {
                            val mutation = withContext(Dispatchers.IO) {
                                activeRuntime.updateReceivingMethodLabel(routeId, label)
                            }
                            receivingMethodActionMessage = receivingMutationMessage(mutation)
                            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                        }
                    },
                    onReplaceMethod = { routeId, submission ->
                        replaceReceivingMethod(routeId, submission)
                    },
                    onDisableMethod = { routeId ->
                        receivingMethodActionMessage = null
                        receivingMethodsState = PremiumScreenState.loading()
                        scope.launch {
                            val mutation = withContext(Dispatchers.IO) {
                                activeRuntime.disableReceivingMethod(routeId)
                            }
                            receivingMethodActionMessage = receivingMutationMessage(mutation)
                            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                        }
                    },
                    onSetDefaultMethod = { routeId ->
                        receivingMethodActionMessage = null
                        receivingMethodsState = PremiumScreenState.loading()
                        scope.launch {
                            val mutation = withContext(Dispatchers.IO) {
                                activeRuntime.markReceivingMethodRecommended(routeId)
                            }
                            receivingMethodActionMessage = receivingMutationMessage(mutation)
                            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                        }
                    },
                    onDeleteMethod = { routeId ->
                        receivingMethodActionMessage = null
                        receivingMethodsState = PremiumScreenState.loading()
                        scope.launch {
                            val mutation = withContext(Dispatchers.IO) {
                                activeRuntime.deleteReceivingMethod(routeId)
                            }
                            receivingMethodActionMessage = receivingMutationMessage(mutation)
                            receivingMethodsState = withContext(Dispatchers.IO) { activeRuntime.loadReceivingMethods() }
                        }
                    }
                )
            }
        )
        PremiumRoute.ConnectedSite -> PremiumConnectedSiteStateScreen(
            state = connectedSiteState,
            language = merchantSettings.language,
            onBack = {
                activeRuntime.clearDeveloperShowOnceExport()
                route = PremiumRoute.Main(PremiumMainTab.Business)
            },
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
            onProvisionIntegration = { webhookUrl ->
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.provisionDeveloperIntegration(webhookUrl) }
                }
            },
            onRevealSecrets = {
                onRequestSecretReveal(
                    {
                        connectedSiteState = PremiumScreenState.loading()
                        scope.launch {
                            connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.revealDeveloperSecrets() }
                        }
                    },
                    { unavailableMessage ->
                        connectedSiteState = PremiumScreenState.actionRequired(
                            "Sécurité appareil requise",
                            unavailableMessage
                        )
                    }
                )
            },
            onCopyAllForDeveloper = {
                onRequestSecretReveal(
                    {
                        connectedSiteState = PremiumScreenState.loading()
                        scope.launch {
                            val handoff = withContext(Dispatchers.IO) { activeRuntime.copyDeveloperHandoffExport() }
                            handoff.exportText?.let { exportText ->
                                context.copyDeveloperExportToClipboard(exportText)
                            }
                            connectedSiteState = handoff.state
                        }
                    },
                    { unavailableMessage ->
                        connectedSiteState = PremiumScreenState.actionRequired(
                            "Sécurité appareil requise",
                            unavailableMessage
                        )
                    }
                )
            },
            onTestWebhook = {
                connectedSiteState = PremiumScreenState.loading()
                scope.launch {
                    connectedSiteState = withContext(Dispatchers.IO) { activeRuntime.testDeveloperWebhook() }
                }
            },
            onOpenDeveloperGuide = {
                runCatching {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(developerGuidePdfUrl)).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                }.onFailure { error ->
                    Log.w("PremiumMerchantApp", "Unable to open developer guide PDF.", error)
                }
            },
            onAuthorizeCopy = { onAuthorized -> onRequestUnlock(onAuthorized) },
            onCopyDeveloperExport = { value ->
                val exportText = activeRuntime.consumeDeveloperExportText(value)
                connectedSiteState = PremiumScreenState.content(value.withoutShowOnceExport())
                exportText
            }
        )
        PremiumRoute.ConfigurationTest -> PremiumConfigurationStateScreen(configurationState) {
            route = PremiumRoute.Main(PremiumMainTab.Business)
        }
        PremiumRoute.ConfirmationMode -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = { PremiumConfirmationModeScreen(language = merchantSettings.language) }
        )
        PremiumRoute.Security -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                PremiumSecurityScreen(
                    appLock = merchantSettings.appLock,
                    googleAccountLinked = merchantSettings.googleAccountLinked,
                    language = merchantSettings.language,
                    onToggleAppLock = { enabled ->
                        if (enabled) {
                            onRequestUnlock {
                                updateSettings(
                                    merchantSettingsStore.saveAppLock(
                                        merchantSettingsStore.load().appLock.copy(enabled = true)
                                    )
                                )
                            }
                        } else {
                            updateSettings(
                                merchantSettingsStore.saveAppLock(
                                    merchantSettings.appLock.copy(enabled = false)
                                )
                            )
                        }
                    },
                    onTimeoutSelected = { timeout ->
                        updateSettings(
                            merchantSettingsStore.saveAppLock(
                                merchantSettings.appLock.copy(timeout = timeout)
                            )
                        )
                    },
                    onGoogleAccountLink = {
                        route = PremiumNavigation.openGoogleAccountLink(
                            PremiumGoogleAccountLinkUiState.pending()
                        )
                        scope.launch {
                            val session = mobileMerchantSessionStore.currentSession()
                            if (session == null) {
                                route = PremiumNavigation.openGoogleAccountLink(
                                    PremiumGoogleAccountLinkUiState.error(
                                        "Connectez-vous avant de lier Google à ce profil marchand."
                                    )
                                )
                                return@launch
                            }
                            val idToken = googleIdTokenProvider()
                            val result = if (!idToken.isNullOrBlank()) {
                                withContext(Dispatchers.IO) {
                                    accountAuthRepository?.googleLink(AuthenticatedMerchantSession.mobile(session), idToken)
                                }
                            } else {
                                AndroidMerchantAccountCreateResult(
                                    status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
                                    safeMessage = "Aucun compte Google sélectionné."
                                )
                            }
                            route = if (result?.status == AndroidMerchantAuthResultStatus.SUCCESS) {
                                updateSettings(merchantSettingsStore.saveGoogleAccountLinked(true))
                                PremiumNavigation.openGoogleAccountLink(PremiumGoogleAccountLinkUiState.success())
                            } else {
                                PremiumNavigation.openGoogleAccountLink(
                                    PremiumGoogleAccountLinkUiState.error(
                                        result?.safeMessage ?: "Association Google annulée ou indisponible."
                                    )
                                )
                            }
                        }
                    }
                )
            }
        )
        PremiumRoute.HelpCenter -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = { PremiumHelpCenterScreen(language = merchantSettings.language) }
        )
        PremiumRoute.SupportContact -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                PremiumContactSupportScreen(
                    language = merchantSettings.language,
                    result = supportResult,
                    onSubmit = { draft ->
                        supportResult = PremiumSupportTicketResult("", "submitting", "", "Envoi en cours")
                        scope.launch {
                            supportResult = withContext(Dispatchers.IO) {
                                activeRuntime.createSupportTicket(
                                    draft = draft,
                                    safeContext = mapOf(
                                        "app_version" to receiverAppVersion,
                                        "android_version" to receiverAndroidVersion,
                                        "notification_access_enabled" to notificationAccessEnabled
                                    )
                                )
                            }
                        }
                    }
                )
            }
        )
        PremiumRoute.Language -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                PremiumLanguageScreen(
                    selected = merchantSettings.language,
                    onSelect = { updateSettings(merchantSettingsStore.saveLanguage(it)) }
                )
            }
        )
        PremiumRoute.Appearance -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                    PremiumAppearanceScreen(
                        selected = merchantSettings.themeMode,
                        language = merchantSettings.language,
                        onSelect = { updateSettings(merchantSettingsStore.saveThemeMode(it)) }
                    )
            }
        )
        PremiumRoute.Banks -> PremiumAppShell(
            selectedTab = PremiumMainTab.Payment,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = { PremiumBanksStateScreen(banksState, language = merchantSettings.language) }
        )
        PremiumRoute.ReceiverHealth -> PremiumAppShell(
            selectedTab = PremiumMainTab.Settings,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                PremiumReceiverHealthStateScreen(
                    receiverHealthState,
                    onOpenNotificationSettings,
                    language = merchantSettings.language
                )
            }
        )
            is PremiumRoute.OrderDetail -> PremiumAppShell(
            selectedTab = PremiumMainTab.Business,
            onTab = { route = PremiumRoute.Main(it) },
            profileInitials = currentMerchantProfileUiState().initials,
            language = merchantSettings.language,
            content = {
                PremiumStatePanel(
                    PremiumScreenState.empty<Unit>(
                        title = "Commande à synchroniser",
                        message = "Les détails seront synchronisés dès que SwimPay sera connecté."
                    )
                )
            }
            )
            is PremiumRoute.WalletDetail -> PremiumWalletDetailScreen(
                state = walletDetailState,
                language = merchantSettings.language,
                onBack = { route = PremiumNavigation.backFromWalletDetail() }
            )
        }
        AnimatedVisibility(
            visible = showStartupSplash,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            PremiumStartupSplashScreen()
        }
    }
}

private fun PremiumMerchantProfileType.toAndroidAuthProfileType(): AndroidMerchantAccountProfileType {
    return when (this) {
        PremiumMerchantProfileType.PERSONAL -> AndroidMerchantAccountProfileType.PERSONAL
        PremiumMerchantProfileType.COMMERCE -> AndroidMerchantAccountProfileType.BUSINESS
    }
}

private const val DEVELOPER_GUIDE_PDF_PATH = "/docs/sdk-developer-integration-guide.pdf"
private const val DEVELOPER_GUIDE_FALLBACK_ORIGIN = "https://www.swimpay.pro"

private fun resolveDeveloperGuidePdfUrl(): String {
    return runCatching {
        val base = AndroidMerchantBackendConfig.configuredBaseUrl()
        val parsed = Uri.parse(base)
        val scheme = parsed.scheme ?: "https"
        val authority = parsed.encodedAuthority
        if (authority.isNullOrBlank()) {
            "$DEVELOPER_GUIDE_FALLBACK_ORIGIN$DEVELOPER_GUIDE_PDF_PATH"
        } else {
            "$scheme://$authority$DEVELOPER_GUIDE_PDF_PATH"
        }
    }.getOrElse {
        "$DEVELOPER_GUIDE_FALLBACK_ORIGIN$DEVELOPER_GUIDE_PDF_PATH"
    }
}
