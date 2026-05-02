package com.swimpay.receiver.security

import java.security.MessageDigest

data class SignedReceiverPayloadFields(
    val event_id: String,
    val device_id: String,
    val merchant_id: String,
    val notification_hash: String,
    val local_counter: Long,
    val observed_at: String,
    val payload_hash: String
)

fun canonicalReceiverPayload(fields: SignedReceiverPayloadFields): String {
    return listOf(
        "device_id=${fields.device_id}",
        "event_id=${fields.event_id}",
        "local_counter=${fields.local_counter}",
        "merchant_id=${fields.merchant_id}",
        "notification_hash=${fields.notification_hash}",
        "observed_at=${fields.observed_at}",
        "payload_hash=${fields.payload_hash}"
    ).joinToString("&")
}

fun sha256Hex(value: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(value.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { byte -> "%02x".format(byte) }
}
