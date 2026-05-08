package com.swimpay.receiver.security

class FakePayloadSigner(
    private val testSecret: String
) : PayloadSigner {
    override fun sign(payload: ByteArray): String {
        return sha256Hex(testSecret + "|" + payload.toString(Charsets.UTF_8))
    }

    override fun publicKeyPem(): String {
        return listOf(
            "-----BEGIN PUBLIC KEY-----",
            "DEBUG_FAKE_PAYLOAD_SIGNER_PUBLIC_KEY",
            "-----END PUBLIC KEY-----"
        ).joinToString("\n")
    }

    override fun keyId(): String {
        return "fake_${sha256Hex(testSecret).take(16)}"
    }
}
