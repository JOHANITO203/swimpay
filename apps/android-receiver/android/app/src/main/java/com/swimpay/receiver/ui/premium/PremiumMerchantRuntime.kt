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
import com.swimpay.receiver.MerchantOrderItem
import com.swimpay.receiver.MerchantPaymentDetailApiRepository
import com.swimpay.receiver.MerchantOrdersApiRepository
import com.swimpay.receiver.MerchantOrdersResult
import com.swimpay.receiver.MerchantOrdersSummary
import com.swimpay.receiver.MerchantReceivingMethodsApiRepository
import com.swimpay.receiver.MerchantReceivingMethodDisplay
import com.swimpay.receiver.MerchantReceivingMethodMutationResult
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.MerchantRepositoryState
import com.swimpay.receiver.MerchantReviewActionApiResult
import com.swimpay.receiver.MerchantReviewActionResultStatus
import com.swimpay.receiver.MerchantReviewActionsApiRepository
import com.swimpay.receiver.MerchantReviewQueueApiRepository
import com.swimpay.receiver.MerchantScreenRepositoryResult
import com.swimpay.receiver.MerchantSupportTicketApiRepository
import com.swimpay.receiver.ReceiverRuntimeState
import com.swimpay.receiver.ReceiverStatusState
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
    val status: String = "Ã€ vÃ©rifier"
)

data class PremiumDashboardUiState(
    val readyTitle: String,
    val readyText: String,
    val mainMetricLabel: String = "Paiements confirmÃ©s",
    val monthlyAmount: String,
    val metrics: List<PremiumMetricUiState>,
    val chartPoints: List<PremiumChartPointUiState> = emptyList(),
    val chartConfirmedAmountLabel: String = "â€”",
    val chartConfirmationRateLabel: String = "â€”",
    val recentPayments: List<PremiumRecentPaymentUiState>,
    val usesLiveApi: Boolean,
    val localSystemCards: List<PremiumLocalSystemUiState> = emptyList(),
    val backendNoticeTitle: String = "",
    val backendNoticeText: String = "",
    val emptyPaymentsTitle: String = "Aucun paiement dÃ©tectÃ© pour le moment",
    val emptyPaymentsAction: String = "Lancez un test"
) {
    fun visibleTexts(): List<String> {
        return listOf(
            readyTitle,
            readyText,
            mainMetricLabel,
            monthlyAmount,
            chartConfirmedAmountLabel,
            chartConfirmationRateLabel,
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
                readyTitle = "SwimPay est prÃªt",
                readyText = "Votre tÃ©lÃ©phone est connectÃ© et vos paiements peuvent Ãªtre dÃ©tectÃ©s.",
                mainMetricLabel = "Paiements confirmÃ©s",
                monthlyAmount = "0 â‚½",
                metrics = listOf(
                    PremiumMetricUiState("0", "Ã€ confirmer"),
                    PremiumMetricUiState("0", "ConfirmÃ©s"),
                    PremiumMetricUiState("0", "RejetÃ©s"),
                    PremiumMetricUiState("0", "ExpirÃ©s"),
                    PremiumMetricUiState("0", "Ã‰checs"),
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
    val reviewStatus: ReviewUiStatus = ReviewUiStatus.TO_CONFIRM,
    val status: String,
    val helper: String,
    val reasons: List<String>,
    val valid: Boolean
)

enum class ReviewUiStatus {
    TO_CONFIRM,
    CONFIRMED,
    REJECTED
}

private fun String.toReviewUiStatus(): ReviewUiStatus {
    return when (trim().lowercase()) {
        "merchant_confirmed",
        "manual_confirmed",
        "confirmed",
        "payment_confirmed" -> ReviewUiStatus.CONFIRMED
        "merchant_rejected",
        "signal_rejected",
        "order_rejected",
        "rejected" -> ReviewUiStatus.REJECTED
        else -> ReviewUiStatus.TO_CONFIRM
    }
}

data class PremiumReviewsUiState(
    val items: List<PremiumReviewUiItem>,
    val usesLiveApi: Boolean,
    val safeMessage: String = ""
) {
    companion object {
        fun preview(): PremiumReviewsUiState {
            return PremiumReviewsUiState(
                items = listOf(
                    PremiumReviewUiItem("rev_demo_1", "9 450,00 RUB", "Sberbank", ReviewUiStatus.TO_CONFIRM, "A verifier", "Ref. 5421 9988 7721", listOf("Montant exact", "Carte se terminant par 5421"), false),
                    PremiumReviewUiItem("rev_demo_2", "14 200,00 RUB", "T-Bank", ReviewUiStatus.TO_CONFIRM, "A verifier", "Ref. 8876 1122 3344", listOf("Reference non visible"), false),
                    PremiumReviewUiItem("rev_demo_3", "6 800,00 RUB", "VTB", ReviewUiStatus.TO_CONFIRM, "A verifier", "Ref. 1122 6677 8899", listOf("Validation manuelle"), false),
                    PremiumReviewUiItem("rev_demo_4", "22 950,00 RUB", "Alfa-Bank", ReviewUiStatus.TO_CONFIRM, "A verifier", "Ref. 3344 5566 7788", listOf("Validation manuelle"), false),
                    PremiumReviewUiItem("rev_demo_5", "3 150,00 RUB", "Gazprombank", ReviewUiStatus.TO_CONFIRM, "A verifier", "Ref. 7788 9900 1122", listOf("Validation manuelle"), false)
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
    val usesLiveApi: Boolean,
    val actionsEnabled: Boolean = true
) {
    companion object {
        fun preview(reviewId: String = "rev_demo_1"): PremiumPaymentDetailUiState {
            return PremiumPaymentDetailUiState(
                reviewId = reviewId,
                statusTitle = "A verifier",
                statusText = "Ce paiement necessite une validation manuelle.",
                summaryRows = listOf(
                    "Banque" to "Sberbank",
                    "Methode" to "Carte bancaire",
                    "Reference" to "#SPM-2025-05-0912",
                    "Recu le" to "21 mai 2025, 09:21:12",
                    "Montant" to "9 450,00 RUB",
                    "Confiance" to "78%",
                    "Risque" to "Montant exact attendu reconnu",
                    "Moyen de reception" to "Carte **** 5421",
                    "Signal recu" to "Il y a 2 min"
                ),
                reasons = listOf("Montant exact", "Carte se terminant par 5421", "Reference dans la notification", "Heure proche"),
                timeline = listOf("Signal recu", "Review creee"),
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
    val confirmedSalesCount: String = if (usesLiveApi) "0" else "â€”",
    val confirmedAmount: String = if (usesLiveApi) "0,00 RUB" else "â€”",
    val failedCount: String = if (usesLiveApi) "0" else "â€”",
    val confirmationRate: String = if (usesLiveApi) "0 %" else "â€”",
    val emptyTitle: String = "Aucune vente confirmÃ©e",
    val emptyMessage: String = "Vos ventes apparaÃ®tront ici aprÃ¨s confirmation des paiements.",
    val primaryActionLabel: String = "Lancer un test",
    val secondaryActionLabel: String = "Voir les paiements Ã  confirmer"
) {
    fun visibleTexts(): List<String> {
        return listOf(
            confirmedSalesCount,
            confirmedAmount,
            failedCount,
            confirmationRate,
            emptyTitle,
            emptyMessage,
            primaryActionLabel,
            secondaryActionLabel
        ) +
            rows.flatMap { listOf(it.orderId, it.amount, it.status, it.helper) }
    }
}

data class PremiumMerchantProfileUiState(
    val displayName: String = "Marchand",
    val statusLabel: String = "Profil en attente",
    val initials: String = "S."
) {
    companion object {
        fun fromSession(session: PremiumMobileMerchantSession?): PremiumMerchantProfileUiState {
            val handle = session?.displayHandle?.trim().orEmpty()
            val merchantId = session?.merchantId?.trim().orEmpty()
            val display = handle.ifBlank { "Marchand" }
            return PremiumMerchantProfileUiState(
                displayName = display,
                statusLabel = if (merchantId.isBlank()) "Profil en attente" else "Profil mobile actif",
                initials = display.initialsForProfile()
            )
        }
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
    val copyExportLines: List<String> = emptyList(),
    val oneTimeSecrets: List<Pair<String, String>> = emptyList(),
    val webhookUrl: String = "",
    val merchantAuthorizationHeaderMasked: String = "",
    val actionButtonsEnabled: Boolean = false
) {
    fun developerExportText(): String = copyExportLines.ifEmpty { exportLines }.joinToString("\n")

    fun withoutShowOnceExport(): PremiumConnectedSiteUiState {
        return copy(copyExportLines = emptyList(), oneTimeSecrets = emptyList())
    }

    companion object {
        fun preview(): PremiumConnectedSiteUiState {
            return PremiumConnectedSiteUiState(
                statusTitle = "Connexion active",
                statusText = "DerniÃ¨re notification envoyÃ©e il y a 3 min.",
                rows = listOf(
                    "URL de notification" to "https://votre-site.com/api/v1/payments/swimpay/webhook",
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
                outcomeTitle = "SwimPay est prÃªt",
                outcomeText = "Le backend peut envoyer un Ã©vÃ©nement de test vers votre endpoint.",
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
    private val supportTicketRepository: MerchantSupportTicketApiRepository? = null,
    private val ordersRepository: MerchantOrdersApiRepository = MerchantOrdersApiRepository(NoopMerchantApiTransport),
    private val nowEpochMs: () -> Long = System::currentTimeMillis
) {
    private var developerSecretKeyOnceForCopy: String? = null
    private var integrationWebhookSecretOnceForCopy: String? = null
    private var developerShowOnceCopyExpiresAtEpochMs: Long = 0L

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
                        MerchantRepositoryState.LOADING -> "PrÃ©paration de l'Ã©cran."
                        else -> "Les donnÃ©es seront synchronisÃ©es dÃ¨s que SwimPay sera connectÃ©."
                    }
                )
            )
        }
        val texts = result.visibleTexts()
        val recent = texts.drop(12).chunked(3).mapNotNull { chunk ->
            val amount = chunk.getOrNull(0) ?: return@mapNotNull null
            if (!amount.contains("â‚½") && !amount.contains("RUB", ignoreCase = true)) return@mapNotNull null
            val bank = chunk.getOrNull(1) ?: "Banque choisie"
            val status = chunk.getOrNull(2) ?: "Ã€ vÃ©rifier"
            PremiumRecentPaymentUiState(amount, "$bank Â· rÃ©cemment", status)
        }
        val dashboardChartPoints = result.dashboardTimeseries.map {
            PremiumChartPointUiState(
                date = it.date,
                confirmedAmountMinor = it.confirmedAmountMinor,
                confirmationRate = it.confirmationRate
            )
        }
        val ordersFallback = loadConfirmedOrdersFallback(
            summary = result.dashboardMetricsSummary,
            chartPoints = dashboardChartPoints,
            recentPayments = recent
        )
        val summary = result.dashboardMetricsSummary
            ?.takeUnless { it.isEmptyConfirmedDashboardSummary() && ordersFallback != null }
            ?: ordersFallback?.summary?.toDashboardMetricsSummary()
            ?: result.dashboardMetricsSummary
        val chartPoints = dashboardChartPoints.ifEmpty {
            ordersFallback?.summary?.toDashboardChartPoints().orEmpty()
        }
        val recentPayments = recent.ifEmpty {
            ordersFallback?.items?.toDashboardRecentPayments().orEmpty()
        }
        val chartConfirmedAmountMinor = chartPoints.sumOf { it.confirmedAmountMinor }
        val chartConfirmationRate = chartPoints.maxOfOrNull { it.confirmationRate }
        return PremiumScreenState.content(
            PremiumDashboardUiState(
                readyTitle = texts.getOrNull(1) ?: "SwimPay est prÃªt",
                readyText = texts.getOrNull(2) ?: "Votre tÃ©lÃ©phone est connectÃ© et vos paiements peuvent Ãªtre dÃ©tectÃ©s.",
                mainMetricLabel = "Paiements confirmÃ©s",
                monthlyAmount = summary?.confirmedAmountLabel() ?: "0 â‚½",
                metrics = dashboardMetricCards(summary),
                chartPoints = chartPoints,
                chartConfirmedAmountLabel = if (chartPoints.isEmpty()) "â€”" else formatDashboardChartAmount(chartConfirmedAmountMinor, summary?.currency ?: "RUB"),
                chartConfirmationRateLabel = chartConfirmationRate?.let { "$it %" } ?: "â€”",
                recentPayments = recentPayments,
                usesLiveApi = !result.usesMockRepository,
                localSystemCards = defaultLocalSystemCards(
                    notificationAccessEnabled = notificationAccessEnabled,
                    detectedBankCount = detectedBankCount,
                    receivingMethodsValue = receivingMethodsValue
                )
            )
        )
    }

    private fun loadConfirmedOrdersFallback(
        summary: MerchantDashboardMetricsSummary?,
        chartPoints: List<PremiumChartPointUiState>,
        recentPayments: List<PremiumRecentPaymentUiState>
    ): MerchantOrdersResult? {
        val dashboardHasConfirmedData = summary != null &&
            (summary.confirmedPaymentCount > 0 || summary.confirmedAmountMinor > 0L)
        if (dashboardHasConfirmedData && chartPoints.isNotEmpty()) return null
        if (dashboardHasConfirmedData && recentPayments.isNotEmpty()) return null
        val orders = ordersRepository.list(session)
        if (orders.state != MerchantRepositoryState.SUCCESS) return null
        if (orders.summary.confirmedOrderCount <= 0 && orders.summary.confirmedAmountMinor <= 0L) return null
        return orders
    }

    fun loadReviews(): PremiumScreenState<PremiumReviewsUiState> {
        val result = reviewQueueRepository.list(session)
        when (result.state) {
            MerchantRepositoryState.ACTION_REQUIRED -> return PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.EMPTY -> return PremiumScreenState.empty("Aucun paiement Ã  confirmer", "Les nouveaux paiements apparaÃ®tront ici.")
            MerchantRepositoryState.ERROR -> return PremiumScreenState.offline()
            MerchantRepositoryState.LOADING -> return PremiumScreenState.loading()
            MerchantRepositoryState.SUCCESS -> Unit
        }
        val items = result.items.map {
            val reviewStatus = it.reviewStatus.toReviewUiStatus()
            PremiumReviewUiItem(
                reviewId = it.reviewId,
                amount = it.amountLabel,
                bank = it.bankDisplayName,
                reviewStatus = reviewStatus,
                status = it.statusLabel,
                helper = it.helper,
                reasons = it.reasonLabels,
                valid = reviewStatus == ReviewUiStatus.CONFIRMED
            )
        }
        if (items.isEmpty()) {
            return PremiumScreenState.empty("Aucun paiement Ã  confirmer", "Les nouveaux paiements apparaÃ®tront ici.")
        }
        return PremiumScreenState.content(PremiumReviewsUiState(items = items, usesLiveApi = true))
    }

    fun loadPaymentDetail(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = paymentDetailRepository.load(session, reviewId)
        if (result.state != MerchantRepositoryState.SUCCESS) {
            return result.toPremiumState(
                actionMessage = "Connectez votre session marchand.",
                errorTitle = "Paiement Ã  synchroniser",
                errorMessage = "Ce paiement ne peut pas Ãªtre affichÃ© pour le moment."
            )
        }
        val texts = result.visibleTexts()
        val summaryRows = buildList {
            add((texts.getOrNull(3) ?: "Montant affichÃ©") to (texts.getOrNull(4) ?: "0,00 â‚½"))
            add((texts.getOrNull(5) ?: "Montant exact attendu") to (texts.getOrNull(6) ?: "0,00 â‚½"))
            add((texts.getOrNull(7) ?: "Montant dÃ©tectÃ©") to (texts.getOrNull(8) ?: "0,00 â‚½"))
            add((texts.getOrNull(9) ?: "Ã‰cart") to (texts.getOrNull(10) ?: "0,00 â‚½"))
            add((texts.getOrNull(11) ?: "Risque") to (texts.getOrNull(12) ?: "Validation manuelle requise"))
            add((texts.getOrNull(13) ?: "Banque") to (texts.getOrNull(14) ?: "Banque choisie"))
            add((texts.getOrNull(15) ?: "Moyen de rÃ©ception") to (texts.getOrNull(16) ?: "Moyen de rÃ©ception"))
            add((texts.getOrNull(17) ?: "RÃ©fÃ©rence") to (texts.getOrNull(18) ?: "<REFERENCE>"))
            add((texts.getOrNull(19) ?: "Signal reÃ§u") to (texts.getOrNull(20) ?: "RÃ©cemment"))
            result.paymentScoreLabel?.let { add("Score" to it) }
        }
        return PremiumScreenState.content(
            PremiumPaymentDetailUiState(
                reviewId = reviewId,
                statusTitle = texts.getOrNull(1) ?: "Ã€ vÃ©rifier",
                statusText = texts.getOrNull(2) ?: "Ce paiement nÃ©cessite une validation manuelle.",
                summaryRows = summaryRows,
                reasons = texts.drop(22).takeWhile { it !in REVIEW_ACTION_LABELS }.ifEmpty {
                    listOf("Validation manuelle en bÃªta")
                },
                timeline = result.paymentDetailTimeline,
                usesLiveApi = !result.usesMockRepository
            )
        )
    }

    fun confirmReceived(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = reviewActionsRepository.confirmReceived(session, reviewId)
        return resolveReviewActionState(reviewId, result)
    }

    fun rejectSignal(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = reviewActionsRepository.rejectSignal(session, reviewId)
        return resolveReviewActionState(reviewId, result)
    }

    fun rejectOrder(reviewId: String): PremiumScreenState<PremiumPaymentDetailUiState> {
        val result = reviewActionsRepository.rejectOrder(session, reviewId)
        return resolveReviewActionState(reviewId, result)
    }

    private fun resolveReviewActionState(
        reviewId: String,
        result: MerchantReviewActionApiResult
    ): PremiumScreenState<PremiumPaymentDetailUiState> {
        val refreshed = loadPaymentDetail(reviewId)
        if (refreshed is PremiumScreenState.Content) {
            return refreshed.withActionMessage(result.safeMessage)
        }
        val resolved = result.toResolvedPaymentDetail(reviewId)
        return resolved ?: refreshed.withActionMessage(result.safeMessage)
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
            MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de rÃ©ception", "Ajoutez une carte ou un tÃ©lÃ©phone SBP pour commencer.")
            MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.ERROR -> PremiumScreenState.offline()
            MerchantRepositoryState.LOADING -> PremiumScreenState.loading()
        }
    }

    fun createReceivingMethod(
        submission: MerchantReceivingMethodSubmission
    ): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.create(session, submission).toPremiumMutationState("Moyen ajoutÃ©")
    }

    fun disableReceivingMethod(routeId: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.disable(session, routeId).toPremiumMutationState("Moyen dÃ©sactivÃ©")
    }

    fun markReceivingMethodRecommended(routeId: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.markRecommended(session, routeId).toPremiumMutationState("DÃ©fini par dÃ©faut")
    }

    fun updateReceivingMethodLabel(routeId: String, label: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.updateLabel(session, routeId, label).toPremiumMutationState("Moyen modifiÃ©")
    }

    fun deleteReceivingMethod(routeId: String): PremiumScreenState<PremiumReceivingMethodMutationUiState> {
        return receivingMethodsRepository.delete(session, routeId).toPremiumMutationState("Moyen supprimÃ©")
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
                            BankTargetVisibleStatus.ENABLED -> "SwimPay Intelligence activÃ©e"
                            BankTargetVisibleStatus.DETECTED -> "Peut Ãªtre activÃ©e"
                            BankTargetVisibleStatus.NOT_DETECTED -> "Installez l'application bancaire"
                            BankTargetVisibleStatus.CONFIGURE -> "Ã€ configurer"
                        },
                        enabled = state.visibleStatus == BankTargetVisibleStatus.ENABLED,
                        canActivate = state.canActivate
                    )
                }
            )
        )
    }

    fun loadReceiverHealth(notificationAccessEnabled: Boolean): PremiumScreenState<PremiumReceiverHealthUiState> {
        return loadReceiverHealth(
            notificationAccessEnabled = notificationAccessEnabled,
            enabledBankProfileIds = emptySet(),
            listenerConnected = null,
            outboxDepth = null
        )
    }

    fun loadReceiverHealth(
        notificationAccessEnabled: Boolean,
        enabledBankProfileIds: Set<String>,
        listenerConnected: Boolean?,
        outboxDepth: Int?
    ): PremiumScreenState<PremiumReceiverHealthUiState> {
        val detectedEnabledBanks = BankTargetLock.resolveTargets(
            probe = bankPackageProbe,
            selectedBankProfileIds = enabledBankProfileIds,
            enabledBankProfileIds = enabledBankProfileIds,
            listenerReady = notificationAccessEnabled
        ).count { it.visibleStatus == BankTargetVisibleStatus.ENABLED }
        val health = ReceiverStatusViewModel().buildState(
            notificationAccessEnabled = notificationAccessEnabled,
            listenerConnected = listenerConnected ?: false,
            allowedBanksCount = enabledBankProfileIds.size,
            trustedBanksCount = detectedEnabledBanks,
            queueLength = outboxDepth ?: 1,
            backendReachable = session.isAuthenticated
        )
        val statusTitle = when (health.runtimeState) {
            ReceiverRuntimeState.LISTENING -> "TÃ©lÃ©phone connectÃ©"
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED -> "VÃ©rification requise"
            ReceiverRuntimeState.OFFLINE -> "Hors ligne"
            else -> "Action nÃ©cessaire"
        }
        val statusText = when (health.runtimeState) {
            ReceiverRuntimeState.LISTENING -> "Ce tÃ©lÃ©phone peut dÃ©tecter les paiements reÃ§us."
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED -> "Des commandes peuvent nÃ©cessiter une vÃ©rification banque."
            ReceiverRuntimeState.OFFLINE -> "La synchronisation backend est indisponible."
            ReceiverRuntimeState.DEGRADED -> receiverHealthDegradedMessage(health)
            else -> "Le Receiver est prÃªt Ã  se synchroniser."
        }
        val runtimeStateLabel = when (health.runtimeState) {
            ReceiverRuntimeState.IDLE -> "Au repos"
            ReceiverRuntimeState.ARMED -> "ArmÃ©"
            ReceiverRuntimeState.LISTENING -> "Ã€ l'Ã©coute"
            ReceiverRuntimeState.DEGRADED -> "DÃ©gradÃ©"
            ReceiverRuntimeState.OFFLINE -> "Hors ligne"
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED -> "VÃ©rification banque"
        }
        val notices = buildList {
            add("SwimPay ne lit pas vos SMS et ne contrÃ´le pas votre banque.")
            if (health.runtimeState == ReceiverRuntimeState.MANUAL_CHECK_REQUIRED) {
                add("VÃ©rifiez les commandes en attente depuis votre banque.")
            }
            if (health.runtimeState == ReceiverRuntimeState.OFFLINE || health.runtimeState == ReceiverRuntimeState.DEGRADED) {
                add("La dÃ©tection automatique peut Ãªtre limitÃ©e.")
            }
        }
        return PremiumScreenState.content(
            PremiumReceiverHealthUiState(
                statusTitle = statusTitle,
                statusText = statusText,
                rows = listOf(
                    "Ã‰tat Receiver" to runtimeStateLabel,
                    "AccÃ¨s notifications" to if (health.notificationAccessEnabled) "ActivÃ©" else "Action requise",
                    "Banques surveillÃ©es" to if (enabledBankProfileIds.isEmpty()) "Ã€ configurer" else "${health.allowedBanksCount} banques",
                    "File d'envoi" to outboxDepth?.let { if (it == 0) "OK" else "Ã€ vÃ©rifier" }.orEmpty().ifBlank { "Ã€ vÃ©rifier" },
                    "DerniÃ¨re synchronisation" to if (health.backendReachable && listenerConnected == true) "SynchronisÃ©" else "Ã€ vÃ©rifier"
                ),
                notices = notices
            )
        )
    }

    private fun receiverHealthDegradedMessage(health: ReceiverStatusState): String {
        return when {
            !health.notificationAccessEnabled -> "Activez l'accÃ¨s notifications pour continuer."
            !health.listenerConnected -> "Gardez SwimPay ouvert quelques instants pour reconnecter l'Ã©coute."
            health.allowedBanksCount == 0 -> "Activez au moins une banque surveillÃ©e."
            health.allowedBanksCount > 0 && health.trustedBanksCount == 0 -> "VÃ©rifiez les banques surveillÃ©es avant de compter sur la dÃ©tection."
            else -> "La dÃ©tection automatique peut Ãªtre limitÃ©e."
        }
    }

    fun loadConfigurationChecklist(
        notificationAccessEnabled: Boolean,
        enabledBankProfileIds: Set<String>
    ): MerchantConfigurationChecklist {
        val receivingMethodsReady = receivingMethodsRepository.list(session).let { result ->
            result.state == MerchantRepositoryState.SUCCESS &&
                result.items.any { it.status.equals("Active", ignoreCase = true) }
        }
        val connectedSiteReady = connectedSiteRepository.load(session, developerDetailsEnabled = false).let { result ->
            result.state == MerchantRepositoryState.SUCCESS &&
                result.visibleTexts().any { text ->
                    text.equals("Actif", ignoreCase = true) || text.equals("Connexion active", ignoreCase = true)
                }
        }
        return MerchantConfigurationChecklist(
            phoneConnected = notificationAccessEnabled,
            bankChosen = enabledBankProfileIds.isNotEmpty(),
            receivingMethodAdded = receivingMethodsReady,
            connectedSiteReady = connectedSiteReady
        )
    }

    fun loadConnectedSite(): PremiumScreenState<PremiumConnectedSiteUiState> {
        developerIntegrationRepository?.let { repository ->
            clearDeveloperShowOnceExport()
            return repository.load(session).toConnectedSiteState(
                merchantAuthorizationHeaderForCopy = session.authorizationHeader(),
                merchantAuthorizationHeaderMasked = session.maskedAuthorizationHeader()
            )
        }
        val result = connectedSiteRepository.load(session, developerDetailsEnabled = false)
        if (result.state == MerchantRepositoryState.EMPTY || result.state == MerchantRepositoryState.ERROR) {
            return PremiumScreenState.content(
                PremiumConnectedSiteUiState(
                    statusTitle = "Site ou application Ã  configurer",
                    statusText = "Vous pouvez continuer Ã  utiliser SwimPay. Les mises Ã  jour automatiques seront disponibles aprÃ¨s connexion.",
                    rows = listOf(
                        "URL de notification" to "Ã€ configurer",
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
                errorMessage = "Votre site n'a pas rÃ©pondu au dernier test."
            )
        }
        val texts = result.visibleTexts()
        return PremiumScreenState.content(
            PremiumConnectedSiteUiState(
                statusTitle = texts.getOrNull(2) ?: "Action requise",
                statusText = "Votre site ou application reÃ§oit une notification quand un paiement change de statut.",
                rows = listOf(
                    (texts.getOrNull(3) ?: "URL de notification") to (texts.getOrNull(4) ?: "Non configurÃ©e"),
                    (texts.getOrNull(5) ?: "Statut") to (texts.getOrNull(6) ?: "Action requise")
                ),
                usesLiveApi = !result.usesMockRepository
            )
        )
    }

    fun createDeveloperApiKey(): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.createApiKey(session)?.toConnectedSiteStateWithShowOnceCopy()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun rotateDeveloperApiKey(): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.rotateApiKey(session)?.toConnectedSiteStateWithShowOnceCopy()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun rotateDeveloperWebhookSecret(): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.rotateWebhookSecret(session)?.toConnectedSiteStateWithShowOnceCopy()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun updateDeveloperWebhookUrl(webhookUrl: String): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.updateWebhookUrl(session, webhookUrl)
            ?.toConnectedSiteStateWithCurrentShowOnceCopy()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun testDeveloperWebhook(): PremiumScreenState<PremiumConnectedSiteUiState> {
        val repository = developerIntegrationRepository
            ?: return PremiumScreenState.offline(message = "Integration developpeur indisponible.")
        val test = repository.testWebhook(session)
        return repository.load(session).copy(safeMessage = test.safeMessage).toConnectedSiteStateWithCurrentShowOnceCopy()
    }

    fun consumeDeveloperExportText(state: PremiumConnectedSiteUiState): String {
        val exportText = state.developerExportText()
        clearDeveloperShowOnceExport()
        return exportText
    }

    fun clearDeveloperShowOnceExport() {
        developerSecretKeyOnceForCopy = null
        integrationWebhookSecretOnceForCopy = null
        developerShowOnceCopyExpiresAtEpochMs = 0L
    }

    private fun clearExpiredDeveloperShowOnceCopyValues() {
        if (
            developerShowOnceCopyExpiresAtEpochMs > 0L &&
            nowEpochMs() >= developerShowOnceCopyExpiresAtEpochMs
        ) {
            clearDeveloperShowOnceExport()
        }
    }

    private fun MerchantDeveloperIntegrationResult.toConnectedSiteStateWithShowOnceCopy(): PremiumScreenState<PremiumConnectedSiteUiState> {
        var hasShowOnceSecret = false
        integration?.secretKeyOnce?.takeIf { it.isNotBlank() }?.let {
            developerSecretKeyOnceForCopy = it
            hasShowOnceSecret = true
        }
        integration?.webhookSecretOnce?.takeIf { it.isNotBlank() }?.let {
            integrationWebhookSecretOnceForCopy = it
            hasShowOnceSecret = true
        }
        if (hasShowOnceSecret) {
            developerShowOnceCopyExpiresAtEpochMs = nowEpochMs() + DEVELOPER_SHOW_ONCE_COPY_TTL_MS
        }
        return toConnectedSiteState(
            secretKeyForCopy = developerSecretKeyOnceForCopy,
            webhookSecretForCopy = integrationWebhookSecretOnceForCopy,
            merchantAuthorizationHeaderForCopy = session.authorizationHeader(),
            merchantAuthorizationHeaderMasked = session.maskedAuthorizationHeader()
        )
    }

    private fun MerchantDeveloperIntegrationResult.toConnectedSiteStateWithCurrentShowOnceCopy(): PremiumScreenState<PremiumConnectedSiteUiState> {
        clearExpiredDeveloperShowOnceCopyValues()
        return toConnectedSiteState(
            secretKeyForCopy = developerSecretKeyOnceForCopy,
            webhookSecretForCopy = integrationWebhookSecretOnceForCopy,
            merchantAuthorizationHeaderForCopy = session.authorizationHeader(),
            merchantAuthorizationHeaderMasked = session.maskedAuthorizationHeader()
        )
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
            MerchantConfigurationTestOutcome.ACTION_REQUIRED -> return PremiumScreenState.actionRequired("Action requise", "VÃ©rifiez les Ã©tapes avant de continuer.")
            MerchantConfigurationTestOutcome.ERROR -> return PremiumScreenState.offline()
            MerchantConfigurationTestOutcome.READY -> Unit
        }
        val texts = result.visibleTexts()
        return PremiumScreenState.content(
            PremiumConfigurationUiState(
                checklist = texts.take(MerchantConfigurationChecklist.REQUIRED_LABELS.size).ifEmpty {
                    MerchantConfigurationChecklist.REQUIRED_LABELS
                },
                outcomeTitle = if (texts.contains("SwimPay est prÃªt") || texts.contains("Webhook prÃªt")) "Webhook prÃªt" else "Action requise",
                outcomeText = if (texts.contains("SwimPay est prÃªt") || texts.contains("Webhook prÃªt")) {
                    "Le backend peut envoyer un Ã©vÃ©nement de test vers votre endpoint."
                } else {
                    "VÃ©rifiez les Ã©tapes avant de lancer le test webhook."
                },
                usesLiveApi = !result.usesMockRepository && !result.confirmsRealPayment
            )
        )
    }

    fun loadOrders(): PremiumScreenState<PremiumOrdersUiState> {
        val result = ordersRepository.list(session)
        if (result.state == MerchantRepositoryState.ACTION_REQUIRED) {
            return PremiumScreenState.content(
                PremiumOrdersUiState(
                    rows = emptyList(),
                    usesLiveApi = false
                )
            )
        }
        if (result.state == MerchantRepositoryState.LOADING) {
            return PremiumScreenState.loading()
        }
        if (result.state == MerchantRepositoryState.SUCCESS) {
            return PremiumScreenState.content(
                PremiumOrdersUiState(
                    rows = result.items.map { item ->
                        PremiumOrderUiItem(
                            orderId = item.orderId,
                            amount = item.amountLabel,
                            status = item.statusLabel,
                            helper = item.helper
                        )
                    },
                    usesLiveApi = true,
                    confirmedSalesCount = result.summary.confirmedOrderCountLabel(),
                    confirmedAmount = result.summary.confirmedAmountLabel(),
                    failedCount = result.summary.failedCountLabel(),
                    confirmationRate = result.summary.confirmationRateLabel()
                )
            )
        }
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
                "Votre tÃ©lÃ©phone est connectÃ© et prÃªt Ã  Ã©couter les banques activÃ©es."
            } else {
                "Activez l'accÃ¨s notifications pour lancer l'Ã©coute intelligente."
            },
            mainMetricLabel = "Paiements confirmÃ©s",
            monthlyAmount = "0 â‚½",
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
                    0 -> "Ã€ ajouter"
                    1 -> "1 actif"
                    else -> "$activeCount actifs"
                }
            }
            MerchantRepositoryState.EMPTY -> "Ã€ ajouter"
            MerchantRepositoryState.ERROR,
            MerchantRepositoryState.ACTION_REQUIRED,
            MerchantRepositoryState.LOADING -> "Connexion en attente"
        }
    }

    companion object {
        const val DEVELOPER_SHOW_ONCE_COPY_TTL_MS = 2 * 60 * 1000L

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
                ordersRepository = MerchantOrdersApiRepository(transport),
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
                ordersRepository = MerchantOrdersApiRepository(transport),
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
                ordersRepository = MerchantOrdersApiRepository(transport),
                receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
                connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
                configurationTestRepository = MerchantConfigurationTestApiRepository(transport),
                bankPackageProbe = StaticExactPackageProbe(emptySet())
            )
        }
    }
}

private fun MerchantDeveloperIntegrationResult.toConnectedSiteState(
    secretKeyForCopy: String? = null,
    webhookSecretForCopy: String? = null,
    merchantAuthorizationHeaderForCopy: String = "",
    merchantAuthorizationHeaderMasked: String = ""
): PremiumScreenState<PremiumConnectedSiteUiState> {
    return when (state) {
        MerchantRepositoryState.SUCCESS -> PremiumScreenState.content(
            integration?.toPremiumConnectedSiteUiState(
                safeMessage = safeMessage,
                secretKeyForCopy = secretKeyForCopy,
                webhookSecretForCopy = webhookSecretForCopy,
                merchantAuthorizationHeaderForCopy = merchantAuthorizationHeaderForCopy,
                merchantAuthorizationHeaderMasked = merchantAuthorizationHeaderMasked
            )
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

private fun MerchantDeveloperIntegrationSnapshot.toPremiumConnectedSiteUiState(
    safeMessage: String,
    secretKeyForCopy: String? = null,
    webhookSecretForCopy: String? = null,
    merchantAuthorizationHeaderForCopy: String = "",
    merchantAuthorizationHeaderMasked: String = ""
): PremiumConnectedSiteUiState {
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
            "Authorization Bearer mobile" to merchantAuthorizationHeaderMasked.ifBlank { "Session mobile requise" },
            "Cle publique" to publicKey,
            "Cle API" to secretKeyMasked,
            "Secret webhook" to webhookSecretMasked,
            "Evenements publics" to publicWebhookEvents.joinToString(", ")
        ),
        exportLines = exportLines(),
        copyExportLines = copyExportLines(
            secretKeyForCopy = secretKeyForCopy,
            webhookSecretForCopy = webhookSecretForCopy,
            merchantAuthorizationHeaderForCopy = merchantAuthorizationHeaderForCopy
        ),
        oneTimeSecrets = showOnceSecrets(
            secretKeyForCopy = secretKeyForCopy,
            webhookSecretForCopy = webhookSecretForCopy
        ),
        webhookUrl = webhookUrl,
        merchantAuthorizationHeaderMasked = merchantAuthorizationHeaderMasked,
        actionButtonsEnabled = true
    )
}

private fun defaultLocalSystemCards(
    notificationAccessEnabled: Boolean,
    detectedBankCount: Int,
    receivingMethodsValue: String
): List<PremiumLocalSystemUiState> {
    val bankValue = if (detectedBankCount > 0) "$detectedBankCount dÃ©tectÃ©es" else "Ã€ configurer"
    return listOf(
        PremiumLocalSystemUiState("SwimPay Intelligence", if (notificationAccessEnabled) "PrÃªte" else "Action requise"),
        PremiumLocalSystemUiState("TÃ©lÃ©phone connectÃ©", if (notificationAccessEnabled) "ConnectÃ©" else "Ã€ connecter"),
        PremiumLocalSystemUiState("Notifications activÃ©es", if (notificationAccessEnabled) "ActivÃ©es" else "Action requise"),
        PremiumLocalSystemUiState("DerniÃ¨re activitÃ©", if (notificationAccessEnabled) "Il y a quelques instants" else "En attente"),
        PremiumLocalSystemUiState("Banques actives", bankValue),
        PremiumLocalSystemUiState("Moyens de rÃ©ception", receivingMethodsValue)
    )
}

private fun MerchantDashboardMetricsSummary.isEmptyConfirmedDashboardSummary(): Boolean {
    return confirmedPaymentCount <= 0 &&
        confirmedAmountMinor <= 0L &&
        rejectedPaymentCount <= 0 &&
        expiredPaymentCount <= 0 &&
        failedCount <= 0 &&
        confirmationRate <= 0
}

private fun MerchantOrdersSummary.toDashboardMetricsSummary(): MerchantDashboardMetricsSummary {
    return MerchantDashboardMetricsSummary(
        range = "orders",
        currency = currency,
        confirmedPaymentCount = confirmedOrderCount,
        confirmedAmountMinor = confirmedAmountMinor,
        pendingReviewCount = 0,
        rejectedPaymentCount = 0,
        expiredPaymentCount = 0,
        failedCount = failedCount,
        confirmationRate = confirmationRate,
        averageManualConfirmationDelaySeconds = 0
    )
}

private fun MerchantOrdersSummary.toDashboardChartPoints(): List<PremiumChartPointUiState> {
    if (confirmedOrderCount <= 0 && confirmedAmountMinor <= 0L) return emptyList()
    return listOf(
        PremiumChartPointUiState(
            date = "Ventes",
            confirmedAmountMinor = confirmedAmountMinor,
            confirmationRate = confirmationRate
        )
    )
}

private fun List<MerchantOrderItem>.toDashboardRecentPayments(): List<PremiumRecentPaymentUiState> {
    return take(5).map {
        PremiumRecentPaymentUiState(
            amount = it.amountLabel,
            detail = it.helper.ifBlank { it.orderId },
            status = it.statusLabel
        )
    }
}

private fun dashboardMetricCards(summary: MerchantDashboardMetricsSummary?): List<PremiumMetricUiState> {
    return listOf(
        PremiumMetricUiState((summary?.pendingReviewCount ?: 0).toString(), "Ã€ confirmer"),
        PremiumMetricUiState((summary?.confirmedPaymentCount ?: 0).toString(), "ConfirmÃ©s"),
        PremiumMetricUiState((summary?.rejectedPaymentCount ?: 0).toString(), "RejetÃ©s"),
        PremiumMetricUiState((summary?.expiredPaymentCount ?: 0).toString(), "ExpirÃ©s"),
        PremiumMetricUiState((summary?.failedCount ?: 0).toString(), "Ã‰checs"),
        PremiumMetricUiState(summary?.confirmationRateLabel() ?: "0 %", "Taux")
    )
}

private fun formatDashboardChartAmount(amountMinor: Long, currency: String): String {
    val units = amountMinor / 100L
    val cents = kotlin.math.abs(amountMinor % 100L)
    val grouped = "%,d".format(java.util.Locale.US, units).replace(",", " ")
    val symbol = if (currency == "RUB") "â‚½" else currency
    return if (cents == 0L) {
        "$grouped $symbol"
    } else {
        "$grouped,${cents.toString().padStart(2, '0')} $symbol"
    }
}

private fun String.initialsForProfile(): String {
    val initials = trim()
        .split(Regex("[\\s._-]+"))
        .filter { it.isNotBlank() }
        .take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")
    return initials.ifBlank { "S." }.take(2)
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
    errorMessage: String = "Les donnÃ©es seront synchronisÃ©es dÃ¨s que SwimPay sera connectÃ©."
): PremiumScreenState<T> {
    return when (state) {
        MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired(
            title = "Action requise",
            message = visibleTexts().getOrNull(1) ?: actionMessage
        )
        MerchantRepositoryState.EMPTY -> PremiumScreenState.empty(
            title = "Aucune donnÃ©e",
            message = "Les informations apparaÃ®tront ici."
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
    val recommended = !actions.contains("DÃ©finir par dÃ©faut")
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
        MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de rÃ©ception", "Ajoutez une carte ou un tÃ©lÃ©phone SBP pour commencer.")
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

private fun MerchantReviewActionApiResult.toResolvedPaymentDetail(
    reviewId: String
): PremiumScreenState<PremiumPaymentDetailUiState>? {
    val (title, text, decision) = when (status) {
        MerchantReviewActionResultStatus.SIGNAL_REJECTED -> Triple(
            "Signal rejetÃ©",
            "Le signal a Ã©tÃ© Ã©cartÃ©. Aucune confirmation automatique.",
            "Signal rejetÃ©"
        )
        MerchantReviewActionResultStatus.ORDER_REJECTED -> Triple(
            "Commande rejetÃ©e",
            "La dÃ©cision est enregistrÃ©e cÃ´tÃ© backend.",
            "Commande rejetÃ©e"
        )
        MerchantReviewActionResultStatus.MANUAL_CONFIRMED -> Triple(
            "Commande confirmÃ©e",
            "La dÃ©cision marchand est enregistrÃ©e cÃ´tÃ© backend.",
            "Commande confirmÃ©e"
        )
        MerchantReviewActionResultStatus.ALREADY_RESOLVED -> Triple(
            "DÃ©jÃ  traitÃ©",
            "Cette review a dÃ©jÃ  Ã©tÃ© traitÃ©e cÃ´tÃ© backend.",
            "DÃ©jÃ  traitÃ©"
        )
        MerchantReviewActionResultStatus.ACTION_REQUIRED,
        MerchantReviewActionResultStatus.ERROR -> return null
    }
    return PremiumScreenState.content(
        PremiumPaymentDetailUiState(
            reviewId = reviewId,
            statusTitle = title,
            statusText = text,
            summaryRows = listOf(
                "Review" to reviewId,
                "DÃ©cision" to decision
            ),
            reasons = listOf("DÃ©cision marchand enregistrÃ©e.", "Aucun paiement n'est confirmÃ© automatiquement par Android."),
            timeline = listOf("Action marchand enregistrÃ©e"),
            actionMessage = safeMessage,
            usesLiveApi = true,
            actionsEnabled = false
        )
    )
}

private object NoopMerchantApiTransport : MerchantApiTransport {
    override fun execute(request: com.swimpay.receiver.MerchantApiRequest): com.swimpay.receiver.MerchantApiResponse {
        return com.swimpay.receiver.MerchantApiResponse(
            statusCode = 503,
            body = """{"error":{"code":"merchant_session_required"}}"""
        )
    }
}

