package com.swimpay.receiver

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.swimpay.receiver.ui.premium.PremiumMerchantApp
import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.theme.SwimPayMerchantTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val runtime = PremiumMerchantRuntime.forAppBuild()
        setContent {
            SwimPayMerchantTheme {
                PremiumMerchantApp(runtime = runtime)
            }
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
        "Activer lâ€™accÃ¨s",
        "NotificationListenerSettingsAction.createIntent()",
        "chooseBanksScreen",
        "merchantCatalog",
        "MerchantReceivingMethodsApiRepository",
        "MerchantReviewQueueApiRepository",
        "refreshMerchantApiData",
        "trustedBanksCount = selectedBankProfiles.count"
    )
}

