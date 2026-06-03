package com.swimpay.receiver.work

import android.content.Context
import android.os.PowerManager
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import android.util.Log
import com.swimpay.receiver.AndroidMerchantBackendConfig
import com.swimpay.receiver.BuildConfig
import com.swimpay.receiver.DebugReceiverSmokeController
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverForegroundService
import com.swimpay.receiver.SharedPreferencesDeviceStateStorage
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidKeystoreOutboxStorageAdapter
import java.util.concurrent.TimeUnit

data class SignalUploadWorkPlan(
    val uniqueName: String,
    val initialDelayMs: Long,
    val requiresNetwork: Boolean,
    val maxAttempts: Int
) {
    companion object {
        fun next(delayMs: Long): SignalUploadWorkPlan = SignalUploadWorkPlan(
            uniqueName = SignalUploadWorker.UNIQUE_WORK_NAME,
            initialDelayMs = delayMs.coerceAtLeast(0),
            requiresNetwork = true,
            maxAttempts = SignalUploadWorker.MAX_RETRY_ATTEMPTS
        )
    }
}

data class SignalUploadWorkDecision(
    val shouldRetry: Boolean
) {
    companion object {
        fun fromAttempts(attempts: Int, policy: ReceiverRetryPolicy): SignalUploadWorkDecision {
            return SignalUploadWorkDecision(shouldRetry = policy.shouldRetry(attempts))
        }
    }
}

private data class SignalUploadWorkerResult(
    val success: Boolean,
    val safeMessage: String
)

class SignalUploadWorker(
    appContext: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(appContext, workerParameters) {
    companion object {
        const val UNIQUE_WORK_NAME = "swimpay_signal_upload_retry"
        const val MAX_RETRY_ATTEMPTS = 6
        const val UPLOAD_FOREGROUND_NOTIFICATION_ID = 7303
        private const val WAKELOCK_TIMEOUT_MS = 30_000L
        private const val WAKELOCK_TAG = "swimpay:signal_upload"

        /** Network-constrained, backoff-friendly enqueue used for retries (keeps initial delay). */
        fun enqueue(workManager: WorkManager, delayMs: Long = 0) {
            val plan = SignalUploadWorkPlan.next(delayMs)
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SignalUploadWorker>()
                .setConstraints(constraints)
                .setInitialDelay(plan.initialDelayMs, TimeUnit.MILLISECONDS)
                .build()

            workManager.enqueueUniqueWork(plan.uniqueName, ExistingWorkPolicy.KEEP, request)
        }

        /**
         * Expedited (no initial delay) flush for time-sensitive moments: a posted
         * bank notification and listener reconnect. Falls back to a regular request
         * if the expedited quota is exhausted. Expedited work cannot have an initial
         * delay, hence the separate path from [enqueue].
         */
        fun enqueueExpedited(workManager: WorkManager) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SignalUploadWorker>()
                .setConstraints(constraints)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()

            workManager.enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.KEEP, request)
        }
    }

    // Required by WorkManager when an expedited job must run as a foreground
    // service (Android 11 / API 30 and lower). Reuses the discreet capture channel.
    override suspend fun getForegroundInfo(): ForegroundInfo {
        ReceiverForegroundService.ensureChannel(applicationContext)
        return ForegroundInfo(
            UPLOAD_FOREGROUND_NOTIFICATION_ID,
            ReceiverForegroundService.buildNotification(applicationContext)
        )
    }

    override suspend fun doWork(): Result {
        val decision = SignalUploadWorkDecision.fromAttempts(runAttemptCount, ReceiverRetryPolicy(MAX_RETRY_ATTEMPTS))
        if (!decision.shouldRetry) {
            return Result.failure()
        }

        // Short, time-bounded wake lock so the upload completes even if the device
        // is dozing during the brief flush. Always released in finally.
        val powerManager = applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
        val wakeLock = powerManager?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKELOCK_TAG)?.apply {
            setReferenceCounted(false)
            runCatching { acquire(WAKELOCK_TIMEOUT_MS) }
        }
        try {
            val outboxStore = AndroidEncryptedOutboxStore(AndroidKeystoreOutboxStorageAdapter(applicationContext))
            val deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(applicationContext))
            val result: SignalUploadWorkerResult = if (BuildConfig.DEBUG) {
                val debugResult = DebugReceiverSmokeController(
                    debugEnabled = true,
                    deviceStateStore = deviceStateStore,
                    outboxStore = outboxStore
                ).performAction("flush_outbox")
                SignalUploadWorkerResult(success = debugResult.success, safeMessage = debugResult.safeMessage)
            } else {
                val backendBaseUrl = deviceStateStore.load()?.backendBaseUrl
                    ?: AndroidMerchantBackendConfig.configuredBaseUrl()
                val flushResult = SignalUploadFlusher.forBaseUrl(
                    outboxStore,
                    AndroidMerchantBackendConfig.normalizeBaseUrl(backendBaseUrl)
                )
                    .flushDue()
                SignalUploadWorkerResult(success = flushResult.success, safeMessage = flushResult.safeMessage)
            }

            Log.i("SwimPaySignalWorker", "background outbox flush success=${result.success} message=${result.safeMessage}")
            return if (result.success) Result.success() else Result.retry()
        } finally {
            if (wakeLock?.isHeld == true) {
                runCatching { wakeLock.release() }
            }
        }
    }
}
