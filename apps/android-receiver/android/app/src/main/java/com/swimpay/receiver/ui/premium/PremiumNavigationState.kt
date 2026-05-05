package com.swimpay.receiver.ui.premium

sealed interface PremiumRoute {
    data object Landing : PremiumRoute
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
    fun initialRoute(onboardingCompleted: Boolean): PremiumRoute {
        return if (onboardingCompleted) PremiumRoute.Main(PremiumMainTab.Home) else PremiumRoute.Landing
    }

    fun afterOnboarding(): PremiumRoute = PremiumRoute.Main(PremiumMainTab.Home)

    fun openReview(reviewId: String): PremiumRoute = PremiumRoute.PaymentDetail(reviewId)

    fun backFromPaymentDetail(): PremiumRoute = PremiumRoute.Main(PremiumMainTab.Reviews)

    fun openReceivingMethods(): PremiumRoute = PremiumRoute.ReceivingMethods

    fun openBanks(): PremiumRoute = PremiumRoute.Banks

    fun openReceiverHealth(): PremiumRoute = PremiumRoute.ReceiverHealth

    fun openConnectedSite(): PremiumRoute = PremiumRoute.ConnectedSite

    fun openConfigurationTest(): PremiumRoute = PremiumRoute.ConfigurationTest

    fun openConfirmationMode(): PremiumRoute = PremiumRoute.ConfirmationMode

    fun openSecurity(): PremiumRoute = PremiumRoute.Security
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
            title: String = "Données indisponibles",
            message: String = "Réessayez dans quelques instants.",
            actionLabel: String? = "Réessayer"
        ): PremiumScreenState<T> = Error(title, message, actionLabel)

        fun <T> offline(
            title: String = "Hors ligne",
            message: String = "Vérifiez la connexion de ce téléphone.",
            actionLabel: String? = "Réessayer"
        ): PremiumScreenState<T> = Offline(title, message, actionLabel)
    }
}
