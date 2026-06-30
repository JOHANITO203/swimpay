package com.swimpay.receiver

import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.FakeEncryptedStorageAdapter
import com.swimpay.receiver.outbox.OutboxStatus
import com.swimpay.receiver.security.FakePayloadSigner
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidReceiverRealRuntimeTest {
    @Test
    fun nonDebugRuntimeAllowsOnlyEnabledSupportedBankPackages() {
        val enabledPackages = setOf("ru.sberbankmobile")

        assertTrue(
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = "ru.sberbankmobile",
                appPackageName = "com.swimpay.receiver",
                debugEnabled = false,
                enabledBankPackages = enabledPackages
            )
        )
        assertFalse(
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = "com.idamob.tinkoff.android",
                appPackageName = "com.swimpay.receiver",
                debugEnabled = false,
                enabledBankPackages = enabledPackages
            )
        )
        assertFalse(
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = "com.example.unrelated",
                appPackageName = "com.swimpay.receiver",
                debugEnabled = false,
                enabledBankPackages = enabledPackages
            )
        )
    }

    @Test
    fun realRuntimePipelineAcceptsActivatedSupportedBankAndRedactsBeforePayload() {
        val pipeline = ReceiverNotificationPipeline(
            debugEnabled = false,
            enabledBankPackages = setOf("ru.sberbankmobile")
        )
        val snapshot = StagingSyntheticNotificationHarness.supportedBankSnapshot(
            packageName = "ru.sberbankmobile",
            bankProfileId = "sber_ru",
            title = "Incoming transfer 137 RUB",
            text = "Transfer from Ivan +79991234567. Ref SWP-ABC123"
        )

        val result = pipeline.process(listOf(snapshot))

        assertTrue(result.accepted)
        assertEquals("enabled_supported_bank_package", result.packageTrustLabel)
        val payload = result.payload ?: error("payload expected")
        assertEquals("ru.sberbankmobile", payload["package_name"])
        assertEquals("TO_VERIFY", payload["package_cert_sha256"])
        assertEquals(false, payload["raw_text_present"])
        assertEquals("<PHONE>", payload["sender_phone_masked"])
        // Reference dropped as an upload field (phantom HMAC removed); body still scrubbed below.
        assertEquals("", payload["reference_code_masked"])
        assertFalse(payload.toString().contains("+79991234567"))
        assertFalse(payload.toString().contains("SWP-ABC123"))
        assertFalse(payload.toString().contains("payment.confirmed"))
        assertFalse(payload.toString().contains("webhook", ignoreCase = true))
    }

    @Test
    fun notificationHashChangesWithSnapshotTimeWhileSemanticHashStaysStable() {
        val pipeline = ReceiverNotificationPipeline(
            debugEnabled = false,
            enabledBankPackages = setOf("ru.sberbankmobile")
        )
        val first = pipeline.process(
            listOf(StagingSyntheticNotificationHarness.supportedBankSnapshot(postTime = 1_775_000_100_000L))
        ).payload ?: error("first payload expected")
        val second = pipeline.process(
            listOf(StagingSyntheticNotificationHarness.supportedBankSnapshot(postTime = 1_775_000_160_000L))
        ).payload ?: error("second payload expected")

        assertFalse(first["notification_hash"] == second["notification_hash"])
        assertEquals(first["semantic_hash"], second["semantic_hash"])
        assertFalse(first["event_id"] == second["event_id"])
    }

    @Test
    fun realRuntimeOutboxEnqueuesOnlyRedactedSignedPayloads() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        val deviceStateStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        deviceStateStore.save(
            ReceiverDeviceState(
                deviceId = "dev_runtime_01",
                deviceStatus = "active",
                serverTime = null,
                appVersion = "0.1.0-test",
                lastRegistrationAt = "2026-05-08T00:00:00.000Z",
                lastHeartbeatAt = null,
                backendBaseUrl = "http://127.0.0.1:8080",
                lastLocalCounter = 41
            )
        )
        val pipeline = ReceiverNotificationPipeline(debugEnabled = false, enabledBankPackages = setOf("ru.sberbankmobile"))
        val result = pipeline.process(listOf(StagingSyntheticNotificationHarness.supportedBankSnapshot()))

        val enqueue = ReceiverRuntimeOutboxController(
            merchantId = "mch_runtime_01",
            payloadSigner = FakePayloadSigner("runtime-test-signer"),
            deviceStateStore = deviceStateStore,
            outboxStore = store,
            nowIso = { "2026-05-08T00:01:00.000Z" }
        ).enqueueProcessedNotificationSignal(result)

        assertTrue(enqueue.success)
        assertEquals("redacted runtime notification signal queued; backend decision pending", enqueue.safeMessage)
        val due = store.dueRecords("2026-05-08T00:02:00.000Z")
        assertEquals(1, due.size)
        assertEquals(OutboxStatus.PENDING_UPLOAD, due[0].status)
        assertTrue(due[0].encryptedPayload.contains("\"local_counter\":42"))
        assertTrue(due[0].encryptedPayload.contains("\"payload_hash\""))
        assertTrue(due[0].encryptedPayload.contains("\"signature\""))
        assertFalse(due[0].encryptedPayload.contains("runtime_test_hmac_key"))
        assertFalse(due[0].encryptedPayload.contains("+79991234567"))
        assertFalse(due[0].encryptedPayload.contains("raw_title", ignoreCase = true))
    }

    @Test
    fun realRuntimeOutboxRequiresRegisteredMerchantAndDevice() {
        val store = AndroidEncryptedOutboxStore(FakeEncryptedStorageAdapter())
        val deviceStateStore = PersistentDeviceStateStore(InMemoryDeviceStateStorage())
        deviceStateStore.save(
            ReceiverDeviceState(
                deviceId = "dev_runtime_01",
                deviceStatus = "active",
                serverTime = null,
                appVersion = "0.1.0-test",
                lastRegistrationAt = "2026-05-08T00:00:00.000Z",
                lastHeartbeatAt = null,
                backendBaseUrl = "http://127.0.0.1:8080"
            )
        )
        val pipeline = ReceiverNotificationPipeline(debugEnabled = false, enabledBankPackages = setOf("ru.sberbankmobile"))
        val result = pipeline.process(listOf(StagingSyntheticNotificationHarness.supportedBankSnapshot()))

        val missingMerchant = ReceiverRuntimeOutboxController(
            merchantId = "",
            payloadSigner = FakePayloadSigner("runtime-test-signer"),
            deviceStateStore = deviceStateStore,
            outboxStore = store
        ).enqueueProcessedNotificationSignal(result)

        assertFalse(missingMerchant.success)
        assertEquals(0, store.dueRecords("2026-05-08T00:02:00.000Z").size)
    }

    @Test
    fun stagingSyntheticHarnessExercisesRuntimeWithoutRealNotificationCapture() {
        val result = StagingSyntheticNotificationHarness.runSmoke(
            enabledBankPackages = setOf("ru.sberbankmobile")
        )

        assertTrue(result.supportedBankAccepted)
        assertTrue(result.unsupportedPackageIgnored)
        assertTrue(result.rawTextBlockedAtBoundary)
        assertTrue(result.redactedSignalEnvelopeCreated)
        assertFalse(result.androidConfirmedPayment)
        assertFalse(result.androidDeveloperWebhookEmitted)
        assertNotNull(result.safeEnvelope)
        assertFalse(result.safeEnvelope.toString().contains("+79991234567"))
        assertFalse(result.safeEnvelope.toString().contains("raw_notification", ignoreCase = true))
    }

    @Test
    fun realRuntimeGuardrailsKeepForbiddenAndroidCapabilitiesOut() {
        val mainManifest = File("src/main/AndroidManifest.xml").readText()
        val sourceCorpus = listOf(
            "src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt",
            "src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt",
            "src/main/java/com/swimpay/receiver/ReceiverNotificationPipeline.kt",
            "src/main/java/com/swimpay/receiver/BankTargetLock.kt",
            "src/main/java/com/swimpay/receiver/work/SignalUploadWorker.kt"
        ).joinToString("\n") { File(it).readText() }

        assertFalse(mainManifest.contains("android.permission.READ_SMS"))
        assertFalse(mainManifest.contains("android.permission.RECEIVE_SMS"))
        assertFalse(mainManifest.contains("android.permission.BIND_ACCESSIBILITY_SERVICE"))
        assertFalse(mainManifest.contains("QUERY_ALL_PACKAGES"))
        assertFalse(sourceCorpus.contains("getInstalledPackages"))
        assertFalse(sourceCorpus.contains("getInstalledApplications"))
        assertFalse(sourceCorpus.contains("queryIntentActivities"))
        assertFalse(sourceCorpus.contains("payment.confirmed"))
        assertFalse(sourceCorpus.contains("developer webhook", ignoreCase = true))
        assertFalse(sourceCorpus.contains("autoConfirm"))
        assertTrue(sourceCorpus.contains("enabledBankPackages"))
    }

    @Test
    fun liveNotificationListenerChecksActiveIntentBeforeExtraction() {
        val source = File("src/main/java/com/swimpay/receiver/SwimPayNotificationListenerService.kt").readText()
        val activeWindowGate = source.indexOf("if (!runtimeConfig.activeIntentWindow.canSweep())")
        val extractorCall = source.indexOf("AndroidNotificationSnapshotExtractor.fromStatusBarNotification")

        assertTrue(activeWindowGate >= 0)
        assertTrue(extractorCall >= 0)
        assertTrue(activeWindowGate < extractorCall)
    }

    @Test
    fun merchantFallbackNotificationCopyIsActionOnlyAndNotAConfirmation() {
        val source = File("src/main/java/com/swimpay/receiver/AndroidMerchantReviewNotifier.kt").readText()

        assertTrue(source.contains("Commande à vérifier"))
        assertTrue(source.contains("Aucun signal bancaire détecté"))
        assertTrue(source.contains("confirmez ou rejetez"))
        assertFalse(source.contains("paiement confirmé", ignoreCase = true))
        assertFalse(source.contains("official_bank_confirmation", ignoreCase = true))
    }
}
