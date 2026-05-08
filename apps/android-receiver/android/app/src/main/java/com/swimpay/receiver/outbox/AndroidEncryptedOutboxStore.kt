package com.swimpay.receiver.outbox

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.security.KeyStore

class AndroidEncryptedOutboxStore(
    private val storage: EncryptedStorageAdapter
) : EncryptedOutboxStore {
    override fun enqueue(record: OutboxRecord): OutboxRecord {
        validateSafe(record.encryptedPayload)
        require(!record.encryptedPayload.contains("+7")) { "raw phone must not be stored" }
        require(!record.encryptedPayload.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }

        val existing = storage.read(record.eventId)
        if (existing != null) {
            return existing
        }
        val sameHash = storage.readAll().firstOrNull { it.notificationHash == record.notificationHash }
        if (sameHash != null) {
            return sameHash
        }
        storage.write(record.eventId, record)
        return record
    }

    override fun markUploading(eventId: String): OutboxRecord? {
        return transition(eventId, OutboxStatus.UPLOADING)
    }

    override fun markAcked(eventId: String, ackReceivedAt: String): OutboxRecord? {
        val existing = storage.read(eventId) ?: return null
        val updated = existing.copy(status = OutboxStatus.ACKED, ackReceivedAt = ackReceivedAt, nextRetryAt = null)
        storage.write(eventId, updated)
        return updated
    }

    override fun markFailedRetrying(
        eventId: String,
        sanitizedError: String,
        nextRetryAt: String,
        lastAttemptAt: String
    ): OutboxRecord? {
        require(!sanitizedError.contains("+7")) { "raw phone must not be stored" }
        require(!sanitizedError.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }
        val existing = storage.read(eventId) ?: return null
        val updated = existing.copy(
            status = OutboxStatus.FAILED_RETRYING,
            attemptCount = existing.attemptCount + 1,
            lastAttemptAt = lastAttemptAt,
            nextRetryAt = nextRetryAt
        )
        storage.write(eventId, updated)
        return updated
    }

    override fun dueRecords(nowIso: String): List<OutboxRecord> {
        return storage.readAll().filter { record ->
            record.status == OutboxStatus.PENDING_UPLOAD ||
                (record.status == OutboxStatus.FAILED_RETRYING && (record.nextRetryAt == null || record.nextRetryAt <= nowIso))
        }
    }

    fun cleanup(nowIso: String, retentionMs: Long = OutboxRetention.ACKED_RETENTION_MS): Int {
        var removed = 0
        val now = java.time.Instant.parse(nowIso)
        for (record in storage.readAll()) {
            val shouldRemoveAcked = record.status == OutboxStatus.ACKED &&
                record.ackReceivedAt != null &&
                java.time.Instant.parse(record.ackReceivedAt).plusMillis(retentionMs).isBefore(now)
            val shouldRemoveExpired = record.status == OutboxStatus.EXPIRED ||
                (record.status != OutboxStatus.ACKED && java.time.Instant.parse(record.firstSeenAt)
                    .plusMillis(OutboxRetention.EXPIRED_RETENTION_MS)
                    .isBefore(now))
            if (shouldRemoveAcked || shouldRemoveExpired) {
                storage.delete(record.eventId)
                removed += 1
            }
        }
        return removed
    }

    private fun transition(eventId: String, status: OutboxStatus): OutboxRecord? {
        val existing = storage.read(eventId) ?: return null
        val updated = existing.copy(status = status)
        storage.write(eventId, updated)
        return updated
    }

    private fun validateSafe(value: String) {
        require(!value.contains(Regex("\\+\\d[\\d\\s()-]{6,}"))) {
            "raw phone must not be stored"
        }
        require(!value.contains("raw_notification", ignoreCase = true)) {
            "raw notification text must not be stored"
        }
        require(!value.contains("raw_title", ignoreCase = true)) {
            "raw title must not be stored"
        }
        require(!value.contains("raw_body", ignoreCase = true)) {
            "raw body must not be stored"
        }
        require(!value.contains(Regex("raw_card|card_number|source_card|pan", RegexOption.IGNORE_CASE))) {
            "raw card data must not be stored"
        }
        require(!value.contains(Regex("secret|token|password|api_key", RegexOption.IGNORE_CASE))) {
            "secrets must not be stored"
        }
    }
}

interface EncryptedStorageAdapter {
    fun read(eventId: String): OutboxRecord?
    fun readAll(): List<OutboxRecord>
    fun write(eventId: String, record: OutboxRecord)
    fun delete(eventId: String)
}

class SharedPreferencesOutboxStorageAdapter(context: Context) : EncryptedStorageAdapter {
    private val preferences = context.getSharedPreferences("swimpay_receiver_outbox", Context.MODE_PRIVATE)

    override fun read(eventId: String): OutboxRecord? {
        return preferences.getString(key(eventId), null)?.let(OutboxRecordCodec::decode)
    }

    override fun readAll(): List<OutboxRecord> {
        return preferences.all.values.mapNotNull { value ->
            (value as? String)?.let(OutboxRecordCodec::decode)
        }
    }

    override fun write(eventId: String, record: OutboxRecord) {
        preferences.edit().putString(key(eventId), OutboxRecordCodec.encode(record)).apply()
    }

    override fun delete(eventId: String) {
        preferences.edit().remove(key(eventId)).apply()
    }

    private fun key(eventId: String): String = "outbox_$eventId"
}

object OutboxRetention {
    const val ACKED_RETENTION_MS: Long = 24L * 60L * 60L * 1000L
    const val EXPIRED_RETENTION_MS: Long = 24L * 60L * 60L * 1000L
}

object OutboxMigration {
    fun migrate(source: EncryptedStorageAdapter, target: EncryptedStorageAdapter): Int {
        var migrated = 0
        for (record in source.readAll()) {
            val duplicate = target.read(record.eventId) != null ||
                target.readAll().any { it.notificationHash == record.notificationHash }
            if (!duplicate) {
                target.write(record.eventId, record)
                migrated += 1
            }
        }
        return migrated
    }
}

object OutboxRecordCodec {
    fun encode(record: OutboxRecord): String {
        return listOf(
            record.localId,
            record.eventId,
            record.notificationHash,
            record.semanticHash.orEmpty(),
            record.payloadHash,
            record.encryptedPayload,
            record.status.wireValue,
            record.attemptCount.toString(),
            record.firstSeenAt,
            record.lastAttemptAt.orEmpty(),
            record.nextRetryAt.orEmpty(),
            record.ackReceivedAt.orEmpty()
        ).joinToString("|") { Base64.getUrlEncoder().withoutPadding().encodeToString(it.toByteArray(Charsets.UTF_8)) }
    }

    fun decode(value: String): OutboxRecord? {
        val parts = value.split("|").map { part ->
            String(Base64.getUrlDecoder().decode(part), Charsets.UTF_8)
        }
        if (parts.size != 12) {
            return null
        }
        val status = OutboxStatus.values().firstOrNull { it.wireValue == parts[6] } ?: return null
        return OutboxRecord(
            localId = parts[0],
            eventId = parts[1],
            notificationHash = parts[2],
            semanticHash = parts[3].ifBlank { null },
            payloadHash = parts[4],
            encryptedPayload = parts[5],
            status = status,
            attemptCount = parts[7].toIntOrNull() ?: 0,
            firstSeenAt = parts[8],
            lastAttemptAt = parts[9].ifBlank { null },
            nextRetryAt = parts[10].ifBlank { null },
            ackReceivedAt = parts[11].ifBlank { null }
        )
    }
}

interface ProtectedKeyValueStore {
    fun read(key: String): String?
    fun readAll(): Map<String, String>
    fun write(key: String, value: String)
    fun delete(key: String)
}

class InMemoryProtectedKeyValueStore : ProtectedKeyValueStore {
    private val values = linkedMapOf<String, String>()

    override fun read(key: String): String? = values[key]
    override fun readAll(): Map<String, String> = values.toMap()
    override fun write(key: String, value: String) {
        values[key] = value
    }
    override fun delete(key: String) {
        values.remove(key)
    }
    fun dump(): Map<String, String> = values.toMap()
}

interface StringProtector {
    fun protect(value: String): String
    fun unprotect(value: String): String
}

class XorStringProtector(private val key: String) : StringProtector {
    override fun protect(value: String): String {
        val keyBytes = key.toByteArray(Charsets.UTF_8)
        val protected = value.toByteArray(Charsets.UTF_8).mapIndexed { index, byte ->
            (byte.toInt() xor keyBytes[index % keyBytes.size].toInt()).toByte()
        }.toByteArray()
        return Base64.getUrlEncoder().withoutPadding().encodeToString(protected)
    }

    override fun unprotect(value: String): String {
        val bytes = Base64.getUrlDecoder().decode(value)
        val keyBytes = key.toByteArray(Charsets.UTF_8)
        val clear = bytes.mapIndexed { index, byte ->
            (byte.toInt() xor keyBytes[index % keyBytes.size].toInt()).toByte()
        }.toByteArray()
        return String(clear, Charsets.UTF_8)
    }
}

class ProtectedOutboxStorageAdapter(
    private val storage: ProtectedKeyValueStore,
    private val deterministicProtector: StringProtector
) : EncryptedStorageAdapter {
    override fun read(eventId: String): OutboxRecord? {
        return storage.read(key(eventId))
            ?.let(deterministicProtector::unprotect)
            ?.let(OutboxRecordCodec::decode)
    }

    override fun readAll(): List<OutboxRecord> {
        return storage.readAll().values.mapNotNull { value ->
            runCatching {
                OutboxRecordCodec.decode(deterministicProtector.unprotect(value))
            }.getOrNull()
        }
    }

    override fun write(eventId: String, record: OutboxRecord) {
        storage.write(key(eventId), deterministicProtector.protect(OutboxRecordCodec.encode(record)))
    }

    override fun delete(eventId: String) {
        storage.delete(key(eventId))
    }

    private fun key(eventId: String): String = "outbox_$eventId"
}

class AndroidProtectedKeyValueStore(context: Context, name: String) : ProtectedKeyValueStore {
    private val preferences = context.getSharedPreferences(name, Context.MODE_PRIVATE)

    override fun read(key: String): String? = preferences.getString(key, null)
    override fun readAll(): Map<String, String> = preferences.all.mapNotNull { (key, value) ->
        (value as? String)?.let { key to it }
    }.toMap()
    override fun write(key: String, value: String) {
        preferences.edit().putString(key, value).apply()
    }
    override fun delete(key: String) {
        preferences.edit().remove(key).apply()
    }
}

class AndroidKeystoreStringProtector(
    private val alias: String = "swimpay_receiver_outbox_key"
) : StringProtector {
    companion object {
        const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }

    override fun protect(value: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, ensureKey())
        val iv = cipher.iv
        val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(iv) + "." +
            Base64.getUrlEncoder().withoutPadding().encodeToString(encrypted)
    }

    override fun unprotect(value: String): String {
        val parts = value.split(".")
        require(parts.size == 2) { "invalid protected value" }
        val iv = Base64.getUrlDecoder().decode(parts[0])
        val encrypted = Base64.getUrlDecoder().decode(parts[1])
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, ensureKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(encrypted), Charsets.UTF_8)
    }

    private fun ensureKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        val existing = keyStore.getKey(alias, null) as? SecretKey
        if (existing != null) {
            return existing
        }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true)
            .build()
        generator.init(spec)
        return generator.generateKey()
    }
}

class AndroidKeystoreOutboxStorageAdapter(context: Context) : EncryptedStorageAdapter by ProtectedOutboxStorageAdapter(
    storage = AndroidProtectedKeyValueStore(context, "swimpay_receiver_outbox_protected"),
    deterministicProtector = AndroidKeystoreStringProtector()
)

object AndroidOutboxStorageFactory {
    fun createMigrating(context: Context): EncryptedStorageAdapter {
        val legacy = SharedPreferencesOutboxStorageAdapter(context)
        val protected = AndroidKeystoreOutboxStorageAdapter(context)
        OutboxMigration.migrate(legacy, protected)
        return protected
    }
}
