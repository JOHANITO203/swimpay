package com.swimpay.receiver.ui.premium

import android.content.Context
import android.content.SharedPreferences
import java.util.Locale
import kotlin.math.max

enum class PremiumLanguageOption(
    val tag: String,
    val shortLabel: String,
    val displayLabel: String
) {
    FR("fr", "FR", "Français"),
    EN("en", "EN", "English"),
    RU("ru", "RU", "Русский");

    companion object {
        fun fromTag(value: String?): PremiumLanguageOption {
            val normalized = value?.trim()?.lowercase(Locale.US).orEmpty()
            return entries.firstOrNull { it.tag == normalized } ?: FR
        }
    }
}

enum class PremiumThemeMode(
    val wireValue: String,
    val labelFr: String,
    val labelEn: String,
    val labelRu: String
) {
    SYSTEM("system", "Système", "System", "Система"),
    LIGHT("light", "Clair", "Light", "Светлая"),
    DARK("dark", "Sombre", "Dark", "Темная");

    fun resolve(systemDark: Boolean): Boolean {
        return when (this) {
            SYSTEM -> systemDark
            LIGHT -> false
            DARK -> true
        }
    }

    companion object {
        fun fromWire(value: String?): PremiumThemeMode {
            return entries.firstOrNull { it.wireValue == value?.trim()?.lowercase(Locale.US) } ?: SYSTEM
        }
    }
}

enum class PremiumLockTimeout(
    val wireValue: String,
    val labelFr: String,
    val durationMs: Long
) {
    IMMEDIATE("immediate", "Immédiatement", 0L),
    ONE_MINUTE("one_minute", "Après 1 min", 60_000L),
    FIVE_MINUTES("five_minutes", "Après 5 min", 5 * 60_000L),
    FIFTEEN_MINUTES("fifteen_minutes", "Après 15 min", 15 * 60_000L);

    companion object {
        fun fromWire(value: String?): PremiumLockTimeout {
            return entries.firstOrNull { it.wireValue == value?.trim()?.lowercase(Locale.US) } ?: FIVE_MINUTES
        }
    }
}

data class PremiumAppLockSettings(
    val enabled: Boolean = false,
    val timeout: PremiumLockTimeout = PremiumLockTimeout.FIVE_MINUTES,
    val lastUnlockedAtEpochMs: Long = 0L
)

data class PremiumMerchantSettings(
    val language: PremiumLanguageOption = PremiumLanguageOption.FR,
    val themeMode: PremiumThemeMode = PremiumThemeMode.SYSTEM,
    val appLock: PremiumAppLockSettings = PremiumAppLockSettings(),
    val googleAccountLinked: Boolean = false
)

interface PremiumMerchantSettingsStore {
    fun load(): PremiumMerchantSettings
    fun saveLanguage(language: PremiumLanguageOption): PremiumMerchantSettings
    fun saveThemeMode(themeMode: PremiumThemeMode): PremiumMerchantSettings
    fun saveAppLock(appLock: PremiumAppLockSettings): PremiumMerchantSettings
    fun saveGoogleAccountLinked(linked: Boolean): PremiumMerchantSettings
    fun markUnlocked(nowEpochMs: Long = System.currentTimeMillis()): PremiumMerchantSettings
    fun shouldRequireUnlock(nowEpochMs: Long = System.currentTimeMillis()): Boolean
}

class InMemoryPremiumMerchantSettingsStore(
    initial: PremiumMerchantSettings = PremiumMerchantSettings()
) : PremiumMerchantSettingsStore {
    private var settings: PremiumMerchantSettings = initial

    override fun load(): PremiumMerchantSettings = settings

    override fun saveLanguage(language: PremiumLanguageOption): PremiumMerchantSettings {
        settings = settings.copy(language = language)
        return settings
    }

    override fun saveThemeMode(themeMode: PremiumThemeMode): PremiumMerchantSettings {
        settings = settings.copy(themeMode = themeMode)
        return settings
    }

    override fun saveAppLock(appLock: PremiumAppLockSettings): PremiumMerchantSettings {
        settings = settings.copy(appLock = appLock)
        return settings
    }

    override fun saveGoogleAccountLinked(linked: Boolean): PremiumMerchantSettings {
        settings = settings.copy(googleAccountLinked = linked)
        return settings
    }

    override fun markUnlocked(nowEpochMs: Long): PremiumMerchantSettings {
        settings = settings.copy(appLock = settings.appLock.copy(lastUnlockedAtEpochMs = nowEpochMs))
        return settings
    }

    override fun shouldRequireUnlock(nowEpochMs: Long): Boolean {
        val appLock = settings.appLock
        if (!appLock.enabled) return false
        val elapsed = max(0L, nowEpochMs - appLock.lastUnlockedAtEpochMs)
        return elapsed >= appLock.timeout.durationMs
    }
}

class SharedPreferencesPremiumMerchantSettingsStore(
    context: Context
) : PremiumMerchantSettingsStore {
    private val preferences: SharedPreferences =
        context.getSharedPreferences("premium_merchant_settings", Context.MODE_PRIVATE)

    override fun load(): PremiumMerchantSettings {
        return PremiumMerchantSettings(
            language = PremiumLanguageOption.fromTag(preferences.getString(KEY_LANGUAGE, PremiumLanguageOption.FR.tag)),
            themeMode = PremiumThemeMode.fromWire(preferences.getString(KEY_THEME, PremiumThemeMode.SYSTEM.wireValue)),
            googleAccountLinked = preferences.getBoolean(KEY_GOOGLE_ACCOUNT_LINKED, false),
            appLock = PremiumAppLockSettings(
                enabled = preferences.getBoolean(KEY_APP_LOCK_ENABLED, false),
                timeout = PremiumLockTimeout.fromWire(preferences.getString(KEY_APP_LOCK_TIMEOUT, PremiumLockTimeout.FIVE_MINUTES.wireValue)),
                lastUnlockedAtEpochMs = preferences.getLong(KEY_APP_LOCK_LAST_UNLOCKED_AT, 0L)
            )
        )
    }

    override fun saveLanguage(language: PremiumLanguageOption): PremiumMerchantSettings {
        preferences.edit().putString(KEY_LANGUAGE, language.tag).apply()
        return load()
    }

    override fun saveThemeMode(themeMode: PremiumThemeMode): PremiumMerchantSettings {
        preferences.edit().putString(KEY_THEME, themeMode.wireValue).apply()
        return load()
    }

    override fun saveAppLock(appLock: PremiumAppLockSettings): PremiumMerchantSettings {
        preferences.edit()
            .putBoolean(KEY_APP_LOCK_ENABLED, appLock.enabled)
            .putString(KEY_APP_LOCK_TIMEOUT, appLock.timeout.wireValue)
            .putLong(KEY_APP_LOCK_LAST_UNLOCKED_AT, appLock.lastUnlockedAtEpochMs)
            .apply()
        return load()
    }

    override fun saveGoogleAccountLinked(linked: Boolean): PremiumMerchantSettings {
        preferences.edit().putBoolean(KEY_GOOGLE_ACCOUNT_LINKED, linked).apply()
        return load()
    }

    override fun markUnlocked(nowEpochMs: Long): PremiumMerchantSettings {
        preferences.edit().putLong(KEY_APP_LOCK_LAST_UNLOCKED_AT, nowEpochMs).apply()
        return load()
    }

    override fun shouldRequireUnlock(nowEpochMs: Long): Boolean {
        val settings = load()
        if (!settings.appLock.enabled) return false
        val elapsed = max(0L, nowEpochMs - settings.appLock.lastUnlockedAtEpochMs)
        return elapsed >= settings.appLock.timeout.durationMs
    }

    private companion object {
        const val KEY_LANGUAGE = "language"
        const val KEY_THEME = "theme_mode"
        const val KEY_APP_LOCK_ENABLED = "app_lock_enabled"
        const val KEY_APP_LOCK_TIMEOUT = "app_lock_timeout"
        const val KEY_APP_LOCK_LAST_UNLOCKED_AT = "app_lock_last_unlocked_at"
        const val KEY_GOOGLE_ACCOUNT_LINKED = "google_account_linked"
    }
}

data class PremiumSupportTicketDraft(
    val category: PremiumSupportCategory,
    val subject: String,
    val message: String
) {
    fun validationError(): String? {
        if (subject.trim().length < 3) return "Ajoutez un sujet lisible."
        if (message.trim().length < 12) return "Ajoutez quelques détails sans secret ni donnée brute."
        val combined = "${subject}\n$message"
        return if (SupportSafety.forbiddenContentDetected(combined)) {
            "Retirez les secrets, numéros complets ou texte brut de notification."
        } else {
            null
        }
    }
}

enum class PremiumSupportCategory(
    val wireValue: String,
    val labelFr: String
) {
    RECEIVER_ISSUE("receiver_issue", "Receiver"),
    PAYMENT_REVIEW_ISSUE("payment_review_issue", "Revue paiement"),
    INTEGRATION_WEBHOOK_ISSUE("integration_webhook_issue", "Integration webhook"),
    ACCOUNT_SECURITY_ISSUE("account_security_issue", "Compte et securite"),
    OTHER("other", "Autre")
}

data class PremiumSupportTicketResult(
    val ticketId: String,
    val status: String,
    val createdAt: String,
    val safeMessage: String
)

object SupportSafety {
    private val forbiddenPatterns = listOf(
        Regex("\\bsk_(test|live|staging)?[A-Za-z0-9_\\-]{6,}", RegexOption.IGNORE_CASE),
        Regex("\\bwhsec_[A-Za-z0-9_\\-]{6,}", RegexOption.IGNORE_CASE),
        Regex("\\bspm_[A-Za-z0-9_\\-]{6,}", RegexOption.IGNORE_CASE),
        Regex("\\+?7\\d{10}"),
        Regex("\\b\\d{13,19}\\b")
    )

    fun forbiddenContentDetected(value: String): Boolean {
        return forbiddenPatterns.any { it.containsMatchIn(value) }
    }
}
