package com.swimpay.receiver.outbox

class FakeEncryptedStorageAdapter : EncryptedStorageAdapter {
    private val records = linkedMapOf<String, OutboxRecord>()

    override fun read(eventId: String): OutboxRecord? = records[eventId]

    override fun readAll(): List<OutboxRecord> = records.values.toList()

    override fun write(eventId: String, record: OutboxRecord) {
        records[eventId] = record
    }
}
