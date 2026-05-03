package com.swimpay.receiver

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory

class MainActivity : Activity() {
    private val statusViewModel = ReceiverStatusViewModel()
    private val merchantCatalog = AndroidMerchantUiCatalog()
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
        val selectedBankProfiles = ReceiverBankProfileSelectionDefaults.debugSelectedProfiles(BuildConfig.DEBUG)

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
                selectedBankProfiles = selectedBankProfiles.map { it.toOnboardingProfile() },
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
            allowedBanksCount = selectedBankProfiles.count { it.selected },
            trustedBanksCount = selectedBankProfiles.count { it.isTrustedForProductionReady() },
            queueLength = 0,
            backendReachable = backendStatus.reachable
        )

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(32, 40, 32, 40)
            setBackgroundColor(Color.rgb(246, 252, 253))
        }
        val result = TextView(this).apply { text = "" }

        addBrandHeader(container)
        addScreenCard(
            container,
            merchantCatalog.connectPhoneScreen(
                if (notificationAccessEnabled) {
                    NotificationAccessMerchantState.ACTIVE
                } else {
                    NotificationAccessMerchantState.ACTION_REQUIRED
                }
            )
        )
        if (!notificationAccessEnabled) {
            addPrimaryButton(container, "Activer l’accès") {
                startActivity(NotificationListenerSettingsAction.createIntent())
            }
        }

        addScreenCard(container, merchantCatalog.chooseBanksScreen(setOf("sber_ru", "tbank_ru")))
        addScreenCard(
            container,
            merchantCatalog.receivingMethodSetupScreen(ReceivingMethodType.CARD_TRANSFER)
        )
        addScreenCard(
            container,
            merchantCatalog.configurationTestScreen(
                MerchantConfigurationChecklist(
                    phoneConnected = notificationAccessEnabled,
                    bankChosen = state.allowedBanksCount > 0,
                    receivingMethodAdded = true,
                    connectedSiteReady = backendStatus.reachable
                )
            )
        )
        addScreenCard(container, merchantCatalog.dashboardScreen(receiverReady = onboarding.receiverReady))
        addScreenCard(
            container,
            merchantCatalog.receivingMethodsScreen(
                listOf(
                    MerchantReceivingMethodDisplay.masked("Carte bancaire", "Sberbank · •••• 4821"),
                    MerchantReceivingMethodDisplay.masked("Numéro de téléphone", "T-Bank · +7 *** *** 45-67")
                )
            )
        )
        addScreenCard(container, merchantCatalog.reviewQueueScreen())
        addScreenCard(
            container,
            merchantCatalog.paymentReviewDetailScreen(
                listOf(
                    MerchantReviewReasonCode.MANUAL_VALIDATION_BETA,
                    MerchantReviewReasonCode.REFERENCE_NOT_VISIBLE
                )
            )
        )
        addScreenCard(container, merchantCatalog.connectedSiteScreen(developerDetailsEnabled = false))
        addScreenCard(container, merchantCatalog.receiverHealthScreen(notificationAccessEnabled))

        if (BuildConfig.DEBUG) {
            addDebugPanel(container, result)
            container.addView(result)
        }

        setContentView(ScrollView(this).apply { addView(container) })
    }

    private fun addBrandHeader(container: LinearLayout) {
        container.addView(TextView(this).apply {
            text = "SwimPay"
            textSize = 34f
            setTypeface(Typeface.DEFAULT, Typeface.BOLD)
            setTextColor(Color.rgb(3, 27, 67))
            textAlignment = TextView.TEXT_ALIGNMENT_CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).withMargins(bottom = 24)
        })
    }

    private fun addScreenCard(container: LinearLayout, screen: MerchantUiScreen) {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 28, 28, 28)
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                cornerRadius = 28f
                setStroke(1, Color.rgb(213, 235, 240))
            }
            elevation = 4f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).withMargins(bottom = 20)
        }

        card.addView(TextView(this).apply {
            text = screen.title
            textSize = 26f
            setTypeface(Typeface.DEFAULT, Typeface.BOLD)
            setTextColor(Color.rgb(3, 27, 67))
        })
        screen.subtitle?.let { subtitle ->
            card.addView(TextView(this).apply {
                text = subtitle
                textSize = 16f
                setTextColor(Color.rgb(91, 101, 122))
                setPadding(0, 10, 0, 12)
            })
        }
        screen.texts.distinct().forEach { label ->
            card.addView(TextView(this).apply {
                text = label
                textSize = 15f
                setTextColor(colorForLabel(label))
                setPadding(0, 6, 0, 6)
            })
        }
        screen.bankRows.forEach { row ->
            card.addView(TextView(this).apply {
                text = "${row.displayName} · ${if (row.selected) "choisie" else "à choisir"}"
                textSize = 17f
                setTypeface(Typeface.DEFAULT, Typeface.BOLD)
                setTextColor(Color.rgb(3, 27, 67))
                setPadding(0, 10, 0, 4)
            })
        }
        screen.methodRows.forEach { method ->
            card.addView(TextView(this).apply {
                text = method.visibleTexts().joinToString("\n")
                textSize = 16f
                setTextColor(Color.rgb(3, 27, 67))
                setPadding(0, 10, 0, 6)
            })
        }
        screen.primaryAction?.let { action ->
            addPrimaryButton(card, action) {}
        }
        container.addView(card)
    }

    private fun addDebugPanel(container: LinearLayout, result: TextView) {
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
            background = GradientDrawable().apply {
                setColor(Color.rgb(239, 248, 251))
                cornerRadius = 20f
                setStroke(1, Color.rgb(174, 220, 230))
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).withMargins(top = 8, bottom = 16)
        }
        panel.addView(TextView(this).apply {
            text = "Debug local"
            textSize = 18f
            setTypeface(Typeface.DEFAULT, Typeface.BOLD)
            setTextColor(Color.rgb(0, 115, 140))
        })
        panel.addView(Button(this).apply {
            text = "Post synthetic notification"
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
        for (action in debugController.availableActions()) {
            panel.addView(Button(this).apply {
                text = action.label
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
        container.addView(panel)
    }

    private fun addPrimaryButton(container: LinearLayout, label: String, onClick: () -> Unit) {
        container.addView(Button(this).apply {
            text = label
            textSize = 16f
            setTextColor(Color.WHITE)
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.rgb(0, 156, 178), Color.rgb(0, 103, 142))
            ).apply {
                cornerRadius = 18f
            }
            setOnClickListener { onClick() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).withMargins(top = 14)
        })
    }

    private fun colorForLabel(label: String): Int {
        return when (label) {
            "À vérifier", "Action nécessaire", "Action requise", "Accès nécessaire" -> Color.rgb(191, 122, 0)
            "Validé", "Connexion active", "SwimPay est prêt", "Téléphone connecté", "Activé", "Active" ->
                Color.rgb(0, 142, 116)
            "Rejeté", "Échec" -> Color.rgb(215, 49, 49)
            else -> Color.rgb(91, 101, 122)
        }
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

    private fun LinearLayout.LayoutParams.withMargins(
        left: Int = 0,
        top: Int = 0,
        right: Int = 0,
        bottom: Int = 0
    ): LinearLayout.LayoutParams {
        setMargins(left, top, right, bottom)
        return this
    }
}
