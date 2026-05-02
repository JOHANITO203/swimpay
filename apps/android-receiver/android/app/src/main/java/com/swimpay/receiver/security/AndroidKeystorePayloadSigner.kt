package com.swimpay.receiver.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.Signature
import java.util.Base64

class AndroidKeystorePayloadSigner(
    private val alias: String = "swimpay_receiver_device_key"
) : PayloadSigner {
    companion object {
        const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        const val SIGNATURE_ALGORITHM = "SHA256withECDSA"
        val REQUIRED_SIGNED_FIELDS = listOf(
            "event_id",
            "device_id",
            "merchant_id",
            "notification_hash",
            "local_counter",
            "observed_at",
            "payload_hash"
        )
    }

    override fun sign(fields: SignedReceiverPayloadFields): String {
        val canonical = canonicalReceiverPayload(fields)
        val privateKey = ensureKeyPair()
        val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
        signature.initSign(privateKey)
        signature.update(canonical.toByteArray(Charsets.UTF_8))
        return Base64.getEncoder().encodeToString(signature.sign())
    }

    private fun ensureKeyPair(): java.security.PrivateKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        val existing = keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
        if (existing != null) {
            return existing.privateKey
        }

        val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE_PROVIDER)
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .build()
        generator.initialize(spec)
        return generator.generateKeyPair().private
    }
}
