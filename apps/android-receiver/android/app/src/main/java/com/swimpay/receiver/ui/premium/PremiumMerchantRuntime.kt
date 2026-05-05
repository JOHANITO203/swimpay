package com.swimpay.receiver.ui.premium

import com.swimpay.receiver.AuthenticatedMerchantSession
import com.swimpay.receiver.BuildConfig
import com.swimpay.receiver.DebugBackendConfig
import com.swimpay.receiver.HttpUrlConnectionMerchantApiTransport
import com.swimpay.receiver.MerchantApiTransport
import com.swimpay.receiver.MerchantConfigurationChecklist
import com.swimpay.receiver.MerchantConfigurationTestApiRepository
import com.swimpay.receiver.MerchantConfigurationTestOutcome
import com.swimpay.receiver.MerchantConnectedSiteApiRepository
import com.swimpay.receiver.MerchantDashboardApiRepository
import com.swimpay.receiver.MerchantPaymentDetailApiRepository
import com.swimpay.receiver.MerchantReceivingMethodsApiRepository
import com.swimpay.receiver.MerchantReceivingMethodDisplay
import com.swimpay.receiver.MerchantReceivingMethodMutationResult
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.MerchantRepositoryState
import com.swimpay.receiver.MerchantReviewActionsApiRepository
import com.swimpay.receiver.MerchantReviewQueueApiRepository
import com.swimpay.receiver.MerchantScreenRepositoryResult
import com.swimpay.receiver.ReceiverStatusViewModel

data class PremiumMetricUiState(
    val value: String,
    val label: String,
    val trend: String = ""
)

data class PremiumRecentPaymentUiState(
    val amount: String,
    val detail: String,
    val status: String = "À vérifier"
)

data class PremiumDashboardUiState(
    val readyTitle: String,
    val readyText: String,
    val monthlyAmount: String,
    val metrics: List<PremiumMetricUiState>,
    val recentPayments: List<PremiumRecentPaymentUiState>,
    val usesLiveApi: Boolean
) {
    companion object {
        fun preview(): PremiumDashboardUiState {
            return PremiumDashboardUiState(
                readyTitle = "SwimPay est prêt",
                readyText = "Votre téléphone est connecté et vos paiements peuvent être détectés.",
                monthlyAmount = "1 482 000 ₽",
                metrics = listOf(
                    PremiumMetricUiState("7", "À VÉRIFIER", "+2"),
                    PremiumMetricUiState("24", "VALIDÉS", "+84%")
                ),
                recentPayments = listOf(
                    PremiumRecentPaymentUiState("58,41 ₽", "Sberbank · Il y a 2 min", "À vérifier"),
                    PremiumRecentPaymentUiState("129,00 ₽", "T-Bank · Il y a 8 min", "Validé"),
                    PremiumRecentPaymentUiState("45,00 ₽", "Alfa-Bank · Il y a 12 min", "En attente")
                ),
                usesLiveApi = false
            )
        }
    }
}

data class PremiumReviewUiItem(
    val reviewId: String,
    val amount: String,
    val bank: String,
    val status: String,
    val helper: String,
    val reasons: List<String>,
    val valid: Boolean
)

data class PremiumReviewsUiState(
    val items: List<PremiumReviewUiItem>,
    val usesLiveApi: Boolean,
    val safeMessage: String = ""
) {
    companion object {
        fun preview(): PremiumReviewsUiState {
            return PremiumReviewsUiState(
                items = listOf(
                    PremiumReviewUiItem("rev_demo_1", "58,41 ₽", "Sberbank", "À vérifier", "Signal détecté il y a 2 min", listOf("Validation manuelle en bêta"), false),
                    PremiumReviewUiItem("rev_demo_2", "129,00 ₽", "T-Bank", "À vérifier", "Référence non visible", listOf("Référence non visible"), false),
                    PremiumReviewUiItem("rev_demo_3", "45,00 ₽", "Alfa-Bank", "Validé", "Confirmé manuellement", listOf("Validation manuelle en bêta"), true)
                ),
                usesLiveApi = false
            )
        }
    }
}

data class PremiumPaymentDetailUiState(
    val reviewId: String,
    val statusTitle: String,
    val statusText: String,
    val summaryRows: List<Pair<String, String>>,
    val reasons: List<String>,
    val actionMessage: String = "",
    val usesLiveApi: Boolean
) {
    companion object {
        fun preview(reviewId: String = "rev_demo_1"): PremiumPaymentDetailUiState {
            return PremiumPaymentDetailUiState(
                reviewId = reviewId,
                statusTitle = "À vérifier",
                statusText = "Ce paiement nécessite une validation manuelle.",
                summaryRows = listOf(
                    "Montant attendu" to "58,41 ₽",
                    "Montant détecté" to "58,41 ₽",
                    "Banque" to "Sberbank",
                    "Moyen de réception" to "Carte · •••• 4821",
                    "Référence" to "TANGO ALFA",
                    "Signal reçu" to "Il y a 2 min"
                ),
                reasons = listOf("Validation manuelle en bêta", "Référence non visible"),
                usesLiveApi = false
            )
        }
    }
}

data class PremiumReceivingMethodUiItem(
    val routeId: String,
    val title: String,
    val subtitle: String,
    val helper: String?,
    val badge: String?,
    val status: String,
    val enabled: Boolean,
    val recommended: Boolean,
    val actions: List<String>
) {
    fun visibleTexts(): List<String> = buildList {
        add(title)
        add(subtitle)
        helper?.let { add(it) }
        badge?.let { add(it) }
        add(status)
        addAll(actions)
    }
}

data class PremiumReceivingMethodsUiState(
    val items: List<PremiumReceivingMethodUiItem>,
    val usesLiveApi: Boolean,
    val safeMessage: String = ""
)

data class PremiumReceivingMethodMutationUiState(
    val item: PremiumReceivingMethodUiItem?,
    val clearedRawIdentifier: String,
    val message: String
) {
    fun visibleTexts(): List<String> = (item?.visibleTexts() ?: emptyList()) + message
}

data class PremiumBankUiItem(
    val bankProfileId: String,
    val displayName: String,
    val status: String,
    val helper: String,
    val enabled: Boolean
) {
    fun visibleTexts(): List<String> = listOf(displayName, status, helper)
}

data class PremiumBanksUiState(
    val items: List<PremiumBankUiItem>
) {
    fun visibleTexts(): List<String> = items.flatMap { it.visibleTexts() }
}

data class PremiumReceiverHealthUiState(
    val statusTitle: String,
    val statusText: String,
    val rows: List<Pair<String, String>>,
    val notices: List<String>
) {
    fun visibleTexts(): List<String> {
        return listOf(statusTitle, statusText) + rows.flatMap { listOf(it.first, it.second) } + notices
    }
}

data class PremiumOrderUiItem(
    val orderId: String,
    val amount: String,
    val status: String,
    val helper: String
)

data class PremiumOrdersUiState(
    val rows: List<PremiumOrderUiItem>,
    val usesLiveApi: Boolean
)

data class PremiumConnectedSiteUiState(
    val statusTitle: String,
    val statusText: String,
    val rows: List<Pair<String, String>>,
    val usesLiveApi: Boolean,
    val safeMessage: String = ""
) {
    companion object {
        fun preview(): PremiumConnectedSiteUiState {
            return PremiumConnectedSiteUiState(
                statusTitle = "Connexion active",
                statusText = "Dernière notification envoyée il y a 3 min.",
                rows = listOf(
                    "URL de notification" to "https://votre-site.com/swimpay/webhook",
                    "Statut" to "Actif"
                ),
                usesLiveApi = false
            )
        }
    }
}

data class PremiumConfigurationUiState(
    val checklist: List<String>,
    val outcomeTitle: String,
    val outcomeText: String,
    val usesLiveApi: Boolean
) {
    companion object {
        fun preview(): PremiumConfigurationUiState {
            return PremiumConfigurationUiState(
                checklist = MerchantConfigurationChecklist.REQUIRED_LABELS,
                outcomeTitle = "SwimPay est prêt",
                outcomeText = "Votre configuration fonctionne pour la bêta.",
                usesLiveApi = false
            )
        }
    }
}

class PremiumMerchantRuntime(
    private val session: AuthenticatedMerchantSession,
    private val dashboardRepository: MerchantDashboardApiRepository,
    private val reviewQueueRepository: MerchantReviewQueueApiRepository,
    private val paymentDetailRepository: MerchantPaymentDetailApiRepository,
    private val reviewActionsRepository: MerchantReviewActionsApiRepository,
    private val receivingMethodsRepository: MerchantReceivingMethodsApiRepository,
    private val connectedSiteRepository: MerchantConnectedSiteApiRepository,
    private val configurationTestRepository: MerchantConfigurationTestApiRepository
) {
    val reviewActionsAreBackendOwned: Boolean
        get() = reviewActionsRepository.backendOwnsReviewDecisions

    fun loadDashboard(): PremiumScreenState<PremiumDashboardUiState> {
        val result = dashboardRepository.load(session)
        if (result.state != MerchantRepositoryState.SUCCESS) {
            return result.toPremiumState(
                actionMessage = "Connectez votre session marchand.",
                errorMessage = "Le tableau de bord est indisponible."
            )
        }
        val texts = result.visibleTexts()
        val recent = texts.drop(12).chunked(3).mapNotNull { chunk ->
            val amount = chunk.getOrNull(0) ?: return@mapNotNull null
            if (!amount.contains("₽") && !amount.contains("RUB", ignoreCase = true)) return@mapNotNull null
            val bank = chunk.getOrNull(1) ?: "Banque choisie"
            val status = chunk.getOrNull(2) ?: "À vérifier"
            PremiumRecentPaymentUiState(amount, "$bank · récemment", status)
        }
        val toReview = texts.getOrNull(4) ?: "0"
        val confirmed = texts.getOrNull(6) ?: "0"
        if (recent.isEmpty() && toReview == "0" && confirmed == "0") {
            return PremiumScreenState.empty(
                title = "Aucune activité",
                message = "Les paiements détectés apparaîtront ici."
            )
        }
        return PremiumScreenState.content(
            PremiumDashboardUiState(
                readyTitle = texts.getOrNull(1) ?: "SwimPay est prêt",
                readyText = texts.getOrNull(2) ?: "Votre téléphone est connecté et vos paiements peuvent être détectés.",
                monthlyAmount = recent.firstOrNull()?.amount ?: "0,00 ₽",
                metrics = listOf(
                    PremiumMetricUiState(toReview, "À VÉRIFIER"),
                    PremiumMetricUiState(confirmed, "VALIDÉS")
                ),
                recentPayments = recent,
                usesLiveApi = !result.usesMockRepository
            )
        )
    }

    fun loadReviews(): PremiumScreenState<PremiumReviewsUiState> {
        val result = reviewQueueRepository.list(session)
        when (result.state) {
            MerchantRepositoryState.ACTION_REQUIRED -> return PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.EMPTY -> return PremiumScreenState.empty("Aucun paiement À vérifier", "Les nouveaux paiements apparaîtront ici.")
            MerchantRepositoryState.ERROR -> return PremiumScreenState.error("Revue indisponible", result.safeMessage.ifBlank { "Réessayez dans quelques instants." })
            MerchantRepositoryState.LOADING -> return PremiumScreenState.loading()
            MerchantRepositoryState.SUCCESS -> Unit
        }
        val items = result.items.map {
            PremiumReviewUiItem(
                reviewId = it.reviewId,
                amount = it.amountLabel,
                bank = it.bankDisplayName,
                status = it.statusLabel,
                helper = it.helper,
                reasons = it.reasonLabels,
                valid = it.statusLabel.equals("Validé", ignoreCase = true)
            )
        }
        if (items.isEmpty()) {
            return PremiumScreenState.empty("Aucun paiement À vérifier", "Les nouveaux paiements apparaîtront ici.")
        }
        return PremiumScreenState.content(PremiumReviewsUiState(items = items, usesLiveApi = true))
    }

    fun loadPaymentDetail(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = paymentDetailRepository.load(session, reviewId)
        if (result.state != MerchantRepositoryState.SUCCESS) {
            return result.toPremiumState(
                actionMessage = "Connectez votre session marchand.",
                errorTitle = "Paiement indisponible",
                errorMessage = "Ce paiement ne peut pas être affiché pour le moment."
            )
        }
        val texts = result.visibleTexts()
        return PremiumScreenState.content(
            PremiumPaymentDetailUiState(
                reviewId = reviewId,
                statusTitle = texts.getOrNull(1) ?: "À vérifier",
                statusText = texts.getOrNull(2) ?: "Ce paiement nécessite une validation manuelle.",
                summaryRows = listOf(
                    (texts.getOrNull(3) ?: "Montant attendu") to (texts.getOrNull(4) ?: "0,00 ₽"),
                    (texts.getOrNull(5) ?: "Montant détecté") to (texts.getOrNull(6) ?: "0,00 ₽"),
                    (texts.getOrNull(7) ?: "Banque") to (texts.getOrNull(8) ?: "Banque choisie"),
                    (texts.getOrNull(9) ?: "Moyen de réception") to (texts.getOrNull(10) ?: "Moyen de réception"),
                    (texts.getOrNull(11) ?: "Référence") to (texts.getOrNull(12) ?: "<REFERENCE>"),
                    (texts.getOrNull(13) ?: "Signal reçu") to (texts.getOrNull(14) ?: "Récemment")
                ),
                reasons = texts.drop(16).takeWhile { it !in REVIEW_ACTION_LABELS }.ifEmpty {
                    listOf("Validation manuelle en bêta")
                },
                usesLiveApi = !result.usesMockRepository
            )
        )
    }

    fun confirm(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = reviewActionsRepository.confirm(session, reviewId)
        return loadPaymentDetail(reviewId).withActionMessage(result.safeMessage)
    }

    fun rejectSignal(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = reviewActionsRepository.rejectSignal(session, reviewId)
        return loadPaymentDetail(reviewId).withActionMessage(result.safeMessage)
    }

    fun rejectOrder(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = reviewActionsRepository.rejectOrder(session, reviewId)
        return loadPaymentDetail(reviewId).withActionMessage(result.safeMessage)
    }

    fun loadReceivingMethods(): PremiumScreenState<PremiumReceivingMethodsUiState> {
        val result = receivingMethodsRepository.list(session)
        return when (result.state) {
            MerchantRepositoryState.SUCCESS -> PremiumScreenState.content(
                PremiumReceivingMethodsUiState(
                    items = result.items.map { it.toPremiumItem() },
                    usesLiveApi = true,
                    safeMessage = result.safeMessage
                )
            )
            MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de réception", "Ajoutez une carte ou un numéro pour commencer.")
            MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.ERROR -> PremiumScreenState.error("Moyens indisponibles", result.safeMessage.ifBlank { "Réessayez dans quelques instants." })
            MerchantRepositoryState.LOADING -> PremiumScreenState.loading()
        }
    }

    fun createReceivingMethod(
        submission: MerchantReceivingMethodSubmission
    ): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.create(session, submission).toPremiumMutationState("Moyen ajouté")
    }

    fun disableReceivingMethod(routeId: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.disable(session, routeId).toPremiumMutationState("Moyen désactivé")
    }

    fun markReceivingMethodRecommended(routeId: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.markRecommended(session, routeId).toPremiumMutationState("Défini par défaut")
    }

    fun loadBanks(): PremiumScreenState<PremiumBanksUiState> {
        return PremiumScreenState.content(
            PremiumBanksUiState(
                items = listOf(
                    PremiumBankUiItem("sber_ru", "Sberbank", "Activée", "Validation manuelle en bêta", true),
                    PremiumBankUiItem("tbank_ru", "T-Bank", "Activée", "Validation manuelle en bêta", true),
                    PremiumBankUiItem("vtb_ru", "VTB", "À configurer", "Ajoutez un moyen de réception", false),
                    PremiumBankUiItem("alfa_ru", "Alfa-Bank", "En pause", "Peut être réactivée", false),
                    PremiumBankUiItem("gazprombank_ru", "Gazprombank", "À configurer", "Ajoutez un moyen de réception", false)
                )
            )
        )
    }

    fun loadReceiverHealth(notificationAccessEnabled: Boolean): PremiumScreenState<PremiumReceiverHealthUiState> {
        val health = ReceiverStatusViewModel().buildState(
            notificationAccessEnabled = notificationAccessEnabled,
            listenerConnected = notificationAccessEnabled,
            allowedBanksCount = 5,
            trustedBanksCount = 0,
            queueLength = 0,
            backendReachable = session.isAuthenticated
        )
        return PremiumScreenState.content(
            PremiumReceiverHealthUiState(
                statusTitle = if (health.notificationAccessEnabled && health.listenerConnected) "Téléphone connecté" else "Action nécessaire",
                statusText = if (health.notificationAccessEnabled && health.listenerConnected) {
                    "Ce téléphone peut détecter les paiements reçus."
                } else {
                    "Activez l'accès notifications pour continuer."
                },
                rows = listOf(
                    "Accès notifications" to if (health.notificationAccessEnabled) "Activé" else "Action requise",
                    "Banques surveillées" to "${health.allowedBanksCount} banques",
                    "File d'envoi" to if (health.queueLength == 0) "OK" else "À vérifier",
                    "Dernière synchronisation" to if (health.backendReachable) "Il y a quelques instants" else "Hors ligne"
                ),
                notices = listOf("SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.")
            )
        )
    }

    fun loadConnectedSite(): PremiumScreenState<PremiumConnectedSiteUiState> {
        val result = connectedSiteRepository.load(session, developerDetailsEnabled = false)
        if (result.state != MerchantRepositoryState.SUCCESS) {
            return result.toPremiumState(
                actionMessage = "Connectez votre site ou application.",
                errorMessage = "Votre site n'a pas répondu au dernier test."
            )
        }
        val texts = result.visibleTexts()
        return PremiumScreenState.content(
            PremiumConnectedSiteUiState(
                statusTitle = texts.getOrNull(2) ?: "Action requise",
                statusText = "Votre site ou application reçoit une notification quand un paiement change de statut.",
                rows = listOf(
                    (texts.getOrNull(3) ?: "URL de notification") to (texts.getOrNull(4) ?: "Non configurée"),
                    (texts.getOrNull(5) ?: "Statut") to (texts.getOrNull(6) ?: "Action requise")
                ),
                usesLiveApi = !result.usesMockRepository
            )
        )
    }

    fun runConfigurationTest(checklist: MerchantConfigurationChecklist): PremiumScreenState<PremiumConfigurationUiState> {
        val result = configurationTestRepository.run(session, checklist)
        when (result.outcome) {
            MerchantConfigurationTestOutcome.ACTION_REQUIRED -> return PremiumScreenState.actionRequired("Action requise", "Vérifiez les étapes avant de continuer.")
            MerchantConfigurationTestOutcome.ERROR -> return PremiumScreenState.error("Test indisponible", "Réessayez dans quelques instants.")
            MerchantConfigurationTestOutcome.READY -> Unit
        }
        val texts = result.visibleTexts()
        return PremiumScreenState.content(
            PremiumConfigurationUiState(
                checklist = texts.take(MerchantConfigurationChecklist.REQUIRED_LABELS.size).ifEmpty {
                    MerchantConfigurationChecklist.REQUIRED_LABELS
                },
                outcomeTitle = if (texts.contains("SwimPay est prêt")) "SwimPay est prêt" else "Action requise",
                outcomeText = if (texts.contains("SwimPay est prêt")) {
                    "Votre configuration fonctionne pour la bêta."
                } else {
                    "Vérifiez les étapes avant de recevoir vos premiers paiements."
                },
                usesLiveApi = !result.usesMockRepository && !result.confirmsRealPayment
            )
        )
    }

    fun loadOrders(): PremiumScreenState<PremiumOrdersUiState> {
        return PremiumScreenState.empty("Aucune commande", "Les commandes synchronisées apparaîtront ici.")
    }

    companion object {
        private val REVIEW_ACTION_LABELS = setOf(
            "Confirmer le paiement",
            "Rejeter le signal",
            "Rejeter la commande"
        )

        fun localDev(
            baseUrl: String = DebugBackendConfig.DEFAULT_BASE_URL,
            merchantId: String = "mch_demo"
        ): PremiumMerchantRuntime {
            val transport: MerchantApiTransport = HttpUrlConnectionMerchantApiTransport(baseUrl)
            return PremiumMerchantRuntime(
                session = AuthenticatedMerchantSession.localDev(merchantId),
                dashboardRepository = MerchantDashboardApiRepository(transport),
                reviewQueueRepository = MerchantReviewQueueApiRepository(transport),
                paymentDetailRepository = MerchantPaymentDetailApiRepository(transport),
                reviewActionsRepository = MerchantReviewActionsApiRepository(transport),
                receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
                connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
                configurationTestRepository = MerchantConfigurationTestApiRepository(transport)
            )
        }

        fun forAppBuild(
            baseUrl: String = DebugBackendConfig.DEFAULT_BASE_URL,
            merchantId: String = "mch_demo"
        ): PremiumMerchantRuntime {
            return if (BuildConfig.DEBUG) {
                localDev(baseUrl = baseUrl, merchantId = merchantId)
            } else {
                disconnected()
            }
        }

        fun disconnected(): PremiumMerchantRuntime {
            val transport: MerchantApiTransport = NoopMerchantApiTransport
            return PremiumMerchantRuntime(
                session = AuthenticatedMerchantSession.missing(),
                dashboardRepository = MerchantDashboardApiRepository(transport),
                reviewQueueRepository = MerchantReviewQueueApiRepository(transport),
                paymentDetailRepository = MerchantPaymentDetailApiRepository(transport),
                reviewActionsRepository = MerchantReviewActionsApiRepository(transport),
                receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
                connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
                configurationTestRepository = MerchantConfigurationTestApiRepository(transport)
            )
        }
    }
}

private fun <T> MerchantScreenRepositoryResult.toPremiumState(
    actionMessage: String,
    errorTitle: String = "Données indisponibles",
    errorMessage: String = "Réessayez dans quelques instants."
): PremiumScreenState<T> {
    return when (state) {
        MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired(
            title = "Action requise",
            message = visibleTexts().getOrNull(1) ?: actionMessage
        )
        MerchantRepositoryState.EMPTY -> PremiumScreenState.empty(
            title = "Aucune donnée",
            message = "Les informations apparaîtront ici."
        )
        MerchantRepositoryState.ERROR -> PremiumScreenState.error(
            title = errorTitle,
            message = safeMessage.ifBlank { errorMessage }
        )
        MerchantRepositoryState.LOADING -> PremiumScreenState.loading()
        MerchantRepositoryState.SUCCESS -> PremiumScreenState.error(message = errorMessage)
    }
}

private fun MerchantReceivingMethodDisplay.toPremiumItem(): PremiumReceivingMethodUiItem {
    val enabled = status.equals("Active", ignoreCase = true)
    val recommended = !actions.contains("Définir par défaut")
    return PremiumReceivingMethodUiItem(
        routeId = routeId,
        title = title,
        subtitle = subtitle,
        helper = helper,
        badge = badge,
        status = status,
        enabled = enabled,
        recommended = recommended,
        actions = actions
    )
}

private fun MerchantReceivingMethodMutationResult.toPremiumMutationState(
    successMessage: String
): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
    val mutation = PremiumReceivingMethodMutationUiState(
        item = display?.toPremiumItem(),
        clearedRawIdentifier = clearedSubmission.rawIdentifier,
        message = safeMessage.ifBlank { successMessage }
    )
    return when (state) {
        MerchantRepositoryState.SUCCESS -> PremiumScreenState.content(mutation)
        MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired("Action requise", mutation.message)
        MerchantRepositoryState.ERROR -> PremiumScreenState.error("Moyen indisponible", mutation.message)
        MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de réception", "Ajoutez une carte ou un numéro pour commencer.")
        MerchantRepositoryState.LOADING -> PremiumScreenState.loading()
    }
}

private fun PremiumScreenState<PremiumPaymentDetailUiState>.withActionMessage(
    actionMessage: String
): PremiumScreenState<PremiumPaymentDetailUiState> {
    return when (this) {
        is PremiumScreenState.Content -> PremiumScreenState.content(value.copy(actionMessage = actionMessage))
        is PremiumScreenState.ActionRequired -> copy(message = actionMessage.ifBlank { message })
        is PremiumScreenState.Empty -> copy(message = actionMessage.ifBlank { message })
        is PremiumScreenState.Error -> copy(message = actionMessage.ifBlank { message })
        is PremiumScreenState.Loading -> this
        is PremiumScreenState.Offline -> copy(message = actionMessage.ifBlank { message })
    }
}

private object NoopMerchantApiTransport : MerchantApiTransport {
    override fun execute(request: com.swimpay.receiver.MerchantApiRequest): com.swimpay.receiver.MerchantApiResponse {
        return com.swimpay.receiver.MerchantApiResponse(
            statusCode = 503,
            body = """{"error":{"code":"merchant_session_required"}}"""
        )
    }
}
