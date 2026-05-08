package com.swimpay.receiver.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.InvalidKeyException
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

data class ReceiverKeyPairPublicInfo(
    val keyId: String,
    val publicKeyPem: String,
    val algorithm: String = AndroidKeystorePayloadSigner.SIGNATURE_ALGORITHM
)

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

    fun getOrCreateKeyPair(): ReceiverKeyPairPublicInfo {
        ensureKeyPair()
        return ReceiverKeyPairPublicInfo(
            keyId = keyId(),
            publicKeyPem = publicKeyPem()
        )
    }

    override fun sign(payload: ByteArray): String {
        val privateKey = ensurePrivateKey()
        val signature = Signature.getInstance(SIGNATURE_ALGORITHM)
        signature.initSign(privateKey)
        signature.update(payload)
        return Base64.getEncoder().encodeToString(signature.sign())
    }

    override fun publicKeyPem(): String {
        val publicKey = ensureKeyPair().certificate.publicKey
        val encoded = Base64.getMimeEncoder(64, "\n".toByteArray(Charsets.UTF_8)).encodeToString(publicKey.encoded)
        return "-----BEGIN PUBLIC KEY-----\n$encoded\n-----END PUBLIC KEY-----"
    }

    override fun keyId(): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(publicKeyPem().toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte) }
        return "akp_${digest.take(32)}"
    }

    private fun ensurePrivateKey(): PrivateKey {
        return ensureKeyPair().privateKey
    }

    private fun ensureKeyPair(): KeyStore.PrivateKeyEntry {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        val existing = keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
        if (existing != null) {
            return existing
        }

        val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE_PROVIDER)
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .build()
        generator.initialize(spec)
        generator.generateKeyPair()
        val reloadedKeyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        return reloadedKeyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
            ?: throw InvalidKeyException("receiver keystore keypair unavailable after generation")
    }
}

enum class ReceiverRuntimeMode {
    DEBUG,
    PRODUCTION
}

class ReceiverSigningPolicy private constructor(
    private val mode: ReceiverRuntimeMode
) {
    companion object {
        fun forMode(mode: ReceiverRuntimeMode): ReceiverSigningPolicy = ReceiverSigningPolicy(mode)
    }

    fun requireProductionSigner(signer: PayloadSigner): PayloadSigner {
        if (mode == ReceiverRuntimeMode.PRODUCTION && signer is FakePayloadSigner) {
            throw IllegalStateException("dev signer cannot be used in production receiver mode")
        }
        return signer
    }
}
