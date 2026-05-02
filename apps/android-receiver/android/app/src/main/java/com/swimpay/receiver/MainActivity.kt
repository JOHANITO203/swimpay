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
    private val outboxStore by lazy {
        AndroidEncryptedOutboxStore(AndroidOutboxStorageFactory.createMigrating(this))
    }
    private val deviceStateStore by lazy {
        PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(this))
    }
    private val debugController by lazy {
        DebugReceiverSmokeController(
            debugEnabled = BuildConfig.DEBUG,
            deviceStateStore = deviceStateStore,
            outboxStore = outboxStore
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
        val appNotificationsEnabled = AppNotificationPermissionReader(this).isEnabled()
        val previousAccess = deviceStateStore.load()?.lastNotificationListenerAccessEnabled == true
        deviceStateStore.load()?.let {
            if (it.lastNotificationListenerAccessEnabled != notificationAccessEnabled) {
                deviceStateStore.save(it.copy(lastNotificationListenerAccessEnabled = notificationAccessEnabled))
            }
        }
        val onboarding = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = appNotificationsEnabled,
                notificationListenerAccessEnabled = notificationAccessEnabled,
                listenerConnected = notificationAccessEnabled,
                selectedBankProfiles = emptyList(),
                backendConfigured = backendStatus.reachable,
                deviceRegistrationStatus = if (deviceStateStore.load() == null) {
                    DeviceRegistrationReadinessStatus.NONE
                } else {
                    DeviceRegistrationReadinessStatus.PENDING
                },
                previouslyHadNotificationListenerAccess = previousAccess,
                appInstalled = true
            )
        )
        val state = statusViewModel.buildState(
            notificationAccessEnabled = notificationAccessEnabled,
            listenerConnected = notificationAccessEnabled,
            allowedBanksCount = 0,
            trustedBanksCount = 0,
            queueLength = 0,
            backendReachable = backendStatus.reachable
        )
        val diagnostics = ReceiverDiagnosticsBuilder().build(
            notificationAccessEnabled = notificationAccessEnabled,
            appNotificationsPermissionEnabled = appNotificationsEnabled,
            listenerConnected = notificationAccessEnabled,
            allowedBanksCount = 0,
            syntheticDebugSourceEnabled = BuildConfig.DEBUG,
            backendReachable = backendStatus.reachable,
            lastSignalObservedAt = null,
            lastUploadStatus = backendStatus.safeMessage,
            lastSafeErrorSummary = null,
            outboxStore = outboxStore
        )

        val text = """
            SwimPay Receiver
            App notifications: ${if (onboarding.appNotificationsPermissionEnabled) "enabled" else "disabled"}
            Notification Listener Access: ${if (onboarding.notificationListenerAccessEnabled) "enabled" else "disabled"}
            Listener: ${if (state.listenerConnected) "connected" else "disconnected"}
            Receiver ready state: ${onboarding.state.wireValue}
            Capture enabled: ${onboarding.captureEnabled}
            Upload enabled: ${onboarding.uploadEnabled}
            Allowed banks: ${state.allowedBanksCount}
            Queue length: ${state.queueLength}
            Outbox pending: ${diagnostics.outboxPendingCount}
            Outbox retrying: ${diagnostics.outboxFailedRetryingCount}
            Synthetic debug source: ${if (diagnostics.syntheticDebugSourceEnabled) "enabled" else "disabled"}
            Backend: ${if (state.backendReachable) "reachable" else "unreachable"}
            Last backend check: ${backendStatus.checkedAt}
            Backend status: ${backendStatus.safeMessage}
            Last upload: ${diagnostics.lastUploadStatus}
            Warnings: ${(state.warnings + onboarding.diagnostics).distinct().joinToString(", ")}

            Android donne une permission large d'accès aux notifications. SwimPay applique ensuite une allowlist locale : seules les notifications des banques que vous choisissez sont analysées. Les autres notifications sont ignorées localement.
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

        container.addView(Button(this).apply {
            this.text = "Ouvrir les paramètres d'accès aux notifications"
            setOnClickListener {
                startActivity(NotificationListenerSettingsAction.createIntent())
            }
        })

        if (BuildConfig.DEBUG) {
            container.addView(Button(this).apply {
                this.text = "Post synthetic notification"
                setOnClickListener {
                    result.text = "Posting synthetic notification..."
                    Thread {
                        val actionResult = DebugSyntheticNotificationSource(this@MainActivity).postIncomingTransfer()
                        runOnUiThread {
                            result.text = "${if (actionResult.success) "Success" else "Error"}: ${actionResult.safeMessage}"
                        }
                    }.start()
                }
            })
        }

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
