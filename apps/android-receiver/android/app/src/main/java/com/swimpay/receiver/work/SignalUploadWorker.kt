package com.swimpay.receiver.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class SignalUploadWorker(
    appContext: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(appContext, workerParameters) {
    companion object {
        const val UNIQUE_WORK_NAME = "swimpay_signal_upload_retry"
        const val MAX_RETRY_ATTEMPTS = 6

        fun enqueue(workManager: WorkManager, delayMs: Long = 0) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<SignalUploadWorker>()
                .setConstraints(constraints)
                .setInitialDelay(delayMs.coerceAtLeast(0), TimeUnit.MILLISECONDS)
                .build()

            workManager.enqueueUniqueWork(UNIQUE_WORK_NAME, ExistingWorkPolicy.KEEP, request)
        }
    }

    override suspend fun doWork(): Result {
        return if (runAttemptCount >= MAX_RETRY_ATTEMPTS) {
            Result.failure()
        } else {
            Result.retry()
        }
    }
}
