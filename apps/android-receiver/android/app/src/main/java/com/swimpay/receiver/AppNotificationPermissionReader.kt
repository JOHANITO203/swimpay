package com.swimpay.receiver

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

class AppNotificationPermissionReader(private val context: Context) {
    fun isEnabled(): Boolean {
        if (Build.VERSION.SDK_INT < 33) {
            return true
        }
        return context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
    }
}
