package com.swimpay.receiver.work

import com.swimpay.receiver.InMemoryDeviceStateStorage
import com.swimpay.receiver.InMemoryReceiverListenerLifecycleStorage
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverDeviceState
import com.swimpay.receiver.ReceiverHeartbeatPayloadBuilder
import com.swimpay.receiver.ReceiverListenerLifecycleStore
import com.swimpay.receiver.ReceiverRuntimeConfig
import com.swimpay.receiver.ReceiverRuntimeConfigReader
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverHeartbeatWorkerTest {
    @Test
    fun heartbeatPayloadUsesRealListenerLifecycleAndBatteryRisk() {
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        deviceStore.save(
            ReceiverDeviceState(
                deviceId = "dev_runtime_01",
                deviceStatus = "active",
                serverTime = null,
                appVersion = "0.1.0-test",
                lastRegistrationAt = "2026-05-17T09:00:00.000Z",
                lastHeartbeatAt = "2026-05-17T09:30:00.000Z",
                backendBaseUrl = "https://staging.swimpay.pro",
                lastLocalCounter = 7
            )
        )
        val lifecycleStore = ReceiverListenerLifecycleStore(InMemoryReceiverListenerLifecycleStorage())
        lifecycleStore.markDisconnected("2026-05-17T09:59:00.000Z")

        val payload = ReceiverHeartbeatPayloadBuilder(
            deviceStateStore = deviceStore,
            runtimeConfigReader = StaticRuntimeConfigReader(
                ReceiverRuntimeConfig(
                    enabledBankProfileIds = setOf("sber_ru"),
                    merchantId = "mch_runtime",
                    paymentIntentActive = true,
                    receiverArmed = true,
                    expectedPaymentProfilePresent = true,
                    receivingRouteLocked = true
                )
            ),
            listenerLifecycleStore = lifecycleStore,
            notificationAccessEnabled = { true },
            batteryOptimizationIgnored = { false },
            queueDepth = { 2 },
            lastSignalObservedAt = { "2026-05-17T09:58:00.000Z" },
            nowIso = { "2026-05-17T10:00:00.000Z" }
        ).build()

        assertEquals("dev_runtime_01", payload.deviceId)
        assertTrue(payload.notificationAccessEnabled)
        assertFalse(payload.listenerConnected)
        assertEquals(listOf("sber_ru"), payload.allowedBankProfileIds)
        assertEquals(2, payload.queueLength)
        assertEquals("2026-05-17T09:58:00.000Z", payload.lastSignalObservedAt)
        assertFalse(payload.batteryOptimizationIgnored)
        assertTrue(payload.body.contains("\"listener_connected\":false"))
        assertTrue(payload.body.contains("\"battery_optimization_ignored\":false"))
        assertFalse(payload.body.contains("spm_"))
        assertFalse(payload.body.contains("raw_notification", ignoreCase = true))
    }

    @Test
    fun periodicHeartbeatWorkPlanIsUniqueAndNetworkConstrained() {
        val plan = ReceiverHeartbeatWorkPlan.periodic()

        assertEquals(ReceiverHeartbeatWorker.UNIQUE_WORK_NAME, plan.uniqueName)
        assertTrue(plan.requiresNetwork)
        assertEquals(15L, plan.repeatIntervalMinutes)
    }
}

private class StaticRuntimeConfigReader(
    private val config: ReceiverRuntimeConfig
) : ReceiverRuntimeConfigReader {
    override fun load(): ReceiverRuntimeConfig = config
}
