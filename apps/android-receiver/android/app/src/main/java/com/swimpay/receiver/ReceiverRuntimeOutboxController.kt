package com.swimpay.receiver

import com.swimpay.receiver.outbox.EncryptedOutboxStore
import com.swimpay.receiver.outbox.OutboxRecord
import com.swimpay.receiver.outbox.OutboxStatus
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

data class ReceiverRuntimeOutboxResult(
    val success: Boolean,
    val safeMessage: String
)

class ReceiverRuntimeOutboxController(
    private val merchantId: String,
    private val signingKey: String,
    private val deviceStateStore: PersistentDeviceStateStore,
    private val outboxStore: EncryptedOutboxStore,
    private val nowIso: () -> String = { java.time.Instant.now().toString() }
) {
    fun enqueueProcessedNotificationSignal(result: ReceiverNotificationPipelineResult): ReceiverRuntimeOutboxResult {
        if (merchantId.isBlank()) {
            return ReceiverRuntimeOutboxResult(success = false, safeMessage = "receiver merchant runtime config required")
        }
        if (signingKey.isBlank()) {
            return ReceiverRuntimeOutboxResult(success = false, safeMessage = "receiver signing runtime config required")
        }
        val payload = result.payload
            ?: return ReceiverRuntimeOutboxResult(success = false, safeMessage = "notification pipeline payload missing")
        val deviceState = deviceStateStore.load()
            ?: return ReceiverRuntimeOutboxResult(success = false, safeMessage = "receiver device registration required")
        val eventId = payload["event_id"]?.toString()
            ?: return ReceiverRuntimeOutboxResult(success = false, safeMessage = "notification pipeline event id missing")
        val signal = linkedMapOf<String, Any>()
        signal.putAll(payload)
        signal["merchant_id"] = merchantId
        signal["device_id"] = deviceState.deviceId
        signal["local_counter"] = deviceStateStore.nextLocalCounter()
        signal["signature"] = signRuntimeSignal(signal)
        val payloadJson = jsonObject(signal.entries.map { it.key to it.value })

        outboxStore.enqueue(
            OutboxRecord(
                localId = "outbox_$eventId",
                eventId = eventId,
                notificationHash = signal["notification_hash"].toString(),
                semanticHash = signal["semantic_hash"].toString(),
                payloadHash = runtimeSha256Hex(payloadJson),
                encryptedPayload = payloadJson,
                status = OutboxStatus.PENDING_UPLOAD,
                attemptCount = 0,
                firstSeenAt = nowIso(),
                lastAttemptAt = null,
                nextRetryAt = null,
                ackReceivedAt = null
            )
        )

        return ReceiverRuntimeOutboxResult(
            success = true,
            safeMessage = "redacted runtime notification signal queued; backend decision pending"
        )
    }

    private fun signRuntimeSignal(signalWithoutSignature: Map<String, Any>): String {
        return hmacSha256Hex(signingKey, stableDebugJson(signalWithoutSignature))
    }

    private fun hmacSha256Hex(secret: String, value: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(value.toByteArray(Charsets.UTF_8)).joinToString("") { byte ->
            "%02x".format(byte)
        }
    }

    private fun runtimeSha256Hex(value: String): String {
        val digest = java.security.MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { byte -> "%02x".format(byte) }
    }
}
