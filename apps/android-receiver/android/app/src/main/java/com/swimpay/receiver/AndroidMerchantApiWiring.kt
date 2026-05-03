package com.swimpay.receiver

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

enum class MerchantRepositoryState {
    LOADING,
    EMPTY,
    SUCCESS,
    ACTION_REQUIRED,
    ERROR
}

data class AuthenticatedMerchantSession(
    val merchantId: String?,
    private val bearerToken: String?,
    val authMode: String,
    val isAuthenticated: Boolean
) {
    val merchantStatusLabel: String = if (isAuthenticated) "Connexion active" else "Action requise"
    val safeModeLabel: String = if (authMode == LOCAL_DEV_AUTH_MODE) {
        "Session marchand local/dev"
    } else {
        "Session marchand non connectée"
    }

    fun authorizationHeader(): String {
        return bearerToken?.let { "Bearer $it" }.orEmpty()
    }

    fun visibleTexts(): List<String> {
        return listOf(merchantStatusLabel, safeModeLabel)
    }

    companion object {
        private const val LOCAL_DEV_AUTH_MODE = "local_dev"

        fun missing(): AuthenticatedMerchantSession {
            return AuthenticatedMerchantSession(
                merchantId = null,
                bearerToken = null,
                authMode = "missing",
                isAuthenticated = false
            )
        }

        fun localDev(merchantId: String): AuthenticatedMerchantSession {
            val safeMerchantId = merchantId.trim()
            require(safeMerchantId.isNotBlank()) { "merchantId cannot be blank" }
            return AuthenticatedMerchantSession(
                merchantId = safeMerchantId,
                bearerToken = "test_$safeMerchantId",
                authMode = LOCAL_DEV_AUTH_MODE,
                isAuthenticated = true
            )
        }
    }
}

data class MerchantApiRequest(
    val method: String,
    val path: String,
    val headers: Map<String, String> = emptyMap(),
    val body: String = ""
)

data class MerchantApiResponse(
    val statusCode: Int,
    val body: String
)

interface MerchantApiTransport {
    fun execute(request: MerchantApiRequest): MerchantApiResponse
}

class HttpUrlConnectionMerchantApiTransport(
    private val baseUrl: String,
    private val timeoutMs: Int = 5_000
) : MerchantApiTransport {
    override fun execute(request: MerchantApiRequest): MerchantApiResponse {
        val connection = URL(baseUrl.trimEnd('/') + request.path).openConnection() as HttpURLConnection
        connection.requestMethod = request.method
        connection.connectTimeout = timeoutMs
        connection.readTimeout = timeoutMs
        connection.setRequestProperty("Accept", "application/json")
        request.headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }

        if (request.body.isNotBlank()) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(request.body)
            }
        }

        val status = connection.responseCode
        val stream = if (status in 200..399) connection.inputStream else connection.errorStream
        val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        connection.disconnect()
        return MerchantApiResponse(statusCode = status, body = body)
    }
}

data class MerchantReceivingMethodSubmission(
    val bankProfileId: String,
    val type: ReceivingMethodType,
    val rawIdentifier: String,
    val routeCode: String,
    val displayLabel: String,
    val enabled: Boolean = true,
    val recommended: Boolean = false
) {
    fun cleared(): MerchantReceivingMethodSubmission {
        return copy(rawIdentifier = "")
    }
}

data class MerchantReceivingMethodsResult(
    val state: MerchantRepositoryState,
    val items: List<MerchantReceivingMethodDisplay> = emptyList(),
    val safeMessage: String = ""
) {
    fun visibleTexts(): List<String> {
        return items.flatMap { it.visibleTexts() } + safeMessage
    }
}

data class MerchantReceivingMethodMutationResult(
    val state: MerchantRepositoryState,
    val display: MerchantReceivingMethodDisplay?,
    val clearedSubmission: MerchantReceivingMethodSubmission,
    val safeMessage: String = ""
) {
    fun visibleTexts(): List<String> {
        return (display?.visibleTexts() ?: emptyList()) + safeMessage
    }
}

class MerchantReceivingMethodsApiRepository(
    private val transport: MerchantApiTransport
) {
    fun list(session: AuthenticatedMerchantSession): MerchantReceivingMethodsResult {
        if (!session.isAuthenticated) {
            return MerchantReceivingMethodsResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                safeMessage = "Session marchand requise"
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "GET",
                path = "/v1/merchant/receiving-routes",
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantReceivingMethodsResult(MerchantRepositoryState.ERROR, safeMessage = "Moyens indisponibles")
        }
        val displays = extractTopLevelObjectsFromArray(response.body, "routes")
            .mapNotNull { it.toReceivingMethodDisplay() }
        return MerchantReceivingMethodsResult(
            state = if (displays.isEmpty()) MerchantRepositoryState.EMPTY else MerchantRepositoryState.SUCCESS,
            items = displays
        )
    }

    fun create(
        session: AuthenticatedMerchantSession,
        submission: MerchantReceivingMethodSubmission
    ): MerchantReceivingMethodMutationResult {
        if (!session.isAuthenticated) {
            return MerchantReceivingMethodMutationResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                display = null,
                clearedSubmission = submission.cleared(),
                safeMessage = "Session marchand requise"
            )
        }
        val body = jsonObject(
            "bank_profile_id" to submission.bankProfileId,
            "rail_type" to submission.type.wireValue,
            "receiver_identifier" to submission.rawIdentifier,
            "route_code" to submission.routeCode,
            "display_label" to submission.displayLabel,
            "enabled" to submission.enabled,
            "recommended" to submission.recommended,
            "review_policy" to reviewPolicyFor(submission.type)
        )
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/merchant/receiving-routes",
                headers = authHeaders(session),
                body = body
            )
        )
        return mutationResultFrom(response, submission)
    }

    fun disable(session: AuthenticatedMerchantSession, routeId: String): MerchantReceivingMethodMutationResult {
        val placeholder = MerchantReceivingMethodSubmission(
            bankProfileId = "",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "",
            routeCode = "",
            displayLabel = ""
        )
        return patch(session, routeId, jsonObject("enabled" to false), placeholder)
    }

    fun markRecommended(session: AuthenticatedMerchantSession, routeId: String): MerchantReceivingMethodMutationResult {
        val placeholder = MerchantReceivingMethodSubmission(
            bankProfileId = "",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "",
            routeCode = "",
            displayLabel = ""
        )
        return patch(session, routeId, jsonObject("recommended" to true), placeholder)
    }

    private fun patch(
        session: AuthenticatedMerchantSession,
        routeId: String,
        body: String,
        submission: MerchantReceivingMethodSubmission
    ): MerchantReceivingMethodMutationResult {
        if (!session.isAuthenticated) {
            return MerchantReceivingMethodMutationResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                display = null,
                clearedSubmission = submission.cleared(),
                safeMessage = "Session marchand requise"
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "PATCH",
                path = "/v1/merchant/receiving-routes/${urlPath(routeId)}",
                headers = authHeaders(session),
                body = body
            )
        )
        return mutationResultFrom(response, submission)
    }

    private fun mutationResultFrom(
        response: MerchantApiResponse,
        submission: MerchantReceivingMethodSubmission
    ): MerchantReceivingMethodMutationResult {
        if (response.statusCode !in 200..299) {
            return MerchantReceivingMethodMutationResult(
                state = MerchantRepositoryState.ERROR,
                display = null,
                clearedSubmission = submission.cleared(),
                safeMessage = "Moyen indisponible"
            )
        }
        val routeObject = extractObjectValue(response.body, "route")
        return MerchantReceivingMethodMutationResult(
            state = MerchantRepositoryState.SUCCESS,
            display = routeObject?.toReceivingMethodDisplay(),
            clearedSubmission = submission.cleared()
        )
    }

    private fun execute(request: MerchantApiRequest): MerchantApiResponse {
        return try {
            transport.execute(request)
        } catch (_: Exception) {
            MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}""")
        }
    }
}

data class MerchantReviewQueueItem(
    val reviewId: String,
    val amountLabel: String,
    val bankDisplayName: String,
    val statusLabel: String,
    val helper: String,
    val reasonLabels: List<String>
) {
    fun visibleTexts(): List<String> {
        return listOf(amountLabel, bankDisplayName, statusLabel, helper) + reasonLabels
    }
}

data class MerchantReviewQueueResult(
    val state: MerchantRepositoryState,
    val items: List<MerchantReviewQueueItem> = emptyList(),
    val safeMessage: String = ""
) {
    fun visibleTexts(): List<String> {
        return items.flatMap { it.visibleTexts() } + safeMessage
    }

    fun toScreen(): MerchantUiScreen {
        if (items.isEmpty()) {
            return AndroidMerchantUiCatalog().reviewQueueScreen()
        }
        return MerchantUiScreen(
            id = "review_queue",
            title = "Paiements à vérifier",
            subtitle = "Confirmez uniquement les paiements que vous reconnaissez.",
            texts = listOf("Tous", "À vérifier", "Validés", "Rejetés", "Expirés") +
                items.flatMap { item ->
                    listOf(item.amountLabel, item.bankDisplayName, item.helper, item.statusLabel, "Examiner") +
                        item.reasonLabels
                }
        )
    }
}

class MerchantReviewQueueApiRepository(
    private val transport: MerchantApiTransport
) {
    fun list(session: AuthenticatedMerchantSession): MerchantReviewQueueResult {
        if (!session.isAuthenticated) {
            return MerchantReviewQueueResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                safeMessage = "Session marchand requise"
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "GET",
                path = "/v1/reviews",
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantReviewQueueResult(MerchantRepositoryState.ERROR, safeMessage = "Revue indisponible")
        }
        val items = extractTopLevelObjectsFromArray(response.body, "reviews").map { reviewObject ->
            val reviewId = extractString(reviewObject, "review_id").orEmpty()
            val bankProfileId = extractString(reviewObject, "bank_profile_id").orEmpty()
            val amount = extractNestedString(reviewObject, "amount", "value") ?: "0.00"
            val currency = extractNestedString(reviewObject, "amount", "currency") ?: "RUB"
            val reasons = extractReasonTokens(reviewObject)
            MerchantReviewQueueItem(
                reviewId = reviewId,
                amountLabel = formatAmountLabel(amount, currency),
                bankDisplayName = bankDisplayNameFor(bankProfileId),
                statusLabel = "À vérifier",
                helper = "Signal détecté",
                reasonLabels = reasons.mapMerchantReasonLabels()
            )
        }
        return MerchantReviewQueueResult(
            state = if (items.isEmpty()) MerchantRepositoryState.EMPTY else MerchantRepositoryState.SUCCESS,
            items = items
        )
    }

    private fun execute(request: MerchantApiRequest): MerchantApiResponse {
        return try {
            transport.execute(request)
        } catch (_: Exception) {
            MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}""")
        }
    }
}

enum class MerchantReviewActionResultStatus {
    MANUAL_CONFIRMED,
    SIGNAL_REJECTED,
    ORDER_REJECTED,
    ACTION_REQUIRED,
    ERROR
}

data class MerchantReviewActionApiResult(
    val status: MerchantReviewActionResultStatus,
    val rejectsOrder: Boolean,
    val safeMessage: String
) {
    fun visibleTexts(): List<String> = listOf(safeMessage)
}

class MerchantReviewActionsApiRepository(
    private val transport: MerchantApiTransport
) {
    val sendsDeveloperWebhookDirectly: Boolean = false

    fun confirm(session: AuthenticatedMerchantSession, reviewId: String): MerchantReviewActionApiResult {
        return action(
            session = session,
            reviewId = reviewId,
            pathSuffix = "confirm",
            body = jsonObject("actor_id" to "android_merchant"),
            fallbackStatus = MerchantReviewActionResultStatus.MANUAL_CONFIRMED
        )
    }

    fun rejectSignal(session: AuthenticatedMerchantSession, reviewId: String): MerchantReviewActionApiResult {
        return action(
            session = session,
            reviewId = reviewId,
            pathSuffix = "reject",
            body = jsonObject(
                "actor_id" to "android_merchant",
                "scope" to "signal",
                "reason" to "wrong_signal"
            ),
            fallbackStatus = MerchantReviewActionResultStatus.SIGNAL_REJECTED
        )
    }

    fun rejectOrder(session: AuthenticatedMerchantSession, reviewId: String): MerchantReviewActionApiResult {
        return action(
            session = session,
            reviewId = reviewId,
            pathSuffix = "reject",
            body = jsonObject(
                "actor_id" to "android_merchant",
                "scope" to "order",
                "reason" to "buyer_not_recognized"
            ),
            fallbackStatus = MerchantReviewActionResultStatus.ORDER_REJECTED
        )
    }

    private fun action(
        session: AuthenticatedMerchantSession,
        reviewId: String,
        pathSuffix: String,
        body: String,
        fallbackStatus: MerchantReviewActionResultStatus
    ): MerchantReviewActionApiResult {
        if (!session.isAuthenticated) {
            return MerchantReviewActionApiResult(
                status = MerchantReviewActionResultStatus.ACTION_REQUIRED,
                rejectsOrder = false,
                safeMessage = "Session marchand requise"
            )
        }
        val response = try {
            transport.execute(
                MerchantApiRequest(
                    method = "POST",
                    path = "/v1/reviews/${urlPath(reviewId)}/$pathSuffix",
                    headers = authHeaders(session),
                    body = body
                )
            )
        } catch (_: Exception) {
            MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}""")
        }
        if (response.statusCode !in 200..299) {
            return MerchantReviewActionApiResult(
                status = MerchantReviewActionResultStatus.ERROR,
                rejectsOrder = false,
                safeMessage = "Action indisponible"
            )
        }
        val responseScope = extractString(response.body, "rejection_scope")
        val orderStatus = extractString(response.body, "order_status")
        val status = when {
            orderStatus == "manual_confirmed" -> MerchantReviewActionResultStatus.MANUAL_CONFIRMED
            responseScope == "order" || orderStatus == "rejected" -> MerchantReviewActionResultStatus.ORDER_REJECTED
            responseScope == "signal" -> MerchantReviewActionResultStatus.SIGNAL_REJECTED
            else -> fallbackStatus
        }
        return MerchantReviewActionApiResult(
            status = status,
            rejectsOrder = status == MerchantReviewActionResultStatus.ORDER_REJECTED,
            safeMessage = when (status) {
                MerchantReviewActionResultStatus.MANUAL_CONFIRMED -> "Validé"
                MerchantReviewActionResultStatus.SIGNAL_REJECTED -> "Signal rejeté"
                MerchantReviewActionResultStatus.ORDER_REJECTED -> "Commande rejetée"
                MerchantReviewActionResultStatus.ACTION_REQUIRED -> "Action requise"
                MerchantReviewActionResultStatus.ERROR -> "Action indisponible"
            }
        )
    }
}

data class MerchantScreenRepositoryResult(
    val state: MerchantRepositoryState,
    private val texts: List<String>,
    val usesMockRepository: Boolean,
    val safeMessage: String = ""
) {
    fun visibleTexts(): List<String> = texts + safeMessage
}

class MerchantDashboardRepository private constructor() {
    fun load(session: AuthenticatedMerchantSession): MerchantScreenRepositoryResult {
        if (!session.isAuthenticated) {
            return MerchantScreenRepositoryResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = true
            )
        }
        return MerchantScreenRepositoryResult(
            state = MerchantRepositoryState.SUCCESS,
            texts = AndroidMerchantUiCatalog().dashboardScreen(receiverReady = true).visibleTexts(),
            usesMockRepository = true,
            safeMessage = "Mock explicite: endpoint dashboard Android marchand manquant"
        )
    }

    companion object {
        fun mockOnly(): MerchantDashboardRepository = MerchantDashboardRepository()
    }
}

class MerchantConnectedSiteRepository private constructor() {
    fun load(
        session: AuthenticatedMerchantSession,
        developerDetailsEnabled: Boolean
    ): MerchantScreenRepositoryResult {
        if (!session.isAuthenticated) {
            return MerchantScreenRepositoryResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = true
            )
        }
        return MerchantScreenRepositoryResult(
            state = MerchantRepositoryState.SUCCESS,
            texts = AndroidMerchantUiCatalog().connectedSiteScreen(developerDetailsEnabled).visibleTexts(),
            usesMockRepository = true,
            safeMessage = "Mock explicite: endpoint site connecté Android manquant"
        )
    }

    companion object {
        fun mockOnly(): MerchantConnectedSiteRepository = MerchantConnectedSiteRepository()
    }
}

enum class MerchantConfigurationTestOutcome {
    READY,
    ACTION_REQUIRED,
    ERROR
}

data class MerchantConfigurationTestResult(
    val outcome: MerchantConfigurationTestOutcome,
    val confirmsRealPayment: Boolean,
    private val texts: List<String>,
    val usesMockRepository: Boolean
) {
    fun visibleTexts(): List<String> = texts
}

class MerchantConfigurationTestRepository private constructor() {
    fun run(
        session: AuthenticatedMerchantSession,
        checklist: MerchantConfigurationChecklist
    ): MerchantConfigurationTestResult {
        if (!session.isAuthenticated) {
            return MerchantConfigurationTestResult(
                outcome = MerchantConfigurationTestOutcome.ACTION_REQUIRED,
                confirmsRealPayment = false,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = true
            )
        }
        val screen = AndroidMerchantUiCatalog().configurationTestScreen(checklist)
        return MerchantConfigurationTestResult(
            outcome = if (checklist.allItemsReady()) {
                MerchantConfigurationTestOutcome.READY
            } else {
                MerchantConfigurationTestOutcome.ACTION_REQUIRED
            },
            confirmsRealPayment = false,
            texts = screen.visibleTexts(),
            usesMockRepository = true
        )
    }

    companion object {
        fun mockOnly(): MerchantConfigurationTestRepository = MerchantConfigurationTestRepository()
    }
}

fun authHeaders(session: AuthenticatedMerchantSession): Map<String, String> {
    val header = session.authorizationHeader()
    return if (header.isBlank()) emptyMap() else mapOf("Authorization" to header)
}

private fun reviewPolicyFor(type: ReceivingMethodType): String {
    return when (type) {
        ReceivingMethodType.CARD_TRANSFER -> "review_first"
        ReceivingMethodType.PHONE_TRANSFER -> "eligible_low_risk_later"
    }
}

private fun String.toReceivingMethodDisplay(): MerchantReceivingMethodDisplay? {
    val railType = extractString(this, "rail_type") ?: return null
    val bankProfileId = extractString(this, "bank_profile_id").orEmpty()
    val masked = extractString(this, "receiver_identifier_masked").orEmpty()
    val enabled = extractBoolean(this, "enabled") ?: true
    val recommended = extractBoolean(this, "recommended") ?: false
    val type = when (railType) {
        ReceivingMethodType.CARD_TRANSFER.wireValue -> ReceivingMethodType.CARD_TRANSFER
        ReceivingMethodType.PHONE_TRANSFER.wireValue -> ReceivingMethodType.PHONE_TRANSFER
        else -> return null
    }
    val actions = buildList {
        add("Modifier")
        if (enabled) add("Désactiver")
        if (!recommended) add("Définir par défaut")
    }
    return MerchantReceivingMethodDisplay(
        title = type.merchantLabel,
        subtitle = "${bankDisplayNameFor(bankProfileId)} · $masked",
        helper = if (type == ReceivingMethodType.PHONE_TRANSFER) "Pratique pour SBP" else null,
        status = if (enabled) "Active" else "Désactivée",
        actions = actions
    )
}

fun bankDisplayNameFor(bankProfileId: String): String {
    return when (bankProfileId) {
        "sber_ru" -> "Sberbank"
        "tbank_ru" -> "T-Bank"
        "vtb_ru" -> "VTB"
        "alfa_ru" -> "Alfa-Bank"
        "gazprombank_ru" -> "Gazprombank"
        else -> "Banque choisie"
    }
}

fun extractTopLevelObjectsFromArray(body: String, key: String): List<String> {
    val arrayStart = Regex("\"${Regex.escape(key)}\"\\s*:\\s*\\[").find(body)?.range?.last?.plus(1) ?: return emptyList()
    var depth = 0
    var objectStart = -1
    val objects = mutableListOf<String>()
    for (index in arrayStart until body.length) {
        when (body[index]) {
            '{' -> {
                if (depth == 0) objectStart = index
                depth += 1
            }
            '}' -> {
                depth -= 1
                if (depth == 0 && objectStart >= 0) {
                    objects.add(body.substring(objectStart, index + 1))
                    objectStart = -1
                }
            }
            ']' -> if (depth == 0) return objects
        }
    }
    return objects
}

fun extractObjectValue(body: String, key: String): String? {
    val objectStart = Regex("\"${Regex.escape(key)}\"\\s*:\\s*\\{").find(body)?.range?.last ?: return null
    var depth = 0
    var start = -1
    for (index in objectStart until body.length) {
        when (body[index]) {
            '{' -> {
                if (depth == 0) start = index
                depth += 1
            }
            '}' -> {
                depth -= 1
                if (depth == 0 && start >= 0) return body.substring(start, index + 1)
            }
        }
    }
    return null
}

fun extractBoolean(body: String, key: String): Boolean? {
    val match = Regex("\"${Regex.escape(key)}\"\\s*:\\s*(true|false)").find(body) ?: return null
    return match.groupValues[1].toBooleanStrictOrNull()
}

fun extractNestedString(body: String, objectKey: String, nestedKey: String): String? {
    return extractObjectValue(body, objectKey)?.let { extractString(it, nestedKey) }
}

fun extractStringArray(body: String, key: String): List<String> {
    val match = Regex("\"${Regex.escape(key)}\"\\s*:\\s*\\[(.*?)]", RegexOption.DOT_MATCHES_ALL).find(body)
        ?: return emptyList()
    return Regex("\"([^\"]*)\"").findAll(match.groupValues[1]).map { it.groupValues[1] }.toList()
}

fun extractReasonTokens(reviewObject: String): List<String> {
    return buildList {
        extractString(reviewObject, "reason_code")?.let { add(it) }
        addAll(extractStringArray(reviewObject, "negative_reasons"))
        addAll(extractStringArray(reviewObject, "positive_reasons"))
    }.distinct()
}

fun List<String>.mapMerchantReasonLabels(): List<String> {
    val labels = mutableListOf<String>()
    for (reason in this) {
        val normalized = reason.lowercase(Locale.US)
        when {
            normalized.contains("review_only") || normalized.contains("manual_validation") ->
                labels.add(MerchantReviewReasonCode.MANUAL_VALIDATION_BETA.merchantLabel)
            normalized.contains("reference_not") || normalized.contains("reference") ->
                labels.add(MerchantReviewReasonCode.REFERENCE_NOT_VISIBLE.merchantLabel)
            normalized.contains("amount_only") ->
                labels.add(MerchantReviewReasonCode.AMOUNT_ONLY_RECOGNIZED.merchantLabel)
            normalized.contains("collision") || normalized.contains("multiple") ->
                labels.add(MerchantReviewReasonCode.MULTIPLE_SIMILAR_PAYMENTS.merchantLabel)
            normalized.contains("bank") || normalized.contains("untrusted") ->
                labels.add(MerchantReviewReasonCode.BANK_STILL_IN_TEST.merchantLabel)
        }
    }
    if (labels.isEmpty()) labels.add(MerchantReviewReasonCode.MANUAL_VALIDATION_BETA.merchantLabel)
    return labels.distinct()
}

fun formatAmountLabel(value: String, currency: String): String {
    val normalized = value.replace('.', ',')
    val withCents = if (normalized.contains(',')) normalized else "$normalized,00"
    val symbol = if (currency == "RUB") "₽" else currency
    return "$withCents $symbol"
}

fun urlPath(value: String): String {
    return value.replace(Regex("[^A-Za-z0-9_\\-.]"), "")
}
