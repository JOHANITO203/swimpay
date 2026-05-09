package com.swimpay.receiver.ui.premium

sealed interface PremiumRoute {
    data object Landing : PremiumRoute
    data object AccountEntry : PremiumRoute
    data object AccountProfileChoice : PremiumRoute
    data object LoginProviderChoice : PremiumRoute
    data class AccountRecovery(
        val state: PremiumAccountRecoveryUiState,
        val returnRoute: PremiumRoute = LoginProviderChoice
    ) : PremiumRoute
    data class GoogleAccountLink(
        val state: PremiumGoogleAccountLinkUiState,
        val returnRoute: PremiumRoute = Security
    ) : PremiumRoute
    data object Onboarding : PremiumRoute
    data class Main(val tab: PremiumMainTab = PremiumMainTab.Home) : PremiumRoute
    data class PaymentDetail(val reviewId: String) : PremiumRoute
    data object ReceivingMethods : PremiumRoute
    data object Banks : PremiumRoute
    data object ConnectedSite : PremiumRoute
    data object ReceiverHealth : PremiumRoute
    data object ConfigurationTest : PremiumRoute
    data object ConfirmationMode : PremiumRoute
    data object Security : PremiumRoute
    data object HelpCenter : PremiumRoute
    data object SupportContact : PremiumRoute
    data object Language : PremiumRoute
    data object Appearance : PremiumRoute
    data class OrderDetail(val orderId: String) : PremiumRoute
}

enum class PremiumMainTab(
    val navLabel: String,
    val accessibilityLabel: String
) {
    Home("Accueil", "Accueil"),
    Reviews("Revue", "Revue"),
    Orders("Ventes", "Ventes"),
    Menu("MENU", "Menu")
}

object PremiumNavigation {
    fun initialRoute(
        onboardingCompleted: Boolean,
        mobileMerchantSessionValid: Boolean = false
    ): PremiumRoute {
        if (!mobileMerchantSessionValid) return PremiumRoute.AccountEntry
        return if (onboardingCompleted) PremiumRoute.Main(PremiumMainTab.Home) else PremiumRoute.Onboarding
    }

    fun afterOnboarding(): PremiumRoute = PremiumRoute.Main(PremiumMainTab.Home)

    fun openAccountProfileChoice(): PremiumRoute = PremiumRoute.AccountProfileChoice

    fun openLoginProviderChoice(): PremiumRoute = PremiumRoute.LoginProviderChoice

    fun afterAccountProfileSelected(profileType: PremiumMerchantProfileType): PremiumRoute {
        return when (profileType) {
            PremiumMerchantProfileType.PERSONAL,
            PremiumMerchantProfileType.COMMERCE -> PremiumRoute.Onboarding
        }
    }

    fun openAccountRecovery(
        state: PremiumAccountRecoveryUiState,
        returnRoute: PremiumRoute = PremiumRoute.LoginProviderChoice
    ): PremiumRoute {
        return PremiumRoute.AccountRecovery(state, returnRoute)
    }

    fun openGoogleAccountLink(
        state: PremiumGoogleAccountLinkUiState,
        returnRoute: PremiumRoute = PremiumRoute.Security
    ): PremiumRoute {
        return PremiumRoute.GoogleAccountLink(state, returnRoute)
    }

    fun openReview(reviewId: String): PremiumRoute = PremiumRoute.PaymentDetail(reviewId)

    fun backFromPaymentDetail(): PremiumRoute = PremiumRoute.Main(PremiumMainTab.Reviews)

    fun openReceivingMethods(): PremiumRoute = PremiumRoute.ReceivingMethods

    fun openBanks(): PremiumRoute = PremiumRoute.Banks

    fun openReceiverHealth(): PremiumRoute = PremiumRoute.ReceiverHealth

    fun openConnectedSite(): PremiumRoute = PremiumRoute.ConnectedSite

    fun openConfigurationTest(): PremiumRoute = PremiumRoute.ConfigurationTest

    fun openConfirmationMode(): PremiumRoute = PremiumRoute.ConfirmationMode

    fun openSecurity(): PremiumRoute = PremiumRoute.Security

    fun openHelpCenter(): PremiumRoute = PremiumRoute.HelpCenter

    fun openSupportContact(): PremiumRoute = PremiumRoute.SupportContact

    fun openLanguage(): PremiumRoute = PremiumRoute.Language

    fun openAppearance(): PremiumRoute = PremiumRoute.Appearance
}

sealed interface PremiumScreenState<out T> {
    val title: String
    val message: String
    val actionLabel: String?

    data class Content<T>(val value: T) : PremiumScreenState<T> {
        override val title: String = ""
        override val message: String = ""
        override val actionLabel: String? = null
    }

    data class Loading(
        override val title: String,
        override val message: String,
        override val actionLabel: String? = null
    ) : PremiumScreenState<Nothing>

    data class Empty(
        override val title: String,
        override val message: String,
        override val actionLabel: String? = null
    ) : PremiumScreenState<Nothing>

    data class ActionRequired(
        override val title: String,
        override val message: String,
        override val actionLabel: String? = null
    ) : PremiumScreenState<Nothing>

    data class Error(
        override val title: String,
        override val message: String,
        override val actionLabel: String? = "Réessayer"
    ) : PremiumScreenState<Nothing>

    data class Offline(
        override val title: String,
        override val message: String,
        override val actionLabel: String? = "Réessayer"
    ) : PremiumScreenState<Nothing>

    companion object {
        fun <T> content(value: T): PremiumScreenState<T> = Content(value)

        fun <T> loading(
            title: String = "Chargement",
            message: String = "Préparation de l’écran."
        ): PremiumScreenState<T> = Loading(title, message)

        fun <T> empty(
            title: String,
            message: String,
            actionLabel: String? = null
        ): PremiumScreenState<T> = Empty(title, message, actionLabel)

        fun <T> actionRequired(
            title: String,
            message: String,
            actionLabel: String? = null
        ): PremiumScreenState<T> = ActionRequired(title, message, actionLabel)

        fun <T> error(
            title: String = "Connexion en attente",
            message: String = "Les données seront synchronisées dès que SwimPay sera connecté.",
            actionLabel: String? = "Réessayer"
        ): PremiumScreenState<T> = Error(title, message, actionLabel)

        fun <T> offline(
            title: String = "Connexion en attente",
            message: String = "Les données seront synchronisées dès que SwimPay sera connecté.",
            actionLabel: String? = "Réessayer"
        ): PremiumScreenState<T> = Offline(title, message, actionLabel)
    }
}
