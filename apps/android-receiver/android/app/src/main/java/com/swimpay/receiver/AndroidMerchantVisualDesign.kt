package com.swimpay.receiver

import android.graphics.Typeface

object AndroidMerchantColors {
    const val DEEP_NAVY: Int = -16311501 // #071B33
    const val TEAL: Int = -16738905 // #0097A7
    const val CYAN: Int = -14497847 // #23C7C9
    const val MINT_LIGHT: Int = -1510536 // #E8FAF8
    const val SURFACE: Int = -1 // #FFFFFF
    const val BACKGROUND: Int = -526340 // #F7FBFC
    const val WARNING: Int = -681437 // #F5A623
    const val SUCCESS: Int = -14502541 // #22B573
    const val DANGER: Int = -1755059 // #E5484D
    const val MUTED: Int = -9732973 // #6B7C93
    const val BORDER: Int = -2035998 // #E0EEF2
}

object AndroidMerchantTypography {
    val title: Typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    val body: Typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
    val strong: Typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
}

object AndroidMerchantSpacing {
    const val SCREEN_HORIZONTAL_DP: Int = 24
    const val SCREEN_TOP_DP: Int = 28
    const val CARD_RADIUS_DP: Int = 28
    const val BUTTON_RADIUS_DP: Int = 22
    const val PILL_RADIUS_DP: Int = 999
}

enum class AndroidMerchantVisualScreen {
    WELCOME,
    CONNECT_PHONE,
    CHOOSE_BANKS,
    ADD_RECEIVING_METHOD,
    TEST_CONFIGURATION,
    DASHBOARD,
    RECEIVING_METHODS,
    REVIEW_QUEUE,
    PAYMENT_DETAIL,
    CONNECTED_SITE,
    RECEIVER_HEALTH
}

data class AndroidMerchantVisualSnapshot(
    val notificationAccessEnabled: Boolean,
    val onboardingReady: Boolean,
    val allowedBanksCount: Int,
    val backendReachable: Boolean,
    val receivingMethods: List<MerchantReceivingMethodDisplay>,
    val dashboardScreen: MerchantUiScreen,
    val reviewQueueScreen: MerchantUiScreen,
    val paymentDetailScreen: MerchantUiScreen,
    val connectedSiteScreen: MerchantUiScreen,
    val configurationTestScreen: MerchantUiScreen
)
