package com.swimpay.receiver

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

class DebugSyntheticNotificationSource(
    private val context: Context,
    private val debugEnabled: Boolean = BuildConfig.DEBUG
) {
    fun postIncomingTransfer(): DebugSmokeResult {
        require(debugEnabled) { "Synthetic notification source is debug-only." }
        return try {
            ensureChannel()
            val uniqueSuffix = (System.currentTimeMillis() % 100_000L).toInt()
            val notificationId = 10_000 + uniqueSuffix
            val notification = Notification.Builder(context, SyntheticNotificationConstants.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_more)
                .setContentTitle("Поступление 137 ₽")
                .setContentText("Перевод от <PERSON> <PHONE>. Коммент <REFERENCE>")
                .setStyle(
                    Notification.BigTextStyle()
                        .bigText("Перевод от <PERSON> <PHONE>. Коммент <REFERENCE>")
                )
                .setTicker("Поступление <AMOUNT> <CURRENCY>")
                .setAutoCancel(true)
                .build()
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.notify("${SyntheticNotificationConstants.TAG_PREFIX}_incoming_$uniqueSuffix", notificationId, notification)
            DebugSmokeResult(
                success = true,
                safeMessage = "synthetic debug notification posted; backend decision pending; not official bank confirmation"
            )
        } catch (error: SecurityException) {
            DebugSmokeResult(
                success = false,
                safeMessage = redactDebugMessage("synthetic notification permission missing: ${error.message.orEmpty()}")
            )
        }
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            SyntheticNotificationConstants.CHANNEL_ID,
            "SwimPay synthetic debug",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "Debug-only synthetic notification source for SwimPay receiver smoke tests."
        }
        manager.createNotificationChannel(channel)
    }
}
