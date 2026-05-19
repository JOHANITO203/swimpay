package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.InMemoryPremiumMerchantSettingsStore
import com.swimpay.receiver.ui.premium.PremiumAppLockSettings
import com.swimpay.receiver.ui.premium.PremiumColors
import com.swimpay.receiver.ui.premium.PremiumLanguageOption
import com.swimpay.receiver.ui.premium.PremiumLocalizedCopy
import com.swimpay.receiver.ui.premium.PremiumLockTimeout
import com.swimpay.receiver.ui.premium.PremiumMainTab
import com.swimpay.receiver.ui.premium.PremiumThemeMode
import com.swimpay.receiver.ui.premium.mainTabLabel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumMerchantSettingsStateTest {
    @Test
    fun merchantSettingsPersistLanguageAppearanceAndAppLock() {
        val store = InMemoryPremiumMerchantSettingsStore()

        store.saveLanguage(PremiumLanguageOption.RU)
        store.saveThemeMode(PremiumThemeMode.DARK)
        store.saveAppLock(PremiumAppLockSettings(enabled = true, timeout = PremiumLockTimeout.ONE_MINUTE))
        store.saveGoogleAccountLinked(true)
        store.markUnlocked(1_000L)

        val settings = store.load()
        assertEquals(PremiumLanguageOption.RU, settings.language)
        assertEquals(PremiumThemeMode.DARK, settings.themeMode)
        assertTrue(settings.googleAccountLinked)
        assertTrue(settings.appLock.enabled)
        assertEquals(PremiumLockTimeout.ONE_MINUTE, settings.appLock.timeout)
        assertFalse(store.shouldRequireUnlock(30_000L))
        assertTrue(store.shouldRequireUnlock(62_000L))
    }

    @Test
    fun invalidLanguageTagsFallbackToRussianDefault() {
        assertEquals(PremiumLanguageOption.RU, PremiumLanguageOption.DEFAULT)
        assertEquals(PremiumLanguageOption.RU, PremiumLanguageOption.fromTag("../../../secret"))
        assertEquals(PremiumLanguageOption.RU, PremiumLanguageOption.fromTag("de"))
        assertEquals(PremiumLanguageOption.EN, PremiumLanguageOption.fromTag("EN"))
    }

    @Test
    fun darkPaletteChangesPremiumSurfaceTokens() {
        PremiumColors.useDarkTheme(false)
        val lightSurface = PremiumColors.Surface
        val lightInk = PremiumColors.Ink

        PremiumColors.useDarkTheme(true)
        val darkSurface = PremiumColors.Surface
        val darkInk = PremiumColors.Ink

        assertNotEquals(lightSurface, darkSurface)
        assertNotEquals(lightInk, darkInk)
        PremiumColors.useDarkTheme(false)
    }

    @Test
    fun languageSelectionHasVisibleInterfaceCopy() {
        val french = PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.FR)
        val english = PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.EN)
        val russian = PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.RU)

        assertEquals("Langue", french.language)
        assertEquals("Language", english.language)
        assertEquals("Язык", russian.language)
        assertNotEquals(french.terminalTitle, english.terminalTitle)
    }

    @Test
    fun localizedCopyUsesCleanUtf8ForFrenchEnglishAndCyrillicRussian() {
        val copies = listOf(
            PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.FR),
            PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.EN),
            PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.RU)
        )
        val visibleText = copies.flatMap {
            listOf(
                it.welcomeTitle,
                it.welcomeBody,
                it.createAccount,
                it.signIn,
                it.receivingMethods,
                it.security,
                it.appearance,
                it.language,
                it.signOut
            )
        }.joinToString("\n")

        listOf("\uFFFD", "\u00C3", "\u00D0", "\u00D1", "\u00E2", "\u00C2").forEach { forbidden ->
            assertFalse("localized copy contains mojibake marker $forbidden", visibleText.contains(forbidden))
        }
        assertTrue("Russian copy must use Cyrillic alphabet", PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.RU).language.contains("Я"))
        assertEquals("Réglages", PremiumLanguageOption.FR.mainTabLabel(PremiumMainTab.Settings))
        assertEquals("Settings", PremiumLanguageOption.EN.mainTabLabel(PremiumMainTab.Settings))
        assertEquals("Настройки", PremiumLanguageOption.RU.mainTabLabel(PremiumMainTab.Settings))
    }


    @Test
    fun reviewEmptyStateCopyIsLocalized() {
        val title = "Aucun paiement \u00e0 confirmer"
        val message = "Les nouveaux paiements appara\u00eetront ici."
        assertEquals("Aucun paiement \u00e0 confirmer", PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.FR).ui(title))
        assertEquals("No payment to confirm", PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.EN).ui(title))
        assertEquals("\u041d\u0435\u0442 \u043f\u043b\u0430\u0442\u0435\u0436\u0435\u0439 \u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0443", PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.RU).ui(title))
        assertEquals("New payments will appear here.", PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.EN).ui(message))
        assertEquals("\u041d\u043e\u0432\u044b\u0435 \u043f\u043b\u0430\u0442\u0435\u0436\u0438 \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.", PremiumLocalizedCopy.forLanguage(PremiumLanguageOption.RU).ui(message))
    }

}
