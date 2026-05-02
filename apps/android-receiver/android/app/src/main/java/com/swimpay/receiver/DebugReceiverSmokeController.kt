package com.swimpay.receiver

data class DebugSmokeAction(
    val id: String,
    val label: String,
    val safeDescription: String
)

class DebugReceiverSmokeController(private val debugEnabled: Boolean) {
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

    fun buildSyntheticRedactedSignal(
        merchantId: String,
        deviceId: String,
        eventId: String,
        observedAt: String
    ): Map<String, Any> {
        require(debugEnabled) { "Debug receiver smoke actions are disabled." }

        return linkedMapOf(
            "event_id" to eventId,
            "merchant_id" to merchantId,
            "device_id" to deviceId,
            "bank_profile_id" to "debug_to_verify_bank",
            "package_name" to "TO_VERIFY",
            "package_cert_sha256" to "TO_VERIFY",
            "observed_at" to observedAt,
            "notification_hash" to "0".repeat(64),
            "semantic_hash" to "1".repeat(64),
            "local_counter" to 1L,
            "snapshot_count" to 1,
            "coalesced" to true,
            "amount_minor" to 12345,
            "currency" to "RUB",
            "sender_phone_hmac" to "synthetic_phone_hmac",
            "sender_phone_masked" to "<PHONE>",
            "reference_hmac" to "synthetic_reference_hmac",
            "reference_code_masked" to "<REFERENCE>",
            "direction_hint" to "incoming_customer_transfer",
            "parser_hint" to "android-debug-smoke-v1",
            "signal_quality_hint" to 50,
            "redacted_title" to "Synthetic transfer <AMOUNT> <CURRENCY>",
            "redacted_body" to "Synthetic notification signal from <PHONE> with <REFERENCE>",
            "raw_text_present" to false,
            "signature" to "debug_signature_placeholder"
        )
    }
}

