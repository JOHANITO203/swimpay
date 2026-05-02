package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DebugReceiverSmokeControllerTest {
    @Test
    fun exposesOnlySafeDebugSmokeActions() {
        val controller = DebugReceiverSmokeController(debugEnabled = true)

        val actions = controller.availableActions()

        assertEquals(
            listOf(
                "register_receiver",
                "send_heartbeat",
                "upload_synthetic_redacted_signal",
                "enqueue_synthetic_outbox_signal",
                "flush_outbox",
                "process_synthetic_notification_e2e",
                "submit_synthetic_bank_evidence"
            ),
            actions.map { it.id }
        )
        val rendered = actions.joinToString("\n") { "${it.label} ${it.safeDescription}" }
        assertTrue(rendered.contains("backend decision pending"))
        assertTrue(rendered.contains("not official bank confirmation"))
        assertFalse(rendered.contains("+7"))
        assertFalse(rendered.contains("raw notification"))
        assertFalse(rendered.contains("bank confirmed", ignoreCase = true))
    }

    @Test
    fun hidesDebugSmokeActionsWhenDebugIsDisabled() {
        val controller = DebugReceiverSmokeController(debugEnabled = false)

        assertTrue(controller.availableActions().isEmpty())
    }

    @Test
    fun buildsSyntheticSignalWithoutRawPiiOrPaymentConfirmation() {
        val controller = DebugReceiverSmokeController(debugEnabled = true)

        val signal = controller.buildSyntheticRedactedSignal(
            merchantId = "00000000-0000-4000-8000-000000000001",
            deviceId = "00000000-0000-4000-8000-000000000002",
            eventId = "evt_debug_safe_01",
            observedAt = "2026-05-02T18:00:00.000Z"
        )
        val serialized = signal.toString()

        assertEquals("TO_VERIFY", signal["package_name"])
        assertEquals("TO_VERIFY", signal["package_cert_sha256"])
        assertEquals(false, signal["raw_text_present"])
        assertTrue(signal["signature"].toString().isNotBlank())
        assertFalse(signal["signature"].toString().contains("placeholder", ignoreCase = true))
        assertFalse(serialized.contains("+7"))
        assertFalse(serialized.contains("raw_notification"))
        assertFalse(serialized.contains("official_bank_confirmation"))
        assertFalse(serialized.contains("confirmed", ignoreCase = true))
    }
}
