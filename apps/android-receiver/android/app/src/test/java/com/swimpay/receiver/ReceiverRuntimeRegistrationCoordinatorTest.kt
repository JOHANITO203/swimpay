package com.swimpay.receiver

import com.swimpay.receiver.security.FakePayloadSigner
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverRuntimeRegistrationCoordinatorTest {
    @Test
    fun skipsRegistrationWhenStoredDeviceUsesCurrentReceiverKey() {
        val signer = FakePayloadSigner("current")
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        deviceStore.save(
            receiverDeviceState(deviceId = "dev_existing", receiverKeyId = signer.keyId())
        )
        val registrationClient = RecordingRegistrationClient()

        val result = coordinator(signer, deviceStore, registrationClient)
            .ensureCurrentAsymmetricRegistration(
                session = AuthenticatedMerchantSession.localDev("mch_runtime"),
                notificationAccessEnabled = true,
                appVersion = "0.1.0-test",
                androidVersion = "test"
            )

        assertTrue(result.success)
        assertFalse(result.registered)
        assertEquals(0, registrationClient.calls)
        assertEquals("dev_existing", deviceStore.load()?.deviceId)
    }

    @Test
    fun registersAgainWhenStoredDeviceHasLegacyOrMissingReceiverKey() {
        val signer = FakePayloadSigner("current")
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        deviceStore.save(
            receiverDeviceState(deviceId = "dev_legacy", receiverKeyId = null)
        )
        val registrationClient = RecordingRegistrationClient()

        val result = coordinator(signer, deviceStore, registrationClient)
            .ensureCurrentAsymmetricRegistration(
                session = AuthenticatedMerchantSession.localDev("mch_runtime"),
                notificationAccessEnabled = true,
                appVersion = "0.1.0-test",
                androidVersion = "test"
            )

        assertTrue(result.success)
        assertTrue(result.registered)
        assertEquals(1, registrationClient.calls)
        assertEquals("dev_registered_01", deviceStore.load()?.deviceId)
        assertEquals(signer.keyId(), deviceStore.load()?.receiverKeyId)
    }

    @Test
    fun freshnessTreatsMissingKeyAsRegistrationRequired() {
        val signer = FakePayloadSigner("current")

        assertTrue(ReceiverRuntimeRegistrationFreshness.needsRegistration(null, signer.keyId()))
        assertTrue(
            ReceiverRuntimeRegistrationFreshness.needsRegistration(
                receiverDeviceState(receiverKeyId = null),
                signer.keyId()
            )
        )
        assertTrue(
            ReceiverRuntimeRegistrationFreshness.needsRegistration(
                receiverDeviceState(receiverKeyId = signer.keyId(), notificationAccessEnabled = false),
                signer.keyId(),
                notificationAccessEnabled = true
            )
        )
        assertFalse(
            ReceiverRuntimeRegistrationFreshness.needsRegistration(
                receiverDeviceState(receiverKeyId = signer.keyId(), notificationAccessEnabled = true),
                signer.keyId(),
                notificationAccessEnabled = true
            )
        )
    }

    private fun coordinator(
        signer: FakePayloadSigner,
        deviceStore: PersistentDeviceStateStore,
        registrationClient: RecordingRegistrationClient
    ): ReceiverRuntimeRegistrationCoordinator {
        return ReceiverRuntimeRegistrationCoordinator(
            registrationClient = registrationClient,
            deviceStateStore = deviceStore,
            runtimeConfigStore = StaticRuntimeConfigReader(
                ReceiverRuntimeConfig(
                    enabledBankProfileIds = setOf("sber_ru"),
                    merchantId = "mch_runtime"
                )
            ),
            payloadSigner = signer
        )
    }

    private fun receiverDeviceState(
        deviceId: String = "dev_runtime",
        receiverKeyId: String? = "akp_test",
        notificationAccessEnabled: Boolean = true
    ): ReceiverDeviceState {
        return ReceiverDeviceState(
            deviceId = deviceId,
            deviceStatus = "active",
            serverTime = null,
            appVersion = "0.1.0-test",
            lastRegistrationAt = "2026-05-08T00:00:00.000Z",
            lastHeartbeatAt = "2026-05-08T00:00:01.000Z",
            backendBaseUrl = "http://127.0.0.1:8080",
            receiverKeyId = receiverKeyId,
            lastNotificationListenerAccessEnabled = notificationAccessEnabled
        )
    }
}

private class StaticRuntimeConfigReader(
    private val config: ReceiverRuntimeConfig
) : ReceiverRuntimeConfigReader {
    override fun load(): ReceiverRuntimeConfig = config
}

private class RecordingRegistrationClient : ReceiverDeviceRegistrationClient {
    var calls: Int = 0

    override fun registerAndHeartbeat(
        session: AuthenticatedMerchantSession,
        enabledBankProfileIds: Set<String>,
        publicKeyPem: String,
        notificationAccessEnabled: Boolean,
        appVersion: String,
        androidVersion: String
    ): AndroidReceiverRuntimeRegistrationResult {
        calls += 1
        return AndroidReceiverRuntimeRegistrationResult(
            status = AndroidMerchantAuthResultStatus.SUCCESS,
            deviceState = ReceiverDeviceState(
                deviceId = "dev_registered_01",
                deviceStatus = "active",
                serverTime = "2026-05-08T00:00:02.000Z",
                appVersion = appVersion,
                lastRegistrationAt = "2026-05-08T00:00:02.000Z",
                lastHeartbeatAt = "2026-05-08T00:00:03.000Z",
                backendBaseUrl = "http://127.0.0.1:8080",
                receiverKeyId = null,
                lastNotificationListenerAccessEnabled = notificationAccessEnabled
            )
        )
    }
}
