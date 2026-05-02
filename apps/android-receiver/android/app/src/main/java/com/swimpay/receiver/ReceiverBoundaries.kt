package com.swimpay.receiver

object ReceiverBoundaries {
    const val androidConfirmsPayments: Boolean = false
    const val readsSms: Boolean = false
    const val scrapesBankApps: Boolean = false

    fun isRuntimeNotificationAllowed(
        packageName: String,
        appPackageName: String,
        debugEnabled: Boolean
    ): Boolean {
        if (packageName.isBlank()) {
            return false
        }

        // The current runnable app only supports the debug synthetic source. Real bank package
        // allowlisting must be wired through verified bank profiles before production capture.
        return debugEnabled && packageName == appPackageName
    }
}
