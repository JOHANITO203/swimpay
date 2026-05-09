package com.swimpay.receiver.ui.premium

import com.swimpay.receiver.AuthenticatedMerchantSession
import com.swimpay.receiver.BankTargetLock
import com.swimpay.receiver.BankTargetVisibleStatus
import com.swimpay.receiver.BuildConfig
import com.swimpay.receiver.DebugBackendConfig
import com.swimpay.receiver.ExactPackageProbe
import com.swimpay.receiver.HttpUrlConnectionMerchantApiTransport
import com.swimpay.receiver.MerchantApiTransport
import com.swimpay.receiver.MerchantConfigurationChecklist
import com.swimpay.receiver.MerchantConfigurationTestApiRepository
import com.swimpay.receiver.MerchantConfigurationTestOutcome
import com.swimpay.receiver.MerchantConnectedSiteApiRepository
import com.swimpay.receiver.MerchantDashboardApiRepository
import com.swimpay.receiver.MerchantDashboardMetricsSummary
import com.swimpay.receiver.MerchantDeveloperIntegrationApiRepository
import com.swimpay.receiver.MerchantDeveloperIntegrationResult
import com.swimpay.receiver.MerchantDeveloperIntegrationSnapshot
import com.swimpay.receiver.MerchantPaymentDetailApiRepository
import com.swimpay.receiver.MerchantReceivingMethodsApiRepository
import com.swimpay.receiver.MerchantReceivingMethodDisplay
import com.swimpay.receiver.MerchantReceivingMethodMutationResult
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.MerchantRepositoryState
import com.swimpay.receiver.MerchantReviewActionsApiRepository
import com.swimpay.receiver.MerchantReviewQueueApiRepository
import com.swimpay.receiver.MerchantScreenRepositoryResult
import com.swimpay.receiver.MerchantSupportTicketApiRepository
import com.swimpay.receiver.ReceiverStatusViewModel

data class PremiumMetricUiState(
    val value: String,
    val label: String,
    val trend: String = ""
)

data class PremiumLocalSystemUiState(
    val title: String,
    val value: String,
    val helper: String = ""
)

data class PremiumChartPointUiState(
    val date: String,
    val confirmedAmountMinor: Long,
    val confirmationRate: Int
)

data class PremiumRecentPaymentUiState(
    val amount: String,
    val detail: String,
    val status: String = "À vérifier"
)

data class PremiumDashboardUiState(
    val readyTitle: String,
    val readyText: String,
    val mainMetricLabel: String = "Paiements confirmés",
    val monthlyAmount: String,
    val metrics: List<PremiumMetricUiState>,
    val chartPoints: List<PremiumChartPointUiState> = emptyList(),
    val recentPayments: List<PremiumRecentPaymentUiState>,
    val usesLiveApi: Boolean,
    val localSystemCards: List<PremiumLocalSystemUiState> = emptyList(),
    val backendNoticeTitle: String = "",
    val backendNoticeText: String = "",
    val emptyPaymentsTitle: String = "Aucun paiement détecté pour le moment",
    val emptyPaymentsAction: String = "Lancez un test"
) {
    fun visibleTexts(): List<String> {
        return listOf(
            readyTitle,
            readyText,
            mainMetricLabel,
            monthlyAmount,
            backendNoticeTitle,
            backendNoticeText,
            emptyPaymentsTitle,
            emptyPaymentsAction
        ) + metrics.flatMap { listOf(it.value, it.label, it.trend) } +
            chartPoints.flatMap { listOf(it.date, it.confirmedAmountMinor.toString(), it.confirmationRate.toString()) } +
            localSystemCards.flatMap { listOf(it.title, it.value, it.helper) } +
            recentPayments.flatMap { listOf(it.amount, it.detail, it.status) }
    }

    companion object {
        fun preview(): PremiumDashboardUiState {
            return PremiumDashboardUiState(
                readyTitle = "SwimPay est prêt",
                readyText = "Votre téléphone est connecté et vos paiements peuvent être détectés.",
                mainMetricLabel = "Paiements confirmés",
                monthlyAmount = "0 ₽",
                metrics = listOf(
                    PremiumMetricUiState("0", "À confirmer"),
                    PremiumMetricUiState("0", "Confirmés"),
                    PremiumMetricUiState("0", "Rejetés"),
                    PremiumMetricUiState("0", "Expirés"),
                    PremiumMetricUiState("0", "Échecs"),
                    PremiumMetricUiState("0 %", "Taux")
                ),
                recentPayments = emptyList(),
                usesLiveApi = false,
                localSystemCards = defaultLocalSystemCards(
                    notificationAccessEnabled = true,
                    detectedBankCount = 3,
                    receivingMethodsValue = "Connexion en attente"
                )
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
    val timeline: List<String> = emptyList(),
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
                timeline = listOf("Signal reçu", "Review créée"),
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
    val enabled: Boolean,
    val canActivate: Boolean = false
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
    val usesLiveApi: Boolean,
    val emptyTitle: String = "Aucune vente confirmée",
    val emptyMessage: String = "Vos ventes apparaîtront ici après confirmation des paiements.",
    val primaryActionLabel: String = "Lancer un test",
    val secondaryActionLabel: String = "Voir les paiements à confirmer"
) {
    fun visibleTexts(): List<String> {
        return listOf(emptyTitle, emptyMessage, primaryActionLabel, secondaryActionLabel) +
            rows.flatMap { listOf(it.orderId, it.amount, it.status, it.helper) }
    }
}

data class PremiumConnectedSiteUiState(
    val statusTitle: String,
    val statusText: String,
    val rows: List<Pair<String, String>>,
    val usesLiveApi: Boolean,
    val safeMessage: String = "",
    val developerRows: List<Pair<String, String>> = emptyList(),
    val exportLines: List<String> = emptyList(),
    val oneTimeSecrets: List<Pair<String, String>> = emptyList(),
    val webhookUrl: String = "",
    val actionButtonsEnabled: Boolean = false
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
                outcomeText = "Le backend peut envoyer un événement de test vers votre endpoint.",
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
    private val configurationTestRepository: MerchantConfigurationTestApiRepository,
    private val bankPackageProbe: ExactPackageProbe = defaultBankPackageProbe(),
    private val developerIntegrationRepository: MerchantDeveloperIntegrationApiRepository? = null,
    private val supportTicketRepository: MerchantSupportTicketApiRepository? = null
) {
    val reviewActionsAreBackendOwned: Boolean
        get() = reviewActionsRepository.backendOwnsReviewDecisions

    fun loadDashboard(notificationAccessEnabled: Boolean = true): PremiumScreenState<PremiumDashboardUiState> {
        val detectedBankCount = detectedSupportedBankCount()
        val result = dashboardRepository.load(session)
        val receivingMethodsValue = receivingMethodsDashboardValue()
        if (result.state != MerchantRepositoryState.SUCCESS) {
            return PremiumScreenState.content(
                livelyDashboardFallback(
                    notificationAccessEnabled = notificationAccessEnabled,
                    detectedBankCount = detectedBankCount,
                    receivingMethodsValue = receivingMethodsValue,
                    noticeTitle = when (result.state) {
                        MerchantRepositoryState.LOADING -> "Chargement"
                        else -> "Connexion en attente"
                    },
                    noticeText = when (result.state) {
                        MerchantRepositoryState.LOADING -> "Préparation de l'écran."
                        else -> "Les données seront synchronisées dès que SwimPay sera connecté."
                    }
                )
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
        val summary = result.dashboardMetricsSummary
        return PremiumScreenState.content(
            PremiumDashboardUiState(
                readyTitle = texts.getOrNull(1) ?: "SwimPay est prêt",
                readyText = texts.getOrNull(2) ?: "Votre téléphone est connecté et vos paiements peuvent être détectés.",
                mainMetricLabel = "Paiements confirmés",
                monthlyAmount = summary?.confirmedAmountLabel() ?: "0 ₽",
                metrics = dashboardMetricCards(summary),
                chartPoints = result.dashboardTimeseries.map {
                    PremiumChartPointUiState(
                        date = it.date,
                        confirmedAmountMinor = it.confirmedAmountMinor,
                        confirmationRate = it.confirmationRate
                    )
                },
                recentPayments = recent,
                usesLiveApi = !result.usesMockRepository,
                localSystemCards = defaultLocalSystemCards(
                    notificationAccessEnabled = notificationAccessEnabled,
                    detectedBankCount = detectedBankCount,
                    receivingMethodsValue = receivingMethodsValue
                )
            )
        )
    }

    fun loadReviews(): PremiumScreenState<PremiumReviewsUiState> {
        val result = reviewQueueRepository.list(session)
        when (result.state) {
            MerchantRepositoryState.ACTION_REQUIRED -> return PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.EMPTY -> return PremiumScreenState.empty("Aucun paiement à confirmer", "Les nouveaux paiements apparaîtront ici.")
            MerchantRepositoryState.ERROR -> return PremiumScreenState.offline()
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
            return PremiumScreenState.empty("Aucun paiement à confirmer", "Les nouveaux paiements apparaîtront ici.")
        }
        return PremiumScreenState.content(PremiumReviewsUiState(items = items, usesLiveApi = true))
    }

    fun loadPaymentDetail(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = paymentDetailRepository.load(session, reviewId)
        if (result.state != MerchantRepositoryState.SUCCESS) {
            return result.toPremiumState(
                actionMessage = "Connectez votre session marchand.",
                errorTitle = "Paiement à synchroniser",
                errorMessage = "Ce paiement ne peut pas être affiché pour le moment."
            )
        }
        val texts = result.visibleTexts()
        val summaryRows = buildList {
            add((texts.getOrNull(3) ?: "Montant attendu") to (texts.getOrNull(4) ?: "0,00 ₽"))
            add((texts.getOrNull(5) ?: "Montant détecté") to (texts.getOrNull(6) ?: "0,00 ₽"))
            add((texts.getOrNull(7) ?: "Banque") to (texts.getOrNull(8) ?: "Banque choisie"))
            add((texts.getOrNull(9) ?: "Moyen de réception") to (texts.getOrNull(10) ?: "Moyen de réception"))
            add((texts.getOrNull(11) ?: "Référence") to (texts.getOrNull(12) ?: "<REFERENCE>"))
            add((texts.getOrNull(13) ?: "Signal reçu") to (texts.getOrNull(14) ?: "Récemment"))
            result.paymentScoreLabel?.let { add("Score" to it) }
        }
        return PremiumScreenState.content(
            PremiumPaymentDetailUiState(
                reviewId = reviewId,
                statusTitle = texts.getOrNull(1) ?: "À vérifier",
                statusText = texts.getOrNull(2) ?: "Ce paiement nécessite une validation manuelle.",
                summaryRows = summaryRows,
                reasons = texts.drop(16).takeWhile { it !in REVIEW_ACTION_LABELS }.ifEmpty {
                    listOf("Validation manuelle en bêta")
                },
                timeline = result.paymentDetailTimeline,
                usesLiveApi = !result.usesMockRepository
            )
        )
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
            MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de réception", "Ajoutez une carte ou un téléphone SBP pour commencer.")
            MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.ERROR -> PremiumScreenState.offline()
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

    fun updateReceivingMethodLabel(routeId: String, label: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.updateLabel(session, routeId, label).toPremiumMutationState("Moyen modifié")
    }

    fun deleteReceivingMethod(routeId: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.delete(session, routeId).toPremiumMutationState("Moyen supprimé")
    }

    fun loadBanks(
        probe: ExactPackageProbe = bankPackageProbe,
        enabledBankProfileIds: Set<String> = emptySet()
    ): PremiumScreenState<PremiumBanksUiState> {
        val targets = BankTargetLock.resolveTargets(
            probe = probe,
            selectedBankProfileIds = enabledBankProfileIds,
            enabledBankProfileIds = enabledBankProfileIds,
            listenerReady = true
        )
        return PremiumScreenState.content(
            PremiumBanksUiState(
                items = targets.map { state ->
                    PremiumBankUiItem(
                        bankProfileId = state.bankProfileId,
                        displayName = state.displayName,
                        status = state.visibleStatus.label,
                        helper = when (state.visibleStatus) {
                            BankTargetVisibleStatus.ENABLED -> "SwimPay Intelligence activée"
                            BankTargetVisibleStatus.DETECTED -> "Peut être activée"
                            BankTargetVisibleStatus.NOT_DETECTED -> "Installez l'application bancaire"
                            BankTargetVisibleStatus.CONFIGURE -> "À configurer"
                        },
                        enabled = state.visibleStatus == BankTargetVisibleStatus.ENABLED,
                        canActivate = state.canActivate
                    )
                }
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
        developerIntegrationRepository?.let { repository ->
            return repository.load(session).toConnectedSiteState()
        }
        val result = connectedSiteRepository.load(session, developerDetailsEnabled = false)
        if (result.state == MerchantRepositoryState.EMPTY || result.state == MerchantRepositoryState.ERROR) {
            return PremiumScreenState.content(
                PremiumConnectedSiteUiState(
                    statusTitle = "Site ou application à configurer",
                    statusText = "Vous pouvez continuer à utiliser SwimPay. Les mises à jour automatiques seront disponibles après connexion.",
                    rows = listOf(
                        "URL de notification" to "À configurer",
                        "Statut" to "Optionnel"
                    ),
                    usesLiveApi = false,
                    safeMessage = result.safeMessage
                )
            )
        }
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

    fun createDeveloperApiKey(): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.createApiKey(session)?.toConnectedSiteState()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun rotateDeveloperApiKey(): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.rotateApiKey(session)?.toConnectedSiteState()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun rotateDeveloperWebhookSecret(): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.rotateWebhookSecret(session)?.toConnectedSiteState()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun updateDeveloperWebhookUrl(webhookUrl: String): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.updateWebhookUrl(session, webhookUrl)?.toConnectedSiteState()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun testDeveloperWebhook(): PremiumScreenState<PremiumConnectedSiteUiState> {
        val repository = developerIntegrationRepository
            ?: return PremiumScreenState.offline(message = "Integration developpeur indisponible.")
        val test = repository.testWebhook(session)
        return repository.load(session).copy(safeMessage = test.safeMessage).toConnectedSiteState()
    }

    fun createSupportTicket(
        draft: PremiumSupportTicketDraft,
        safeContext: Map<String, Any?>
    ): PremiumSupportTicketResult {
        val repository = supportTicketRepository ?: return PremiumSupportTicketResult(
            ticketId = "",
            status = "unavailable",
            createdAt = "",
            safeMessage = "Support indisponible"
        )
        return repository.create(session, draft, safeContext)
    }

    fun runConfigurationTest(checklist: MerchantConfigurationChecklist): PremiumScreenState<PremiumConfigurationUiState> {
        val result = configurationTestRepository.run(session, checklist)
        when (result.outcome) {
            MerchantConfigurationTestOutcome.ACTION_REQUIRED -> return PremiumScreenState.actionRequired("Action requise", "Vérifiez les étapes avant de continuer.")
            MerchantConfigurationTestOutcome.ERROR -> return PremiumScreenState.offline()
            MerchantConfigurationTestOutcome.READY -> Unit
        }
        val texts = result.visibleTexts()
        return PremiumScreenState.content(
            PremiumConfigurationUiState(
                checklist = texts.take(MerchantConfigurationChecklist.REQUIRED_LABELS.size).ifEmpty {
                    MerchantConfigurationChecklist.REQUIRED_LABELS
                },
                outcomeTitle = if (texts.contains("SwimPay est prêt") || texts.contains("Webhook prêt")) "Webhook prêt" else "Action requise",
                outcomeText = if (texts.contains("SwimPay est prêt") || texts.contains("Webhook prêt")) {
                    "Le backend peut envoyer un événement de test vers votre endpoint."
                } else {
                    "Vérifiez les étapes avant de lancer le test webhook."
                },
                usesLiveApi = !result.usesMockRepository && !result.confirmsRealPayment
            )
        )
    }

    fun loadOrders(): PremiumScreenState<PremiumOrdersUiState> {
        return PremiumScreenState.content(
            PremiumOrdersUiState(
                rows = emptyList(),
                usesLiveApi = false
            )
        )
    }

    private fun detectedSupportedBankCount(): Int {
        return BankTargetLock.resolveTargets(
            probe = bankPackageProbe,
            selectedBankProfileIds = emptySet(),
            enabledBankProfileIds = emptySet(),
            listenerReady = true
        ).count { state ->
            state.visibleStatus == BankTargetVisibleStatus.DETECTED ||
                state.visibleStatus == BankTargetVisibleStatus.ENABLED
        }
    }

    private fun livelyDashboardFallback(
        notificationAccessEnabled: Boolean,
        detectedBankCount: Int,
        receivingMethodsValue: String,
        noticeTitle: String,
        noticeText: String
    ): PremiumDashboardUiState {
        return PremiumDashboardUiState(
            readyTitle = "SwimPay Intelligence",
            readyText = if (notificationAccessEnabled) {
                "Votre téléphone est connecté et prêt à écouter les banques activées."
            } else {
                "Activez l'accès notifications pour lancer l'écoute intelligente."
            },
            mainMetricLabel = "Paiements confirmés",
            monthlyAmount = "0 ₽",
            metrics = dashboardMetricCards(null),
            recentPayments = emptyList(),
            usesLiveApi = false,
            localSystemCards = defaultLocalSystemCards(
                notificationAccessEnabled = notificationAccessEnabled,
                detectedBankCount = detectedBankCount,
                receivingMethodsValue = receivingMethodsValue
            ),
            backendNoticeTitle = noticeTitle,
            backendNoticeText = noticeText
        )
    }

    private fun receivingMethodsDashboardValue(): String {
        val result = receivingMethodsRepository.list(session)
        return when (result.state) {
            MerchantRepositoryState.SUCCESS -> {
                val activeCount = result.items.count { it.status.equals("Active", ignoreCase = true) }
                when (activeCount) {
                    0 -> "À ajouter"
                    1 -> "1 actif"
                    else -> "$activeCount actifs"
                }
            }
            MerchantRepositoryState.EMPTY -> "À ajouter"
            MerchantRepositoryState.ERROR,
            MerchantRepositoryState.ACTION_REQUIRED,
            MerchantRepositoryState.LOADING -> "Connexion en attente"
        }
    }

    companion object {
        private val REVIEW_ACTION_LABELS = setOf(
            "Rejeter le signal",
            "Rejeter la commande"
        )

        fun localDev(
            baseUrl: String = DebugBackendConfig.DEFAULT_BASE_URL,
            merchantId: String = "mch_demo",
            bankPackageProbe: ExactPackageProbe = defaultBankPackageProbe()
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
                configurationTestRepository = MerchantConfigurationTestApiRepository(transport),
                bankPackageProbe = bankPackageProbe,
                developerIntegrationRepository = MerchantDeveloperIntegrationApiRepository(transport),
                supportTicketRepository = MerchantSupportTicketApiRepository(transport)
            )
        }

        fun forAppBuild(
            baseUrl: String = DebugBackendConfig.DEFAULT_BASE_URL,
            merchantId: String = "mch_demo",
            bankPackageProbe: ExactPackageProbe = defaultBankPackageProbe()
        ): PremiumMerchantRuntime {
            return if (BuildConfig.DEBUG) {
                localDev(baseUrl = baseUrl, merchantId = merchantId, bankPackageProbe = bankPackageProbe)
            } else {
                disconnected()
            }
        }

        fun mobileSession(
            mobileSession: PremiumMobileMerchantSession,
            baseUrl: String = DebugBackendConfig.DEFAULT_BASE_URL,
            bankPackageProbe: ExactPackageProbe = defaultBankPackageProbe()
        ): PremiumMerchantRuntime {
            val transport: MerchantApiTransport = HttpUrlConnectionMerchantApiTransport(baseUrl)
            return PremiumMerchantRuntime(
                session = AuthenticatedMerchantSession.mobile(mobileSession.merchantId, mobileSession.authorizationTokenForRuntime()),
                dashboardRepository = MerchantDashboardApiRepository(transport),
                reviewQueueRepository = MerchantReviewQueueApiRepository(transport),
                paymentDetailRepository = MerchantPaymentDetailApiRepository(transport),
                reviewActionsRepository = MerchantReviewActionsApiRepository(transport),
                receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
                connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
                configurationTestRepository = MerchantConfigurationTestApiRepository(transport),
                bankPackageProbe = bankPackageProbe,
                developerIntegrationRepository = MerchantDeveloperIntegrationApiRepository(transport),
                supportTicketRepository = MerchantSupportTicketApiRepository(transport)
            )
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
                configurationTestRepository = MerchantConfigurationTestApiRepository(transport),
                bankPackageProbe = StaticExactPackageProbe(emptySet())
            )
        }
    }
}

private fun MerchantDeveloperIntegrationResult.toConnectedSiteState(): PremiumScreenState<PremiumConnectedSiteUiState> {
    return when (state) {
        MerchantRepositoryState.SUCCESS -> PremiumScreenState.content(
            integration?.toPremiumConnectedSiteUiState(safeMessage = safeMessage)
                ?: PremiumConnectedSiteUiState(
                    statusTitle = "Test webhook",
                    statusText = safeMessage.ifBlank { "Test webhook envoye." },
                    rows = emptyList(),
                    usesLiveApi = true,
                    safeMessage = safeMessage,
                    actionButtonsEnabled = true
                )
        )
        MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired("Action requise", safeMessage.ifBlank { "Session marchand requise" })
        MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Integration a configurer", "Creez une cle et ajoutez une URL webhook.")
        MerchantRepositoryState.ERROR -> PremiumScreenState.offline(message = safeMessage.ifBlank { "Integration developpeur indisponible." })
        MerchantRepositoryState.LOADING -> PremiumScreenState.loading()
    }
}

private fun MerchantDeveloperIntegrationSnapshot.toPremiumConnectedSiteUiState(safeMessage: String): PremiumConnectedSiteUiState {
    val active = webhookStatus == "active"
    return PremiumConnectedSiteUiState(
        statusTitle = if (active) "Integration active" else "Integration a configurer",
        statusText = "SwimPay backend genere les identifiants. Le SDK les utilise cote app externe.",
        rows = listOf(
            "Webhook URL" to webhookUrl.ifBlank { "A configurer" },
            "Statut" to if (active) "Actif" else "Action requise"
        ),
        usesLiveApi = true,
        safeMessage = safeMessage,
        developerRows = listOf(
            "Merchant ID" to merchantId,
            "Cle publique" to publicKey,
            "Cle API" to secretKeyMasked,
            "Secret webhook" to webhookSecretMasked,
            "Evenements publics" to publicWebhookEvents.joinToString(", ")
        ),
        exportLines = exportLines(),
        oneTimeSecrets = emptyList(),
        webhookUrl = webhookUrl,
        actionButtonsEnabled = true
    )
}

private fun defaultLocalSystemCards(
    notificationAccessEnabled: Boolean,
    detectedBankCount: Int,
    receivingMethodsValue: String
): List<PremiumLocalSystemUiState> {
    val bankValue = if (detectedBankCount > 0) "$detectedBankCount détectées" else "À configurer"
    return listOf(
        PremiumLocalSystemUiState("SwimPay Intelligence", if (notificationAccessEnabled) "Prête" else "Action requise"),
        PremiumLocalSystemUiState("Téléphone connecté", if (notificationAccessEnabled) "Connecté" else "À connecter"),
        PremiumLocalSystemUiState("Notifications activées", if (notificationAccessEnabled) "Activées" else "Action requise"),
        PremiumLocalSystemUiState("Dernière activité", if (notificationAccessEnabled) "Il y a quelques instants" else "En attente"),
        PremiumLocalSystemUiState("Banques actives", bankValue),
        PremiumLocalSystemUiState("Moyens de réception", receivingMethodsValue)
    )
}

private fun dashboardMetricCards(summary: MerchantDashboardMetricsSummary?): List<PremiumMetricUiState> {
    return listOf(
        PremiumMetricUiState((summary?.pendingReviewCount ?: 0).toString(), "À confirmer"),
        PremiumMetricUiState((summary?.confirmedPaymentCount ?: 0).toString(), "Confirmés"),
        PremiumMetricUiState((summary?.rejectedPaymentCount ?: 0).toString(), "Rejetés"),
        PremiumMetricUiState((summary?.expiredPaymentCount ?: 0).toString(), "Expirés"),
        PremiumMetricUiState((summary?.failedCount ?: 0).toString(), "Échecs"),
        PremiumMetricUiState(summary?.confirmationRateLabel() ?: "0 %", "Taux")
    )
}

private fun defaultBankPackageProbe(): ExactPackageProbe {
    return StaticExactPackageProbe(
        detectedPackages = setOf(
            "ru.sberbankmobile",
            "com.idamob.tinkoff.android",
            "ru.alfabank.mobile.android"
        )
    )
}

class StaticExactPackageProbe(
    private val detectedPackages: Set<String>
) : ExactPackageProbe {
    override fun isInstalled(packageName: String): Boolean {
        require(BankTargetLock.isSupportedPackage(packageName)) {
            "Only supported bank packages can be probed"
        }
        return packageName in detectedPackages
    }
}

private fun <T> MerchantScreenRepositoryResult.toPremiumState(
    actionMessage: String,
    errorTitle: String = "Connexion en attente",
    errorMessage: String = "Les données seront synchronisées dès que SwimPay sera connecté."
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
        MerchantRepositoryState.ERROR -> PremiumScreenState.offline(
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
        MerchantRepositoryState.ERROR -> PremiumScreenState.offline("Action en attente", mutation.message)
        MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de réception", "Ajoutez une carte ou un téléphone SBP pour commencer.")
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
