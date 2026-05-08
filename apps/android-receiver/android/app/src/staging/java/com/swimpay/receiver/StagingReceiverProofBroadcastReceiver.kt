package com.swimpay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory
import com.swimpay.receiver.outbox.EncryptedStorageAdapter
import com.swimpay.receiver.security.AndroidKeystorePayloadSigner
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumMobileMerchantSessionStore
import com.swimpay.receiver.work.HttpUrlConnectionSignalUploadTransport
import com.swimpay.receiver.work.SignalUploadRequest
import com.swimpay.receiver.work.SignalUploadResponse
import com.swimpay.receiver.work.SignalUploadFlusher
import com.swimpay.receiver.work.SignalUploadTransport
import java.time.Instant
import kotlin.math.abs

class StagingReceiverProofBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val pending = goAsync()
        Thread {
            val message = runCatching { runProof(context.applicationContext) }
                .getOrElse { error -> "staging_proof_failed error=${error::class.java.simpleName}" }
            Log.i(TAG, message)
            pending.finish()
        }.start()
    }

    private fun runProof(context: Context): String {
        val baseUrl = AndroidMerchantBackendConfig.configuredBaseUrl()
        val session = SharedPreferencesPremiumMobileMerchantSessionStore(context).currentSession()
            ?: return "staging_proof_skipped reason=session_required"
        val runtimeConfigStore = ReceiverRuntimeConfigStore(context)
        val runtimeConfig = runtimeConfigStore.load()
        val enabledPackage = runtimeConfig.enabledBankPackages.firstOrNull()
            ?: return "staging_proof_skipped reason=bank_targets_required"
        val signer = AndroidKeystorePayloadSigner()
        val deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(context))
        val merchantTransport = HttpUrlConnectionMerchantApiTransport(baseUrl)
        val registration = ReceiverRuntimeRegistrationCoordinator(
            registrationClient = AndroidReceiverDeviceApiRepository(merchantTransport, baseUrl),
            deviceStateStore = deviceStateStore,
            runtimeConfigStore = runtimeConfigStore,
            payloadSigner = signer
        ).ensureCurrentAsymmetricRegistration(
            session = AuthenticatedMerchantSession.mobile(session),
            notificationAccessEnabled = NotificationAccessStatusReader(context).isEnabled(),
            appVersion = BuildConfig.VERSION_NAME,
            androidVersion = Build.VERSION.RELEASE ?: "unknown"
        )
        if (!registration.success) {
            return "staging_proof_skipped reason=registration_failed message=${registration.safeMessage}"
        }

        val pipeline = ReceiverNotificationPipeline(
            debugEnabled = false,
            enabledBankPackages = runtimeConfig.enabledBankPackages
        )
        val snapshot = StagingSyntheticNotificationHarness.supportedBankSnapshot(
            packageName = enabledPackage,
            postTime = System.currentTimeMillis()
        )
        val result = pipeline.process(listOf(snapshot))
        if (!result.accepted) {
            return "staging_proof_skipped reason=${result.reason}"
        }

        val outboxStorage = AndroidOutboxStorageFactory.createMigrating(context)
        val purgedProofRecords = purgePreviousStagingProofRecords(outboxStorage)
        val outboxStore = AndroidEncryptedOutboxStore(outboxStorage)
        val proofResult = result.copy(
            payload = result.payload?.plus("parser_hint" to "android-listener-staging-proof")
        )
        val enqueue = ReceiverRuntimeOutboxController(
            merchantId = runtimeConfig.merchantId,
            payloadSigner = signer,
            deviceStateStore = deviceStateStore,
            outboxStore = outboxStore
        ).enqueueProcessedNotificationSignal(proofResult)
        if (!enqueue.success) {
            return "staging_proof_skipped reason=enqueue_failed message=${enqueue.safeMessage}"
        }

        val uploadTransport = RecordingSafeStatusTransport(baseUrl)
        val upload = SignalUploadFlusher(outboxStore, uploadTransport).flushDue()
        return "staging_proof_upload success=${upload.success} acked=${upload.acked} failed_retrying=${upload.failedRetrying} " +
            "status=${uploadTransport.lastStatusCode} code=${uploadTransport.lastErrorCode} purged=$purgedProofRecords"
    }

    companion object {
        const val ACTION = "com.swimpay.receiver.STAGING_PROOF"
        const val TAG = "SwimPayStagingProof"
    }
}

private fun purgePreviousStagingProofRecords(
    storage: EncryptedStorageAdapter,
    nowMs: Long = System.currentTimeMillis()
): Int {
    var purged = 0
    for (record in storage.readAll()) {
        val payload = record.encryptedPayload
        val isStagingProof = payload.contains("\"parser_hint\":\"android-listener-staging-proof\"") ||
            payload.contains("\"redacted_body\":\"Transfer from Ivan <PHONE>. Ref <REFERENCE>\"") ||
            payload.contains("\"parser_hint\":\"android-listener-runtime-redacted\"")
        if (isStagingProof && record.ackReceivedAt == null && isOutsideStagingProofWindow(payload, nowMs)) {
            storage.delete(record.eventId)
            purged += 1
        }
    }
    return purged
}

private fun isOutsideStagingProofWindow(payload: String, nowMs: Long): Boolean {
    val observedAt = Regex("\"observed_at\"\\s*:\\s*\"([^\"]+)\"")
        .find(payload)
        ?.groupValues
        ?.getOrNull(1)
        ?: return false
    val observedMs = runCatching { Instant.parse(observedAt).toEpochMilli() }.getOrNull() ?: return false
    return abs(nowMs - observedMs) > STAGING_PROOF_OBSERVED_TOLERANCE_MS
}

private const val STAGING_PROOF_OBSERVED_TOLERANCE_MS = 15L * 60L * 1000L

private class RecordingSafeStatusTransport(baseUrl: String) : SignalUploadTransport {
    private val delegate = HttpUrlConnectionSignalUploadTransport(baseUrl)
    var lastStatusCode: Int = 0
        private set
    var lastErrorCode: String = "none"
        private set

    override fun execute(request: SignalUploadRequest): SignalUploadResponse {
        val response = delegate.execute(request)
        lastStatusCode = response.statusCode
        lastErrorCode = Regex("\"code\"\\s*:\\s*\"([^\"]+)\"")
            .find(response.body)
            ?.groupValues
            ?.getOrNull(1)
            ?.replace(Regex("[^A-Za-z0-9_\\-]"), "")
            ?: "none"
        return response
    }
}
