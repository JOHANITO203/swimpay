package com.swimpay.receiver

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.InvalidKeyException
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64

object AndroidMerchantDeviceProofContract {
    const val PROOF_TYPE = "install_keypair_signed_challenge"
    const val WIRE_SIGNATURE_ALGORITHM = "ecdsa_p256_sha256_der_v1"
    const val JVM_SIGNATURE_ALGORITHM = "SHA256withECDSA"
    const val ANDROID_KEYSTORE_PROVIDER = "AndroidKeyStore"

    fun canonicalChallengeBytes(installPublicKeyPem: String, challengeId: String): ByteArray {
        return listOf(
            "swimpay_android_install_proof_v1",
            "challenge_id=${challengeId.trim()}",
            "install_public_key=${installPublicKeyPem.trim()}"
        ).joinToString("\n").toByteArray(Charsets.UTF_8)
    }
}

interface AndroidMerchantInstallProofSigner {
    val signatureAlgorithm: String

    fun publicKeyPem(): String

    fun signChallenge(challengeId: String): String
}

class AndroidMerchantDeviceProofFactory(
    private val signer: AndroidMerchantInstallProofSigner,
    private val challengeIdFactory: () -> String = { "challenge_${System.currentTimeMillis()}" }
) : AndroidMerchantDeviceProofProvider {
    override fun currentProof(): AndroidMerchantDeviceProof {
        val publicKeyPem = signer.publicKeyPem()
        val challengeId = challengeIdFactory().trim()
        require(challengeId.isNotBlank()) { "challenge id cannot be blank" }
        return AndroidMerchantDeviceProof(
            installPublicKey = publicKeyPem,
            challengeId = challengeId,
            challengeSignature = signer.signChallenge(challengeId),
            signatureAlgorithm = signer.signatureAlgorithm
        )
    }
}

class SharedPreferencesAndroidMerchantDeviceProofProvider(
    context: Context,
    signer: AndroidMerchantInstallProofSigner = AndroidKeystoreAndroidMerchantInstallProofSigner()
) : AndroidMerchantDeviceProofProvider {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    private val delegate = AndroidMerchantDeviceProofFactory(
        signer = signer,
        challengeIdFactory = { nextChallengeId() }
    )

    override fun currentProof(): AndroidMerchantDeviceProof = delegate.currentProof()

    private fun nextChallengeId(): String {
        val nextCounter = preferences.getLong(KEY_LAST_CHALLENGE_COUNTER, 0L) + 1L
        preferences.edit().putLong(KEY_LAST_CHALLENGE_COUNTER, nextCounter).apply()
        return "challenge_${System.currentTimeMillis()}_$nextCounter"
    }

    companion object {
        const val PREFERENCES_NAME = "swimpay_android_merchant_device_proof"
        const val KEY_LAST_CHALLENGE_COUNTER = "last_challenge_counter"
    }
}

class AndroidKeystoreAndroidMerchantInstallProofSigner(
    private val alias: String = "swimpay_android_merchant_install_proof_key"
) : AndroidMerchantInstallProofSigner {
    override val signatureAlgorithm: String = AndroidMerchantDeviceProofContract.WIRE_SIGNATURE_ALGORITHM

    override fun publicKeyPem(): String {
        return publicKeyToPem(ensureKeyPair().certificate.publicKey)
    }

    override fun signChallenge(challengeId: String): String {
        val entry = ensureKeyPair()
        return signWithPrivateKey(
            privateKey = entry.privateKey,
            payload = AndroidMerchantDeviceProofContract.canonicalChallengeBytes(
                installPublicKeyPem = publicKeyToPem(entry.certificate.publicKey),
                challengeId = challengeId
            )
        )
    }

    private fun ensureKeyPair(): KeyStore.PrivateKeyEntry {
        val keyStore = KeyStore.getInstance(AndroidMerchantDeviceProofContract.ANDROID_KEYSTORE_PROVIDER).apply { load(null) }
        val existing = keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
        if (existing != null) {
            return existing
        }

        val generator = KeyPairGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_EC,
            AndroidMerchantDeviceProofContract.ANDROID_KEYSTORE_PROVIDER
        )
        val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY)
            .setDigests(KeyProperties.DIGEST_SHA256)
            .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
            .build()
        generator.initialize(spec)
        generator.generateKeyPair()

        val reloadedKeyStore = KeyStore.getInstance(AndroidMerchantDeviceProofContract.ANDROID_KEYSTORE_PROVIDER).apply { load(null) }
        return reloadedKeyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
            ?: throw InvalidKeyException("merchant install proof keypair unavailable after generation")
    }
}

class JvmAndroidMerchantInstallProofSigner(
    private val keyPair: KeyPair = generateJvmKeyPair()
) : AndroidMerchantInstallProofSigner {
    override val signatureAlgorithm: String = AndroidMerchantDeviceProofContract.WIRE_SIGNATURE_ALGORITHM

    override fun publicKeyPem(): String = publicKeyToPem(keyPair.public)

    override fun signChallenge(challengeId: String): String {
        return signWithPrivateKey(
            privateKey = keyPair.private,
            payload = AndroidMerchantDeviceProofContract.canonicalChallengeBytes(
                installPublicKeyPem = publicKeyPem(),
                challengeId = challengeId
            )
        )
    }

    fun verifyChallengeSignature(challengeId: String, signatureBase64: String): Boolean {
        val verifier = Signature.getInstance(AndroidMerchantDeviceProofContract.JVM_SIGNATURE_ALGORITHM)
        verifier.initVerify(keyPair.public)
        verifier.update(
            AndroidMerchantDeviceProofContract.canonicalChallengeBytes(
                installPublicKeyPem = publicKeyPem(),
                challengeId = challengeId
            )
        )
        return verifier.verify(Base64.getDecoder().decode(signatureBase64))
    }
}

private fun generateJvmKeyPair(): KeyPair {
    val generator = KeyPairGenerator.getInstance("EC")
    generator.initialize(ECGenParameterSpec("secp256r1"))
    return generator.generateKeyPair()
}

private fun signWithPrivateKey(privateKey: PrivateKey, payload: ByteArray): String {
    val signature = Signature.getInstance(AndroidMerchantDeviceProofContract.JVM_SIGNATURE_ALGORITHM)
    signature.initSign(privateKey)
    signature.update(payload)
    return Base64.getEncoder().encodeToString(signature.sign())
}

private fun publicKeyToPem(publicKey: PublicKey): String {
    val encoded = Base64.getMimeEncoder(64, "\n".toByteArray(Charsets.UTF_8)).encodeToString(publicKey.encoded)
    return "-----BEGIN PUBLIC KEY-----\n$encoded\n-----END PUBLIC KEY-----"
}
