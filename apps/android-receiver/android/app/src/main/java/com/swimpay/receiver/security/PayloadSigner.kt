package com.swimpay.receiver.security

interface PayloadSigner {
    fun sign(payload: ByteArray): String

    fun publicKeyPem(): String

    fun keyId(): String

    fun sign(fields: SignedReceiverPayloadFields): String {
        return sign(canonicalReceiverPayload(fields).toByteArray(Charsets.UTF_8))
    }
}
