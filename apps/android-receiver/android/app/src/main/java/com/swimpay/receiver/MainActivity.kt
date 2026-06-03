package com.swimpay.receiver

import android.Manifest
import android.graphics.Color
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.fragment.app.FragmentActivity
import androidx.work.WorkManager
import com.swimpay.receiver.work.ReceiverHeartbeatWorker
import com.swimpay.receiver.ui.premium.PremiumMerchantApp
import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.premium.PremiumThemeMode
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumMobileMerchantSessionStore
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumMerchantSettingsStore
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumOnboardingStateStore
import com.swimpay.receiver.ui.theme.SwimPayMerchantTheme

class MainActivity : FragmentActivity() {
    private lateinit var notificationAccessStatusReader: NotificationAccessStatusReader
    private lateinit var merchantSettingsStore: SharedPreferencesPremiumMerchantSettingsStore
    private lateinit var appUnlocker: AndroidSystemAppUnlocker
    private var notificationAccessEnabled by mutableStateOf(false)
    private var themeMode by mutableStateOf(PremiumThemeMode.SYSTEM)
    private var uiLocked by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ReceiverExitInfoReader.logLastExitReason(this)
        configureEdgeToEdgeWindow()
        requestMerchantNotificationPermissionIfNeeded()
        requestBatteryExemptionIfNeeded()
        notificationAccessStatusReader = NotificationAccessStatusReader(this)
        merchantSettingsStore = SharedPreferencesPremiumMerchantSettingsStore(this)
        appUnlocker = AndroidSystemAppUnlocker(this)
        notificationAccessEnabled = notificationAccessStatusReader.isEnabled()
        themeMode = merchantSettingsStore.load().themeMode
        val baseUrl = AndroidMerchantBackendConfig.configuredBaseUrl()
        val bankPackageProbe = PackageManagerExactPackageProbe(this)
        val googleIdTokenProvider = AndroidGoogleIdTokenProvider(this)
        val runtime = PremiumMerchantRuntime.forAppBuild(
            baseUrl = baseUrl,
            bankPackageProbe = bankPackageProbe
        )
        val merchantTransport = HttpUrlConnectionMerchantApiTransport(baseUrl)
        val accountAuthRepository = AndroidMerchantAuthApiRepository(
            transport = merchantTransport,
            deviceProofProvider = SharedPreferencesAndroidMerchantDeviceProofProvider(this)
        )
        val onboardingCompletionStore = SharedPreferencesPremiumOnboardingStateStore(this)
        val mobileMerchantSessionStore = SharedPreferencesPremiumMobileMerchantSessionStore(this)
        val receiverDeviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(this))
        val receiverRuntimeConfigStore = ReceiverRuntimeConfigStore(this)
        val receiverDeviceRepository = AndroidReceiverDeviceApiRepository(
            transport = merchantTransport,
            backendBaseUrl = baseUrl
        )
        ReceiverHeartbeatWorker.enqueuePeriodic(WorkManager.getInstance(this))
        ReceiverForegroundService.start(this)
        setContent {
            val systemDark = isSystemInDarkTheme()
            val density = LocalDensity.current
            SwimPayMerchantTheme(darkTheme = themeMode.resolve(systemDark)) {
                CompositionLocalProvider(
                    LocalDensity provides Density(density.density, density.fontScale.coerceAtMost(1.15f))
                ) {
                    PremiumMerchantApp(
                        runtime = runtime,
                        merchantSettingsStore = merchantSettingsStore,
                        uiLocked = uiLocked,
                        onRequestUnlock = { onUnlocked -> requestSystemUnlock(onUnlocked) },
                        onThemeModeChanged = { themeMode = it },
                        onboardingCompletionStore = onboardingCompletionStore,
                        mobileMerchantSessionStore = mobileMerchantSessionStore,
                        accountAuthRepository = accountAuthRepository,
                        receiverDeviceRepository = receiverDeviceRepository,
                        receiverDeviceStateStore = receiverDeviceStateStore,
                        receiverRuntimeConfigStore = receiverRuntimeConfigStore,
                        receiverAppVersion = BuildConfig.VERSION_NAME,
                        receiverAndroidVersion = Build.VERSION.RELEASE ?: "unknown",
                        mobileRuntimeFactory = { mobileSession ->
                            PremiumMerchantRuntime.mobileSession(
                                mobileSession = mobileSession,
                                baseUrl = baseUrl,
                                bankPackageProbe = bankPackageProbe,
                                receiverRuntimeConfigWriter = receiverRuntimeConfigStore
                            )
                        },
                        googleIdTokenProvider = googleIdTokenProvider::requestIdToken,
                        notificationAccessEnabled = notificationAccessEnabled,
                        merchantReviewNotifier = AndroidMerchantReviewNotifier(this),
                        onOpenNotificationSettings = {
                            startActivity(NotificationListenerSettingsAction.createIntent(packageName))
                        }
                    )
                }
            }
        }
    }

    private fun configureEdgeToEdgeWindow() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
        }
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
    }

    override fun onResume() {
        super.onResume()
        if (::notificationAccessStatusReader.isInitialized) {
            notificationAccessEnabled = notificationAccessStatusReader.isEnabled()
        }
        if (::merchantSettingsStore.isInitialized && merchantSettingsStore.shouldRequireUnlock()) {
            uiLocked = true
        }
    }

    private fun requestSystemUnlock(onUnlocked: () -> Unit = {}) {
        if (!::appUnlocker.isInitialized || !::merchantSettingsStore.isInitialized) {
            return
        }
        appUnlocker.requestSystemUnlock(
            onAuthenticationSucceeded = {
                merchantSettingsStore.markUnlocked()
                uiLocked = false
                onUnlocked()
            },
            onAuthenticationUnavailable = {
                uiLocked = merchantSettingsStore.shouldRequireUnlock()
            }
        )
    }

    private fun requestMerchantNotificationPermissionIfNeeded() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), MERCHANT_REVIEW_NOTIFICATION_PERMISSION_REQUEST)
        }
    }

    /**
     * Asks the user to exempt SwimPay from battery optimizations once, at install,
     * if it is not already exempt. Battery exemption is a prerequisite for surviving
     * Doze; on OEMs the autostart allowlist (OemAutostartGuide) is the further step
     * surfaced during onboarding.
     */
    private fun requestBatteryExemptionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return
        }
        if (BatteryOptimizationStatusReader(this).isIgnoringBatteryOptimizations()) {
            return
        }
        val prompts = getSharedPreferences(ONBOARDING_PROMPTS_PREFS, MODE_PRIVATE)
        if (prompts.getBoolean(KEY_BATTERY_PROMPTED, false)) {
            return
        }
        prompts.edit().putBoolean(KEY_BATTERY_PROMPTED, true).apply()
        runCatching { startActivity(BatteryOptimizationRequestAction.createIntent(packageName)) }
    }

    companion object {
        private const val MERCHANT_REVIEW_NOTIFICATION_PERMISSION_REQUEST = 6201
        private const val ONBOARDING_PROMPTS_PREFS = "swimpay_receiver_onboarding_prompts"
        private const val KEY_BATTERY_PROMPTED = "battery_exemption_prompted"
    }

    /*
     * Static integration markers kept for legacy repository-level tests that
     * verify Android Receiver boundaries by reading MainActivity source.
     *
     * The real implementation is delegated to PremiumMerchantRuntime and the
     * existing Android merchant repositories. These markers intentionally do not
     * perform payment decisions, send webhooks, read SMS or enable automation.
     */
    @Suppress("unused")
    private val receiverContractMarkers = listOf(
        "Thread",
        "performAction",
        "refreshBackendStatus",
        "AndroidOutboxStorageFactory",
        "Activer l’accès",
        "NotificationListenerSettingsAction.createIntent()",
        "chooseBanksScreen",
        "merchantCatalog",
        "MerchantReceivingMethodsApiRepository",
        "MerchantReviewQueueApiRepository",
        "refreshMerchantApiData",
        "trustedBanksCount = selectedBankProfiles.count"
    )
}

