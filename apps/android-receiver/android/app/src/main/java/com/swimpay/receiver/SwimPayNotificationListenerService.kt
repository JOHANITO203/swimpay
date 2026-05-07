package com.swimpay.receiver

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.work.WorkManager
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory
import com.swimpay.receiver.work.SignalUploadWorker

class SwimPayNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val runtimeConfig = ReceiverRuntimeConfigStore(this).load()
        if (!ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = sbn.packageName,
                appPackageName = packageName,
                debugEnabled = BuildConfig.DEBUG,
                enabledBankPackages = runtimeConfig.enabledBankPackages
            )
        ) {
            return
        }

        val snapshot = AndroidNotificationSnapshotExtractor.fromStatusBarNotification(
            sbn = sbn,
            appPackageName = packageName,
            debugEnabled = BuildConfig.DEBUG
        )
        val fieldsDetected = AndroidNotificationSnapshotExtractor.detectedFieldCount(snapshot)
        val result = ReceiverNotificationPipeline(
            debugEnabled = BuildConfig.DEBUG,
            enabledBankPackages = runtimeConfig.enabledBankPackages
        ).process(listOf(snapshot))

        Log.i(
            TAG,
            "package=${snapshot.packageName} notification_id=${snapshot.notificationId} tag=${snapshot.tag.orEmpty()} " +
                "post_time=${snapshot.postTime} fields_detected=$fieldsDetected result=${result.nextAction} reason=${result.reason}"
        )

        if (!result.accepted) {
            return
        }

        val outboxStore = AndroidEncryptedOutboxStore(AndroidOutboxStorageFactory.createMigrating(this))
        val deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(this))
        val enqueue = if (BuildConfig.DEBUG) {
            DebugReceiverSmokeController(
                debugEnabled = true,
                deviceStateStore = deviceStateStore,
                outboxStore = outboxStore
            ).enqueueProcessedNotificationSignal(result)
        } else {
            ReceiverRuntimeOutboxController(
                merchantId = runtimeConfig.merchantId,
                signingKey = runtimeConfig.signingKey,
                deviceStateStore = deviceStateStore,
                outboxStore = outboxStore
            ).enqueueProcessedNotificationSignal(result).let {
                DebugSmokeResult(success = it.success, safeMessage = it.safeMessage)
            }
        }
        Log.i(TAG, "outbox_enqueue_success=${enqueue.success} message=${enqueue.safeMessage}")
        SignalUploadWorker.enqueue(WorkManager.getInstance(this), 0)
    }

    companion object {
        const val TAG = "SwimPayReceiverListener"
    }
}
