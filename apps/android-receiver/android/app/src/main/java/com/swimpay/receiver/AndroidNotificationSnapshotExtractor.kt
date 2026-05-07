package com.swimpay.receiver

import android.app.Notification
import android.service.notification.StatusBarNotification

object AndroidNotificationSnapshotExtractor {
    fun fromStatusBarNotification(
        sbn: StatusBarNotification,
        appPackageName: String,
        debugEnabled: Boolean
    ): NotificationSnapshot {
        val notification = sbn.notification
        val extras = notification.extras
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            ?.map { it.toString() }
            .orEmpty()
        val syntheticDebug = debugEnabled &&
            sbn.packageName == appPackageName &&
            (notification.channelId == SyntheticNotificationConstants.CHANNEL_ID ||
                sbn.tag.orEmpty().startsWith(SyntheticNotificationConstants.TAG_PREFIX))

        return NotificationSnapshot(
            packageName = if (syntheticDebug) SyntheticNotificationConstants.PACKAGE_NAME else sbn.packageName,
            notificationId = sbn.id,
            tag = sbn.tag,
            postTime = sbn.postTime,
            channelId = notification.channelId,
            groupKey = sbn.groupKey,
            sortKey = notification.sortKey,
            title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString(),
            text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString(),
            bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString(),
            subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString(),
            summaryText = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString(),
            textLines = textLines,
            tickerText = notification.tickerText?.toString(),
            syntheticDebugOnly = syntheticDebug,
            bankProfileId = if (syntheticDebug) {
                SyntheticNotificationConstants.BANK_PROFILE_ID
            } else {
                BankTargetLock.bankProfileIdForPackage(sbn.packageName) ?: "unknown"
            },
            packageCertSha256 = if (syntheticDebug) SyntheticNotificationConstants.CERT_SHA256 else "TO_VERIFY",
            verificationStatus = if (syntheticDebug) {
                BankPackageVerificationStatus.VERIFIED
            } else {
                BankPackageVerificationStatus.TO_VERIFY
            }
        )
    }

    fun detectedFieldCount(snapshot: NotificationSnapshot): Int {
        return listOf(
            snapshot.title,
            snapshot.text,
            snapshot.bigText,
            snapshot.subText,
            snapshot.summaryText,
            snapshot.tickerText
        ).count { !it.isNullOrBlank() } + snapshot.textLines.size
    }
}
