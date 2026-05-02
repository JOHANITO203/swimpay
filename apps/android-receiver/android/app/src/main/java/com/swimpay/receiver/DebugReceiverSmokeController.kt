package com.swimpay.receiver

import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.EncryptedOutboxStore
import com.swimpay.receiver.outbox.FakeEncryptedStorageAdapter
import com.swimpay.receiver.outbox.OutboxRecord
import com.swimpay.receiver.work.ReceiverRetryPolicy
import java.time.Instant
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class DebugSmokeAction(
    val id: String,
    val label: String,
    val safeDescription: String
)

data class DebugSmokeResult(
    val success: Boolean,
    val safeMessage: String
)

class DebugReceiverSmokeController(
    private val debugEnabled: Boolean,
    private val config: DebugBackendConfig = DebugBackendConfig(),
    private val httpClient: DebugReceiverHttpClient = DebugReceiverHttpClient(config),
    private val deviceStateStore: PersistentDeviceStateStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage()),
    private val outboxStore: EncryptedOutboxStore = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter()),
    private val retryPolicy: ReceiverRetryPolicy = ReceiverRetryPolicy(),
    private val nowIso: () -> String = { java.time.Instant.now().toString() }
) {
    private var deviceId: String? = deviceStateStore.load()?.deviceId
    private var nextLocalCounter = 1L

    fun availableActions(): List<DebugSmokeAction> {
        if (!debugEnabled) {
            return emptyList()
        }

        return listOf(
            DebugSmokeAction(
                id = "register_receiver",
                label = "Register receiver",
                safeDescription = "Uses synthetic local data; backend decision pending; not official bank confirmation."
            ),
            DebugSmokeAction(
                id = "send_heartbeat",
                label = "Send heartbeat",
                safeDescription = "Reports safe receiver health only; backend decision pending; not official bank confirmation."
            ),
            DebugSmokeAction(
                id = "upload_synthetic_redacted_signal",
                label = "Upload synthetic signal",
                safeDescription = "Uploads redacted notification signal; backend decision pending; not official bank confirmation."
            ),
            DebugSmokeAction(
                id = "enqueue_synthetic_outbox_signal",
                label = "Queue synthetic outbox signal",
                safeDescription = "Stores redacted signed payload only; backend decision pending; not official bank confirmation."
            ),
            DebugSmokeAction(
                id = "flush_outbox",
                label = "Flush outbox",
                safeDescription = "Retries queued redacted payloads; backend decision pending; not official bank confirmation."
            )
        )
    }

    fun performAction(actionId: String): DebugSmokeResult {
        require(debugEnabled) { "Debug receiver smoke actions are disabled." }

        return when (actionId) {
            "register_receiver" -> registerReceiver()
            "send_heartbeat" -> sendHeartbeat()
            "upload_synthetic_redacted_signal" -> uploadSyntheticSignal()
            "enqueue_synthetic_outbox_signal" -> enqueueSyntheticOutboxSignal()
            "flush_outbox" -> flushOutbox()
            else -> DebugSmokeResult(success = false, safeMessage = "Unknown debug action.")
        }
    }

    fun buildSyntheticRedactedSignal(
        merchantId: String,
        deviceId: String,
        eventId: String,
        observedAt: String,
        localCounter: Long = 1L
    ): Map<String, Any> {
        require(debugEnabled) { "Debug receiver smoke actions are disabled." }

        val signal = linkedMapOf(
            "event_id" to eventId,
            "merchant_id" to merchantId,
            "device_id" to deviceId,
            "bank_profile_id" to "sber_ru",
            "package_name" to "TO_VERIFY",
            "package_cert_sha256" to "TO_VERIFY",
            "observed_at" to observedAt,
            "notification_hash" to sha256Hex(eventId),
            "semantic_hash" to sha256Hex("semantic:$eventId"),
            "local_counter" to localCounter,
            "snapshot_count" to 1,
            "coalesced" to true,
            "amount_minor" to 12345,
            "currency" to "RUB",
            "sender_phone_hmac" to "synthetic_phone_hmac",
            "sender_phone_masked" to "<PHONE>",
            "reference_hmac" to "synthetic_reference_hmac",
            "reference_code_masked" to "<REFERENCE>",
            "direction_hint" to "incoming_customer_transfer",
            "parser_hint" to "backend-debug-smoke",
            "signal_quality_hint" to 50,
            "redacted_title" to "Synthetic transfer <AMOUNT> <CURRENCY>",
            "redacted_body" to "Synthetic notification signal from <PHONE> with <REFERENCE>",
            "raw_text_present" to false
        )
        signal["signature"] = signDebugSignal(signal)
        return signal
    }

    private fun registerReceiver(): DebugSmokeResult {
        val result = httpClient.registerDevice()
        if (result.success && result.deviceId != null) {
            deviceId = result.deviceId
            deviceStateStore.save(
                ReceiverDeviceState(
                    deviceId = result.deviceId,
                    deviceStatus = "active",
                    serverTime = null,
                    appVersion = config.appVersion,
                    lastRegistrationAt = nowIso(),
                    lastHeartbeatAt = null,
                    backendBaseUrl = config.baseUrl,
                    lastLocalCounter = deviceStateStore.load()?.lastLocalCounter ?: 0
                )
            )
        }
        return DebugSmokeResult(result.success, result.safeMessage)
    }

    private fun sendHeartbeat(): DebugSmokeResult {
        val currentDeviceId = deviceId
            ?: return DebugSmokeResult(
                success = false,
                safeMessage = "Register receiver first before heartbeat."
            )
        val result = httpClient.sendHeartbeat(currentDeviceId)
        if (result.success) {
            deviceStateStore.updateHeartbeat(nowIso())
        }
        return DebugSmokeResult(result.success, result.safeMessage)
    }

    private fun uploadSyntheticSignal(): DebugSmokeResult {
        val currentDeviceId = deviceId
            ?: return DebugSmokeResult(
                success = false,
                safeMessage = "Register receiver first before uploading notification signal."
            )
        val signal = buildSyntheticRedactedSignal(
            merchantId = config.merchantId,
            deviceId = currentDeviceId,
            eventId = "evt_android_debug_smoke_${System.currentTimeMillis()}",
            observedAt = nowIso(),
            localCounter = nextCounter()
        )
        val result = httpClient.uploadSignal(signal)
        val message = if (result.success) {
            "notification signal uploaded; backend decision pending; not official bank confirmation"
        } else {
            result.safeMessage
        }
        return DebugSmokeResult(result.success, message)
    }

    private fun enqueueSyntheticOutboxSignal(): DebugSmokeResult {
        val currentDeviceId = deviceId ?: "dev_debug_outbox"
        val eventId = "evt_android_debug_outbox_${System.currentTimeMillis()}"
        val signal = buildSyntheticRedactedSignal(
            merchantId = config.merchantId,
            deviceId = currentDeviceId,
            eventId = eventId,
            observedAt = nowIso(),
            localCounter = nextCounter()
        )
        val payloadJson = jsonObject(signal.entries.map { it.key to it.value })
        outboxStore.enqueue(
            OutboxRecord(
                localId = "outbox_$eventId",
                eventId = eventId,
                notificationHash = signal["notification_hash"].toString(),
                semanticHash = signal["semantic_hash"].toString(),
                payloadHash = sha256Hex(payloadJson),
                encryptedPayload = payloadJson,
                status = com.swimpay.receiver.outbox.OutboxStatus.PENDING_UPLOAD,
                attemptCount = 0,
                firstSeenAt = nowIso(),
                lastAttemptAt = null,
                nextRetryAt = null,
                ackReceivedAt = null
            )
        )
        return DebugSmokeResult(
            success = true,
            safeMessage = "queued redacted notification signal; backend decision pending; not official bank confirmation"
        )
    }

    private fun flushOutbox(): DebugSmokeResult {
        val due = outboxStore.dueRecords("9999-12-31T23:59:59.999Z")
        if (due.isEmpty()) {
            return DebugSmokeResult(success = true, safeMessage = "outbox empty")
        }

        var acked = 0
        var retrying = 0
        for (entry in due) {
            outboxStore.markUploading(entry.eventId)
            val result = httpClient.uploadSignalJson(entry.encryptedPayload)
            if (result.success) {
                outboxStore.markAcked(entry.eventId, nowIso())
                acked += 1
            } else {
                val nextAttempt = entry.attemptCount + 1
                if (retryPolicy.shouldRetry(nextAttempt)) {
                    outboxStore.markFailedRetrying(
                        eventId = entry.eventId,
                        sanitizedError = result.safeMessage,
                        nextRetryAt = addDelay(nowIso(), retryPolicy.delayMsForAttempt(nextAttempt + 1)),
                        lastAttemptAt = nowIso()
                    )
                    retrying += 1
                }
            }
        }

        return DebugSmokeResult(
            success = retrying == 0,
            safeMessage = "outbox flush result: acked=$acked failed_retrying=$retrying; backend decision pending; not official bank confirmation"
        )
    }

    private fun signDebugSignal(signalWithoutSignature: Map<String, Any>): String {
        return hmacSha256Hex(config.publicKey, stableDebugJson(signalWithoutSignature))
    }

    private fun nextCounter(): Long {
        return if (deviceStateStore.load() != null) {
            deviceStateStore.nextLocalCounter()
        } else {
            nextLocalCounter
        }.also {
            nextLocalCounter += 1
        }
    }

    private fun addDelay(now: String, delayMs: Long): String {
        return Instant.parse(now).plusMillis(delayMs).toString()
    }

    private fun hmacSha256Hex(secret: String, value: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(value.toByteArray(Charsets.UTF_8)).joinToString("") { byte ->
            "%02x".format(byte)
        }
    }

    private fun sha256Hex(value: String): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { byte -> "%02x".format(byte) }
    }
}

internal fun stableDebugJson(value: Any?): String {
    return when (value) {
        null -> "null"
        is String -> "\"${escapeJson(value)}\""
        is Boolean -> value.toString()
        is Number -> value.toString()
        is Map<*, *> -> value.entries
            .map { it.key.toString() to it.value }
            .sortedBy { it.first }
            .joinToString(separator = ",", prefix = "{", postfix = "}") { (key, child) ->
                "\"${escapeJson(key)}\":${stableDebugJson(child)}"
            }
        is Iterable<*> -> value.joinToString(separator = ",", prefix = "[", postfix = "]") { stableDebugJson(it) }
        else -> "\"${escapeJson(value.toString())}\""
    }
}
