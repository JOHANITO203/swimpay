package com.swimpay.receiver

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

class AndroidSystemAppUnlocker(
    private val activity: FragmentActivity
) {
    private val authenticators =
        BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL

    fun requestSystemUnlock(
        onAuthenticationSucceeded: () -> Unit,
        onAuthenticationUnavailable: (String) -> Unit = {}
    ) {
        val biometricManager = BiometricManager.from(activity)
        val canAuthenticate = biometricManager.canAuthenticate(authenticators)
        if (canAuthenticate != BiometricManager.BIOMETRIC_SUCCESS) {
            onAuthenticationUnavailable(systemUnlockUnavailableMessage(canAuthenticate))
            return
        }

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Deverrouiller SwimPay")
            .setSubtitle("Utilisez la securite de cet appareil.")
            .setAllowedAuthenticators(authenticators)
            .build()

        val prompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onAuthenticationSucceeded()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (errorCode != BiometricPrompt.ERROR_USER_CANCELED &&
                        errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON &&
                        errorCode != BiometricPrompt.ERROR_CANCELED
                    ) {
                        onAuthenticationUnavailable(errString.toString())
                    }
                }
            }
        )
        prompt.authenticate(promptInfo)
    }

    private fun systemUnlockUnavailableMessage(status: Int): String {
        return when (status) {
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED ->
                "Aucune securite appareil n'est configuree."
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE ->
                "Cet appareil ne fournit pas de verrouillage systeme compatible."
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE ->
                "La securite appareil est temporairement indisponible."
            else -> "La securite appareil est indisponible."
        }
    }
}
