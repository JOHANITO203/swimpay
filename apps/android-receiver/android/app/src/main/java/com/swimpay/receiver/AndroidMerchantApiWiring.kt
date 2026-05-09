package com.swimpay.receiver

import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.util.Locale
import android.util.Log
import com.swimpay.receiver.ui.premium.PremiumSupportTicketDraft
import com.swimpay.receiver.ui.premium.PremiumSupportTicketResult
import com.swimpay.receiver.ui.premium.SupportSafety

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
    val safeModeLabel: String = when (authMode) {
        LOCAL_DEV_AUTH_MODE -> "Session marchand local/dev"
        MOBILE_AUTH_MODE -> "Session mobile Android"
        else -> "Session marchand non connectée"
    }

    fun authorizationHeader(): String {
        return bearerToken?.let { "Bearer $it" }.orEmpty()
    }

    fun visibleTexts(): List<String> {
        return listOf(merchantStatusLabel, safeModeLabel)
    }

    override fun toString(): String {
        return "AuthenticatedMerchantSession(merchantId=$merchantId, authMode=$authMode, isAuthenticated=$isAuthenticated)"
    }

    companion object {
        private const val LOCAL_DEV_AUTH_MODE = "local_dev"
        private const val MOBILE_AUTH_MODE = "android_mobile"

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

        fun mobile(merchantId: String, mobileSessionToken: String): AuthenticatedMerchantSession {
            val safeMerchantId = merchantId.trim()
            val safeToken = mobileSessionToken.trim()
            require(safeMerchantId.isNotBlank()) { "merchantId cannot be blank" }
            require(safeToken.startsWith("spm_")) { "mobile session token must use spm_ prefix" }
            return AuthenticatedMerchantSession(
                merchantId = safeMerchantId,
                bearerToken = safeToken,
                authMode = MOBILE_AUTH_MODE,
                isAuthenticated = true
            )
        }

        fun mobile(session: AndroidMerchantMobileSession): AuthenticatedMerchantSession {
            return mobile(session.merchantId, session.authorizationTokenForRuntime())
        }
    }
}

data class AndroidMerchantDeviceProof(
    val installPublicKey: String,
    val challengeId: String,
    val challengeSignature: String
) {
    fun toRequestMap(): Map<String, String> {
        return mapOf(
            "install_public_key" to installPublicKey,
            "challenge_id" to challengeId,
            "challenge_signature" to challengeSignature
        )
    }
}

interface AndroidMerchantDeviceProofProvider {
    fun currentProof(): AndroidMerchantDeviceProof
}

class StaticAndroidMerchantDeviceProofProvider(
    private val proof: AndroidMerchantDeviceProof
) : AndroidMerchantDeviceProofProvider {
    override fun currentProof(): AndroidMerchantDeviceProof = proof
}

enum class AndroidMerchantDeviceLookupIntent(val wireValue: String) {
    CREATE_ACCOUNT("create_account"),
    RECOVER_ACCOUNT("recover_account")
}

enum class AndroidMerchantDeviceLookupStatus(val wireValue: String) {
    NEW_DEVICE("new_device"),
    KNOWN_DEVICE("known_device"),
    RECOVERY_REQUIRED("recovery_required"),
    ERROR("error")
}

enum class AndroidMerchantAccountProfileType(val wireValue: String) {
    PERSONAL("personal"),
    BUSINESS("business")
}

enum class AndroidMerchantAuthResultStatus {
    SUCCESS,
    ACTION_REQUIRED,
    ERROR
}

data class AndroidMerchantDeviceLookupResult(
    val status: AndroidMerchantAuthResultStatus,
    val deviceStatus: AndroidMerchantDeviceLookupStatus,
    val merchantId: String? = null,
    val deviceId: String? = null,
    val recoveryRequired: Boolean = false,
    val safeMessage: String = ""
) {
    fun visibleTexts(): List<String> = listOfNotNull(safeMessage.takeIf { it.isNotBlank() })
}

class AndroidMerchantMobileSession(
    val merchantId: String,
    val userId: String,
    val displayHandle: String,
    private val mobileSessionToken: String,
    val expiresAtEpochMs: Long
) {
    init {
        require(merchantId.isNotBlank()) { "merchantId cannot be blank" }
        require(userId.isNotBlank()) { "userId cannot be blank" }
        require(displayHandle.isNotBlank()) { "displayHandle cannot be blank" }
        require(mobileSessionToken.startsWith("spm_")) { "mobile session token must use spm_ prefix" }
    }

    fun isValid(nowEpochMs: Long = System.currentTimeMillis()): Boolean = expiresAtEpochMs > nowEpochMs

    fun authorizationTokenForRuntime(): String = mobileSessionToken

    fun visibleTexts(): List<String> = listOf(displayHandle, "Session mobile Android")

    override fun toString(): String {
        return "AndroidMerchantMobileSession(merchantId=$merchantId, userId=$userId, displayHandle=$displayHandle, expiresAtEpochMs=$expiresAtEpochMs)"
    }
}

data class AndroidMerchantAccountCreateResult(
    val status: AndroidMerchantAuthResultStatus,
    val mobileSession: AndroidMerchantMobileSession? = null,
    val safeMessage: String = ""
) {
    fun visibleTexts(): List<String> = (mobileSession?.visibleTexts() ?: emptyList()) +
        listOfNotNull(safeMessage.takeIf { it.isNotBlank() })
}

object AndroidMerchantAuthApiContract {
    const val DEVICE_LOOKUP_PATH = "/v1/android-merchant/auth/device-lookup"
    const val CREATE_ACCOUNT_PATH = "/v1/android-merchant/auth/create-account"
    const val GOOGLE_EXCHANGE_PATH = "/v1/android-merchant/auth/google/exchange"
    const val GOOGLE_LINK_PATH = "/v1/android-merchant/auth/google/link"
}

data class AndroidMerchantAccountEntryContract(
    val deviceLookupPath: String,
    val lookupIntents: Set<AndroidMerchantDeviceLookupIntent>,
    val deviceLookupRequiredBeforeCreateAccount: Boolean,
    val deviceLookupRequiredBeforeGoogleRecovery: Boolean,
    val googleRequiredForCreateAccount: Boolean,
    val rawDeviceIdentifiersAllowed: Boolean
) {
    companion object {
        fun current(): AndroidMerchantAccountEntryContract {
            return AndroidMerchantAccountEntryContract(
                deviceLookupPath = AndroidMerchantAuthApiContract.DEVICE_LOOKUP_PATH,
                lookupIntents = setOf(
                    AndroidMerchantDeviceLookupIntent.CREATE_ACCOUNT,
                    AndroidMerchantDeviceLookupIntent.RECOVER_ACCOUNT
                ),
                deviceLookupRequiredBeforeCreateAccount = true,
                deviceLookupRequiredBeforeGoogleRecovery = true,
                googleRequiredForCreateAccount = false,
                rawDeviceIdentifiersAllowed = false
            )
        }
    }
}

class AndroidMerchantAuthApiRepository(
    private val transport: MerchantApiTransport,
    private val deviceProofProvider: AndroidMerchantDeviceProofProvider
) {
    fun lookupDevice(intent: AndroidMerchantDeviceLookupIntent): AndroidMerchantDeviceLookupResult {
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = AndroidMerchantAuthApiContract.DEVICE_LOOKUP_PATH,
                body = jsonObject(
                    "lookup_intent" to intent.wireValue,
                    "device_proof" to deviceProofProvider.currentProof().toRequestMap()
                )
            )
        )
        if (response.statusCode !in 200..299) {
            return AndroidMerchantDeviceLookupResult(
                status = AndroidMerchantAuthResultStatus.ERROR,
                deviceStatus = AndroidMerchantDeviceLookupStatus.ERROR,
                safeMessage = "Connexion en attente"
            )
        }
        val deviceStatus = when (extractString(response.body, "device_status")) {
            AndroidMerchantDeviceLookupStatus.KNOWN_DEVICE.wireValue -> AndroidMerchantDeviceLookupStatus.KNOWN_DEVICE
            AndroidMerchantDeviceLookupStatus.RECOVERY_REQUIRED.wireValue -> AndroidMerchantDeviceLookupStatus.RECOVERY_REQUIRED
            else -> AndroidMerchantDeviceLookupStatus.NEW_DEVICE
        }
        return AndroidMerchantDeviceLookupResult(
            status = AndroidMerchantAuthResultStatus.SUCCESS,
            deviceStatus = deviceStatus,
            merchantId = extractString(response.body, "merchant_id"),
            deviceId = extractString(response.body, "device_id"),
            recoveryRequired = extractBoolean(response.body, "recovery_required") == true
        )
    }

    fun createAccount(
        profileType: AndroidMerchantAccountProfileType,
        businessLabel: String? = null
    ): AndroidMerchantAccountCreateResult {
        val bodyEntries = buildList<Pair<String, Any?>> {
            add("profile_type" to profileType.wireValue)
            if (!businessLabel.isNullOrBlank()) add("business_label" to businessLabel.trim())
            add("device_proof" to deviceProofProvider.currentProof().toRequestMap())
        }
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = AndroidMerchantAuthApiContract.CREATE_ACCOUNT_PATH,
                body = jsonObject(bodyEntries)
            )
        )
        if (response.statusCode !in 200..299) {
            return AndroidMerchantAccountCreateResult(
                status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
                safeMessage = "Compte non créé"
            )
        }
        return accountCreateResultFrom(response)
    }

    private fun accountCreateResultFrom(response: MerchantApiResponse): AndroidMerchantAccountCreateResult {
        val account = extractObjectValue(response.body, "account").orEmpty()
        val mobileSession = extractObjectValue(response.body, "mobile_session").orEmpty()
        val token = extractString(mobileSession, "token")
        val expiresAt = extractString(mobileSession, "expires_at")
        val merchantId = extractString(account, "merchant_id")
        val userId = extractString(account, "user_id")
        val displayHandle = extractString(account, "display_handle")
        if (token == null || expiresAt == null || merchantId == null || userId == null || displayHandle == null) {
            return AndroidMerchantAccountCreateResult(
                status = AndroidMerchantAuthResultStatus.ERROR,
                safeMessage = "Session mobile indisponible"
            )
        }
        return AndroidMerchantAccountCreateResult(
            status = AndroidMerchantAuthResultStatus.SUCCESS,
            mobileSession = AndroidMerchantMobileSession(
                merchantId = merchantId,
                userId = userId,
                displayHandle = displayHandle,
                mobileSessionToken = token,
                expiresAtEpochMs = parseIsoEpochMs(expiresAt)
            )
        )
    }

    fun googleExchange(idToken: String): AndroidMerchantAccountCreateResult {
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = AndroidMerchantAuthApiContract.GOOGLE_EXCHANGE_PATH,
                body = jsonObject(
                    "id_token" to idToken,
                    "device_proof" to deviceProofProvider.currentProof().toRequestMap()
                )
            )
        )
        return googleResultFrom(response)
    }

    fun googleLink(session: AuthenticatedMerchantSession, idToken: String): AndroidMerchantAccountCreateResult {
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = AndroidMerchantAuthApiContract.GOOGLE_LINK_PATH,
                headers = authHeaders(session),
                body = jsonObject("id_token" to idToken)
            )
        )
        return if (response.statusCode in 200..299) {
            AndroidMerchantAccountCreateResult(
                status = AndroidMerchantAuthResultStatus.SUCCESS,
                safeMessage = "Google associé"
            )
        } else {
            googleRecoveryFailureResult(response)
        }
    }

    private fun googleResultFrom(response: MerchantApiResponse): AndroidMerchantAccountCreateResult {
        return if (response.statusCode in 200..299) {
            accountCreateResultFrom(response)
        } else {
            googleRecoveryFailureResult(response)
        }
    }

    private fun googleRecoveryFailureResult(response: MerchantApiResponse): AndroidMerchantAccountCreateResult {
        val code = extractString(response.body, "code")
        val message = extractString(response.body, "message").orEmpty()
        val tokenAudienceConfigured = extractBoolean(response.body, "token_audience_configured")
        runCatching {
            Log.w("SwimPayGoogleAuth", "google_backend_failed status=${response.statusCode} code=${code ?: "unknown"}")
        }
        val safeMessage = when {
            code == "backend_unreachable" -> "Backend staging injoignable depuis l'app."
            code == "service_unavailable" -> "Service de compte Google indisponible côté serveur."
            code == "google_id_token_rejected" && tokenAudienceConfigured == false ->
                "Client Google non configuré côté backend."
            code == "google_id_token_rejected" && tokenAudienceConfigured == true ->
                "ID Google reconnu, vérification serveur échouée."
            response.statusCode == 401 -> "ID Google rejeté par le backend."
            response.statusCode == 409 && message.contains("already linked", ignoreCase = true) ->
                "Ce compte Google est déjà lié à un autre profil SwimPay."
            code == "google_recovery_unconfigured" ->
                "Google n'est pas configuré sur ce serveur."
            response.statusCode == 503 -> "Google temporairement indisponible."
            else -> "Association Google indisponible."
        }
        return AndroidMerchantAccountCreateResult(
            status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
            safeMessage = safeMessage
        )
    }

    private fun googleRecoveryUnavailableResult(): AndroidMerchantAccountCreateResult {
        return AndroidMerchantAccountCreateResult(
            status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
            safeMessage = "Récupération Google indisponible"
        )
    }

    private fun execute(request: MerchantApiRequest): MerchantApiResponse {
        return try {
            transport.execute(request)
        } catch (error: Exception) {
            if (BuildConfig.DEBUG) {
                Log.w("SwimPayHttp", "${request.method} ${request.path} failed: ${error::class.java.simpleName}")
            }
            MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}""")
        }
    }

    private fun parseIsoEpochMs(value: String): Long {
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrDefault(0L)
    }
}

data class AndroidReceiverRuntimeRegistrationResult(
    val status: AndroidMerchantAuthResultStatus,
    val deviceState: ReceiverDeviceState? = null,
    val safeMessage: String = ""
)

interface ReceiverDeviceRegistrationClient {
    fun registerAndHeartbeat(
        session: AuthenticatedMerchantSession,
        enabledBankProfileIds: Set<String>,
        publicKeyPem: String,
        notificationAccessEnabled: Boolean,
        appVersion: String,
        androidVersion: String
    ): AndroidReceiverRuntimeRegistrationResult
}

class AndroidReceiverDeviceApiRepository(
    private val transport: MerchantApiTransport,
    private val backendBaseUrl: String
) : ReceiverDeviceRegistrationClient {
    override fun registerAndHeartbeat(
        session: AuthenticatedMerchantSession,
        enabledBankProfileIds: Set<String>,
        publicKeyPem: String,
        notificationAccessEnabled: Boolean,
        appVersion: String,
        androidVersion: String
    ): AndroidReceiverRuntimeRegistrationResult {
        if (!session.isAuthenticated) {
            return AndroidReceiverRuntimeRegistrationResult(
                status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
                safeMessage = "Session marchand requise"
            )
        }
        val safeBankIds = enabledBankProfileIds
            .filter { id -> BankTargetLock.supportedTargets.any { it.bankProfileId == id } }
            .toSet()
        if (safeBankIds.isEmpty()) {
            return AndroidReceiverRuntimeRegistrationResult(
                status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
                safeMessage = "Choisissez au moins une banque compatible"
            )
        }
        if (!publicKeyPem.trim().startsWith("-----BEGIN PUBLIC KEY-----")) {
            return AndroidReceiverRuntimeRegistrationResult(
                status = AndroidMerchantAuthResultStatus.ACTION_REQUIRED,
                safeMessage = "Cle publique receiver requise"
            )
        }

        val registration = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/receiver-devices/register",
                headers = authHeaders(session),
                body = jsonObject(
                    "device_name" to "SwimPay Android Receiver",
                    "app_version" to appVersion,
                    "android_version" to androidVersion,
                    "public_key" to publicKeyPem,
                    "supported_capabilities" to listOf(
                        "notification_access",
                        "signed_signal_upload",
                        "local_redaction"
                    ),
                    "selected_banks" to safeBankIds.toList()
                )
            )
        )
        if (registration.statusCode !in 200..299) {
            return AndroidReceiverRuntimeRegistrationResult(
                status = AndroidMerchantAuthResultStatus.ERROR,
                safeMessage = "Receiver non enregistre"
            )
        }

        val deviceId = extractString(registration.body, "device_id")
            ?: return AndroidReceiverRuntimeRegistrationResult(
                status = AndroidMerchantAuthResultStatus.ERROR,
                safeMessage = "Identifiant receiver indisponible"
            )
        val registeredAt = extractString(registration.body, "server_time") ?: java.time.Instant.now().toString()

        val heartbeat = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/receiver-devices/heartbeat",
                headers = authHeaders(session),
                body = jsonObject(
                    "device_id" to deviceId,
                    "app_version" to appVersion,
                    "android_version" to androidVersion,
                    "notification_access_enabled" to notificationAccessEnabled,
                    "listener_connected" to notificationAccessEnabled,
                    "allowed_bank_profile_ids" to safeBankIds.toList(),
                    "queue_length" to 0,
                    "last_signal_observed_at" to null,
                    "timestamp" to registeredAt,
                    "signature" to "heartbeat_signature_present"
                )
            )
        )
        if (heartbeat.statusCode !in 200..299) {
            return AndroidReceiverRuntimeRegistrationResult(
                status = AndroidMerchantAuthResultStatus.ERROR,
                safeMessage = "Heartbeat receiver indisponible"
            )
        }

        val heartbeatAt = extractString(heartbeat.body, "server_time") ?: registeredAt
        val deviceStatus = extractString(heartbeat.body, "status")
            ?: extractString(heartbeat.body, "device_status")
            ?: extractString(registration.body, "status")
            ?: "pending"
        return AndroidReceiverRuntimeRegistrationResult(
            status = AndroidMerchantAuthResultStatus.SUCCESS,
            deviceState = ReceiverDeviceState(
                deviceId = deviceId,
                deviceStatus = deviceStatus,
                serverTime = heartbeatAt,
                appVersion = appVersion,
                lastRegistrationAt = registeredAt,
                lastHeartbeatAt = heartbeatAt,
                backendBaseUrl = AndroidMerchantBackendConfig.normalizeBaseUrl(backendBaseUrl),
                lastLocalCounter = 0,
                lastNotificationListenerAccessEnabled = notificationAccessEnabled
            )
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

object AndroidMerchantReviewApiContract {
    const val REVIEW_QUEUE_PATH = "/v1/reviews"

    fun rejectPath(reviewId: String): String = "$REVIEW_QUEUE_PATH/${urlPath(reviewId)}/reject"
}

class HttpUrlConnectionMerchantApiTransport(
    private val baseUrl: String,
    private val timeoutMs: Int = DEFAULT_TIMEOUT_MS
) : MerchantApiTransport {
    companion object {
        const val DEFAULT_TIMEOUT_MS: Int = 20_000
    }

    override fun execute(request: MerchantApiRequest): MerchantApiResponse {
        val safeUrl = baseUrl.trimEnd('/') + request.path
        val connection = URL(safeUrl).openConnection() as HttpURLConnection
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
        if (BuildConfig.DEBUG) {
            Log.d("SwimPayHttp", "${request.method} ${request.path} -> $status")
        }
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
    val recommended: Boolean = false,
    val rawIdentifierInput: String = rawIdentifier
) {
    fun cleared(): MerchantReceivingMethodSubmission {
        return copy(rawIdentifier = "", rawIdentifierInput = "")
    }
}

data class MerchantReceivingMethodDraft(
    val bankProfileId: String,
    val type: ReceivingMethodType,
    val rawIdentifierInput: String,
    val enabled: Boolean = true,
    val recommended: Boolean = false
) {
    fun toSubmission(): MerchantReceivingMethodSubmission {
        val safeBankProfileId = bankProfileId.trim()
        val safeRawIdentifier = rawIdentifierInput.trim()
        require(safeBankProfileId.isNotBlank()) { "bankProfileId cannot be blank" }
        require(safeRawIdentifier.isNotBlank()) { "receiver identifier cannot be blank" }
        return MerchantReceivingMethodSubmission(
            bankProfileId = safeBankProfileId,
            type = type,
            rawIdentifier = safeRawIdentifier,
            routeCode = routeCodeFor(safeBankProfileId, type),
            displayLabel = displayLabelFor(safeBankProfileId, type),
            enabled = enabled,
            recommended = recommended,
            rawIdentifierInput = safeRawIdentifier
        )
    }
}

private val MERCHANT_RECEIVING_METHOD_BANK_LABELS: Map<String, String> = mapOf(
    "sber_ru" to "Sberbank",
    "tbank_ru" to "T-Bank",
    "vtb_ru" to "VTB",
    "alfa_ru" to "Alfa-Bank",
    "gazprombank_ru" to "Gazprombank"
)

private val MERCHANT_RECEIVING_METHOD_BANK_CODES: Map<String, String> = mapOf(
    "sber_ru" to "SBER",
    "tbank_ru" to "TBANK",
    "vtb_ru" to "VTB",
    "alfa_ru" to "ALFA",
    "gazprombank_ru" to "GAZPROMBANK"
)

private fun routeCodeFor(bankProfileId: String, type: ReceivingMethodType): String {
    val bankCode = MERCHANT_RECEIVING_METHOD_BANK_CODES[bankProfileId] ?: bankProfileId.uppercase()
    val methodCode = when (type) {
        ReceivingMethodType.CARD_TRANSFER -> "CARD"
        ReceivingMethodType.PHONE_TRANSFER -> "PHONE"
    }
    return "$bankCode-$methodCode"
}

private fun displayLabelFor(bankProfileId: String, type: ReceivingMethodType): String {
    val bankLabel = MERCHANT_RECEIVING_METHOD_BANK_LABELS[bankProfileId] ?: bankProfileId
    return "$bankLabel - ${type.merchantLabel}"
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
                path = "/v1/merchant/receiving-methods",
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantReceivingMethodsResult(MerchantRepositoryState.ERROR, safeMessage = "Moyens indisponibles")
        }
        val displays = (
            extractTopLevelObjectsFromArray(response.body, "methods")
                .ifEmpty { extractTopLevelObjectsFromArray(response.body, "routes") }
            )
            .mapNotNull { it.toReceivingMethodDisplay() }
        return MerchantReceivingMethodsResult(
            state = MerchantRepositoryState.SUCCESS,
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
        val validationMessage = validateReceivingMethodSubmission(submission)
        if (validationMessage != null) {
            return MerchantReceivingMethodMutationResult(
                state = MerchantRepositoryState.ERROR,
                display = null,
                clearedSubmission = submission.cleared(),
                safeMessage = validationMessage
            )
        }
        val body = jsonObject(
            "bank_id" to submission.bankProfileId,
            "type" to receivingMethodProductType(submission.type),
            "value" to submission.rawIdentifier,
            "label" to submission.displayLabel,
            "is_default" to submission.recommended,
            "status" to if (submission.enabled) "active" else "inactive"
        )
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/merchant/receiving-methods",
                headers = authHeaders(session),
                body = body
            )
        )
        return mutationResultFrom(response, submission)
    }

    fun create(
        session: AuthenticatedMerchantSession,
        draft: MerchantReceivingMethodDraft
    ): MerchantReceivingMethodMutationResult {
        return create(session, draft.toSubmission())
    }

    fun disable(session: AuthenticatedMerchantSession, routeId: String): MerchantReceivingMethodMutationResult {
        val placeholder = MerchantReceivingMethodSubmission(
            bankProfileId = "",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "",
            rawIdentifierInput = "",
            routeCode = "",
            displayLabel = ""
        )
        return mutate(
            session = session,
            routeId = routeId,
            method = "POST",
            pathSuffix = "/disable",
            body = "{}",
            submission = placeholder
        )
    }

    fun markRecommended(session: AuthenticatedMerchantSession, routeId: String): MerchantReceivingMethodMutationResult {
        val placeholder = MerchantReceivingMethodSubmission(
            bankProfileId = "",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "",
            rawIdentifierInput = "",
            routeCode = "",
            displayLabel = ""
        )
        return mutate(
            session = session,
            routeId = routeId,
            method = "POST",
            pathSuffix = "/set-default",
            body = "{}",
            submission = placeholder
        )
    }

    fun updateLabel(session: AuthenticatedMerchantSession, routeId: String, label: String): MerchantReceivingMethodMutationResult {
        val placeholder = MerchantReceivingMethodSubmission(
            bankProfileId = "",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "",
            rawIdentifierInput = "",
            routeCode = "",
            displayLabel = label.trim()
        )
        return mutate(
            session = session,
            routeId = routeId,
            method = "PATCH",
            pathSuffix = "",
            body = jsonObject("label" to label.trim()),
            submission = placeholder
        )
    }

    fun delete(session: AuthenticatedMerchantSession, routeId: String): MerchantReceivingMethodMutationResult {
        val placeholder = MerchantReceivingMethodSubmission(
            bankProfileId = "",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "",
            rawIdentifierInput = "",
            routeCode = "",
            displayLabel = ""
        )
        return mutate(
            session = session,
            routeId = routeId,
            method = "DELETE",
            pathSuffix = "",
            body = "",
            submission = placeholder
        )
    }

    private fun mutate(
        session: AuthenticatedMerchantSession,
        routeId: String,
        method: String,
        pathSuffix: String,
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
                method = method,
                path = "/v1/merchant/receiving-methods/${urlPath(routeId)}$pathSuffix",
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
        val routeObject = extractObjectValue(response.body, "method") ?: extractObjectValue(response.body, "route")
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
                path = AndroidMerchantReviewApiContract.REVIEW_QUEUE_PATH,
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
    val backendOwnsReviewDecisions: Boolean = true
    val sendsDeveloperWebhookDirectly: Boolean = false

    fun rejectSignal(session: AuthenticatedMerchantSession, reviewId: String): MerchantReviewActionApiResult {
        return action(
            session = session,
            reviewId = reviewId,
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
                    path = AndroidMerchantReviewApiContract.rejectPath(reviewId),
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

class MerchantDashboardApiRepository(
    private val transport: MerchantApiTransport
) {
    fun load(session: AuthenticatedMerchantSession): MerchantScreenRepositoryResult {
        if (!session.isAuthenticated) {
            return MerchantScreenRepositoryResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = false
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "GET",
                path = "/v1/android-merchant/dashboard-summary",
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantScreenRepositoryResult(MerchantRepositoryState.ERROR, listOf("Action nécessaire"), false)
        }
        val toReview = extractNumber(response.body, "payments_to_review_count") ?: "0"
        val confirmed = extractNumber(response.body, "confirmed_today_count") ?: "0"
        val notifications = extractNumber(response.body, "notifications_sent_count") ?: "0"
        val metricsSummary = extractObjectValue(response.body, "metrics_summary")?.toMerchantDashboardMetricsSummary()
            ?: MerchantDashboardMetricsSummary(
                range = "30d",
                currency = "RUB",
                confirmedPaymentCount = confirmed.toIntOrNull() ?: 0,
                confirmedAmountMinor = 0,
                pendingReviewCount = toReview.toIntOrNull() ?: 0,
                rejectedPaymentCount = 0,
                expiredPaymentCount = 0,
                failedCount = 0,
                confirmationRate = 0,
                averageManualConfirmationDelaySeconds = 0
            )
        val metricsTimeseries = extractObjectValue(response.body, "metrics_timeseries")
            ?.let { extractTopLevelObjectsFromArray(it, "points").mapNotNull { point -> point.toMerchantDashboardTimeseriesPoint() } }
            .orEmpty()
        val receiverDisplay = extractNestedString(response.body, "receiver_status", "display") ?: "Action requise"
        val recentTexts = extractTopLevelObjectsFromArray(response.body, "recent_detected_payments").flatMap { item ->
            val amount = extractNestedString(item, "amount", "value") ?: "0.00"
            val currency = extractNestedString(item, "amount", "currency") ?: "RUB"
            listOf(
                formatAmountLabel(amount, currency),
                extractString(item, "bank_display_name") ?: "Banque choisie",
                extractString(item, "status_label") ?: "À vérifier"
            )
        }
        return MerchantScreenRepositoryResult(
            state = MerchantRepositoryState.SUCCESS,
            texts = listOf(
                "Tableau de bord",
                "SwimPay est prêt",
                "Votre téléphone est connecté et vos paiements peuvent être détectés.",
                "À vérifier",
                toReview,
                "Validés aujourd’hui",
                confirmed,
                "Notifications envoyées",
                notifications,
                "Téléphone",
                receiverDisplay,
                "Derniers paiements détectés"
            ) + recentTexts + listOf("Accueil", "Revue", "Commandes", "Plus"),
            usesMockRepository = false,
            dashboardMetricsSummary = metricsSummary,
            dashboardTimeseries = metricsTimeseries
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

class MerchantPaymentDetailApiRepository(
    private val transport: MerchantApiTransport
) {
    fun load(session: AuthenticatedMerchantSession, paymentId: String): MerchantScreenRepositoryResult {
        if (!session.isAuthenticated) {
            return MerchantScreenRepositoryResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = false
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "GET",
                path = "/v1/android-merchant/payments/${urlPath(paymentId)}",
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantScreenRepositoryResult(MerchantRepositoryState.ERROR, listOf("Action requise"), false)
        }
        val payment = extractObjectValue(response.body, "payment").orEmpty()
        val expectedValue = extractNestedString(payment, "amount_expected", "value") ?: "0.00"
        val expectedCurrency = extractNestedString(payment, "amount_expected", "currency") ?: "RUB"
        val detectedValue = extractNestedString(payment, "amount_detected", "value") ?: expectedValue
        val detectedCurrency = extractNestedString(payment, "amount_detected", "currency") ?: expectedCurrency
        val reasonLabels = extractStringArray(payment, "reason_labels").ifEmpty {
            listOf(MerchantReviewReasonCode.MANUAL_VALIDATION_BETA.merchantLabel)
        }
        val scoreLabel = extractNumber(payment, "score")?.let { "$it %" }
        val timeline = extractTopLevelObjectsFromArray(payment, "timeline").mapNotNull { extractString(it, "label") }
        return MerchantScreenRepositoryResult(
            state = MerchantRepositoryState.SUCCESS,
            texts = listOf(
                "Vérifier ce paiement",
                "À vérifier",
                "Ce paiement nécessite une validation manuelle.",
                "Montant attendu",
                formatAmountLabel(expectedValue, expectedCurrency),
                "Montant détecté",
                formatAmountLabel(detectedValue, detectedCurrency),
                "Banque",
                extractString(payment, "bank_display_name") ?: "Banque choisie",
                "Moyen de réception",
                extractString(payment, "receiving_method_masked") ?: "Moyen de réception masqué",
                "Référence",
                extractString(payment, "payment_reference") ?: "<REFERENCE>",
                "Signal reçu",
                "Il y a 2 min",
                "Pourquoi ce paiement est à vérifier ?"
            ) + reasonLabels + listOf(
                MerchantReviewAction.REJECT_SIGNAL.label,
                MerchantReviewAction.REJECT_ORDER.label
            ),
            usesMockRepository = false,
            paymentDetailTimeline = timeline,
            paymentScoreLabel = scoreLabel
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

class MerchantConnectedSiteApiRepository(
    private val transport: MerchantApiTransport
) {
    fun load(
        session: AuthenticatedMerchantSession,
        developerDetailsEnabled: Boolean
    ): MerchantScreenRepositoryResult {
        if (!session.isAuthenticated) {
            return MerchantScreenRepositoryResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = false
            )
        }
        val path = if (developerDetailsEnabled) {
            "/v1/android-merchant/connected-site?developer_mode=true"
        } else {
            "/v1/android-merchant/connected-site"
        }
        val response = execute(
            MerchantApiRequest(
                method = "GET",
                path = path,
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantScreenRepositoryResult(MerchantRepositoryState.ERROR, listOf("Action nécessaire"), false)
        }
        val developerTexts = if (developerDetailsEnabled) {
            listOf("event_id", "signature status", "delivery attempts")
        } else {
            emptyList()
        }
        return MerchantScreenRepositoryResult(
            state = MerchantRepositoryState.SUCCESS,
            texts = listOf(
                "Webhook configuré",
                "Votre site ou application reçoit une notification quand un paiement change de statut.",
                extractString(response.body, "status_label") ?: "Action nécessaire",
                "URL de notification",
                extractString(response.body, "webhook_url_display") ?: "Non configurée",
                "Statut",
                if (extractString(response.body, "status") == "active") "Actif" else "Action requise",
                "Tester la connexion",
                "Copier la clé développeur",
                "Voir les derniers envois",
                "Afficher les détails développeur"
            ) + developerTexts,
            usesMockRepository = false
        )
    }

    fun testConnection(session: AuthenticatedMerchantSession): MerchantConnectedSiteTestResult {
        if (!session.isAuthenticated) {
            return MerchantConnectedSiteTestResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                sendsWebhookDirectlyFromAndroid = false,
                texts = listOf("Action requise", "Session marchand requise")
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/android-merchant/connected-site/test",
                headers = authHeaders(session)
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantConnectedSiteTestResult(
                state = MerchantRepositoryState.ERROR,
                sendsWebhookDirectlyFromAndroid = false,
                texts = listOf("Action nécessaire")
            )
        }
        return MerchantConnectedSiteTestResult(
            state = MerchantRepositoryState.SUCCESS,
            sendsWebhookDirectlyFromAndroid = extractBoolean(response.body, "android_sent_webhook_directly") == true,
            texts = listOf(extractString(response.body, "safe_status") ?: "Notification envoyée")
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

data class MerchantConnectedSiteTestResult(
    val state: MerchantRepositoryState,
    val sendsWebhookDirectlyFromAndroid: Boolean,
    private val texts: List<String>
) {
    fun visibleTexts(): List<String> = texts
}

data class MerchantDeveloperIntegrationSnapshot(
    val merchantId: String,
    val publicKey: String,
    val secretKeyMasked: String,
    val secretKeyOnce: String?,
    val webhookSecretMasked: String,
    val webhookSecretOnce: String?,
    val webhookUrl: String,
    val webhookStatus: String,
    val publicWebhookEvents: List<String>
) {
    fun effectiveSecretKey(): String = secretKeyMasked

    fun effectiveWebhookSecret(): String = webhookSecretMasked

    fun showOnceSecrets(): List<Pair<String, String>> {
        return emptyList()
    }

    fun exportLines(
        apiBaseUrl: String = "https://staging.swimpay.pro",
        externalAppBaseUrl: String = "https://votre-app.example"
    ): List<String> {
        return listOf(
            "SWIMPAY_STAGING_API_BASE_URL=$apiBaseUrl",
            "SWIMPAY_STAGING_SECRET_KEY=${effectiveSecretKey()}",
            "SWIMPAY_STAGING_WEBHOOK_SECRET=${effectiveWebhookSecret()}",
            "SWIMPAY_WEBHOOK_URL=${webhookUrl.ifBlank { "https://votre-app.example/swimpay/webhook" }}",
            "EXTERNAL_APP_BASE_URL=$externalAppBaseUrl",
            "SWIMPAY_PUBLIC_WEBHOOK_EVENTS=${publicWebhookEvents.joinToString(",")}"
        )
    }

    fun visibleTexts(): List<String> {
        return listOf(
            "Integration developpeur",
            "Merchant ID",
            merchantId,
            "Cle publique",
            publicKey,
            "Cle API",
            secretKeyMasked,
            "Secret webhook",
            webhookSecretMasked,
            "Webhook URL",
            webhookUrl.ifBlank { "A configurer" },
            "Evenements publics"
        ) + publicWebhookEvents + exportLines()
    }
}

data class MerchantDeveloperIntegrationResult(
    val state: MerchantRepositoryState,
    val integration: MerchantDeveloperIntegrationSnapshot?,
    val safeMessage: String,
    val androidSentWebhookDirectly: Boolean = false
) {
    fun visibleTexts(): List<String> {
        return (integration?.visibleTexts() ?: emptyList()) + safeMessage
    }
}

class MerchantDeveloperIntegrationApiRepository(
    private val transport: MerchantApiTransport
) {
    fun load(session: AuthenticatedMerchantSession): MerchantDeveloperIntegrationResult {
        return requestIntegration(session, "GET", "/v1/merchant/integration")
    }

    fun createApiKey(session: AuthenticatedMerchantSession): MerchantDeveloperIntegrationResult {
        return requestIntegration(session, "POST", "/v1/merchant/integration/keys", jsonObject())
    }

    fun rotateApiKey(session: AuthenticatedMerchantSession): MerchantDeveloperIntegrationResult {
        return requestIntegration(session, "POST", "/v1/merchant/integration/keys/rotate", jsonObject())
    }

    fun rotateWebhookSecret(session: AuthenticatedMerchantSession): MerchantDeveloperIntegrationResult {
        return requestIntegration(session, "POST", "/v1/merchant/integration/webhook-secret/rotate", jsonObject())
    }

    fun updateWebhookUrl(session: AuthenticatedMerchantSession, webhookUrl: String): MerchantDeveloperIntegrationResult {
        return requestIntegration(
            session,
            "PUT",
            "/v1/merchant/integration/webhook-url",
            jsonObject("webhook_url" to webhookUrl.trim())
        )
    }

    fun testWebhook(session: AuthenticatedMerchantSession): MerchantDeveloperIntegrationResult {
        if (!session.isAuthenticated) {
            return MerchantDeveloperIntegrationResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                integration = null,
                safeMessage = "Session marchand requise"
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/merchant/integration/test-webhook",
                headers = authHeaders(session),
                body = jsonObject()
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantDeveloperIntegrationResult(
                state = MerchantRepositoryState.ERROR,
                integration = null,
                safeMessage = "Test webhook indisponible"
            )
        }
        return MerchantDeveloperIntegrationResult(
            state = MerchantRepositoryState.SUCCESS,
            integration = null,
            safeMessage = extractString(response.body, "safeStatus")
                ?: extractString(response.body, "safe_status")
                ?: "Test webhook envoye",
            androidSentWebhookDirectly = extractBoolean(response.body, "android_sent_webhook_directly") == true
        )
    }

    private fun requestIntegration(
        session: AuthenticatedMerchantSession,
        method: String,
        path: String,
        body: String = ""
    ): MerchantDeveloperIntegrationResult {
        if (!session.isAuthenticated) {
            return MerchantDeveloperIntegrationResult(
                state = MerchantRepositoryState.ACTION_REQUIRED,
                integration = null,
                safeMessage = "Session marchand requise"
            )
        }
        val response = execute(
            MerchantApiRequest(
                method = method,
                path = path,
                headers = authHeaders(session),
                body = body
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantDeveloperIntegrationResult(
                state = MerchantRepositoryState.ERROR,
                integration = null,
                safeMessage = "Integration indisponible"
            )
        }
        return MerchantDeveloperIntegrationResult(
            state = MerchantRepositoryState.SUCCESS,
            integration = response.body.toMerchantDeveloperIntegrationSnapshot(),
            safeMessage = "Integration synchronisee"
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

class MerchantConfigurationTestApiRepository(
    private val transport: MerchantApiTransport
) {
    fun run(
        session: AuthenticatedMerchantSession,
        checklist: MerchantConfigurationChecklist
    ): MerchantConfigurationTestResult {
        if (!session.isAuthenticated) {
            return MerchantConfigurationTestResult(
                outcome = MerchantConfigurationTestOutcome.ACTION_REQUIRED,
                confirmsRealPayment = false,
                texts = listOf("Action requise", "Session marchand requise"),
                usesMockRepository = false
            )
        }
        val body = jsonObject(
            "receiver_connected" to checklist.phoneConnected,
            "notification_access_active" to checklist.phoneConnected,
            "connected_site_configured" to checklist.connectedSiteReady
        )
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/android-merchant/configuration-test",
                headers = authHeaders(session),
                body = body
            )
        )
        if (response.statusCode !in 200..299) {
            return MerchantConfigurationTestResult(
                outcome = MerchantConfigurationTestOutcome.ERROR,
                confirmsRealPayment = false,
                texts = listOf("Action requise"),
                usesMockRepository = false
            )
        }
        val outcome = when (extractString(response.body, "outcome")) {
            "ready" -> MerchantConfigurationTestOutcome.READY
            "action_required" -> MerchantConfigurationTestOutcome.ACTION_REQUIRED
            else -> MerchantConfigurationTestOutcome.ERROR
        }
        val labels = extractTopLevelObjectsFromArray(response.body, "checklist")
            .mapNotNull { extractString(it, "label") }
            .ifEmpty { MerchantConfigurationChecklist.REQUIRED_LABELS }
        val resultTexts = if (outcome == MerchantConfigurationTestOutcome.READY) {
            listOf("Webhook prêt", "Le backend peut envoyer un événement de test vers votre endpoint.")
        } else {
            listOf("Action requise")
        }
        return MerchantConfigurationTestResult(
            outcome = outcome,
            confirmsRealPayment = false,
            texts = labels + resultTexts,
            usesMockRepository = false
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

class MerchantSupportTicketApiRepository(
    private val transport: MerchantApiTransport
) {
    fun create(
        session: AuthenticatedMerchantSession,
        draft: PremiumSupportTicketDraft,
        safeContext: Map<String, Any?>
    ): PremiumSupportTicketResult {
        if (!session.isAuthenticated) {
            return PremiumSupportTicketResult("", "action_required", "", "Session marchand requise")
        }
        val validation = draft.validationError()
        if (validation != null) {
            return PremiumSupportTicketResult("", "invalid", "", validation)
        }
        val body = jsonObject(
            "category" to draft.category.wireValue,
            "subject" to draft.subject.trim(),
            "message" to draft.message.trim(),
            "safe_context" to safeContext.filterValues { value ->
                value == null || !SupportSafety.forbiddenContentDetected(value.toString())
            }
        )
        val response = execute(
            MerchantApiRequest(
                method = "POST",
                path = "/v1/android-merchant/support-tickets",
                headers = authHeaders(session),
                body = body
            )
        )
        if (response.statusCode !in 200..299) {
            return PremiumSupportTicketResult("", "error", "", "Support indisponible")
        }
        return PremiumSupportTicketResult(
            ticketId = extractString(response.body, "ticket_id").orEmpty(),
            status = extractString(response.body, "status") ?: "created",
            createdAt = extractString(response.body, "created_at").orEmpty(),
            safeMessage = extractString(response.body, "safe_message") ?: "Demande envoyee"
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

data class MerchantScreenRepositoryResult(
    val state: MerchantRepositoryState,
    private val texts: List<String>,
    val usesMockRepository: Boolean,
    val safeMessage: String = "",
    val dashboardMetricsSummary: MerchantDashboardMetricsSummary? = null,
    val dashboardTimeseries: List<MerchantDashboardTimeseriesPoint> = emptyList(),
    val paymentDetailTimeline: List<String> = emptyList(),
    val paymentScoreLabel: String? = null
) {
    fun visibleTexts(): List<String> = texts + safeMessage

    fun toScreen(
        id: String,
        title: String,
        subtitle: String? = null
    ): MerchantUiScreen {
        val visible = visibleTexts()
        return MerchantUiScreen(
            id = id,
            title = visible.firstOrNull() ?: title,
            subtitle = subtitle,
            texts = visible.drop(1)
        )
    }
}

data class MerchantDashboardMetricsSummary(
    val range: String,
    val currency: String,
    val confirmedPaymentCount: Int,
    val confirmedAmountMinor: Long,
    val pendingReviewCount: Int,
    val rejectedPaymentCount: Int,
    val expiredPaymentCount: Int,
    val failedCount: Int,
    val confirmationRate: Int,
    val averageManualConfirmationDelaySeconds: Int
) {
    fun confirmedAmountLabel(): String = formatMinorAmountCompact(confirmedAmountMinor, currency)
    fun confirmationRateLabel(): String = "$confirmationRate %"
}

data class MerchantDashboardTimeseriesPoint(
    val date: String,
    val confirmedPaymentCount: Int,
    val confirmedAmountMinor: Long,
    val pendingReviewCount: Int,
    val rejectedPaymentCount: Int,
    val expiredPaymentCount: Int,
    val confirmationRate: Int
)

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

private fun receivingMethodProductType(type: ReceivingMethodType): String {
    return when (type) {
        ReceivingMethodType.CARD_TRANSFER -> "card"
        ReceivingMethodType.PHONE_TRANSFER -> "phone"
    }
}

private fun validateReceivingMethodSubmission(submission: MerchantReceivingMethodSubmission): String? {
    return when (submission.type) {
        ReceivingMethodType.CARD_TRANSFER -> {
            val digits = submission.rawIdentifier.filter { it.isDigit() }
            if (digits.length in 13..19) null else "Moyen de réception invalide"
        }
        ReceivingMethodType.PHONE_TRANSFER -> {
            val digits = submission.rawIdentifier.filter { it.isDigit() }
            if ((digits.length == 11 && (digits.startsWith("7") || digits.startsWith("8"))) || digits.length == 10) {
                null
            } else {
                "Moyen de réception invalide"
            }
        }
    }
}

private fun String.toReceivingMethodDisplay(): MerchantReceivingMethodDisplay? {
    val routeId = extractString(this, "id") ?: extractString(this, "route_id").orEmpty()
    val productType = extractString(this, "type")
    val railType = extractString(this, "rail_type") ?: when (productType) {
        "card" -> ReceivingMethodType.CARD_TRANSFER.wireValue
        "phone" -> ReceivingMethodType.PHONE_TRANSFER.wireValue
        else -> return null
    }
    val bankProfileId = extractString(this, "bank_id") ?: extractString(this, "bank_profile_id").orEmpty()
    val label = extractString(this, "label") ?: extractString(this, "display_label")
    val masked = extractString(this, "masked_value") ?: extractString(this, "receiver_identifier_masked").orEmpty()
    val status = extractString(this, "status")
    val enabled = if (status == "inactive") false else extractBoolean(this, "enabled") ?: true
    val recommended = extractBoolean(this, "is_default") ?: extractBoolean(this, "recommended") ?: false
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
        routeId = routeId,
        title = type.merchantLabel,
        subtitle = "${bankDisplayNameFor(bankProfileId)} · $masked",
        status = if (enabled) "Active" else "Désactivée",
        helper = label?.takeIf { it.isNotBlank() } ?: if (type == ReceivingMethodType.PHONE_TRANSFER) "Pratique pour les virements via SBP" else null,
        actions = actions + "Supprimer"
    )
}

fun String.toMerchantDeveloperIntegrationSnapshot(): MerchantDeveloperIntegrationSnapshot {
    return MerchantDeveloperIntegrationSnapshot(
        merchantId = extractString(this, "merchant_id") ?: "Connexion en attente",
        publicKey = extractString(this, "public_key") ?: "A creer",
        secretKeyMasked = extractString(this, "secret_key_masked") ?: "Non creee",
        secretKeyOnce = extractString(this, "secret_key_once"),
        webhookSecretMasked = extractString(this, "webhook_secret_masked") ?: "Non cree",
        webhookSecretOnce = extractString(this, "webhook_secret_once"),
        webhookUrl = extractString(this, "webhook_url") ?: "",
        webhookStatus = extractString(this, "webhook_status") ?: "not_configured",
        publicWebhookEvents = extractStringArray(this, "public_webhook_events").ifEmpty {
            listOf("payment.confirmed", "payment.rejected", "payment.expired")
        }
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

fun extractNumber(body: String, key: String): String? {
    val match = Regex("\"${Regex.escape(key)}\"\\s*:\\s*([0-9]+)").find(body) ?: return null
    return match.groupValues[1]
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

private fun String.toMerchantDashboardMetricsSummary(): MerchantDashboardMetricsSummary? {
    return MerchantDashboardMetricsSummary(
        range = extractString(this, "range") ?: "30d",
        currency = extractString(this, "currency") ?: "RUB",
        confirmedPaymentCount = extractNumber(this, "confirmed_payment_count")?.toIntOrNull() ?: 0,
        confirmedAmountMinor = extractNumber(this, "confirmed_amount_minor")?.toLongOrNull() ?: 0L,
        pendingReviewCount = extractNumber(this, "pending_review_count")?.toIntOrNull() ?: 0,
        rejectedPaymentCount = extractNumber(this, "rejected_payment_count")?.toIntOrNull() ?: 0,
        expiredPaymentCount = extractNumber(this, "expired_payment_count")?.toIntOrNull() ?: 0,
        failedCount = extractNumber(this, "failed_count")?.toIntOrNull() ?: 0,
        confirmationRate = extractNumber(this, "confirmation_rate")?.toIntOrNull() ?: 0,
        averageManualConfirmationDelaySeconds = extractNumber(this, "average_manual_confirmation_delay_seconds")?.toIntOrNull() ?: 0
    )
}

private fun String.toMerchantDashboardTimeseriesPoint(): MerchantDashboardTimeseriesPoint? {
    val date = extractString(this, "date") ?: return null
    return MerchantDashboardTimeseriesPoint(
        date = date,
        confirmedPaymentCount = extractNumber(this, "confirmed_payment_count")?.toIntOrNull() ?: 0,
        confirmedAmountMinor = extractNumber(this, "confirmed_amount_minor")?.toLongOrNull() ?: 0L,
        pendingReviewCount = extractNumber(this, "pending_review_count")?.toIntOrNull() ?: 0,
        rejectedPaymentCount = extractNumber(this, "rejected_payment_count")?.toIntOrNull() ?: 0,
        expiredPaymentCount = extractNumber(this, "expired_payment_count")?.toIntOrNull() ?: 0,
        confirmationRate = extractNumber(this, "confirmation_rate")?.toIntOrNull() ?: 0
    )
}

fun formatAmountLabel(value: String, currency: String): String {
    val normalized = value.replace('.', ',')
    val withCents = if (normalized.contains(',')) normalized else "$normalized,00"
    val symbol = if (currency == "RUB") "₽" else currency
    return "$withCents $symbol"
}

fun formatMinorAmountCompact(amountMinor: Long, currency: String): String {
    val units = amountMinor / 100L
    val cents = kotlin.math.abs(amountMinor % 100L)
    val grouped = "%,d".format(Locale.US, units).replace(",", " ")
    val symbol = if (currency == "RUB") "₽" else currency
    return if (cents == 0L) {
        "$grouped $symbol"
    } else {
        "$grouped,${cents.toString().padStart(2, '0')} $symbol"
    }
}

fun urlPath(value: String): String {
    return value.replace(Regex("[^A-Za-z0-9_\\-.]"), "")
}
