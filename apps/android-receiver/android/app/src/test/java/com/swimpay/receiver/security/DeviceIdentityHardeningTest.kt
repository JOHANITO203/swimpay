package com.swimpay.receiver.security

import com.swimpay.receiver.InMemoryDeviceStateStorage
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverDeviceState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceIdentityHardeningTest {
    private val fields = SignedReceiverPayloadFields(
        event_id = "evt_hardened",
        device_id = "dev_hardened",
        merchant_id = "mch_hardened",
        notification_hash = "hash_hardened",
        local_counter = 42,
        observed_at = "2026-05-02T20:00:00.000Z",
        payload_hash = "payload_hash_hardened"
    )

    @Test
    fun productionModeRejectsFakeSignerByDefault() {
        val production = ReceiverSigningPolicy.forMode(ReceiverRuntimeMode.PRODUCTION)

        val result = runCatching { production.requireProductionSigner(FakePayloadSigner("dev-only")) }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message.orEmpty().contains("dev signer"))
    }

    @Test
    fun fakeSignerIsAllowedOnlyForDebugTestsAndStillSignsRequiredFields() {
        val debug = ReceiverSigningPolicy.forMode(ReceiverRuntimeMode.DEBUG)
        val signer = debug.requireProductionSigner(FakePayloadSigner("debug-secret"))

        val signature = signer.sign(fields)

        assertFalse(signature.isBlank())
        assertTrue(canonicalReceiverPayload(fields).contains("event_id=evt_hardened"))
        assertTrue(canonicalReceiverPayload(fields).contains("local_counter=42"))
        assertTrue(canonicalReceiverPayload(fields).contains("payload_hash=payload_hash_hardened"))
    }

    @Test
    fun localCounterIncreasesAcrossStateReload() {
        val storage = InMemoryDeviceStateStorage()
        val firstStore = PersistentDeviceStateStore(storage)
        firstStore.save(
            ReceiverDeviceState(
                deviceId = "dev_persisted",
                deviceStatus = "active",
                serverTime = null,
                appVersion = "0.1.0-debug",
                lastRegistrationAt = "2026-05-02T20:00:00.000Z",
                lastHeartbeatAt = null,
                backendBaseUrl = "http://127.0.0.1:8080",
                lastLocalCounter = 9
            )
        )

        val reloaded = PersistentDeviceStateStore(storage)
        val next = reloaded.nextLocalCounter()

        assertEquals(10L, next)
        assertEquals(10L, reloaded.load()?.lastLocalCounter)
    }
}
