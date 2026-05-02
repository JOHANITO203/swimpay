package com.swimpay.receiver

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

private data class DebugOutboxEntry(
    val payload: Map<String, Any>,
    var status: String,
    var attemptCount: Int
)

class DebugReceiverSmokeController(
    private val debugEnabled: Boolean,
    private val config: DebugBackendConfig = DebugBackendConfig(),
    private val httpClient: DebugReceiverHttpClient = DebugReceiverHttpClient(config),
    private val nowIso: () -> String = { java.time.Instant.now().toString() }
) {
    private var deviceId: String? = null
    private var nextLocalCounter = 1L
    private val outbox = linkedMapOf<String, DebugOutboxEntry>()

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
        outbox.putIfAbsent(
            eventId,
            DebugOutboxEntry(payload = signal, status = "pending_upload", attemptCount = 0)
        )
        return DebugSmokeResult(
            success = true,
            safeMessage = "queued redacted notification signal; backend decision pending; not official bank confirmation"
        )
    }

    private fun flushOutbox(): DebugSmokeResult {
        val due = outbox.values.filter { it.status == "pending_upload" || it.status == "failed_retrying" }
        if (due.isEmpty()) {
            return DebugSmokeResult(success = true, safeMessage = "outbox empty")
        }

        var acked = 0
        var retrying = 0
        for (entry in due) {
            entry.status = "uploading"
            entry.attemptCount += 1
            val result = httpClient.uploadSignal(entry.payload)
            if (result.success) {
                entry.status = "acked"
                acked += 1
            } else {
                entry.status = "failed_retrying"
                retrying += 1
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
        val counter = nextLocalCounter
        nextLocalCounter += 1
        return counter
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
