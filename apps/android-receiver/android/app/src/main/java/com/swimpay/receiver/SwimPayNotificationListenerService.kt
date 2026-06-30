package com.swimpay.receiver

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.os.Build
import android.util.Log
import androidx.work.WorkManager
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory
import com.swimpay.receiver.security.AndroidKeystorePayloadSigner
import com.swimpay.receiver.work.SignalUploadWorker

class SwimPayNotificationListenerService : NotificationListenerService() {
    // Reads the real signing cert of an enabled bank app once per package so the uploaded
    // signal carries it (not the "TO_VERIFY" placeholder), letting the backend reach
    // 'trusted_cert'. Lazy: the service Context is valid by the first notification.
    private val certResolver by lazy { PackageSigningCertResolver.forContext(this) }

    override fun onListenerConnected() {
        ReceiverListenerLifecycleStore(SharedPreferencesReceiverListenerLifecycleStorage(this)).markConnected()
        val active = try {
            getActiveNotifications()?.toList().orEmpty()
        } catch (_: RuntimeException) {
            emptyList()
        }
        runNotificationSweep(ActiveNotificationSweepSource.ACTIVE_NOTIFICATIONS, active)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val snoozed = try {
                getSnoozedNotifications()?.toList().orEmpty()
            } catch (_: RuntimeException) {
                emptyList()
            }
            runNotificationSweep(ActiveNotificationSweepSource.SNOOZED_NOTIFICATIONS, snoozed)
        }

        // Flush whatever was captured while the listener was unbound, not only on
        // the next posted notification.
        runCatching { SignalUploadWorker.enqueueExpedited(WorkManager.getInstance(this)) }
    }

    override fun onListenerDisconnected() {
        ReceiverListenerLifecycleStore(SharedPreferencesReceiverListenerLifecycleStorage(this)).markDisconnected()
        // The OEM unbound us in the background: ask the platform to re-bind so the
        // next bank notification is not lost.
        ReceiverForegroundService.requestListenerRebind(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val runtimeConfig = ReceiverRuntimeConfigStore(this).load()
        if (!runtimeConfig.activeIntentWindow.canSweep()) {
            return
        }
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
            debugEnabled = BuildConfig.DEBUG,
            certSha256Resolver = certResolver::resolve
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

        val enqueue = enqueuePipelineResult(runtimeConfig, result)
        Log.i(TAG, "outbox_enqueue_success=${enqueue.success} message=${enqueue.safeMessage}")
        if (enqueue.success) {
            SignalUploadWorker.enqueueExpedited(WorkManager.getInstance(this))
        }

        val recalled = try {
            getActiveNotifications(arrayOf(sbn.key))?.toList().orEmpty()
        } catch (_: RuntimeException) {
            emptyList()
        }
        runNotificationSweep(ActiveNotificationSweepSource.KEYED_RECALL, recalled)
    }

    private fun runNotificationSweep(source: ActiveNotificationSweepSource, notifications: List<StatusBarNotification>) {
        if (notifications.isEmpty()) {
            return
        }
        val runtimeConfig = ReceiverRuntimeConfigStore(this).load()
        if (!runtimeConfig.activeIntentWindow.canSweep()) {
            return
        }
        val allowedBeforeExtraction = notifications.filter { sbn ->
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = sbn.packageName,
                appPackageName = packageName,
                debugEnabled = BuildConfig.DEBUG,
                enabledBankPackages = runtimeConfig.enabledBankPackages
            )
        }
        if (allowedBeforeExtraction.isEmpty()) {
            return
        }
        val snapshots = allowedBeforeExtraction.map { sbn ->
            AndroidNotificationSnapshotExtractor.fromStatusBarNotification(
                sbn = sbn,
                appPackageName = packageName,
                debugEnabled = BuildConfig.DEBUG,
                certSha256Resolver = certResolver::resolve
            )
        }
        val result = ActiveIntentNotificationSweep(
            debugEnabled = BuildConfig.DEBUG,
            enabledBankPackages = runtimeConfig.enabledBankPackages
        ).processSnapshots(runtimeConfig.activeIntentWindow, source, snapshots)
        Log.i(
            TAG,
            "active_notification_sweep source=$source accepted=${result.acceptedCount} ignored=${result.ignoredCount} reason=${result.reason}"
        )
        var queued = 0
        for (uploadable in result.uploadableResults) {
            val enqueue = enqueuePipelineResult(runtimeConfig, uploadable)
            if (enqueue.success) {
                queued += 1
            }
        }
        if (queued > 0) {
            SignalUploadWorker.enqueueExpedited(WorkManager.getInstance(this))
        }
    }

    private fun enqueuePipelineResult(
        runtimeConfig: ReceiverRuntimeConfig,
        result: ReceiverNotificationPipelineResult
    ): DebugSmokeResult {
        val outboxStore = AndroidEncryptedOutboxStore(AndroidOutboxStorageFactory.createMigrating(this))
        val deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(this))
        return if (BuildConfig.DEBUG) {
            DebugReceiverSmokeController(
                debugEnabled = true,
                deviceStateStore = deviceStateStore,
                outboxStore = outboxStore
            ).enqueueProcessedNotificationSignal(result)
        } else {
            ReceiverRuntimeOutboxController(
                merchantId = runtimeConfig.merchantId,
                payloadSigner = AndroidKeystorePayloadSigner(),
                deviceStateStore = deviceStateStore,
                outboxStore = outboxStore
            ).enqueueProcessedNotificationSignal(result).let {
                DebugSmokeResult(success = it.success, safeMessage = it.safeMessage)
            }
        }
    }

    companion object {
        const val TAG = "SwimPayReceiverListener"
    }
}
