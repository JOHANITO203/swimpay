package com.swimpay.receiver

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class MainActivity : Activity() {
    private val statusViewModel = ReceiverStatusViewModel()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val state = statusViewModel.buildState(
            notificationAccessEnabled = false,
            listenerConnected = false,
            allowedBanksCount = 0,
            trustedBanksCount = 0,
            queueLength = 0,
            backendReachable = false
        )

        val text = """
            SwimPay Receiver
            Notification access: ${if (state.notificationAccessEnabled) "enabled" else "disabled"}
            Listener: ${if (state.listenerConnected) "connected" else "disconnected"}
            Allowed banks: ${state.allowedBanksCount}
            Queue length: ${state.queueLength}
            Backend: ${if (state.backendReachable) "reachable" else "unreachable"}
            Warnings: ${state.warnings.joinToString(", ")}
        """.trimIndent()

        setContentView(TextView(this).apply { this.text = text })
    }
}
