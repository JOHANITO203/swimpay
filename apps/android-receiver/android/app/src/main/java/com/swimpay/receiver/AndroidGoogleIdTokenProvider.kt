package com.swimpay.receiver

import java.util.Base64
import androidx.activity.ComponentActivity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import android.util.Log
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import kotlinx.coroutines.delay

class AndroidGoogleIdTokenProvider(
    activity: ComponentActivity
) {
    private val activityRef = activity
    private val credentialManager = CredentialManager.create(activity)

    suspend fun requestIdToken(): String? {
        val serverClientId = BuildConfig.SWIMPAY_GOOGLE_SERVER_CLIENT_ID.trim()
        if (serverClientId.isBlank()) {
            return null
        }
        val googleOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(serverClientId)
            .setAutoSelectEnabled(false)
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleOption)
            .build()

        return try {
            requestIdTokenOnce(request)
        } catch (_: NoCredentialException) {
            delay(1_200L)
            try {
                requestIdTokenOnce(request)
            } catch (_: NoCredentialException) {
                null
            }
        }
    }

    private suspend fun requestIdTokenOnce(request: GetCredentialRequest): String? {
        return try {
            val response = credentialManager.getCredential(
                context = activityRef,
                request = request
            )
            val credential = response.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                val credentialToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
                runCatching {
                    Log.w(
                        "SwimPayGoogleAuth",
                        "credential_id_token_received aud=${extractGoogleIdTokenAudienceForDiagnostics(credentialToken) ?: "unknown"}"
                    )
                }
                credentialToken
            } else {
                null
            }
        } catch (error: NoCredentialException) {
            Log.w("SwimPayGoogleAuth", "credential_no_credential type=${error.type}")
            throw error
        } catch (error: GetCredentialException) {
            Log.w("SwimPayGoogleAuth", "credential_failed type=${error.type}")
            null
        } catch (error: GoogleIdTokenParsingException) {
            Log.w("SwimPayGoogleAuth", "credential_parse_failed type=${error::class.java.simpleName}")
            null
        } catch (error: IllegalArgumentException) {
            Log.w("SwimPayGoogleAuth", "credential_config_failed type=${error::class.java.simpleName}")
            null
        }
    }
}

fun extractGoogleIdTokenAudienceForDiagnostics(token: String): String? {
    val payloadSegment = token.split('.').getOrNull(1)?.takeIf { it.isNotBlank() } ?: return null
    val paddedPayload = payloadSegment.padEnd(payloadSegment.length + ((4 - payloadSegment.length % 4) % 4), '=')
    return runCatching {
        val payloadJson = Base64.getUrlDecoder().decode(paddedPayload).toString(Charsets.UTF_8)
        extractString(payloadJson, "aud")
    }.getOrNull()
}
