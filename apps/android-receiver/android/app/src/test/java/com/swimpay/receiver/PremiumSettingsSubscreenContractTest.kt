package com.swimpay.receiver

import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumSettingsSubscreenContractTest {
    @Test
    fun settingsRowsRouteToRealSubscreens() {
        val navigation = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt").readText()
        val app = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val dashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val accountEntry = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt").readText()

        listOf(
            "HelpCenter",
            "SupportContact",
            "Language",
            "Appearance"
        ).forEach { route ->
            assertTrue("missing route $route", navigation.contains(route))
            assertTrue("PremiumMerchantApp must render $route", app.contains("PremiumRoute.$route"))
        }

        listOf(
            "PremiumHelpCenterScreen(",
            "PremiumContactSupportScreen(",
            "PremiumLanguageScreen(",
            "PremiumAppearanceScreen(",
            "PremiumConfirmationModeScreen(",
            "PremiumSecurityScreen("
        ).forEach { screen ->
            assertTrue("missing implemented screen $screen", dashboard.contains(screen))
        }

        assertTrue(dashboard.contains("onNavigate(PremiumNavigation.openHelpCenter())"))
        assertTrue(dashboard.contains("onNavigate(PremiumNavigation.openSupportContact())"))
        assertTrue(dashboard.contains("onNavigate(PremiumNavigation.openLanguage())"))
        assertTrue(dashboard.contains("onNavigate(PremiumNavigation.openAppearance())"))
        assertTrue(accountEntry.contains("PremiumLanguageSwitch"))
    }

    @Test
    fun confirmationIaIsFutureOnlyAndNotAnActiveV1DecisionPath() {
        val dashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val confirmation = sourceFunction(dashboard, "fun PremiumConfirmationModeScreen")

        assertTrue(confirmation.contains("IA"))
        assertTrue(confirmation.contains("Prochaine mise a jour") || confirmation.contains("prochaine mise a jour"))
        assertTrue(confirmation.contains("Inactive") || confirmation.contains("inactive"))
        assertFalse(confirmation.contains("Activer la confirmation IA"))
        assertFalse(confirmation.contains("allow_auto_confirmation = true"))
        assertFalse(confirmation.contains("payment.confirmed"))
    }

    @Test
    fun androidDeveloperIntegrationDoesNotExposeRawSdkSecrets() {
        val wiring = File("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt").readText()
        val runtime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()
        val dashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()

        assertFalse(wiring.contains("fun effectiveSecretKey(): String = secretKeyOnce"))
        assertFalse(wiring.contains("fun effectiveWebhookSecret(): String = webhookSecretOnce"))
        assertFalse(runtime.contains("oneTimeSecrets = showOnceSecrets()"))
        assertFalse(dashboard.contains("Valeurs show-once"))
        assertFalse(dashboard.contains("secret_key_once"))
        assertFalse(dashboard.contains("webhook_secret_once"))
    }

    @Test
    fun manifestKeepsReceiverBoundaries() {
        val manifest = File("src/main/AndroidManifest.xml").readText()

        assertFalse(manifest.contains("READ_SMS"))
        assertFalse(manifest.contains("BIND_ACCESSIBILITY_SERVICE"))
        assertFalse(manifest.contains("QUERY_ALL_PACKAGES"))
    }

    @Test
    fun appLockUsesAndroidSystemSecurityBeforeUnlockingUi() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        val gradle = File("build.gradle.kts").readText()
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()

        assertTrue(manifest.contains("android.permission.USE_BIOMETRIC"))
        assertTrue(gradle.contains("androidx.biometric:biometric"))
        assertTrue(mainActivity.contains("AndroidSystemAppUnlocker"))
        assertTrue(mainActivity.contains("requestSystemUnlock"))
        assertTrue(mainActivity.contains("onAuthenticationSucceeded"))
        assertTrue(mainActivity.contains("onRequestUnlock = { onUnlocked -> requestSystemUnlock(onUnlocked) }"))
        assertFalse(mainActivity.contains("onRequestUnlock = {\n                        merchantSettingsStore.markUnlocked()"))

        val app = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val toggleFlow = sourceBetween(app, "onToggleAppLock = { enabled ->", "onTimeoutSelected =")
        assertTrue(toggleFlow.contains("onRequestUnlock {"))
        assertTrue(toggleFlow.contains("merchantSettingsStore.load().appLock.copy(enabled = true)"))
        assertFalse(toggleFlow.contains("merchantSettingsStore.saveAppLock(\n                                merchantSettings.appLock.copy(enabled = enabled)"))
    }

    @Test
    fun googleRecoveryAndLinkingUseRealAccountChooserOnUiThread() {
        val provider = File("src/main/java/com/swimpay/receiver/AndroidGoogleIdTokenProvider.kt").readText()
        val app = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()

        assertTrue(provider.contains("CredentialManager.create"))
        assertTrue(provider.contains("GetGoogleIdOption.Builder"))
        assertTrue(provider.contains("setFilterByAuthorizedAccounts(false)"))
        assertTrue(provider.contains("setServerClientId"))
        assertTrue(provider.contains("SWIMPAY_GOOGLE_SERVER_CLIENT_ID"))
        assertFalse(app.contains("withContext(Dispatchers.IO) { googleIdTokenProvider() }"))
    }

    @Test
    fun launcherIconUsesExistingThreeWaveMark() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        val launcher = File("src/main/res/mipmap-anydpi-v26/ic_launcher.xml").readText()
        val launcherRound = File("src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml").readText()
        val foreground = File("src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp")
        val playStoreIcon = File("src/main/play_store_512.png")

        assertTrue(manifest.contains("android:icon=\"@mipmap/ic_launcher\""))
        assertTrue(launcher.contains("@mipmap/ic_launcher_foreground"))
        assertTrue(launcher.contains("@color/ic_launcher_background"))
        assertFalse("Task switcher must not use a monochrome-only launcher layer", launcher.contains("monochrome"))
        assertFalse("Task switcher must not use a monochrome-only round launcher layer", launcherRound.contains("monochrome"))
        assertTrue(launcherRound.contains("@mipmap/ic_launcher_foreground"))
        assertTrue("IconKitchen three-wave foreground must be packaged", foreground.length() > 100L)
        listOf(
            "mipmap-mdpi" to 108,
            "mipmap-hdpi" to 162,
            "mipmap-xhdpi" to 216,
            "mipmap-xxhdpi" to 324,
            "mipmap-xxxhdpi" to 432
        ).forEach { (density, foregroundSize) ->
            val legacyIcon = File("src/main/res/$density/ic_launcher.webp")
            val adaptiveForeground = File("src/main/res/$density/ic_launcher_foreground.webp")
            assertTrue("missing full-color legacy WebP for $density", legacyIcon.isFile)
            assertTrue("missing full-color adaptive foreground WebP for $density", adaptiveForeground.isFile)
            assertEquals(foregroundSize, webpSize(adaptiveForeground).first)
            assertEquals(foregroundSize, webpSize(adaptiveForeground).second)
        }
        assertTrue("IconKitchen Play Store icon must be kept with the Android source", playStoreIcon.isFile)
        assertEquals(512, pngDimension(playStoreIcon, offset = 16))
        assertEquals(512, pngDimension(playStoreIcon, offset = 20))
    }

    private fun pngDimension(file: File, offset: Int): Int {
        val bytes = file.readBytes()
        return ByteBuffer.wrap(bytes, offset, 4).int
    }

    private fun webpSize(file: File): Pair<Int, Int> {
        val bytes = file.readBytes()
        assertTrue("${file.name} must be a RIFF WebP", bytes.copyOfRange(0, 4).decodeToString() == "RIFF")
        assertTrue("${file.name} must be a RIFF WebP", bytes.copyOfRange(8, 12).decodeToString() == "WEBP")

        var offset = 12
        while (offset + 8 <= bytes.size) {
            val fourcc = bytes.copyOfRange(offset, offset + 4).decodeToString()
            val chunkSize = littleEndianInt(bytes, offset + 4)
            val dataOffset = offset + 8
            when (fourcc) {
                "VP8X" -> {
                    val width = 1 + littleEndian24(bytes, dataOffset + 4)
                    val height = 1 + littleEndian24(bytes, dataOffset + 7)
                    return width to height
                }

                "VP8L" -> {
                    val b1 = bytes[dataOffset + 1].toInt() and 0xff
                    val b2 = bytes[dataOffset + 2].toInt() and 0xff
                    val b3 = bytes[dataOffset + 3].toInt() and 0xff
                    val b4 = bytes[dataOffset + 4].toInt() and 0xff
                    val width = 1 + (((b2 and 0x3f) shl 8) or b1)
                    val height = 1 + (((b4 and 0x0f) shl 10) or (b3 shl 2) or ((b2 and 0xc0) shr 6))
                    return width to height
                }

                "VP8 " -> {
                    var startCodeOffset = dataOffset
                    while (startCodeOffset + 10 <= bytes.size) {
                        val hasStartCode = (bytes[startCodeOffset].toInt() and 0xff) == 0x9d &&
                            (bytes[startCodeOffset + 1].toInt() and 0xff) == 0x01 &&
                            (bytes[startCodeOffset + 2].toInt() and 0xff) == 0x2a
                        if (hasStartCode) {
                            val width = littleEndianShort(bytes, startCodeOffset + 3) and 0x3fff
                            val height = littleEndianShort(bytes, startCodeOffset + 5) and 0x3fff
                            return width to height
                        }
                        startCodeOffset += 1
                    }
                }
            }
            offset = dataOffset + chunkSize + (chunkSize % 2)
        }

        error("unable to read WebP dimensions for ${file.path}")
    }

    private fun littleEndianInt(bytes: ByteArray, offset: Int): Int =
        ByteBuffer.wrap(bytes, offset, 4).order(ByteOrder.LITTLE_ENDIAN).int

    private fun littleEndianShort(bytes: ByteArray, offset: Int): Int =
        ByteBuffer.wrap(bytes, offset, 2).order(ByteOrder.LITTLE_ENDIAN).short.toInt() and 0xffff

    private fun littleEndian24(bytes: ByteArray, offset: Int): Int =
        (bytes[offset].toInt() and 0xff) or
            ((bytes[offset + 1].toInt() and 0xff) shl 8) or
            ((bytes[offset + 2].toInt() and 0xff) shl 16)

    @Test
    fun v1BankIconsArePackagedForMerchantScreens() {
        val dashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()

        listOf(
            "ic_bank_sberbank.png",
            "ic_bank_tbank.png",
            "ic_bank_vtb.png",
            "ic_bank_alfa.png",
            "ic_bank_gazprombank.png"
        ).forEach { name ->
            assertTrue("missing bank icon $name", File("src/main/res/drawable-nodpi/$name").isFile)
        }

        assertTrue(dashboard.contains("PremiumBankLogo"))
        assertTrue(dashboard.contains("R.drawable.ic_bank_sberbank"))
        assertTrue(dashboard.contains("R.drawable.ic_bank_gazprombank"))
    }

    private fun sourceFunction(source: String, signature: String): String {
        val start = source.indexOf(signature)
        assertTrue("missing source function $signature", start >= 0)
        val nextComposable = source.indexOf("\n@Composable", start + signature.length)
        return if (nextComposable >= 0) source.substring(start, nextComposable) else source.substring(start)
    }

    private fun sourceBetween(source: String, startMarker: String, endMarker: String): String {
        val start = source.indexOf(startMarker)
        assertTrue("missing start marker $startMarker", start >= 0)
        val end = source.indexOf(endMarker, start + startMarker.length)
        assertTrue("missing end marker $endMarker", end >= 0)
        return source.substring(start, end)
    }
}
