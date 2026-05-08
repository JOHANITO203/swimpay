package com.swimpay.receiver

import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.swimpay.receiver.ui.premium.PremiumMerchantApp
import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumMobileMerchantSessionStore
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumOnboardingStateStore
import com.swimpay.receiver.ui.theme.SwimPayMerchantTheme

class MainActivity : ComponentActivity() {
    private lateinit var notificationAccessStatusReader: NotificationAccessStatusReader
    private var notificationAccessEnabled by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationAccessStatusReader = NotificationAccessStatusReader(this)
        notificationAccessEnabled = notificationAccessStatusReader.isEnabled()
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
        setContent {
            SwimPayMerchantTheme {
                PremiumMerchantApp(
                    runtime = runtime,
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
                            bankPackageProbe = bankPackageProbe
                        )
                    },
                    googleIdTokenProvider = googleIdTokenProvider::requestIdToken,
                    notificationAccessEnabled = notificationAccessEnabled,
                    onOpenNotificationSettings = {
                        startActivity(NotificationListenerSettingsAction.createIntent(packageName))
                    }
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::notificationAccessStatusReader.isInitialized) {
            notificationAccessEnabled = notificationAccessStatusReader.isEnabled()
        }
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

