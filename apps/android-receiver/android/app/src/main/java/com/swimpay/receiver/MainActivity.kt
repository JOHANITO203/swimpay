package com.swimpay.receiver

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {
    private val statusViewModel = ReceiverStatusViewModel()
    private val debugController by lazy {
        DebugReceiverSmokeController(BuildConfig.DEBUG)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        renderStatus()
    }

    override fun onResume() {
        super.onResume()
        renderStatus()
    }

    private fun renderStatus() {
        val notificationAccessEnabled = NotificationAccessStatusReader(this).isEnabled()
        val state = statusViewModel.buildState(
            notificationAccessEnabled = notificationAccessEnabled,
            listenerConnected = notificationAccessEnabled,
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

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
        }
        val result = TextView(this).apply {
            this.text = "Debug smoke actions use synthetic redacted data only. Backend decision pending. Not official bank confirmation."
        }
        container.addView(TextView(this).apply { this.text = text })
        container.addView(result)

        for (action in debugController.availableActions()) {
            container.addView(Button(this).apply {
                this.text = action.label
                setOnClickListener {
                    result.text = "Running ${action.id}..."
                    Thread {
                        val actionResult = debugController.performAction(action.id)
                        runOnUiThread {
                            result.text = "${if (actionResult.success) "Success" else "Error"}: ${actionResult.safeMessage}"
                        }
                    }.start()
                }
            })
        }

        setContentView(ScrollView(this).apply { addView(container) })
    }
}
