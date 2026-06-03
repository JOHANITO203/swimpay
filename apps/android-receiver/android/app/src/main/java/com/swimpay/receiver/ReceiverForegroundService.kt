package com.swimpay.receiver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.service.notification.NotificationListenerService
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import androidx.work.WorkManager
import com.swimpay.receiver.work.SignalUploadWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant

/**
 * Persistent foreground service that keeps the receiver process alive so the
 * bound [SwimPayNotificationListenerService] is not killed in the background by
 * OEM "killers" (MIUI/ColorOS/OneUI) or Doze. It also runs a light self-heal
 * loop that re-arms the listener (requestRebind) and flushes the outbox when the
 * OEM silently unbinds the listener while access is still granted.
 *
 * It performs NO payment logic: capture/upload stays in the listener + workers.
 */
class ReceiverForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @Volatile
    private var selfHealStarted = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        promoteToForeground()
        startSelfHealLoop()
        return START_STICKY
    }

    private fun promoteToForeground() {
        ensureChannel(this)
        val notification = buildNotification(this)
        try {
            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            } else {
                0
            }
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type)
        } catch (t: Throwable) {
            // e.g. ForegroundServiceStartNotAllowedException when the system
            // refuses a background-initiated foreground start on Android 12+.
            Log.w(TAG, "startForeground refused: ${t.javaClass.simpleName}")
        }
    }

    private fun startSelfHealLoop() {
        if (selfHealStarted) {
            return
        }
        selfHealStarted = true
        scope.launch {
            while (isActive) {
                runCatching { selfHealOnce() }
                    .onFailure { Log.w(TAG, "self_heal_iteration_failed: ${it.javaClass.simpleName}") }
                delay(SELF_HEAL_INTERVAL_MS)
            }
        }
    }

    private fun selfHealOnce() {
        val accessEnabled = NotificationAccessStatusReader(this).isEnabled()
        val lifecycle = ReceiverListenerLifecycleStore(
            SharedPreferencesReceiverListenerLifecycleStorage(this)
        ).load()
        val decision = ReceiverSelfHealPolicy.decide(
            ReceiverSelfHealInput(
                notificationAccessEnabled = accessEnabled,
                listenerConnected = lifecycle.connected,
                lastDisconnectedAtIso = lifecycle.lastDisconnectedAt,
                nowIso = Instant.now().toString()
            )
        )
        if (decision.shouldRequestRebind) {
            requestListenerRebind(this)
            // The listener is being re-armed; opportunistically drain anything
            // that was captured before it went down.
            runCatching { SignalUploadWorker.enqueueExpedited(WorkManager.getInstance(this)) }
        }
        val offlineNotifier = ReceiverOfflineAlertNotifier(this)
        if (decision.shouldAlertMerchantOffline) {
            offlineNotifier.alert()
        } else if (decision.reason == "healthy") {
            offlineNotifier.clear()
        }
        Log.i(
            TAG,
            "self_heal reason=${decision.reason} rebind=${decision.shouldRequestRebind} " +
                "alert=${decision.shouldAlertMerchantOffline} offline_ms=${decision.offlineDurationMs ?: -1}"
        )
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val TAG = "SwimPayReceiverFgs"
        const val CHANNEL_ID = "swimpay_receiver_active"
        const val NOTIFICATION_ID = 7301
        const val SELF_HEAL_INTERVAL_MS = 60_000L

        /** Best-effort start of the persistent capture service. Safe to call repeatedly. */
        fun start(context: Context) {
            val intent = Intent(context, ReceiverForegroundService::class.java)
            try {
                ContextCompat.startForegroundService(context, intent)
            } catch (t: Throwable) {
                // Android 12+ blocks background-initiated foreground starts for
                // specialUse services; callers (e.g. boot) fall back to rebind + WorkManager.
                Log.w(TAG, "startForegroundService refused: ${t.javaClass.simpleName}")
            }
        }

        /** Re-arm the notification listener. Allowed from any context, including background/boot. */
        fun requestListenerRebind(context: Context) {
            val component = ComponentName(context, SwimPayNotificationListenerService::class.java)
            runCatching { NotificationListenerService.requestRebind(component) }
                .onFailure { Log.w(TAG, "requestRebind failed: ${it.javaClass.simpleName}") }
        }

        /** Idempotent; also reused by the expedited upload worker's foreground info. */
        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                return
            }
            val channel = NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.receiver_fgs_channel_name),
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = context.getString(R.string.receiver_fgs_channel_description)
                setShowBadge(false)
            }
            context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        fun buildNotification(context: Context): Notification {
            return NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_small)
                .setContentTitle(context.getString(R.string.receiver_fgs_title))
                .setContentText(context.getString(R.string.receiver_fgs_text))
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setShowWhen(false)
                .build()
        }
    }
}
