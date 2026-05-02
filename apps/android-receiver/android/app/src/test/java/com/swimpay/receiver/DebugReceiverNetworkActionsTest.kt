package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DebugReceiverNetworkActionsTest {
    @Test
    fun debugBackendConfigDefaultsToAdbReverseUrl() {
        val config = DebugBackendConfig()

        assertEquals("http://127.0.0.1:8080", config.baseUrl)
        assertEquals("00000000-0000-4000-8000-000000000001", config.merchantId)
        assertFalse(config.publicKey.isBlank())
        assertFalse(config.baseUrl.contains("prod", ignoreCase = true))
    }

    @Test
    fun httpClientUsesSafeEndpointsAndDoesNotExposePayloadsInResult() {
        val transport = RecordingDebugHttpTransport(
            DebugHttpResponse(
                statusCode = 201,
                body = """{"device_id":"dev_debug_01","status":"active"}"""
            )
        )
        val client = DebugReceiverHttpClient(DebugBackendConfig(), transport)

        val result = client.registerDevice()

        assertTrue(result.success)
        assertEquals("dev_debug_01", result.deviceId)
        assertEquals("POST", transport.requests.single().method)
        assertEquals("/v1/receiver-devices/register", transport.requests.single().path)
        assertEquals(
            "Bearer test_00000000-0000-4000-8000-000000000001",
            transport.requests.single().headers["Authorization"]
        )
        assertTrue(transport.requests.single().body.contains("public_key"))
        assertFalse(result.safeMessage.contains("public_key"))
        assertFalse(result.safeMessage.contains("+7"))
        assertFalse(result.safeMessage.contains("raw_notification", ignoreCase = true))
    }

    @Test
    fun controllerRunsRegisterHeartbeatAndSignalUploadThroughHttpClient() {
        val transport = QueueDebugHttpTransport(
            DebugHttpResponse(201, """{"device_id":"dev_debug_01","status":"active"}"""),
            DebugHttpResponse(200, """{"device_status":"active","warnings":[]}"""),
            DebugHttpResponse(201, """{"accepted":true,"status":"received","next_action":"backend_decision_pending"}"""),
            DebugHttpResponse(201, """{"accepted":true,"status":"received","next_action":"backend_decision_pending"}""")
        )
        val controller = DebugReceiverSmokeController(
            debugEnabled = true,
            httpClient = DebugReceiverHttpClient(DebugBackendConfig(), transport),
            nowIso = { "2026-05-02T18:00:00.000Z" }
        )

        val register = controller.performAction("register_receiver")
        val heartbeat = controller.performAction("send_heartbeat")
        val signal = controller.performAction("upload_synthetic_redacted_signal")
        controller.performAction("enqueue_synthetic_outbox_signal")
        val flush = controller.performAction("flush_outbox")

        assertTrue(register.success)
        assertTrue(heartbeat.success)
        assertTrue(signal.success)
        assertTrue(flush.success)
        assertEquals(
            listOf(
                "/v1/receiver-devices/register",
                "/v1/receiver-devices/heartbeat",
                "/v1/receiver/signals",
                "/v1/receiver/signals"
            ),
            transport.requests.map { it.path }
        )
        val uploaded = transport.requests[2].body
        val flushed = transport.requests[3].body
        assertTrue(uploaded.contains("backend-debug-smoke"))
        assertTrue(uploaded.contains("TO_VERIFY"))
        assertTrue(uploaded.contains("signature"))
        assertTrue(uploaded.contains("\"local_counter\":1"))
        assertTrue(flushed.contains("\"local_counter\":2"))
        assertFalse(uploaded.contains("+7"))
        assertFalse(uploaded.contains("raw_notification", ignoreCase = true))
        assertFalse(signal.safeMessage.contains("official_bank_confirmation"))
        assertTrue(signal.safeMessage.contains("backend decision pending"))
        assertTrue(signal.safeMessage.contains("not official bank confirmation"))
    }

    @Test
    fun syntheticSignalSignatureIsNotPlaceholderAndCoversSafeFields() {
        val controller = DebugReceiverSmokeController(
            debugEnabled = true,
            nowIso = { "2026-05-02T18:00:00.000Z" }
        )

        val signal = controller.buildSyntheticRedactedSignal(
            merchantId = DebugBackendConfig.DEFAULT_SMOKE_MERCHANT_ID,
            deviceId = "dev_debug_01",
            eventId = "evt_debug_safe_01",
            observedAt = "2026-05-02T18:00:00.000Z"
        )
        val unsigned = signal.filterKeys { it != "signature" }

        assertNotNull(signal["signature"])
        assertTrue(stableDebugJson(unsigned).contains("\"local_counter\":1"))
        assertTrue(stableDebugJson(unsigned).contains("\"raw_text_present\":false"))
        assertEquals(
            "{\"amount_minor\":12345,\"bank_profile_id\":\"sber_ru\",\"coalesced\":true,\"currency\":\"RUB\",\"device_id\":\"dev_debug_01\",\"direction_hint\":\"incoming_customer_transfer\",\"event_id\":\"evt_debug_safe_01\",\"local_counter\":1,\"merchant_id\":\"00000000-0000-4000-8000-000000000001\",\"notification_hash\":\"664f57a4ca94f4f5d03a3b05026eac9aa94f2ab0b2d9f0479bb9d3bc1868cf81\",\"observed_at\":\"2026-05-02T18:00:00.000Z\",\"package_cert_sha256\":\"TO_VERIFY\",\"package_name\":\"TO_VERIFY\",\"parser_hint\":\"backend-debug-smoke\",\"raw_text_present\":false,\"redacted_body\":\"Synthetic notification signal from <PHONE> with <REFERENCE>\",\"redacted_title\":\"Synthetic transfer <AMOUNT> <CURRENCY>\",\"reference_code_masked\":\"<REFERENCE>\",\"reference_hmac\":\"synthetic_reference_hmac\",\"semantic_hash\":\"aebc8f8c8ab9aea7fe75b738109911496e291f5d66739046144472fd7c9b999c\",\"sender_phone_hmac\":\"synthetic_phone_hmac\",\"sender_phone_masked\":\"<PHONE>\",\"signal_quality_hint\":50,\"snapshot_count\":1}",
            stableDebugJson(unsigned)
        )
        assertEquals("8d60e9303c5343ceda5b3f862131d51102e286205ef2549d411e91b6cc136a35", signal["signature"])
        assertNotEquals("debug_signature_placeholder", signal["signature"])
        assertEquals("TO_VERIFY", signal["package_name"])
        assertEquals(false, signal["raw_text_present"])
        assertFalse(signal.toString().contains("+7"))
        assertFalse(signal.toString().contains("raw_notification", ignoreCase = true))
    }

    @Test
    fun outboxEnqueueAndFlushAckOrRetryWithoutRawPii() {
        val successTransport = QueueDebugHttpTransport(
            DebugHttpResponse(201, """{"accepted":true,"next_action":"backend_decision_pending"}""")
        )
        val successController = DebugReceiverSmokeController(
            debugEnabled = true,
            httpClient = DebugReceiverHttpClient(DebugBackendConfig(), successTransport),
            nowIso = { "2026-05-02T18:00:00.000Z" }
        )

        val queued = successController.performAction("enqueue_synthetic_outbox_signal")
        val flushed = successController.performAction("flush_outbox")

        assertTrue(queued.success)
        assertTrue(flushed.success)
        assertTrue(flushed.safeMessage.contains("acked"))
        assertFalse(queued.safeMessage.contains("+7"))
        assertFalse(queued.safeMessage.contains("raw notification", ignoreCase = true))

        val failingTransport = ThrowingDebugHttpTransport()
        val failingController = DebugReceiverSmokeController(
            debugEnabled = true,
            httpClient = DebugReceiverHttpClient(DebugBackendConfig(), failingTransport),
            nowIso = { "2026-05-02T18:00:00.000Z" }
        )

        failingController.performAction("enqueue_synthetic_outbox_signal")
        val retry = failingController.performAction("flush_outbox")

        assertFalse(retry.success)
        assertTrue(retry.safeMessage.contains("failed_retrying"))
        assertFalse(retry.safeMessage.contains("+7"))
    }
}

private open class RecordingDebugHttpTransport(
    private val response: DebugHttpResponse
) : DebugHttpTransport {
    val requests = mutableListOf<DebugHttpRequest>()

    override fun execute(request: DebugHttpRequest): DebugHttpResponse {
        requests.add(request)
        return response
    }
}

private class QueueDebugHttpTransport(
    vararg responses: DebugHttpResponse
) : DebugHttpTransport {
    private val responses = ArrayDeque(responses.toList())
    val requests = mutableListOf<DebugHttpRequest>()

    override fun execute(request: DebugHttpRequest): DebugHttpResponse {
        requests.add(request)
        return responses.removeFirst()
    }
}

private class ThrowingDebugHttpTransport : DebugHttpTransport {
    override fun execute(request: DebugHttpRequest): DebugHttpResponse {
        throw IllegalStateException("backend unreachable")
    }
}
