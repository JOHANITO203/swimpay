package com.swimpay.receiver

import android.content.Context
import java.time.Instant

data class ReceiverListenerLifecycleState(
    val connected: Boolean,
    val lastConnectedAt: String?,
    val lastDisconnectedAt: String?
)

interface ReceiverListenerLifecycleStorage {
    fun read(): ReceiverListenerLifecycleState
    fun write(state: ReceiverListenerLifecycleState)
}

class ReceiverListenerLifecycleStore(
    private val storage: ReceiverListenerLifecycleStorage
) {
    fun load(): ReceiverListenerLifecycleState = storage.read()

    fun markConnected(nowIso: String = Instant.now().toString()) {
        save(
            load().copy(
                connected = true,
                lastConnectedAt = nowIso,
                lastDisconnectedAt = null
            )
        )
    }

    fun markDisconnected(nowIso: String = Instant.now().toString()) {
        save(
            load().copy(
                connected = false,
                lastDisconnectedAt = nowIso
            )
        )
    }

    fun isConnectedRecently(nowIso: String = Instant.now().toString(), maxAgeMs: Long = CONNECTED_RECENT_MS): Boolean {
        val state = load()
        if (!state.connected || state.lastConnectedAt.isNullOrBlank()) {
            return false
        }
        val now = runCatching { Instant.parse(nowIso).toEpochMilli() }.getOrNull() ?: return false
        val connectedAt = runCatching { Instant.parse(state.lastConnectedAt).toEpochMilli() }.getOrNull() ?: return false
        return now - connectedAt <= maxAgeMs
    }

    fun saveForTest(state: ReceiverListenerLifecycleState) {
        save(state)
    }

    private fun save(state: ReceiverListenerLifecycleState) {
        val serialized = listOfNotNull(
            state.connected.toString(),
            state.lastConnectedAt,
            state.lastDisconnectedAt
        ).joinToString("|")
        require(!serialized.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }
        require(!serialized.contains(Regex("\\+\\d[\\d\\s()-]{6,}"))) {
            "raw phone must not be stored"
        }
        storage.write(state)
    }

    companion object {
        const val CONNECTED_RECENT_MS: Long = 5 * 60 * 1000
    }
}

class InMemoryReceiverListenerLifecycleStorage : ReceiverListenerLifecycleStorage {
    private var state = ReceiverListenerLifecycleState(
        connected = false,
        lastConnectedAt = null,
        lastDisconnectedAt = null
    )

    override fun read(): ReceiverListenerLifecycleState = state

    override fun write(state: ReceiverListenerLifecycleState) {
        this.state = state
    }
}

class SharedPreferencesReceiverListenerLifecycleStorage(context: Context) : ReceiverListenerLifecycleStorage {
    private val preferences = context.getSharedPreferences("swimpay_receiver_listener_lifecycle", Context.MODE_PRIVATE)

    override fun read(): ReceiverListenerLifecycleState {
        return ReceiverListenerLifecycleState(
            connected = preferences.getBoolean("connected", false),
            lastConnectedAt = preferences.getString("last_connected_at", null),
            lastDisconnectedAt = preferences.getString("last_disconnected_at", null)
        )
    }

    override fun write(state: ReceiverListenerLifecycleState) {
        preferences.edit()
            .putBoolean("connected", state.connected)
            .putString("last_connected_at", state.lastConnectedAt)
            .putString("last_disconnected_at", state.lastDisconnectedAt)
            .apply()
    }
}
