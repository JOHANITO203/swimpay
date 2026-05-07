package com.swimpay.receiver

object ReceiverBoundaries {
    const val androidConfirmsPayments: Boolean = false
    const val readsSms: Boolean = false
    const val scrapesBankApps: Boolean = false

    fun isRuntimeNotificationAllowed(
        packageName: String,
        appPackageName: String,
        debugEnabled: Boolean,
        enabledBankPackages: Set<String> = emptySet()
    ): Boolean {
        if (packageName.isBlank()) {
            return false
        }

        if (debugEnabled && packageName == appPackageName) {
            return true
        }

        return BankTargetLock.isNotificationAllowed(packageName, enabledBankPackages)
    }
}
