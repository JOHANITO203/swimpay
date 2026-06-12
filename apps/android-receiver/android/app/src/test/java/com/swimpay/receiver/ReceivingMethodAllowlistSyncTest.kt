package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumOnboardingSessionState
import com.swimpay.receiver.ui.premium.PremiumOnboardingStep
import com.swimpay.receiver.MerchantReceivingMethodDraft as MerchantReceivingRouteDraft
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Gap #1 — the notification allowlist must be a CONTINUOUS consequence of the user's
 * active receiving methods, not a one-shot derivation at onboarding. After adding,
 * removing, or replacing a receiving method the runtime must re-derive the allowlist,
 * persist it, and re-register the device — through ONE shared code path also used by
 * onboarding (no divergent derivation).
 *
 * These tests pin [ReceivingMethodAllowlistSync] at the pure-logic seam (it depends on
 * interfaces, not Android Context / Compose), so the same object that the @Composable
 * app calls on both onboarding completion and post-mutation is exercised directly.
 */
class ReceivingMethodAllowlistSyncTest {

    private val session = AuthenticatedMerchantSession.localDev("mch_sync")

    private fun sync(
        activeBankProfileIds: Set<String>,
        configStore: RecordingRuntimeConfigStore,
        deviceStore: PersistentDeviceStateStore,
        registrationClient: ReceiverDeviceRegistrationClient
    ): ReceivingMethodAllowlistSyncResult {
        return ReceivingMethodAllowlistSync.syncFromActiveMethods(
            session = session,
            activeBankProfileIds = activeBankProfileIds,
            configWriter = configStore,
            clearConfig = configStore::clear,
            deviceStateStore = deviceStore,
            registrationClient = registrationClient,
            publicKeyPem = testReceiverPublicKeyPem(),
            receiverKeyId = "akp_sync_test",
            notificationAccessEnabled = true,
            appVersion = "0.1.0-test",
            androidVersion = "test"
        )
    }

    // ── 1. Adding a detectable method re-derives + persists + re-registers ──────────

    @Test
    fun addingADetectableMethodPersistsTheAllowlistAndReRegistersTheDevice() {
        val configWriter = RecordingRuntimeConfigStore()
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        val registrationClient = RecordingRegistrationClientSpy()

        // The merchant already had Sberbank; they add T-Bank as a second method.
        val result = sync(
            activeBankProfileIds = setOf("sber_ru", "tbank_ru"),
            configStore = configWriter,
            deviceStore = deviceStore,
            registrationClient = registrationClient
        )

        // (a) The persisted runtime config now includes BOTH methods' packages.
        val persisted = configWriter.saved.last()
        assertEquals(setOf("sber_ru", "tbank_ru"), persisted.enabledBankProfileIds)
        assertTrue(persisted.enabledBankPackages.contains("ru.sberbankmobile"))
        assertTrue(persisted.enabledBankPackages.contains("com.idamob.tinkoff.android"))

        // (b) The device was re-registered with the UPDATED allowlist.
        assertEquals(1, registrationClient.calls)
        assertEquals(setOf("sber_ru", "tbank_ru"), registrationClient.lastEnabledBankProfileIds)
        assertTrue(result.registered)
        assertFalse(result.cleared)
        // (c) The fresh device state was persisted (key bound to the receiver key).
        assertEquals("akp_sync_test", deviceStore.load()?.receiverKeyId)
    }

    // ── 2. Removing a method drops its package from the allowlist ───────────────────

    @Test
    fun removingAMethodDropsItsPackageFromTheAllowlistAndReRegisters() {
        val configWriter = RecordingRuntimeConfigStore()
        // Pre-existing config: both Sberbank and T-Bank were enabled.
        configWriter.save(
            ReceiverRuntimeConfig(
                enabledBankProfileIds = setOf("sber_ru", "tbank_ru"),
                merchantId = "mch_sync"
            )
        )
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        val registrationClient = RecordingRegistrationClientSpy()

        // The user deletes T-Bank; only Sberbank remains active.
        val result = sync(
            activeBankProfileIds = setOf("sber_ru"),
            configStore = configWriter,
            deviceStore = deviceStore,
            registrationClient = registrationClient
        )

        val persisted = configWriter.saved.last()
        assertEquals(setOf("sber_ru"), persisted.enabledBankProfileIds)
        assertTrue(persisted.enabledBankPackages.contains("ru.sberbankmobile"))
        // T-Bank's package is no longer monitored.
        assertFalse(persisted.enabledBankPackages.contains("com.idamob.tinkoff.android"))
        assertEquals(setOf("sber_ru"), registrationClient.lastEnabledBankProfileIds)
        assertTrue(result.registered)
        assertFalse(result.cleared)
    }

    // ── 3. Package-less-only set → empty/cleared allowlist, no crash, no register ────

    @Test
    fun removingTheLastDetectableMethodClearsTheAllowlistWithoutCrashingOrRegistering() {
        val configWriter = RecordingRuntimeConfigStore()
        configWriter.save(
            ReceiverRuntimeConfig(
                enabledBankProfileIds = setOf("sber_ru"),
                merchantId = "mch_sync"
            )
        )
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        val registrationClient = RecordingRegistrationClientSpy()

        // Only a package-less WA wallet (Wave CI) remains: it configures a route but
        // contributes NOTHING to the allowlist → derived set is empty.
        val result = sync(
            activeBankProfileIds = setOf("wave_ci"),
            configStore = configWriter,
            deviceStore = deviceStore,
            registrationClient = registrationClient
        )

        // The store must NOT receive an empty save (it require()s non-empty) — instead the
        // stale config is cleared and registration is skipped. No exception thrown.
        assertTrue(result.cleared)
        assertFalse(result.registered)
        assertEquals(0, registrationClient.calls)
        assertTrue(configWriter.cleared)
        assertTrue(configReaderIsEmpty(configWriter))
    }

    @Test
    fun anEmptyActiveSetClearsTheAllowlistWithoutRegistering() {
        val configWriter = RecordingRuntimeConfigStore()
        configWriter.save(
            ReceiverRuntimeConfig(
                enabledBankProfileIds = setOf("sber_ru"),
                merchantId = "mch_sync"
            )
        )
        val deviceStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        val registrationClient = RecordingRegistrationClientSpy()

        val result = sync(
            activeBankProfileIds = emptySet(),
            configStore = configWriter,
            deviceStore = deviceStore,
            registrationClient = registrationClient
        )

        assertTrue(result.cleared)
        assertFalse(result.registered)
        assertEquals(0, registrationClient.calls)
        assertTrue(configWriter.cleared)
    }

    // ── 4. Mutation path and onboarding path produce IDENTICAL allowlists ───────────

    @Test
    fun mutationPathAndOnboardingPathDeriveIdenticalAllowlistsForTheSameMethodSet() {
        // The onboarding path derives the allowlist via PremiumOnboardingSessionState
        // (ReceivingCatalog.notificationProfileIdsFor). The mutation path must derive the
        // SAME set from the same ids — proving one shared derivation, not a fork.
        val onboardingState = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true
        ).withReceivingMethod(
            MerchantReceivingRouteDraft(
                bankProfileId = "sber_ru",
                type = ReceivingMethodType.CARD_TRANSFER,
                rawIdentifierInput = "2200123412344821"
            ).toSubmission()
        )

        val onboardingAllowlist = onboardingState.derivedEnabledBankProfileIds
        val mutationAllowlist =
            ReceivingMethodAllowlistSync.deriveEnabledBankProfileIds(setOf("sber_ru", "wave_ci"))

        // Wave contributes nothing on the mutation side, exactly as it does at onboarding.
        assertEquals(setOf("sber_ru"), onboardingAllowlist)
        assertEquals(setOf("sber_ru"), mutationAllowlist)
        assertEquals(onboardingAllowlist, mutationAllowlist)
    }

    private fun configReaderIsEmpty(reader: ReceiverRuntimeConfigReader): Boolean =
        reader.load().enabledBankProfileIds.isEmpty()

    private fun testReceiverPublicKeyPem(): String = listOf(
        "-----BEGIN PUBLIC KEY-----",
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEiY7GDh0qtB+VSl73IXZdMEaM",
        "C6/8oH3Iv0uJ9+QWm2YyPTrTjBznXLa3HoRrP6+uG81Svu0OJEhS1m3jIw==",
        "-----END PUBLIC KEY-----"
    ).joinToString("\n")
}

/**
 * In-memory ReceiverRuntimeConfig store that mirrors the real store's contract:
 * save() require()s a non-empty allowlist, clear() empties it. Lets the sync tests
 * assert both the save and the clear-on-empty paths without an Android Context.
 */
private class RecordingRuntimeConfigStore : ReceiverRuntimeConfigWriter, ReceiverRuntimeConfigReader {
    val saved: MutableList<ReceiverRuntimeConfig> = mutableListOf()
    var cleared: Boolean = false
    private var current: ReceiverRuntimeConfig =
        ReceiverRuntimeConfig(enabledBankProfileIds = emptySet(), merchantId = "")

    override fun save(config: ReceiverRuntimeConfig) {
        require(config.enabledBankProfileIds.isNotEmpty()) { "at least one supported bank target must be enabled" }
        require(config.merchantId.isNotBlank()) { "merchant id is required for receiver runtime config" }
        cleared = false
        current = config
        saved += config
    }

    override fun saveActiveIntentWindow(window: ActiveIntentWindow) {
        current = current.copy(
            paymentIntentActive = window.paymentIntentActive,
            receiverArmed = window.receiverArmed,
            expectedPaymentProfilePresent = window.expectedPaymentProfilePresent,
            receivingRouteLocked = window.receivingRouteLocked
        )
    }

    fun clear() {
        cleared = true
        current = ReceiverRuntimeConfig(enabledBankProfileIds = emptySet(), merchantId = "")
    }

    override fun load(): ReceiverRuntimeConfig = current
}

private class RecordingRegistrationClientSpy : ReceiverDeviceRegistrationClient {
    var calls: Int = 0
    var lastEnabledBankProfileIds: Set<String> = emptySet()

    override fun registerAndHeartbeat(
        session: AuthenticatedMerchantSession,
        enabledBankProfileIds: Set<String>,
        publicKeyPem: String,
        notificationAccessEnabled: Boolean,
        appVersion: String,
        androidVersion: String
    ): AndroidReceiverRuntimeRegistrationResult {
        calls += 1
        lastEnabledBankProfileIds = enabledBankProfileIds
        return AndroidReceiverRuntimeRegistrationResult(
            status = AndroidMerchantAuthResultStatus.SUCCESS,
            deviceState = ReceiverDeviceState(
                deviceId = "dev_synced_01",
                deviceStatus = "active",
                serverTime = "2026-06-12T00:00:02.000Z",
                appVersion = appVersion,
                lastRegistrationAt = "2026-06-12T00:00:02.000Z",
                lastHeartbeatAt = "2026-06-12T00:00:03.000Z",
                backendBaseUrl = "http://127.0.0.1:8080",
                receiverKeyId = null,
                lastNotificationListenerAccessEnabled = notificationAccessEnabled
            )
        )
    }
}
