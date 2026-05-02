package com.swimpay.receiver

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory

class MainActivity : Activity() {
    private val statusViewModel = ReceiverStatusViewModel()
    private var backendStatus = BackendStatusSnapshot(
        reachable = false,
        checkedAt = "not checked",
        safeMessage = "backend not checked"
    )
    private val debugController by lazy {
        DebugReceiverSmokeController(
            debugEnabled = BuildConfig.DEBUG,
            deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(this)),
            outboxStore = AndroidEncryptedOutboxStore(AndroidOutboxStorageFactory.createMigrating(this))
        )
    }
    private val backendStatusRefresher by lazy {
        BackendStatusRefresher(DebugReceiverHttpClient(DebugBackendConfig()))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        renderStatus()
    }

    override fun onResume() {
        super.onResume()
        refreshBackendStatus()
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
            backendReachable = backendStatus.reachable
        )

        val text = """
            SwimPay Receiver
            Notification access: ${if (state.notificationAccessEnabled) "enabled" else "disabled"}
            Listener: ${if (state.listenerConnected) "connected" else "disconnected"}
            Allowed banks: ${state.allowedBanksCount}
            Queue length: ${state.queueLength}
            Backend: ${if (state.backendReachable) "reachable" else "unreachable"}
            Last backend check: ${backendStatus.checkedAt}
            Backend status: ${backendStatus.safeMessage}
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

    private fun refreshBackendStatus() {
        if (!BuildConfig.DEBUG) {
            return
        }
        Thread {
            val refreshed = backendStatusRefresher.refresh()
            runOnUiThread {
                backendStatus = refreshed
                renderStatus()
            }
        }.start()
    }
}
