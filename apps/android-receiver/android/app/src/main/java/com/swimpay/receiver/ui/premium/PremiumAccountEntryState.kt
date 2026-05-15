package com.swimpay.receiver.ui.premium

import android.content.Context
import com.swimpay.receiver.AndroidMerchantMobileSession
import com.swimpay.receiver.outbox.AndroidKeystoreStringProtector

typealias PremiumMobileMerchantSession = AndroidMerchantMobileSession

object PremiumAccountEntryCopy {
    const val createAccountLabel: String = "Créer un compte"
    const val signInLabel: String = "Se connecter"
    const val sameAppRights: String = "Même accès dans l'app, quel que soit le profil choisi."
}

data class PremiumAccountEntryUiState(
    val title: String = "Bienvenue sur SwimPay",
    val message: String = "Choisissez comment ouvrir votre espace marchand sur ce téléphone.",
    val createAccountLabel: String = PremiumAccountEntryCopy.createAccountLabel,
    val signInLabel: String = PremiumAccountEntryCopy.signInLabel
)

enum class PremiumMerchantProfileType(
    val label: String,
    val description: String
) {
    PERSONAL(
        label = "Profil personnel",
        description = "Pour démarrer simplement avec un compte marchand léger."
    ),
    COMMERCE(
        label = "Profil commerce",
        description = "Pour nommer une activité ou une boutique sans changer les droits."
    );
}

enum class PremiumLoginRecoveryProvider(
    val label: String,
    val description: String
) {
    GOOGLE(
        label = "Continuer avec Google",
        description = "Se connecter avec un compte Google déjà lié."
    );
}

enum class PremiumAccountRecoveryStatus {
    PENDING,
    ERROR,
    SUCCESS
}

data class PremiumAccountRecoveryUiState(
    val status: PremiumAccountRecoveryStatus,
    val title: String,
    val message: String,
    val actionLabel: String? = null
) {
    companion object {
        fun pending(): PremiumAccountRecoveryUiState {
            return PremiumAccountRecoveryUiState(
                status = PremiumAccountRecoveryStatus.PENDING,
                title = "Connexion Google",
                message = "SwimPay vérifie le compte Google et prépare la session mobile."
            )
        }

        fun creating(): PremiumAccountRecoveryUiState {
            return PremiumAccountRecoveryUiState(
                status = PremiumAccountRecoveryStatus.PENDING,
                title = "Création du compte",
                message = "SwimPay prépare une session mobile légère pour ce téléphone."
            )
        }

        fun error(
            message: String = "Essayez un autre moyen de récupération ou créez un nouveau compte."
        ): PremiumAccountRecoveryUiState {
            return PremiumAccountRecoveryUiState(
                status = PremiumAccountRecoveryStatus.ERROR,
                title = "Connexion non retrouvée",
                message = message,
                actionLabel = "Réessayer"
            )
        }

        fun success(): PremiumAccountRecoveryUiState {
            return PremiumAccountRecoveryUiState(
                status = PremiumAccountRecoveryStatus.SUCCESS,
                title = "Compte retrouvé",
                message = "La session mobile peut maintenant être restaurée."
            )
        }
        fun receiverSetup(): PremiumAccountRecoveryUiState {
            return PremiumAccountRecoveryUiState(
                status = PremiumAccountRecoveryStatus.PENDING,
                title = "Activation du receiver",
                message = "SwimPay enregistre ce telephone, les banques activees et la file d'envoi securisee."
            )
        }

        fun receiverError(message: String): PremiumAccountRecoveryUiState {
            return PremiumAccountRecoveryUiState(
                status = PremiumAccountRecoveryStatus.ERROR,
                title = "Receiver non active",
                message = message,
                actionLabel = "Reessayer"
            )
        }
    }
}

enum class PremiumGoogleAccountLinkStatus {
    PENDING,
    ERROR,
    SUCCESS
}

data class PremiumGoogleAccountLinkUiState(
    val status: PremiumGoogleAccountLinkStatus,
    val title: String,
    val message: String,
    val actionLabel: String? = null
) {
    companion object {
        fun pending(): PremiumGoogleAccountLinkUiState {
            return PremiumGoogleAccountLinkUiState(
                status = PremiumGoogleAccountLinkStatus.PENDING,
                title = "Liaison Google",
                message = "SwimPay associe ce compte Google au profil marchand actuel."
            )
        }

        fun success(): PremiumGoogleAccountLinkUiState {
            return PremiumGoogleAccountLinkUiState(
                status = PremiumGoogleAccountLinkStatus.SUCCESS,
                title = "Compte Google lie",
                message = "Ce profil marchand pourra etre retrouve avec Google lors d'une prochaine reconnexion."
            )
        }

        fun error(
            message: String = "La liaison Google n'a pas abouti. Reessayez depuis Securite."
        ): PremiumGoogleAccountLinkUiState {
            return PremiumGoogleAccountLinkUiState(
                status = PremiumGoogleAccountLinkStatus.ERROR,
                title = "Liaison impossible",
                message = message,
                actionLabel = "Reessayer"
            )
        }
    }
}

interface PremiumMobileMerchantSessionStore {
    fun currentSession(nowEpochMs: Long = System.currentTimeMillis()): PremiumMobileMerchantSession?
    fun save(session: PremiumMobileMerchantSession)

    fun hasValidSession(): Boolean = currentSession() != null

    fun markValid() {
        save(
            PremiumMobileMerchantSession(
                merchantId = "mch_local_mobile",
                userId = "usr_local_mobile",
                displayHandle = "merchant-local",
                mobileSessionToken = "spm_local_mobile_session",
                expiresAtEpochMs = System.currentTimeMillis() + DEFAULT_MOBILE_SESSION_TTL_MS
            )
        )
    }

    fun clear()

    companion object {
        const val DEFAULT_MOBILE_SESSION_TTL_MS: Long = 60L * 60L * 24L * 30L * 1000L
    }
}

class InMemoryPremiumMobileMerchantSessionStore(
    private var session: PremiumMobileMerchantSession? = null
) : PremiumMobileMerchantSessionStore {
    constructor(validSession: Boolean) : this(
        if (validSession) {
            PremiumMobileMerchantSession(
                merchantId = "mch_local_mobile",
                userId = "usr_local_mobile",
                displayHandle = "merchant-local",
                mobileSessionToken = "spm_local_mobile_session",
                expiresAtEpochMs = System.currentTimeMillis() + PremiumMobileMerchantSessionStore.DEFAULT_MOBILE_SESSION_TTL_MS
            )
        } else {
            null
        }
    )

    override fun currentSession(nowEpochMs: Long): PremiumMobileMerchantSession? {
        return session?.takeIf { it.isValid(nowEpochMs) }
    }

    override fun save(session: PremiumMobileMerchantSession) {
        this.session = session
    }

    override fun clear() {
        session = null
    }
}

class SharedPreferencesPremiumMobileMerchantSessionStore(
    context: Context
) : PremiumMobileMerchantSessionStore {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    private val tokenProtector = AndroidKeystoreStringProtector(MOBILE_SESSION_TOKEN_KEY_ALIAS)

    override fun currentSession(nowEpochMs: Long): PremiumMobileMerchantSession? {
        val merchantId = preferences.getString(KEY_MOBILE_MERCHANT_SESSION_MERCHANT_ID, null) ?: return null
        val userId = preferences.getString(KEY_MOBILE_MERCHANT_SESSION_USER_ID, null) ?: return null
        val displayHandle = preferences.getString(KEY_MOBILE_MERCHANT_SESSION_DISPLAY_HANDLE, null) ?: return null
        val expiresAt = preferences.getLong(KEY_MOBILE_MERCHANT_SESSION_EXPIRES_AT, 0L)
        val protectedToken = preferences.getString(KEY_MOBILE_MERCHANT_SESSION_TOKEN, null) ?: return null
        val token = runCatching { tokenProtector.unprotect(protectedToken) }.getOrElse {
            clear()
            return null
        }
        val session = PremiumMobileMerchantSession(
            merchantId = merchantId,
            userId = userId,
            displayHandle = displayHandle,
            mobileSessionToken = token,
            expiresAtEpochMs = expiresAt
        )
        if (!session.isValid(nowEpochMs)) {
            clear()
            return null
        }
        return session
    }

    override fun save(session: PremiumMobileMerchantSession) {
        preferences.edit()
            .putString(KEY_MOBILE_MERCHANT_SESSION_MERCHANT_ID, session.merchantId)
            .putString(KEY_MOBILE_MERCHANT_SESSION_USER_ID, session.userId)
            .putString(KEY_MOBILE_MERCHANT_SESSION_DISPLAY_HANDLE, session.displayHandle)
            .putString(KEY_MOBILE_MERCHANT_SESSION_TOKEN, tokenProtector.protect(session.authorizationTokenForRuntime()))
            .putLong(KEY_MOBILE_MERCHANT_SESSION_EXPIRES_AT, session.expiresAtEpochMs)
            .apply()
    }

    override fun clear() {
        preferences.edit()
            .remove(KEY_MOBILE_MERCHANT_SESSION_MERCHANT_ID)
            .remove(KEY_MOBILE_MERCHANT_SESSION_USER_ID)
            .remove(KEY_MOBILE_MERCHANT_SESSION_DISPLAY_HANDLE)
            .remove(KEY_MOBILE_MERCHANT_SESSION_TOKEN)
            .remove(KEY_MOBILE_MERCHANT_SESSION_EXPIRES_AT)
            .apply()
    }

    companion object {
        const val PREFERENCES_NAME = "swimpay_premium_mobile_session"
        const val KEY_MOBILE_MERCHANT_SESSION_MERCHANT_ID = "mobile_merchant_session_merchant_id"
        const val KEY_MOBILE_MERCHANT_SESSION_USER_ID = "mobile_merchant_session_user_id"
        const val KEY_MOBILE_MERCHANT_SESSION_DISPLAY_HANDLE = "mobile_merchant_session_display_handle"
        const val KEY_MOBILE_MERCHANT_SESSION_TOKEN = "mobile_merchant_session_token"
        const val KEY_MOBILE_MERCHANT_SESSION_EXPIRES_AT = "mobile_merchant_session_expires_at"
        const val MOBILE_SESSION_TOKEN_KEY_ALIAS = "swimpay_mobile_merchant_session_key"
    }
}
