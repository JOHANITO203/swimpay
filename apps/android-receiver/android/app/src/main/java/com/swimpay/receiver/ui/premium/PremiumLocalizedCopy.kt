package com.swimpay.receiver.ui.premium

data class PremiumLocalizedCopy(
    val welcomeTitle: String,
    val welcomeBody: String,
    val createAccount: String,
    val signIn: String,
    val chooseProfileTitle: String,
    val sameRights: String,
    val personalProfile: String,
    val personalProfileBody: String,
    val commerceProfile: String,
    val commerceProfileBody: String,
    val recoverTitle: String,
    val recoverBody: String,
    val googleRecovery: String,
    val googleRecoveryBody: String,
    val terminalTitle: String,
    val paymentsGroup: String,
    val banks: String,
    val receivingMethods: String,
    val confirmationMode: String,
    val businessGroup: String,
    val developerIntegration: String,
    val sales: String,
    val notifications: String,
    val applicationGroup: String,
    val appearance: String,
    val language: String,
    val security: String,
    val helpGroup: String,
    val support: String,
    val helpCenter: String,
    val signOut: String,
    val languageBody: String,
    val appearanceBody: String,
    val theme: String,
    val choose: String,
    val active: String
) {
    fun profileLabel(profileType: PremiumMerchantProfileType): String {
        return when (profileType) {
            PremiumMerchantProfileType.PERSONAL -> personalProfile
            PremiumMerchantProfileType.COMMERCE -> commerceProfile
        }
    }

    fun profileBody(profileType: PremiumMerchantProfileType): String {
        return when (profileType) {
            PremiumMerchantProfileType.PERSONAL -> personalProfileBody
            PremiumMerchantProfileType.COMMERCE -> commerceProfileBody
        }
    }

    fun themeModeLabel(mode: PremiumThemeMode): String {
        return when (this) {
            fr -> mode.labelFr
            en -> mode.labelEn
            ru -> mode.labelRu
            else -> mode.labelFr
        }
    }

    companion object {
        fun forLanguage(language: PremiumLanguageOption): PremiumLocalizedCopy {
            return when (language) {
                PremiumLanguageOption.FR -> fr
                PremiumLanguageOption.EN -> en
                PremiumLanguageOption.RU -> ru
            }
        }

        private val fr = PremiumLocalizedCopy(
            welcomeTitle = "Bienvenue sur SwimPay",
            welcomeBody = "Choisissez comment ouvrir votre espace marchand sur ce téléphone.",
            createAccount = "Créer un compte",
            signIn = "Se connecter",
            chooseProfileTitle = "Choisissez votre profil",
            sameRights = "Même accès dans l'app, quel que soit le profil choisi.",
            personalProfile = "Profil personnel",
            personalProfileBody = "Pour démarrer simplement avec un compte marchand léger.",
            commerceProfile = "Profil commerce",
            commerceProfileBody = "Pour nommer une activité ou une boutique sans changer les droits.",
            recoverTitle = "Retrouver un compte",
            recoverBody = "Choisissez un moyen de récupération pour une session déjà créée.",
            googleRecovery = "Continuer avec Google",
            googleRecoveryBody = "Récupérer un compte déjà lié pour la connexion.",
            terminalTitle = "Terminal Marchand",
            paymentsGroup = "PAIEMENTS",
            banks = "Banques",
            receivingMethods = "Moyens de réception",
            confirmationMode = "Mode de confirmation",
            businessGroup = "BUSINESS",
            developerIntegration = "Intégration développeur",
            sales = "Ventes",
            notifications = "Notifications",
            applicationGroup = "APPLICATION",
            appearance = "Apparence",
            language = "Langue",
            security = "Sécurité",
            helpGroup = "AIDE",
            support = "Contacter le support",
            helpCenter = "Centre d'aide",
            signOut = "SE DÉCONNECTER",
            languageBody = "Choisissez la langue de l'interface marchand.",
            appearanceBody = "Le changement est appliqué immédiatement à l'interface.",
            theme = "Thème",
            choose = "Choisir",
            active = "Actif"
        )

        private val en = PremiumLocalizedCopy(
            welcomeTitle = "Welcome to SwimPay",
            welcomeBody = "Choose how to open your merchant workspace on this phone.",
            createAccount = "Create account",
            signIn = "Sign in",
            chooseProfileTitle = "Choose your profile",
            sameRights = "Same app access, whichever profile you choose.",
            personalProfile = "Personal profile",
            personalProfileBody = "Start simply with a lightweight merchant account.",
            commerceProfile = "Business profile",
            commerceProfileBody = "Name a shop or activity without changing permissions.",
            recoverTitle = "Recover an account",
            recoverBody = "Choose a recovery method for an existing mobile session.",
            googleRecovery = "Continue with Google",
            googleRecoveryBody = "Recover an account already linked for sign-in.",
            terminalTitle = "Merchant Terminal",
            paymentsGroup = "PAYMENTS",
            banks = "Banks",
            receivingMethods = "Receiving methods",
            confirmationMode = "Confirmation mode",
            businessGroup = "BUSINESS",
            developerIntegration = "Developer integration",
            sales = "Sales",
            notifications = "Notifications",
            applicationGroup = "APPLICATION",
            appearance = "Appearance",
            language = "Language",
            security = "Security",
            helpGroup = "HELP",
            support = "Contact support",
            helpCenter = "Help center",
            signOut = "SIGN OUT",
            languageBody = "Choose the merchant interface language.",
            appearanceBody = "Theme changes apply immediately to the interface.",
            theme = "Theme",
            choose = "Choose",
            active = "Active"
        )

        private val ru = PremiumLocalizedCopy(
            welcomeTitle = "Добро пожаловать в SwimPay",
            welcomeBody = "Выберите, как открыть торговый кабинет на этом телефоне.",
            createAccount = "Создать аккаунт",
            signIn = "Войти",
            chooseProfileTitle = "Выберите профиль",
            sameRights = "Одинаковый доступ в приложении для любого профиля.",
            personalProfile = "Личный профиль",
            personalProfileBody = "Простой старт с легким торговым аккаунтом.",
            commerceProfile = "Профиль бизнеса",
            commerceProfileBody = "Назовите магазин или деятельность без изменения прав.",
            recoverTitle = "Восстановить аккаунт",
            recoverBody = "Выберите способ восстановления уже созданной сессии.",
            googleRecovery = "Продолжить с Google",
            googleRecoveryBody = "Восстановить аккаунт, уже привязанный для входа.",
            terminalTitle = "Торговый терминал",
            paymentsGroup = "ПЛАТЕЖИ",
            banks = "Банки",
            receivingMethods = "Способы получения",
            confirmationMode = "Режим подтверждения",
            businessGroup = "БИЗНЕС",
            developerIntegration = "Интеграция разработчика",
            sales = "Продажи",
            notifications = "Уведомления",
            applicationGroup = "ПРИЛОЖЕНИЕ",
            appearance = "Оформление",
            language = "Язык",
            security = "Безопасность",
            helpGroup = "ПОМОЩЬ",
            support = "Написать в поддержку",
            helpCenter = "Центр помощи",
            signOut = "ВЫЙТИ",
            languageBody = "Выберите язык интерфейса продавца.",
            appearanceBody = "Изменение темы применяется к интерфейсу сразу.",
            theme = "Тема",
            choose = "Выбрать",
            active = "Активно"
        )
    }
}
