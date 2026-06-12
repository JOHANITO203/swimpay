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
import com.swimpay.receiver.MerchantSecretRevealResult
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
import com.swimpay.receiver.ReceiverRuntimeConfigWriter
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
    val status: String = "À vérifier"
)

data class PremiumDashboardUiState(
    val readyTitle: String,
    val readyText: String,
    val mainMetricLabel: String = "Paiements confirmés",
    val monthlyAmount: String,
    val metrics: List<PremiumMetricUiState>,
    val chartPoints: List<PremiumChartPointUiState> = emptyList(),
    val chartConfirmedAmountLabel: String = "—",
    val chartConfirmationRateLabel: String = "—",
    val recentPayments: List<PremiumRecentPaymentUiState>,
    val usesLiveApi: Boolean,
    val localSystemCards: List<PremiumLocalSystemUiState> = emptyList(),
    val backendNoticeTitle: String = "",
    val backendNoticeText: String = "",
    val emptyPaymentsTitle: String = "Aucun paiement détecté pour le moment",
    val emptyPaymentsAction: String = ""
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
                    PremiumReviewUiItem("rev_demo_1", "58,41 ₽", "Sberbank", ReviewUiStatus.TO_CONFIRM, "À vérifier", "Signal détecté il y a 2 min", listOf("Validation manuelle en bêta"), false),
                    PremiumReviewUiItem("rev_demo_2", "129,00 ₽", "T-Bank", ReviewUiStatus.TO_CONFIRM, "À vérifier", "Référence non visible", listOf("Référence non visible"), false),
                    PremiumReviewUiItem("rev_demo_3", "45,00 ₽", "Alfa-Bank", ReviewUiStatus.CONFIRMED, "Validé", "Confirmé manuellement", listOf("Validation manuelle en bêta"), true)
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
                statusTitle = "À vérifier",
                statusText = "Ce paiement nécessite une validation manuelle.",
                summaryRows = listOf(
                    "Montant affiché" to "58,41 ₽",
                    "Montant exact attendu" to "58,80 ₽",
                    "Montant détecté" to "58,80 ₽",
                    "Écart" to "0,00 ₽",
                    "Risque" to "Montant exact attendu reconnu",
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

/**
 * One received-payment row for the wallet detail provenance list. PREVIEW data:
 * the runtime does not yet expose a per-wallet received-payments aggregate, so
 * these rows are illustrative (see [PremiumWalletDetailUiState.preview]).
 */
data class PremiumWalletReceivedPaymentUiItem(
    val sender: String,
    val amountLabel: String,
    val provenanceStatus: String,
    val provenanceVerified: Boolean,
    val timestamp: String
)

/**
 * Wallet / receiving-method detail UI state.
 *
 * Method IDENTITY (bankProfileId for the official logo, displayName, masked
 * identifier, rail label, active status) is REAL — resolved from the already
 * loaded receiving methods in [PremiumMerchantRuntime.loadWalletDetail].
 *
 * The received-payments history and the summary aggregates
 * (totalReceivedLabel, paymentCount, verifiedRate, statTiles) are PREVIEW: the
 * runtime exposes no per-wallet received aggregate yet (user accepted preview
 * data). They come from [preview] and must not be read as real values.
 */
data class PremiumWalletDetailUiState(
    // --- REAL identity (resolved from the receiving method) ---
    val bankProfileId: String,
    val displayName: String,
    val maskedIdentifier: String,
    val railLabel: String,
    val statusLabel: String,
    val active: Boolean,
    // --- PREVIEW aggregates ---
    val totalReceivedLabel: String,
    val paymentCount: String,
    val verifiedRate: Int,
    val verifiedCountLabel: String,
    val statTiles: List<PremiumMetricUiState>,
    // --- PREVIEW history rows ---
    val receivedPayments: List<PremiumWalletReceivedPaymentUiItem>,
    // INFOS DU RAIL preview rows (label -> value); identity values inside are real.
    val railRows: List<Pair<String, String>>,
    val isPreviewHistory: Boolean = true
) {
    companion object {
        // PREVIEW dataset (history + aggregates). Identity fields below are
        // placeholders only used when no real method is resolved.
        fun preview(): PremiumWalletDetailUiState {
            return PremiumWalletDetailUiState(
                bankProfileId = "unknown",
                displayName = "Portefeuille",
                maskedIdentifier = "•••• ••••",
                railLabel = "Mobile money",
                statusLabel = "Actif",
                active = true,
                totalReceivedLabel = "1 248 500 XOF",
                paymentCount = "32",
                verifiedRate = 98,
                verifiedCountLabel = "944 paiements vérifiés",
                statTiles = listOf(
                    PremiumMetricUiState("+12 500", "Aujourd'hui", "+8 %"),
                    PremiumMetricUiState("+87 200", "7 jours", "+12 %"),
                    PremiumMetricUiState("+312 900", "30 jours", "+9 %")
                ),
                receivedPayments = listOf(
                    PremiumWalletReceivedPaymentUiItem("Boutique Dakar", "+12 500", "Notification SMS", true, "Il y a 2 min"),
                    PremiumWalletReceivedPaymentUiItem("Client anonyme", "+5 000", "Notification app", true, "Il y a 1 h"),
                    PremiumWalletReceivedPaymentUiItem("M. Diallo", "+25 000", "Référence à vérifier", false, "Hier")
                ),
                railRows = listOf(
                    "Compte" to "•••• ••••",
                    "Devise" to "XOF",
                    "Type" to "Mobile money",
                    "Lié depuis" to "14 mars 2026",
                    "Confirmation automatique" to "Désactivée"
                )
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
    val confirmedSalesCount: String = if (usesLiveApi) "0" else "—",
    val confirmedAmount: String = if (usesLiveApi) "0,00 RUB" else "—",
    val failedCount: String = if (usesLiveApi) "0" else "—",
    val confirmationRate: String = if (usesLiveApi) "0 %" else "—",
    val emptyTitle: String = "Aucune vente confirmée",
    val emptyMessage: String = "Vos ventes apparaîtront ici après confirmation des paiements.",
    val primaryActionLabel: String = "",
    val secondaryActionLabel: String = "Voir les paiements à confirmer"
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
                statusText = "Dernière notification envoyée il y a 3 min.",
                rows = listOf(
                    "URL de notification" to "https://votre-site.com/api/v1/payments/swimpay/webhook",
                    "Statut" to "Actif"
                ),
                usesLiveApi = false
            )
        }
    }
}

data class PremiumDeveloperHandoffResult(
    val exportText: String?,
    val state: PremiumScreenState<PremiumConnectedSiteUiState>
)

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
    private val supportTicketRepository: MerchantSupportTicketApiRepository? = null,
    private val ordersRepository: MerchantOrdersApiRepository = MerchantOrdersApiRepository(NoopMerchantApiTransport),
    private val receiverRuntimeConfigWriter: ReceiverRuntimeConfigWriter? = null,
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
        result.receiverRuntimeConfig?.let { receiverRuntimeConfigWriter?.save(it) }
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
                readyTitle = texts.getOrNull(1) ?: "SwimPay est prêt",
                readyText = texts.getOrNull(2) ?: "Votre téléphone est connecté et vos paiements peuvent être détectés.",
                mainMetricLabel = "Paiements confirmés",
                monthlyAmount = summary?.confirmedAmountLabel() ?: "0 ₽",
                metrics = dashboardMetricCards(summary),
                chartPoints = chartPoints,
                chartConfirmedAmountLabel = if (chartPoints.isEmpty()) "—" else formatDashboardChartAmount(chartConfirmedAmountMinor, summary?.currency ?: "RUB"),
                chartConfirmationRateLabel = chartConfirmationRate?.let { "$it %" } ?: "—",
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
            MerchantRepositoryState.EMPTY -> return PremiumScreenState.empty("Aucun paiement à confirmer", "Les nouveaux paiements apparaîtront ici.")
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
            add((texts.getOrNull(3) ?: "Montant affiché") to (texts.getOrNull(4) ?: "0,00 ₽"))
            add((texts.getOrNull(5) ?: "Montant exact attendu") to (texts.getOrNull(6) ?: "0,00 ₽"))
            add((texts.getOrNull(7) ?: "Montant détecté") to (texts.getOrNull(8) ?: "0,00 ₽"))
            add((texts.getOrNull(9) ?: "Écart") to (texts.getOrNull(10) ?: "0,00 ₽"))
            add((texts.getOrNull(11) ?: "Risque") to (texts.getOrNull(12) ?: "Validation manuelle requise"))
            add((texts.getOrNull(13) ?: "Banque") to (texts.getOrNull(14) ?: "Banque choisie"))
            add((texts.getOrNull(15) ?: "Moyen de réception") to (texts.getOrNull(16) ?: "Moyen de réception"))
            add((texts.getOrNull(17) ?: "Référence") to (texts.getOrNull(18) ?: "<REFERENCE>"))
            add((texts.getOrNull(19) ?: "Signal reçu") to (texts.getOrNull(20) ?: "Récemment"))
            result.paymentScoreLabel?.let { add("Score" to it) }
        }
        return PremiumScreenState.content(
            PremiumPaymentDetailUiState(
                reviewId = reviewId,
                statusTitle = texts.getOrNull(1) ?: "À vérifier",
                statusText = texts.getOrNull(2) ?: "Ce paiement nécessite une validation manuelle.",
                summaryRows = summaryRows,
                reasons = texts.drop(22).takeWhile { it !in REVIEW_ACTION_LABELS }.ifEmpty {
                    listOf("Validation manuelle en bêta")
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
            MerchantRepositoryState.EMPTY -> PremiumScreenState.empty("Aucun moyen de réception", "Ajoutez une carte ou un téléphone SBP pour commencer.")
            MerchantRepositoryState.ACTION_REQUIRED -> PremiumScreenState.actionRequired("Action requise", result.safeMessage.ifBlank { "Session marchand requise" })
            MerchantRepositoryState.ERROR -> PremiumScreenState.offline()
            MerchantRepositoryState.LOADING -> PremiumScreenState.loading()
        }
    }

    /**
     * Wallet / receiving-method detail loader. Mirrors [loadPaymentDetail].
     *
     * Method IDENTITY is REAL: it reuses [loadReceivingMethods] and selects the
     * method whose routeId == [methodId] to fill the official logo
     * (bankProfileId resolved from the shared bank catalog), display name,
     * masked identifier, rail label and active status.
     *
     * The received-payments history and aggregates stay PREVIEW (see
     * [PremiumWalletDetailUiState.preview]) — the runtime has no per-wallet
     * received aggregate yet. If the method is not found we return the preview
     * content state rather than crashing.
     */
    fun loadWalletDetail(methodId: String): PremiumScreenState<PremiumWalletDetailUiState> {
        val preview = PremiumWalletDetailUiState.preview()
        val methods = loadReceivingMethods()
        val item = (methods as? PremiumScreenState.Content)?.value?.items
            ?.firstOrNull { it.routeId == methodId }
            ?: return PremiumScreenState.content(preview)

        // Real identity derived from the loaded receiving method.
        val displayName = item.subtitle.substringBefore(" · ").trim().ifBlank { item.title }
        val maskedIdentifier = item.subtitle.substringAfter(" · ", item.subtitle).trim()
            .ifBlank { preview.maskedIdentifier }
        val bankProfileId = walletBankProfileId(item.subtitle)

        // Preview rail rows keep the real masked identifier + rail label so the
        // "INFOS DU RAIL" card stays coherent with the resolved identity.
        val railRows = preview.railRows.map { (label, value) ->
            when (label) {
                "Compte" -> label to maskedIdentifier
                "Type" -> label to item.title
                else -> label to value
            }
        }

        return PremiumScreenState.content(
            preview.copy(
                bankProfileId = bankProfileId,
                displayName = displayName,
                maskedIdentifier = maskedIdentifier,
                railLabel = item.title,
                statusLabel = item.status,
                active = item.enabled,
                railRows = railRows
            )
        )
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
            ReceiverRuntimeState.LISTENING -> "Téléphone connecté"
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED -> "Vérification requise"
            ReceiverRuntimeState.OFFLINE -> "Hors ligne"
            else -> "Action nécessaire"
        }
        val statusText = when (health.runtimeState) {
            ReceiverRuntimeState.LISTENING -> "Ce téléphone peut détecter les paiements reçus."
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED -> "Des commandes peuvent nécessiter une vérification banque."
            ReceiverRuntimeState.OFFLINE -> "La synchronisation backend est indisponible."
            ReceiverRuntimeState.DEGRADED -> receiverHealthDegradedMessage(health)
            else -> "Le Receiver est prêt à se synchroniser."
        }
        val runtimeStateLabel = when (health.runtimeState) {
            ReceiverRuntimeState.IDLE -> "Au repos"
            ReceiverRuntimeState.ARMED -> "Armé"
            ReceiverRuntimeState.LISTENING -> "À l'écoute"
            ReceiverRuntimeState.DEGRADED -> "Dégradé"
            ReceiverRuntimeState.OFFLINE -> "Hors ligne"
            ReceiverRuntimeState.MANUAL_CHECK_REQUIRED -> "Vérification banque"
        }
        val notices = buildList {
            add("SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.")
            if (health.runtimeState == ReceiverRuntimeState.MANUAL_CHECK_REQUIRED) {
                add("Vérifiez les commandes en attente depuis votre banque.")
            }
            if (health.runtimeState == ReceiverRuntimeState.OFFLINE || health.runtimeState == ReceiverRuntimeState.DEGRADED) {
                add("La détection automatique peut être limitée.")
            }
        }
        return PremiumScreenState.content(
            PremiumReceiverHealthUiState(
                statusTitle = statusTitle,
                statusText = statusText,
                rows = listOf(
                    "État Receiver" to runtimeStateLabel,
                    "Accès notifications" to if (health.notificationAccessEnabled) "Activé" else "Action requise",
                    "Banques surveillées" to if (enabledBankProfileIds.isEmpty()) "À configurer" else "${health.allowedBanksCount} banques",
                    "File d'envoi" to outboxDepth?.let { if (it == 0) "OK" else "À vérifier" }.orEmpty().ifBlank { "À vérifier" },
                    "Dernière synchronisation" to if (health.backendReachable && listenerConnected == true) "Synchronisé" else "À vérifier"
                ),
                notices = notices
            )
        )
    }

    private fun receiverHealthDegradedMessage(health: ReceiverStatusState): String {
        return when {
            !health.notificationAccessEnabled -> "Activez l'accès notifications pour continuer."
            !health.listenerConnected -> "Gardez SwimPay ouvert quelques instants pour reconnecter l'écoute."
            health.allowedBanksCount == 0 -> "Activez au moins une banque surveillée."
            health.allowedBanksCount > 0 && health.trustedBanksCount == 0 -> "Vérifiez les banques surveillées avant de compter sur la détection."
            else -> "La détection automatique peut être limitée."
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

    fun provisionDeveloperIntegration(webhookUrl: String): PremiumScreenState<PremiumConnectedSiteUiState> {
        return developerIntegrationRepository?.provisionIntegration(session, webhookUrl)
            ?.toConnectedSiteStateWithShowOnceCopy()
            ?: PremiumScreenState.offline(message = "Integration developpeur indisponible.")
    }

    fun revealDeveloperSecrets(): PremiumScreenState<PremiumConnectedSiteUiState> {
        val repository = developerIntegrationRepository
            ?: return PremiumScreenState.offline(message = "Integration developpeur indisponible.")
        val reveal = repository.revealSecrets(session)
        if (reveal.state != MerchantRepositoryState.SUCCESS) {
            return revealErrorState(reveal)
        }
        storeRevealedSecretsForCopy(reveal)
        val safeMessage = buildList {
            add(reveal.safeMessage)
            addRotationNotes(reveal)
        }.joinToString(" ")
        return repository.load(session).copy(safeMessage = safeMessage).toConnectedSiteStateWithCurrentShowOnceCopy()
    }

    fun copyDeveloperHandoffExport(): PremiumDeveloperHandoffResult {
        val repository = developerIntegrationRepository
            ?: return PremiumDeveloperHandoffResult(
                exportText = null,
                state = PremiumScreenState.offline(message = "Integration developpeur indisponible.")
            )
        val reveal = repository.revealSecrets(session)
        if (reveal.state != MerchantRepositoryState.SUCCESS) {
            return PremiumDeveloperHandoffResult(exportText = null, state = revealErrorState(reveal))
        }
        storeRevealedSecretsForCopy(reveal)
        val loaded = repository.load(session)
        val exportText = loaded.integration?.copyExportLines(
            secretKeyForCopy = reveal.secretKey,
            webhookSecretForCopy = reveal.webhookSecret,
            merchantAuthorizationHeaderMasked = session.maskedAuthorizationHeader()
        )?.joinToString("\n")
        val safeMessage = buildList {
            add(
                if (exportText != null) {
                    "Acces developpeur copie dans le presse-papiers. Collez-le a votre developpeur."
                } else {
                    "Export developpeur indisponible."
                }
            )
            addRotationNotes(reveal)
        }.joinToString(" ")
        return PremiumDeveloperHandoffResult(
            exportText = exportText,
            state = loaded.copy(safeMessage = safeMessage).toConnectedSiteStateWithCurrentShowOnceCopy()
        )
    }

    private fun revealErrorState(reveal: MerchantSecretRevealResult): PremiumScreenState<PremiumConnectedSiteUiState> {
        return when (reveal.state) {
            MerchantRepositoryState.ACTION_REQUIRED ->
                PremiumScreenState.actionRequired("Action requise", reveal.safeMessage)
            else -> PremiumScreenState.offline(message = reveal.safeMessage)
        }
    }

    private fun storeRevealedSecretsForCopy(reveal: MerchantSecretRevealResult) {
        var hasRevealedSecret = false
        reveal.secretKey?.takeIf { it.isNotBlank() }?.let {
            developerSecretKeyOnceForCopy = it
            hasRevealedSecret = true
        }
        reveal.webhookSecret?.takeIf { it.isNotBlank() }?.let {
            integrationWebhookSecretOnceForCopy = it
            hasRevealedSecret = true
        }
        if (hasRevealedSecret) {
            developerShowOnceCopyExpiresAtEpochMs = nowEpochMs() + DEVELOPER_SHOW_ONCE_COPY_TTL_MS
        }
    }

    private fun MutableList<String>.addRotationNotes(reveal: MerchantSecretRevealResult) {
        if (reveal.secretKeyRequiresRotation) {
            add("Cle API creee avant la mise a jour: faites une rotation pour la consulter.")
        }
        if (reveal.webhookSecretRequiresRotation) {
            add("Secret webhook cree avant la mise a jour: faites une rotation pour le consulter.")
        }
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
            bankPackageProbe: ExactPackageProbe = defaultBankPackageProbe(),
            receiverRuntimeConfigWriter: ReceiverRuntimeConfigWriter? = null
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
                supportTicketRepository = MerchantSupportTicketApiRepository(transport),
                receiverRuntimeConfigWriter = receiverRuntimeConfigWriter
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
        statusTitle = if (integrationReady) "Integration prete" else "Integration a completer",
        statusText = if (integrationReady) {
            "Cle API et webhook actifs. Les confirmations de paiement sont renvoyees a votre application."
        } else {
            "Sans webhook actif, les commandes sont refusees: votre application ne recevrait jamais les confirmations."
        },
        rows = listOf(
            "Webhook URL" to webhookUrl.ifBlank { "A configurer" },
            "Statut" to if (active) "Actif" else "Action requise",
            "Integration complete" to if (integrationReady) "Oui" else "Non - webhook a configurer"
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
            merchantAuthorizationHeaderForCopy = merchantAuthorizationHeaderForCopy,
            merchantAuthorizationHeaderMasked = merchantAuthorizationHeaderMasked
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
        PremiumMetricUiState((summary?.pendingReviewCount ?: 0).toString(), "À confirmer"),
        PremiumMetricUiState((summary?.confirmedPaymentCount ?: 0).toString(), "Confirmés"),
        PremiumMetricUiState((summary?.rejectedPaymentCount ?: 0).toString(), "Rejetés"),
        PremiumMetricUiState((summary?.expiredPaymentCount ?: 0).toString(), "Expirés"),
        PremiumMetricUiState((summary?.failedCount ?: 0).toString(), "Échecs"),
        PremiumMetricUiState(summary?.confirmationRateLabel() ?: "0 %", "Taux")
    )
}

private fun formatDashboardChartAmount(amountMinor: Long, currency: String): String {
    val units = amountMinor / 100L
    val cents = kotlin.math.abs(amountMinor % 100L)
    val grouped = "%,d".format(java.util.Locale.US, units).replace(",", " ")
    val symbol = if (currency == "RUB") "₽" else currency
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

// Resolves the official bank logo id from a receiving-method subtitle, using the
// same shared catalog the receiving-methods screen uses. Real (no invention).
private fun walletBankProfileId(subtitle: String): String {
    return PremiumReceivingMethodBankCatalog.availableBanks.firstOrNull { option ->
        subtitle.contains(option.displayName, ignoreCase = true)
    }?.bankProfileId ?: "unknown"
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

private fun MerchantReviewActionApiResult.toResolvedPaymentDetail(
    reviewId: String
): PremiumScreenState<PremiumPaymentDetailUiState>? {
    val (title, text, decision) = when (status) {
        MerchantReviewActionResultStatus.SIGNAL_REJECTED -> Triple(
            "Signal rejeté",
            "Le signal a été écarté. Aucune confirmation automatique.",
            "Signal rejeté"
        )
        MerchantReviewActionResultStatus.ORDER_REJECTED -> Triple(
            "Commande rejetée",
            "La décision est enregistrée côté backend.",
            "Commande rejetée"
        )
        MerchantReviewActionResultStatus.MANUAL_CONFIRMED -> Triple(
            "Commande confirmée",
            "La décision marchand est enregistrée côté backend.",
            "Commande confirmée"
        )
        MerchantReviewActionResultStatus.ALREADY_RESOLVED -> Triple(
            "Déjà traité",
            "Cette review a déjà été traitée côté backend.",
            "Déjà traité"
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
                "Décision" to decision
            ),
            reasons = listOf("Décision marchand enregistrée.", "Aucun paiement n'est confirmé automatiquement par Android."),
            timeline = listOf("Action marchand enregistrée"),
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
