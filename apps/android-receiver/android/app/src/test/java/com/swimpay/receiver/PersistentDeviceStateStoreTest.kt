package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PersistentDeviceStateStoreTest {
    @Test
    fun savesLoadsAndClearsSafeDeviceState() {
        val storage = InMemoryDeviceStateStorage()
        val store = PersistentDeviceStateStore(storage)

        store.save(
            ReceiverDeviceState(
                deviceId = "dev_debug_01",
                deviceStatus = "active",
                serverTime = "2026-05-02T18:00:00.000Z",
                appVersion = "0.1.0-debug",
                lastRegistrationAt = "2026-05-02T18:00:01.000Z",
                lastHeartbeatAt = "2026-05-02T18:00:02.000Z",
                backendBaseUrl = "http://127.0.0.1:8080"
            )
        )

        val reloaded = PersistentDeviceStateStore(storage).load()

        assertEquals("dev_debug_01", reloaded?.deviceId)
        assertEquals("active", reloaded?.deviceStatus)
        assertEquals("http://127.0.0.1:8080", reloaded?.backendBaseUrl)
        assertEquals(0L, reloaded?.lastLocalCounter)
        assertTrue(storage.dump().contains("dev_debug_01"))

        store.clear()

        assertNull(store.load())
    }

    @Test
    fun rejectsRawPiiAndSecretsInDeviceState() {
        val store = PersistentDeviceStateStore(InMemoryDeviceStateStorage())

        val rawPhone = runCatching {
            store.save(
                ReceiverDeviceState(
                    deviceId = "dev_+79991234567",
                    deviceStatus = "active",
                    serverTime = null,
                    appVersion = "0.1.0-debug",
                    lastRegistrationAt = null,
                    lastHeartbeatAt = null,
                    backendBaseUrl = "http://127.0.0.1:8080"
                )
            )
        }
        val secret = runCatching {
            store.save(
                ReceiverDeviceState(
                    deviceId = "dev_debug_01",
                    deviceStatus = "active",
                    serverTime = null,
                    appVersion = "contains token",
                    lastRegistrationAt = null,
                    lastHeartbeatAt = null,
                    backendBaseUrl = "http://127.0.0.1:8080"
                )
            )
        }

        assertTrue(rawPhone.isFailure)
        assertTrue(secret.isFailure)
    }
}
