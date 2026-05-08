package com.swimpay.receiver

import android.content.Context
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64

class SharedPreferencesAndroidMerchantDeviceProofProvider(
    context: Context
) : AndroidMerchantDeviceProofProvider {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    override fun currentProof(): AndroidMerchantDeviceProof {
        val installPublicKey = preferences.getString(KEY_INSTALL_PUBLIC_KEY, null)
            ?: generateInstallPublicKey().also { generated ->
                preferences.edit().putString(KEY_INSTALL_PUBLIC_KEY, generated).apply()
            }
        val challengeId = "challenge_${System.currentTimeMillis()}"
        return AndroidMerchantDeviceProof(
            installPublicKey = installPublicKey,
            challengeId = challengeId,
            challengeSignature = safeSignature(installPublicKey, challengeId)
        )
    }

    private fun generateInstallPublicKey(): String {
        val bytes = ByteArray(32)
        SecureRandom().nextBytes(bytes)
        return "install_${Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)}"
    }

    private fun safeSignature(installPublicKey: String, challengeId: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest("$installPublicKey:$challengeId".toByteArray(Charsets.UTF_8))
        return Base64.getUrlEncoder().withoutPadding().encodeToString(digest)
    }

    companion object {
        const val PREFERENCES_NAME = "swimpay_android_merchant_device_proof"
        const val KEY_INSTALL_PUBLIC_KEY = "install_public_key"
    }
}
