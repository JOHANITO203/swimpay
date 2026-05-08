package com.swimpay.receiver

import android.content.Context

data class ReceiverDeviceState(
    val deviceId: String,
    val deviceStatus: String,
    val serverTime: String?,
    val appVersion: String,
    val lastRegistrationAt: String?,
    val lastHeartbeatAt: String?,
    val backendBaseUrl: String,
    val receiverKeyId: String? = null,
    val lastLocalCounter: Long = 0,
    val lastNotificationListenerAccessEnabled: Boolean = false
)

interface DeviceStateStorage {
    fun read(): ReceiverDeviceState?
    fun write(state: ReceiverDeviceState)
    fun clear()
}

class PersistentDeviceStateStore(
    private val storage: DeviceStateStorage
) {
    fun load(): ReceiverDeviceState? = storage.read()

    fun save(state: ReceiverDeviceState) {
        validateSafe(state)
        storage.write(state)
    }

    fun updateHeartbeat(lastHeartbeatAt: String) {
        val existing = load() ?: return
        save(existing.copy(lastHeartbeatAt = lastHeartbeatAt))
    }

    fun nextLocalCounter(): Long {
        val existing = load() ?: return 1
        val next = existing.lastLocalCounter + 1
        save(existing.copy(lastLocalCounter = next))
        return next
    }

    fun clear() {
        storage.clear()
    }

    private fun validateSafe(state: ReceiverDeviceState) {
        val serialized = listOfNotNull(
            state.deviceId,
            state.deviceStatus,
            state.serverTime,
            state.appVersion,
            state.lastRegistrationAt,
            state.lastHeartbeatAt,
            state.backendBaseUrl,
            state.receiverKeyId,
            state.lastLocalCounter.toString(),
            state.lastNotificationListenerAccessEnabled.toString()
        ).joinToString("|")

        require(!serialized.contains(Regex("\\+\\d[\\d\\s()-]{6,}"))) {
            "raw phone must not be stored"
        }
        require(!serialized.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }
        require(!serialized.contains(Regex("secret|token|password|api_key", RegexOption.IGNORE_CASE))) {
            "secrets must not be stored"
        }
        require(
            state.backendBaseUrl.startsWith("http://127.0.0.1:") ||
                state.backendBaseUrl.startsWith("https://")
        ) {
            "receiver backend URL must use HTTPS outside adb reverse localhost"
        }
    }
}

class InMemoryDeviceStateStorage : DeviceStateStorage {
    private var state: ReceiverDeviceState? = null

    override fun read(): ReceiverDeviceState? = state

    override fun write(state: ReceiverDeviceState) {
        this.state = state
    }

    override fun clear() {
        state = null
    }

    fun dump(): String = state.toString()
}

class SharedPreferencesDeviceStateStorage(context: Context) : DeviceStateStorage {
    private val preferences = context.getSharedPreferences("swimpay_receiver_device_state", Context.MODE_PRIVATE)

    override fun read(): ReceiverDeviceState? {
        val deviceId = preferences.getString("device_id", null) ?: return null
        return ReceiverDeviceState(
            deviceId = deviceId,
            deviceStatus = preferences.getString("device_status", "pending") ?: "pending",
            serverTime = preferences.getString("server_time", null),
            appVersion = preferences.getString("app_version", "0.1.0-debug") ?: "0.1.0-debug",
            lastRegistrationAt = preferences.getString("last_registration_at", null),
            lastHeartbeatAt = preferences.getString("last_heartbeat_at", null),
            backendBaseUrl = preferences.getString("backend_base_url", DebugBackendConfig.DEFAULT_BASE_URL)
                ?: DebugBackendConfig.DEFAULT_BASE_URL,
            receiverKeyId = preferences.getString("receiver_key_id", null),
            lastLocalCounter = preferences.getLong("last_local_counter", 0),
            lastNotificationListenerAccessEnabled = preferences.getBoolean("last_notification_listener_access_enabled", false)
        )
    }

    override fun write(state: ReceiverDeviceState) {
        preferences.edit()
            .putString("device_id", state.deviceId)
            .putString("device_status", state.deviceStatus)
            .putString("server_time", state.serverTime)
            .putString("app_version", state.appVersion)
            .putString("last_registration_at", state.lastRegistrationAt)
            .putString("last_heartbeat_at", state.lastHeartbeatAt)
            .putString("backend_base_url", state.backendBaseUrl)
            .putString("receiver_key_id", state.receiverKeyId)
            .putLong("last_local_counter", state.lastLocalCounter)
            .putBoolean("last_notification_listener_access_enabled", state.lastNotificationListenerAccessEnabled)
            .apply()
    }

    override fun clear() {
        preferences.edit().clear().apply()
    }
}
