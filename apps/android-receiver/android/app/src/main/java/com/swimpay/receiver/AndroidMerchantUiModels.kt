package com.swimpay.receiver

object MerchantUiLanguageContract {
    val allowedMerchantTerms: List<String> = listOf(
        "Paiement détecté",
        "À vérifier",
        "Validé",
        "Rejeté",
        "En attente",
        "Expiré",
        "Téléphone connecté",
        "Accès notifications",
        "Banque choisie",
        "Moyen de réception",
        "Carte bancaire",
        "Numéro de téléphone",
        "Webhook configuré",
        "Notification envoyée",
        "Validation manuelle en bêta"
    )

    val forbiddenMerchantFacingTerms: List<String> = listOf(
        "HMAC",
        "receiver route",
        "payment signal engine",
        "template",
        "package/cert",
        "TO_VERIFY",
        "approved_for_review_only",
        "official_bank_confirmation",
        "notification_hash",
        "webhook payload",
        "cert_sha256",
        "package_name"
    )
}

data class MerchantUiScreen(
    val id: String,
    val title: String,
    val subtitle: String? = null,
    val primaryAction: String? = null,
    val texts: List<String> = emptyList(),
    val bankRows: List<MerchantBankRow> = emptyList(),
    val methodRows: List<MerchantReceivingMethodDisplay> = emptyList()
) {
    fun visibleTexts(): List<String> {
        return buildList {
            add(title)
            subtitle?.let { add(it) }
            primaryAction?.let { add(it) }
            addAll(texts)
            bankRows.forEach { addAll(it.visibleTexts()) }
            methodRows.forEach { addAll(it.visibleTexts()) }
        }
    }
}

data class MerchantBankRow(
    val bankProfileId: String,
    val displayName: String,
    val selected: Boolean,
    val badge: String = "Validation manuelle en bêta"
) {
    fun visibleTexts(): List<String> = listOf(displayName, badge)
}

enum class NotificationAccessMerchantState {
    ACTIVE,
    ACTION_REQUIRED
}

data class MerchantNotificationAccessStatus(
    val label: String,
    val statusLabel: String,
    val allowsNextOnboardingStep: Boolean,
    val settingsIntentAction: String
)

class MerchantNotificationAccessGate {
    fun evaluate(notificationListenerAccessEnabled: Boolean): MerchantNotificationAccessStatus {
        return MerchantNotificationAccessStatus(
            label = "Accès notifications",
            statusLabel = if (notificationListenerAccessEnabled) "Activé" else "Action requise",
            allowsNextOnboardingStep = notificationListenerAccessEnabled,
            settingsIntentAction = NotificationListenerSettingsAction.intentAction
        )
    }
}

enum class ReceivingMethodType(
    val wireValue: String,
    val merchantLabel: String
) {
    CARD_TRANSFER("card_transfer", "Carte bancaire"),
    PHONE_TRANSFER("phone_transfer", "Numéro de téléphone"),
    MOBILE_MONEY("mobile_money", "Mobile money")
}

data class MerchantReceivingMethodDisplay(
    val routeId: String = "",
    // The route's real bank-profile id, carried straight from the API list response
    // (bank_id / bank_profile_id). Drives the derived notification allowlist when the
    // active receiving methods change. Empty only for placeholder/preview rows.
    val bankProfileId: String = "",
    val title: String,
    val subtitle: String,
    val helper: String? = null,
    val badge: String? = "Validation manuelle en bêta",
    val status: String = "Active",
    val actions: List<String> = listOf("Modifier", "Désactiver", "Définir par défaut")
) {
    fun visibleTexts(): List<String> {
        return buildList {
            add(title)
            add(subtitle)
            helper?.let { add(it) }
            badge?.let { add(it) }
            add(status)
            addAll(actions)
        }
    }

    companion object {
        fun masked(title: String, subtitle: String): MerchantReceivingMethodDisplay {
            val helper = if (title == ReceivingMethodType.PHONE_TRANSFER.merchantLabel) {
                "Pratique pour les virements via SBP"
            } else {
                null
            }
            return MerchantReceivingMethodDisplay(
                title = title,
                subtitle = subtitle,
                helper = helper
            )
        }

        fun fromSaved(
            bankDisplayName: String,
            type: ReceivingMethodType,
            rawIdentifier: String,
            enabled: Boolean,
            recommended: Boolean
        ): MerchantReceivingMethodDisplay {
            val maskedIdentifier = when (type) {
                ReceivingMethodType.CARD_TRANSFER -> maskCard(rawIdentifier)
                ReceivingMethodType.PHONE_TRANSFER -> maskPhone(rawIdentifier)
                ReceivingMethodType.MOBILE_MONEY -> maskPhone(rawIdentifier)
            }
            val actions = buildList {
                add("Modifier")
                if (enabled) add("Désactiver")
                if (!recommended) add("Définir par défaut")
            }
            return MerchantReceivingMethodDisplay(
                title = type.merchantLabel,
                subtitle = "$bankDisplayName · $maskedIdentifier",
                helper = if (type == ReceivingMethodType.PHONE_TRANSFER) "Pratique pour les virements via SBP" else null,
                status = if (enabled) "Active" else "Désactivée",
                actions = actions.ifEmpty { listOf("Modifier") }
            )
        }

        private fun maskCard(rawIdentifier: String): String {
            val digits = rawIdentifier.filter { it.isDigit() }
            val lastFour = digits.takeLast(4).ifBlank { "••••" }
            return "•••• $lastFour"
        }

        private fun maskPhone(rawIdentifier: String): String {
            val digits = rawIdentifier.filter { it.isDigit() }
            val lastFour = digits.takeLast(4).padStart(4, '*')
            return "+7 *** *** ${lastFour.take(2)}-${lastFour.drop(2)}"
        }
    }
}

data class MerchantConfigurationChecklist(
    val phoneConnected: Boolean,
    val bankChosen: Boolean,
    val receivingMethodAdded: Boolean,
    val connectedSiteReady: Boolean
) {
    fun allItemsReady(): Boolean = phoneConnected && bankChosen && receivingMethodAdded && connectedSiteReady

    companion object {
        val REQUIRED_LABELS: List<String> = listOf(
            "Téléphone connecté",
            "Banque choisie",
            "Moyen de réception ajouté",
            "Webhook configuré"
        )

        fun allReady(): MerchantConfigurationChecklist {
            return MerchantConfigurationChecklist(
                phoneConnected = true,
                bankChosen = true,
                receivingMethodAdded = true,
                connectedSiteReady = true
            )
        }
    }
}

enum class MerchantReviewReasonCode(val merchantLabel: String) {
    MANUAL_VALIDATION_BETA("Validation manuelle en bêta"),
    REFERENCE_NOT_VISIBLE("Référence non visible"),
    AMOUNT_ONLY_RECOGNIZED("Seul le montant a été reconnu"),
    MULTIPLE_SIMILAR_PAYMENTS("Plusieurs paiements similaires"),
    BANK_STILL_IN_TEST("Banque encore en test")
}

enum class MerchantReviewAction(
    val label: String,
    val rejectsOrderByDefault: Boolean
) {
    REJECT_SIGNAL("Rejeter le signal", false),
    REJECT_ORDER("Rejeter la commande", true)
}

class AndroidMerchantUiCatalog {
    fun welcomeScreen(): MerchantUiScreen {
        return MerchantUiScreen(
            id = "welcome",
            title = "Recevez vos paiements plus facilement",
            subtitle = "SwimPay détecte les paiements reçus, vous aide à les valider et prévient votre site ou votre application.",
            primaryAction = "Commencer",
            texts = listOf(
                "Détection rapide",
                "Repérez plus vite les paiements reçus.",
                "Validation simple",
                "Confirmez ou rejetez en quelques secondes.",
                "Business connecté",
                "Votre site ou application reçoit la mise à jour."
            )
        )
    }

    fun connectPhoneScreen(state: NotificationAccessMerchantState): MerchantUiScreen {
        val stateTexts = if (state == NotificationAccessMerchantState.ACTION_REQUIRED) {
            listOf(
                "Accès nécessaire",
                "Activez l’accès aux notifications pour détecter les paiements reçus.",
                "SwimPay ne lit pas vos SMS et ne contrôle pas votre banque."
            )
        } else {
            listOf(
                "Téléphone connecté",
                "Accès notifications",
                "Activé",
                "SwimPay ne lit pas vos SMS et ne contrôle pas votre banque."
            )
        }
        return MerchantUiScreen(
            id = "connect_phone",
            title = "Connectez votre téléphone",
            subtitle = "SwimPay a besoin d’accéder aux notifications de cet appareil pour fonctionner.",
            primaryAction = if (state == NotificationAccessMerchantState.ACTION_REQUIRED) "Activer l’accès" else "Continuer",
            texts = stateTexts
        )
    }

    fun chooseBanksScreen(selectedBankIds: Set<String>): MerchantUiScreen {
        return MerchantUiScreen(
            id = "choose_banks",
            title = "Choisissez vos banques",
            subtitle = "Sélectionnez les banques que vous utilisez pour recevoir vos paiements.",
            primaryAction = "Continuer",
            texts = listOf("Validation manuelle en bêta"),
            bankRows = V1_BANKS.map {
                MerchantBankRow(
                    bankProfileId = it.first,
                    displayName = it.second,
                    selected = selectedBankIds.contains(it.first)
                )
            }
        )
    }

    fun receivingMethodSetupScreen(selectedType: ReceivingMethodType?): MerchantUiScreen {
        val selectedText = selectedType?.merchantLabel ?: "Aucun choix"
        return MerchantUiScreen(
            id = "receiving_method_setup",
            title = "Ajoutez votre moyen de réception",
            subtitle = "Vos clients utiliseront ces informations pour vous payer.",
            primaryAction = "Ajouter",
            texts = listOf(
                "Carte bancaire",
                "Recevez les paiements sur votre carte.",
                "Numéro de téléphone",
                "Pratique pour les virements via SBP.",
                selectedText
            )
        )
    }

    fun configurationTestScreen(checklist: MerchantConfigurationChecklist): MerchantUiScreen {
        val stateTexts = buildList {
            addAll(MerchantConfigurationChecklist.REQUIRED_LABELS)
            if (checklist.allItemsReady()) {
                add("SwimPay est prêt")
                add("Le backend peut envoyer un événement de test vers votre endpoint.")
            } else {
                if (!checklist.phoneConnected) {
                    add("Action requise")
                    add("Activez l’accès aux notifications pour continuer.")
                }
                if (!checklist.receivingMethodAdded) {
                    add("Action requise")
                    add("Ajoutez un moyen de réception pour continuer.")
                }
                if (!checklist.connectedSiteReady) {
                    add("Action requise")
                    add("Configurez un webhook backend avec la route publique exacte (prefixes inclus).")
                }
            }
        }
        return MerchantUiScreen(
            id = "configuration_test",
            title = "Test webhook",
            subtitle = "Lancez un test backend vers votre endpoint, sans notification réelle ni confirmation de paiement.",
            primaryAction = "Lancer le test webhook",
            texts = stateTexts
        )
    }

    fun dashboardScreen(receiverReady: Boolean): MerchantUiScreen {
        val primary = if (receiverReady) {
            listOf(
                "SwimPay est prêt",
                "Votre téléphone est connecté et vos paiements peuvent être détectés."
            )
        } else {
            listOf(
                "Action nécessaire",
                "Votre téléphone n’est pas connecté. Les paiements ne peuvent pas être détectés."
            )
        }
        return MerchantUiScreen(
            id = "dashboard",
            title = "Tableau de bord",
            texts = primary + listOf(
                "À vérifier",
                "7",
                "Validés aujourd’hui",
                "24",
                "Notifications envoyées",
                "31",
                "Téléphone",
                if (receiverReady) "Connecté" else "Action requise",
                "Derniers paiements détectés",
                "58,41 ₽",
                "Sberbank",
                "À vérifier",
                "Il y a 2 min",
                "129,00 ₽",
                "T-Bank",
                "Validé",
                "Il y a 8 min",
                "45,00 ₽",
                "Alfa-Bank",
                "En attente",
                "Il y a 12 min",
                "Accueil",
                "Revue",
                "Commandes",
                "Plus"
            )
        )
    }

    fun receivingMethodsScreen(methods: List<MerchantReceivingMethodDisplay>): MerchantUiScreen {
        val emptyTexts = if (methods.isEmpty()) {
            listOf(
                "Aucun moyen de réception",
                "Ajoutez une carte ou un téléphone SBP pour commencer à recevoir des paiements.",
                "Ajouter un moyen"
            )
        } else {
            emptyList()
        }
        return MerchantUiScreen(
            id = "receiving_methods",
            title = "Moyens de réception",
            subtitle = "Ajoutez les cartes ou numéros que vos clients utiliseront pour vous payer.",
            texts = listOf(
                "Ajouter une carte",
                "Ajoutez téléphone SBP",
                "Les informations complètes ne sont jamais envoyées dans les webhooks."
            ) + emptyTexts,
            methodRows = methods
        )
    }

    fun reviewQueueScreen(): MerchantUiScreen {
        return MerchantUiScreen(
            id = "review_queue",
            title = "Paiements à vérifier",
            subtitle = "Confirmez uniquement les paiements que vous reconnaissez.",
            texts = listOf(
                "Tous",
                "À vérifier",
                "Validés",
                "Rejetés",
                "Expirés",
                "58,41 ₽",
                "Sberbank",
                "Signal détecté il y a 2 min",
                "Examiner",
                "129,00 ₽",
                "T-Bank",
                "Référence non visible",
                "Examiner",
                "45,00 ₽",
                "Alfa-Bank",
                "Confirmé manuellement",
                "Validé",
                "Voir",
                "Aucun paiement à vérifier",
                "Les nouveaux paiements apparaîtront ici."
            )
        )
    }

    fun paymentReviewDetailScreen(reasonCodes: List<MerchantReviewReasonCode>): MerchantUiScreen {
        return MerchantUiScreen(
            id = "payment_review_detail",
            title = "Vérifier ce paiement",
            texts = listOf(
                "À vérifier",
                "Ce paiement nécessite une validation manuelle.",
                "Montant attendu",
                "58,41 ₽",
                "Montant détecté",
                "58,41 ₽",
                "Banque",
                "Sberbank",
                "Moyen de réception",
                "Carte · •••• 4821",
                "Référence",
                "TANGO ALFA",
                "Signal reçu",
                "Il y a 2 min",
                "Pourquoi ce paiement est à vérifier ?"
            ) + reasonCodes.map { it.merchantLabel } + listOf(
                MerchantReviewAction.REJECT_SIGNAL.label,
                MerchantReviewAction.REJECT_ORDER.label,
                "Rejeter ce signal ?",
                "La commande restera en attente.",
                "Rejeter la commande ?",
                "Le client devra réessayer ou contacter votre support."
            )
        )
    }

    fun connectedSiteScreen(developerDetailsEnabled: Boolean): MerchantUiScreen {
        val developerTexts = if (developerDetailsEnabled) {
            listOf(
                "payment.confirmed",
                "event_id",
                "signature status",
                "delivery attempts"
            )
        } else {
            emptyList()
        }
        return MerchantUiScreen(
            id = "connected_site",
            title = "Site ou application connecté",
            subtitle = "Votre site ou application reçoit une notification quand un paiement change de statut.",
            texts = listOf(
                "Connexion active",
                "Dernière notification envoyée il y a 3 min.",
                "Action nécessaire",
                "La dernière notification n’a pas été envoyée.",
                "URL de notification",
                "https://votre-site.com/api/v1/payments/swimpay/webhook",
                "Utilisez la route publique exacte de votre backend (exemple avec /api/v1).",
                "Statut",
                "Actif",
                "Tester la connexion",
                "Copier la clé développeur",
                "Voir les derniers envois",
                "Paiement confirmé",
                "Envoyé",
                "il y a 3 min",
                "Paiement à vérifier",
                "il y a 8 min",
                "Paiement détecté",
                "Échec",
                "il y a 12 min",
                "Afficher les détails développeur"
            ) + developerTexts
        )
    }

    fun receiverHealthScreen(notificationAccessEnabled: Boolean): MerchantUiScreen {
        val primary = if (notificationAccessEnabled) {
            listOf("Téléphone connecté", "Dernière activité : il y a 12 s")
        } else {
            listOf("Action nécessaire", "L’accès aux notifications est désactivé.", "Réactiver l’accès")
        }
        return MerchantUiScreen(
            id = "receiver_health",
            title = "Téléphone Receiver",
            subtitle = "Ce téléphone permet à SwimPay de détecter les paiements reçus.",
            texts = primary + listOf(
                "Accès notifications",
                if (notificationAccessEnabled) "Activé" else "Action requise",
                "Banques surveillées",
                "5 banques",
                "File d’envoi",
                "OK",
                "Dernière synchronisation",
                "Il y a 12 s",
                "SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.",
                "Business",
                "Paiements",
                "Développeur",
                "Sécurité",
                "Mode bêta",
                "Validation manuelle activée",
                "Les paiements doivent être confirmés avant notification finale.",
                "Automatisation disponible",
                "Cette destination a assez d’historique pour proposer une validation automatique."
            )
        )
    }

    fun merchantFacingScreens(includeDeveloperDetails: Boolean): List<MerchantUiScreen> {
        return listOf(
            welcomeScreen(),
            connectPhoneScreen(NotificationAccessMerchantState.ACTION_REQUIRED),
            chooseBanksScreen(selectedBankIds = setOf("sber_ru")),
            receivingMethodSetupScreen(selectedType = ReceivingMethodType.CARD_TRANSFER),
            configurationTestScreen(MerchantConfigurationChecklist.allReady()),
            dashboardScreen(receiverReady = true),
            receivingMethodsScreen(
                methods = listOf(
                    MerchantReceivingMethodDisplay.masked("Carte bancaire", "Sberbank · •••• 4821"),
                    MerchantReceivingMethodDisplay.masked("Numéro de téléphone", "T-Bank · +7 *** *** 45-67")
                )
            ),
            reviewQueueScreen(),
            paymentReviewDetailScreen(
                reasonCodes = listOf(
                    MerchantReviewReasonCode.MANUAL_VALIDATION_BETA,
                    MerchantReviewReasonCode.REFERENCE_NOT_VISIBLE
                )
            ),
            connectedSiteScreen(developerDetailsEnabled = includeDeveloperDetails),
            receiverHealthScreen(notificationAccessEnabled = true)
        )
    }

    companion object {
        private val V1_BANKS: List<Pair<String, String>> = listOf(
            "sber_ru" to "Sberbank",
            "tbank_ru" to "T-Bank",
            "vtb_ru" to "VTB",
            "alfa_ru" to "Alfa-Bank",
            "gazprombank_ru" to "Gazprombank"
        )
    }
}

data class AndroidMerchantFrontendContract(
    val name: String,
    val supportsLoadingEmptySuccessActionRequiredError: Boolean,
    val usesExistingLocalModel: Boolean,
    val usesMockRepository: Boolean
)

data class AndroidMerchantFrontendContractSet(
    val onboardingReadiness: AndroidMerchantFrontendContract,
    val notificationAccessStatus: AndroidMerchantFrontendContract,
    val bankSelection: AndroidMerchantFrontendContract,
    val receivingMethods: AndroidMerchantFrontendContract,
    val configurationTest: AndroidMerchantFrontendContract,
    val dashboardSummary: AndroidMerchantFrontendContract,
    val reviewQueue: AndroidMerchantFrontendContract,
    val paymentDetail: AndroidMerchantFrontendContract,
    val reviewActions: AndroidMerchantFrontendContract,
    val connectedSite: AndroidMerchantFrontendContract,
    val receiverHealth: AndroidMerchantFrontendContract,
    val missingBackendEndpoints: List<String>
)

object AndroidMerchantFrontendContracts {
    fun defaultContracts(): AndroidMerchantFrontendContractSet {
        val local = AndroidMerchantFrontendContract(
            name = "local_state_model",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = true,
            usesMockRepository = false
        )
        val mock = AndroidMerchantFrontendContract(
            name = "mock_repository_until_backend_endpoint_exists",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = false,
            usesMockRepository = true
        )
        return AndroidMerchantFrontendContractSet(
            onboardingReadiness = local,
            notificationAccessStatus = local,
            bankSelection = local,
            receivingMethods = mock,
            configurationTest = mock,
            dashboardSummary = mock,
            reviewQueue = mock,
            paymentDetail = mock,
            reviewActions = mock,
            connectedSite = mock,
            receiverHealth = local,
            missingBackendEndpoints = listOf(
                "GET /v1/android-merchant/dashboard-summary",
                "GET /v1/android-merchant/review-queue",
                "GET /v1/android-merchant/review-queue/:payment_id",
                "POST /v1/android-merchant/review-queue/:payment_id/reject-signal",
                "POST /v1/android-merchant/review-queue/:payment_id/reject-order",
                "GET /v1/android-merchant/connected-site",
                "POST /v1/android-merchant/connected-site/test"
            )
        )
    }

    fun sprint7EContracts(): AndroidMerchantFrontendContractSet {
        val local = AndroidMerchantFrontendContract(
            name = "local_state_model",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = true,
            usesMockRepository = false
        )
        val wired = AndroidMerchantFrontendContract(
            name = "authenticated_backend_api_wired",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = false,
            usesMockRepository = false
        )
        val mock = AndroidMerchantFrontendContract(
            name = "explicit_mock_repository_missing_backend_endpoint",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = false,
            usesMockRepository = true
        )
        return AndroidMerchantFrontendContractSet(
            onboardingReadiness = local,
            notificationAccessStatus = local,
            bankSelection = local,
            receivingMethods = wired,
            configurationTest = mock,
            dashboardSummary = mock,
            reviewQueue = wired,
            paymentDetail = mock,
            reviewActions = wired,
            connectedSite = mock,
            receiverHealth = local,
            missingBackendEndpoints = listOf(
                "GET /v1/android-merchant/dashboard-summary",
                "GET /v1/android-merchant/review-queue/:payment_id",
                "GET /v1/android-merchant/connected-site",
                "POST /v1/android-merchant/connected-site/test",
                "POST /v1/android-merchant/configuration-test"
            )
        )
    }

    fun sprint7FContracts(): AndroidMerchantFrontendContractSet {
        val local = AndroidMerchantFrontendContract(
            name = "local_state_model",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = true,
            usesMockRepository = false
        )
        val wired = AndroidMerchantFrontendContract(
            name = "authenticated_android_merchant_backend_api_wired",
            supportsLoadingEmptySuccessActionRequiredError = true,
            usesExistingLocalModel = false,
            usesMockRepository = false
        )
        return AndroidMerchantFrontendContractSet(
            onboardingReadiness = local,
            notificationAccessStatus = local,
            bankSelection = local,
            receivingMethods = wired,
            configurationTest = wired,
            dashboardSummary = wired,
            reviewQueue = wired,
            paymentDetail = wired,
            reviewActions = wired,
            connectedSite = wired,
            receiverHealth = local,
            missingBackendEndpoints = emptyList()
        )
    }
}
