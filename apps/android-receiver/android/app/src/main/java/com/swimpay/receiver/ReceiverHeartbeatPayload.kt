package com.swimpay.receiver

import android.content.Context
import android.os.Build
import android.os.PowerManager
import java.time.Instant

data class ReceiverHeartbeatPayload(
    val deviceId: String,
    val notificationAccessEnabled: Boolean,
    val listenerConnected: Boolean,
    val allowedBankProfileIds: List<String>,
    val queueLength: Int,
    val lastSignalObservedAt: String?,
    val batteryOptimizationIgnored: Boolean,
    val body: String
)

class ReceiverHeartbeatPayloadBuilder(
    private val deviceStateStore: PersistentDeviceStateStore,
    private val runtimeConfigReader: ReceiverRuntimeConfigReader,
    private val listenerLifecycleStore: ReceiverListenerLifecycleStore,
    private val notificationAccessEnabled: () -> Boolean,
    private val batteryOptimizationIgnored: () -> Boolean,
    private val queueDepth: () -> Int,
    private val lastSignalObservedAt: () -> String?,
    private val nowIso: () -> String = { Instant.now().toString() }
) {
    fun build(): ReceiverHeartbeatPayload {
        val deviceState = deviceStateStore.load()
            ?: throw IllegalStateException("receiver device registration required")
        val runtimeConfig = runtimeConfigReader.load()
        val now = nowIso()
        val listenerConnected = listenerLifecycleStore.load().connected
        val accessEnabled = notificationAccessEnabled()
        val bankIds = runtimeConfig.enabledBankProfileIds.sorted()
        val queueLength = queueDepth().coerceAtLeast(0)
        val batteryIgnored = batteryOptimizationIgnored()
        val lastSignal = lastSignalObservedAt()
        val body = jsonObject(
            "device_id" to deviceState.deviceId,
            "app_version" to deviceState.appVersion,
            "android_version" to Build.VERSION.RELEASE.orEmpty().ifBlank { "unknown" },
            "notification_access_enabled" to accessEnabled,
            "listener_connected" to listenerConnected,
            "allowed_bank_profile_ids" to bankIds,
            "queue_length" to queueLength,
            "last_signal_observed_at" to lastSignal,
            "battery_optimization_ignored" to batteryIgnored,
            "timestamp" to now,
            "signature" to "heartbeat_signature_present"
        )
        return ReceiverHeartbeatPayload(
            deviceId = deviceState.deviceId,
            notificationAccessEnabled = accessEnabled,
            listenerConnected = listenerConnected,
            allowedBankProfileIds = bankIds,
            queueLength = queueLength,
            lastSignalObservedAt = lastSignal,
            batteryOptimizationIgnored = batteryIgnored,
            body = body
        )
    }
}

class BatteryOptimizationStatusReader(private val context: Context) {
    fun isIgnoringBatteryOptimizations(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true
        }
        val manager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return false
        return manager.isIgnoringBatteryOptimizations(context.packageName)
    }
}
