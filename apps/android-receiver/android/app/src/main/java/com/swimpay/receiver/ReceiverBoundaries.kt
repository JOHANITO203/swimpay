package com.swimpay.receiver

object ReceiverBoundaries {
    const val androidConfirmsPayments: Boolean = false
    const val readsSms: Boolean = false
    const val scrapesBankApps: Boolean = false

    fun isRuntimeNotificationAllowed(packageName: String): Boolean {
        return packageName.isNotBlank()
    }
}
