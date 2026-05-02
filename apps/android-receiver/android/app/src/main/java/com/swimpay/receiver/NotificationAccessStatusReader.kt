package com.swimpay.receiver

import android.content.ComponentName
import android.content.Context
import android.provider.Settings

class NotificationAccessStatusReader(private val context: Context) {
    fun isEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )
        val component = ComponentName(context, SwimPayNotificationListenerService::class.java).flattenToString()
        val shortComponent = ComponentName(context, SwimPayNotificationListenerService::class.java).flattenToShortString()
        return isListenerEnabled(enabledListeners, component) || isListenerEnabled(enabledListeners, shortComponent)
    }

    companion object {
        fun isListenerEnabled(enabledListeners: String?, componentName: String): Boolean {
            if (enabledListeners.isNullOrBlank() || componentName.isBlank()) {
                return false
            }

            return enabledListeners
                .split(':')
                .map { it.trim() }
                .any { it.equals(componentName, ignoreCase = true) }
        }
    }
}

