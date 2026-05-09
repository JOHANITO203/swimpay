package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantDeviceProofHardeningTest {
    @Test
    fun jvmInstallProofSignerProducesVerifiableNonSharedSecretProof() {
        val signer = JvmAndroidMerchantInstallProofSigner()
        val proof = AndroidMerchantDeviceProofFactory(
            signer = signer,
            challengeIdFactory = { "challenge_static_jvm" }
        ).currentProof()
        val request = proof.toRequestMap().toString()

        assertTrue(proof.installPublicKey.contains("BEGIN PUBLIC KEY"))
        assertTrue(proof.challengeSignature.length > 64)
        assertTrue(signer.verifyChallengeSignature(proof.challengeId, proof.challengeSignature))
        assertTrue(request.contains("install_keypair_signed_challenge"))
        assertTrue(request.contains("ecdsa_p256_sha256_der_v1"))
        assertFalse(request.contains("private", ignoreCase = true))
        assertFalse(request.contains("secret", ignoreCase = true))
    }

    @Test
    fun merchantDeviceProofProviderUsesAsymmetricSigningBoundary() {
        val source = File("src/main/java/com/swimpay/receiver/AndroidMerchantDeviceProofProvider.kt").readText()
        val wiringSource = File("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt").readText()

        assertTrue(source.contains("AndroidKeyStore"))
        assertTrue(source.contains("KeyPairGenerator.getInstance"))
        assertTrue(source.contains("Signature.getInstance"))
        assertTrue(source.contains("SHA256withECDSA"))
        assertFalse(source.contains("safeSignature("))
        assertFalse(source.contains("KEY_INSTALL_PUBLIC_KEY"))
        assertFalse(source.contains("installPublicKey:$"))
        val requestMapSource = wiringSource.substring(
            wiringSource.indexOf("fun toRequestMap"),
            wiringSource.indexOf("interface AndroidMerchantDeviceProofProvider")
        )
        assertFalse(requestMapSource.contains("private", ignoreCase = true))
    }
}
