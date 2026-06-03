package com.swimpay.receiver

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * Local, on-device alert shown to the merchant when the receiver can no longer
 * capture bank notifications (listener unbound past threshold, or access revoked).
 * This is the fast (< heartbeat-interval) guardrail; the backend dashboard
 * reflects the same condition on the next heartbeat.
 *
 * It is action-only and never implies a payment was confirmed.
 *
 * A stable notification id + setOnlyAlertOnce keeps repeated checks from buzzing
 * the merchant every cycle; [clear] cancels it once capture is healthy again.
 */
class ReceiverOfflineAlertNotifier(private val context: Context) {
    fun alert() {
        if (!canPostNotifications()) {
            return
        }
        ensureChannel()
        val text = context.getString(R.string.receiver_offline_alert_text)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_small)
            .setContentTitle(context.getString(R.string.receiver_offline_alert_title))
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ERROR)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .build()
        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    fun clear() {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    private fun canPostNotifications(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.receiver_offline_alert_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = context.getString(R.string.receiver_offline_alert_channel_name)
            enableVibration(true)
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "swimpay_receiver_offline"
        const val NOTIFICATION_ID = 7302
    }
}
