package com.swimpay.receiver

import androidx.activity.ComponentActivity
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

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
            val response = credentialManager.getCredential(
                context = activityRef,
                request = request
            )
            val credential = response.credential
            if (credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                GoogleIdTokenCredential.createFrom(credential.data).idToken
            } else {
                null
            }
        } catch (_: GetCredentialException) {
            null
        } catch (_: GoogleIdTokenParsingException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }
}
