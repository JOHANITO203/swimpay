package com.swimpay.receiver.security

class FakePayloadSigner(
    private val testSecret: String
) : PayloadSigner {
    override fun sign(fields: SignedReceiverPayloadFields): String {
        return sha256Hex(testSecret + "|" + canonicalReceiverPayload(fields))
    }
}
