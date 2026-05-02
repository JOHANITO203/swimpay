package com.swimpay.receiver

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class SwimPayNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Boundary only. The TypeScript MVP core documents the current pipeline:
        // allowlist -> snapshot -> coalesce -> privacy firewall -> signed upload.
        // Android must not confirm orders or make payment decisions.
        if (!ReceiverBoundaries.isRuntimeNotificationAllowed(sbn.packageName)) {
            return
        }
    }
}
