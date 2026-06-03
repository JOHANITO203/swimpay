package com.swimpay.receiver.work

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.swimpay.receiver.AndroidMerchantBackendConfig
import com.swimpay.receiver.AuthenticatedMerchantSession
import com.swimpay.receiver.BatteryOptimizationStatusReader
import com.swimpay.receiver.HttpUrlConnectionMerchantApiTransport
import com.swimpay.receiver.MerchantApiRequest
import com.swimpay.receiver.NotificationAccessStatusReader
import com.swimpay.receiver.PersistentDeviceStateStore
import com.swimpay.receiver.ReceiverForegroundService
import com.swimpay.receiver.ReceiverHeartbeatPayloadBuilder
import com.swimpay.receiver.ReceiverListenerLifecycleStore
import com.swimpay.receiver.ReceiverOfflineAlertNotifier
import com.swimpay.receiver.ReceiverSelfHealInput
import com.swimpay.receiver.ReceiverSelfHealPolicy
import com.swimpay.receiver.ReceiverRuntimeConfigStore
import com.swimpay.receiver.ReceiverRuntimeConfigSynchronizer
import com.swimpay.receiver.SharedPreferencesDeviceStateStorage
import com.swimpay.receiver.SharedPreferencesReceiverListenerLifecycleStorage
import com.swimpay.receiver.authHeaders
import com.swimpay.receiver.extractString
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory
import com.swimpay.receiver.ui.premium.SharedPreferencesPremiumMobileMerchantSessionStore
import java.util.concurrent.TimeUnit

data class ReceiverHeartbeatWorkPlan(
    val uniqueName: String,
    val repeatIntervalMinutes: Long,
    val requiresNetwork: Boolean
) {
    companion object {
        fun periodic(): ReceiverHeartbeatWorkPlan = ReceiverHeartbeatWorkPlan(
            uniqueName = ReceiverHeartbeatWorker.UNIQUE_WORK_NAME,
            repeatIntervalMinutes = ReceiverHeartbeatWorker.REPEAT_INTERVAL_MINUTES,
            requiresNetwork = true
        )
    }
}

class ReceiverHeartbeatWorker(
    appContext: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(appContext, workerParameters) {
    companion object {
        const val UNIQUE_WORK_NAME = "swimpay_receiver_heartbeat"
        const val REPEAT_INTERVAL_MINUTES = 15L

        fun enqueuePeriodic(workManager: WorkManager) {
            val plan = ReceiverHeartbeatWorkPlan.periodic()
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<ReceiverHeartbeatWorker>(
                plan.repeatIntervalMinutes,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .build()

            workManager.enqueueUniquePeriodicWork(
                plan.uniqueName,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }

    override suspend fun doWork(): Result {
        val session = SharedPreferencesPremiumMobileMerchantSessionStore(applicationContext).currentSession()
            ?: return Result.success()
        val deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(applicationContext))
        val deviceState = deviceStateStore.load() ?: return Result.success()
        val nowIso = java.time.Instant.now().toString()

        // Backup guardrail (the foreground service self-heal loop is the fast path):
        // if capture is down, re-arm the listener and alert the merchant locally.
        val lifecycle = ReceiverListenerLifecycleStore(
            SharedPreferencesReceiverListenerLifecycleStorage(applicationContext)
        ).load()
        val selfHeal = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = NotificationAccessStatusReader(applicationContext).isEnabled(),
                listenerConnected = lifecycle.connected,
                lastDisconnectedAtIso = lifecycle.lastDisconnectedAt,
                nowIso = nowIso
            )
        )
        if (selfHeal.shouldRequestRebind) {
            ReceiverForegroundService.requestListenerRebind(applicationContext)
        }
        val offlineNotifier = ReceiverOfflineAlertNotifier(applicationContext)
        if (selfHeal.shouldAlertMerchantOffline) {
            offlineNotifier.alert()
        } else if (selfHeal.reason == "healthy") {
            offlineNotifier.clear()
        }

        val outboxStore = AndroidEncryptedOutboxStore(AndroidOutboxStorageFactory.createMigrating(applicationContext))
        val payload = runCatching {
            ReceiverHeartbeatPayloadBuilder(
                deviceStateStore = deviceStateStore,
                runtimeConfigReader = ReceiverRuntimeConfigStore(applicationContext),
                listenerLifecycleStore = ReceiverListenerLifecycleStore(
                    SharedPreferencesReceiverListenerLifecycleStorage(applicationContext)
                ),
                notificationAccessEnabled = { NotificationAccessStatusReader(applicationContext).isEnabled() },
                batteryOptimizationIgnored = { BatteryOptimizationStatusReader(applicationContext).isIgnoringBatteryOptimizations() },
                queueDepth = { outboxStore.dueRecords(nowIso).size },
                lastSignalObservedAt = { null },
                nowIso = { nowIso }
            ).build()
        }.getOrElse {
            return Result.success()
        }
        val baseUrl = AndroidMerchantBackendConfig.normalizeBaseUrl(deviceState.backendBaseUrl)
        val response = runCatching {
            HttpUrlConnectionMerchantApiTransport(baseUrl).execute(
                MerchantApiRequest(
                    method = "POST",
                    path = "/v1/receiver-devices/heartbeat",
                    headers = authHeaders(AuthenticatedMerchantSession.mobile(session)),
                    body = payload.body
                )
            )
        }.getOrElse {
            return Result.retry()
        }

        if (response.statusCode !in 200..299) {
            return Result.retry()
        }
        ReceiverRuntimeConfigSynchronizer.syncFromResponseBody(
            body = response.body,
            writer = ReceiverRuntimeConfigStore(applicationContext)
        )
        val heartbeatAt = extractString(response.body, "server_time") ?: nowIso
        deviceStateStore.updateHeartbeat(heartbeatAt)
        return Result.success()
    }
}
