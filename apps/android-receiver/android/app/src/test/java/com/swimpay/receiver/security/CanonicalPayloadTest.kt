package com.swimpay.receiver.security

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class CanonicalPayloadTest {
    private val fields = SignedReceiverPayloadFields(
        event_id = "evt_test",
        device_id = "dev_test",
        merchant_id = "mch_test",
        notification_hash = "hash_test",
        local_counter = 7,
        observed_at = "2026-05-02T00:00:00.000Z",
        payload_hash = "payload_hash_test"
    )

    @Test
    fun canonicalPayloadUsesStableFieldOrder() {
        assertEquals(
            "device_id=dev_test&event_id=evt_test&local_counter=7&merchant_id=mch_test&notification_hash=hash_test&observed_at=2026-05-02T00:00:00.000Z&payload_hash=payload_hash_test",
            canonicalReceiverPayload(fields)
        )
    }

    @Test
    fun fakeSignerIsDeterministicAndSecretScoped() {
        val signer = FakePayloadSigner("secret_one")
        val otherSigner = FakePayloadSigner("secret_two")

        assertEquals(signer.sign(fields), signer.sign(fields))
        assertNotEquals(signer.sign(fields), otherSigner.sign(fields))
    }
}
