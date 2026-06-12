package com.swimpay.receiver.ui.premium

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * P0 — fondation « noir vivant » (port prototype vers Compose).
 *
 * Vérifie uniquement que la fondation existe et est bien formée :
 * tokens de fond, accents wallets, skins par id, famille DM Sans non nulle.
 * Aucun rendu Compose requis (test JVM pur).
 */
class NoirDesignFoundationTest {

    @Test
    fun noirBackgroundAndInkTokensHaveTheExpectedValues() {
        assertEquals(Color(0xFF08080C), NoirColors.bg)
        assertEquals(Color(0xFF141418), NoirColors.surface)
        assertEquals(Color(0xFF1E1E24), NoirColors.activeSurface)
        assertEquals(Color(0xFFF5F0EB), NoirColors.ink1)
    }

    @Test
    fun walletSkinsCoverAtLeastFiveWalletsKeyedBySimpleIds() {
        assertTrue("at least 5 wallet skins", WalletSkins.all.size >= 5)

        val expectedIds = listOf("wave", "orange", "sber", "usdt", "multi")
        val actualIds = WalletSkins.all.map { it.id }
        expectedIds.forEach { id ->
            assertTrue("missing wallet skin id $id", actualIds.contains(id))
        }
        assertEquals("skin ids must be unique", actualIds.distinct().size, actualIds.size)
    }

    @Test
    fun byIdReturnsTheMatchingSkinWithTheCorrectAccent() {
        assertEquals(NoirColors.wave, WalletSkins.byId("wave")?.accent)
        assertEquals(NoirColors.orange, WalletSkins.byId("orange")?.accent)
        assertEquals(NoirColors.sber, WalletSkins.byId("sber")?.accent)
        assertEquals(NoirColors.usdt, WalletSkins.byId("usdt")?.accent)
        assertEquals(NoirColors.multi, WalletSkins.byId("multi")?.accent)
        assertEquals(null, WalletSkins.byId("does_not_exist"))
    }

    @Test
    fun walletSkinsExposeDeepGradientPairsForCards() {
        val wave = WalletSkins.byId("wave")!!
        assertEquals(Color(0xFF0D2D3A), wave.gradientTop)
        assertEquals(Color(0xFF1A4A5C), wave.gradientBottom)
    }

    @Test
    fun dmSansFamilyIsAvailableForTheNoirLanguage() {
        assertNotNull(NoirFontFamily.Sans)
    }
}
