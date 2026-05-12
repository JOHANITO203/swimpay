package com.swimpay.receiver

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.swimpay.receiver.ui.premium.PremiumMerchantReviewNotifier
import com.swimpay.receiver.ui.premium.PremiumReviewUiItem

class AndroidMerchantReviewNotifier(
    private val context: Context
) : PremiumMerchantReviewNotifier {
    override fun notifyActionRequired(review: PremiumReviewUiItem) {
        if (!canPostNotifications()) {
            return
        }

        ensureChannel()
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_small)
            .setContentTitle("Commande à vérifier")
            .setContentText("${review.amount} · commande à vérifier")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Aucun signal bancaire détecté. Vérifiez votre banque puis confirmez ou rejetez dans SwimPay.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(review.reviewId.hashCode(), notification)
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
            "Commandes à vérifier",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alertes marchand pour les commandes nécessitant une validation manuelle."
            enableVibration(true)
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "swimpay_merchant_reviews"
    }
}
