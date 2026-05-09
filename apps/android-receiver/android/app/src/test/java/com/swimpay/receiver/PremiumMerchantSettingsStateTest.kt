package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.InMemoryPremiumMerchantSettingsStore
import com.swimpay.receiver.ui.premium.PremiumAppLockSettings
import com.swimpay.receiver.ui.premium.PremiumColors
import com.swimpay.receiver.ui.premium.PremiumLanguageOption
import com.swimpay.receiver.ui.premium.PremiumLocalizedCopy
import com.swimpay.receiver.ui.premium.PremiumLockTimeout
import com.swimpay.receiver.ui.premium.PremiumThemeMode
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
    fun invalidLanguageTagsFallbackToFrench() {
        assertEquals(PremiumLanguageOption.FR, PremiumLanguageOption.fromTag("../../../secret"))
        assertEquals(PremiumLanguageOption.FR, PremiumLanguageOption.fromTag("de"))
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
}
