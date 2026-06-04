package com.swimpay.receiver

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

/**
 * Biometric gate dedicated to revealing merchant integration secrets.
 *
 * Unlike the app unlock gate (AndroidSystemAppUnlocker, BIOMETRIC_WEAK), revealing
 * a live API key or webhook secret requires the strongest protection the device
 * offers: BIOMETRIC_STRONG with the device credential (PIN/pattern/password) as
 * fallback. If neither is configured, the reveal fails CLOSED with an actionable
 * message - secrets are never revealed on an unprotected device.
 */
class SecretRevealBiometricGate(
    private val activity: FragmentActivity
) {
    private val strongAuthenticators =
        BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL

    fun requestSecretReveal(
        onAuthorized: () -> Unit,
        onUnavailable: (String) -> Unit = {}
    ) {
        val biometricManager = BiometricManager.from(activity)
        val canAuthenticate = biometricManager.canAuthenticate(strongAuthenticators)
        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            onUnavailable(secretRevealUnavailableMessage(canAuthenticate))
            return
        }

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Reveler les secrets SwimPay")
            .setSubtitle("Confirmez votre identite pour afficher la cle API et le secret webhook.")
            .setAllowedAuthenticators(strongAuthenticators)
            .build()

        val prompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onAuthorized()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (errorCode != BiometricPrompt.ERROR_USER_CANCELED &&
                        errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON &&
                        errorCode != BiometricPrompt.ERROR_CANCELED
                    ) {
                        onUnavailable(errString.toString())
                    }
                }
            }
        )
        prompt.authenticate(promptInfo)
    }

    private fun secretRevealUnavailableMessage(status: Int): String {
        return when (status) {
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                "Configurez la securite de l'appareil (empreinte, visage ou code) pour reveler les secrets."
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
                "Cet appareil ne fournit pas de verrouillage compatible. Les secrets restent masques."
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                "La securite appareil est temporairement indisponible. Reessayez."
            else -> "La securite appareil est indisponible. Les secrets restent masques."
        }
    }
}
