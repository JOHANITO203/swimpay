package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.premium.PremiumBanksUiState
import com.swimpay.receiver.ui.premium.PremiumScreenState
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BankTargetLockTest {
    @Test
    fun supportedTargetsUseExactKnownBankPackagesOnly() {
        assertEquals(
            listOf(
                "ru.sberbankmobile",
                "com.idamob.tinkoff.android",
                "ru.vtb24.mobilebanking.android",
                "ru.alfabank.mobile.android",
                "ru.gazprombank.android.mobilebank.app"
            ),
            BankTargetLock.supportedTargets.map { it.packageName }
        )

        assertTrue(BankTargetLock.isSupportedPackage("ru.sberbankmobile"))
        assertFalse(BankTargetLock.isSupportedPackage("com.example.unrelated"))
    }

    @Test
    fun exactProbeResolvesDetectedSelectedAndEnabledTargetsWithoutBroadEnumeration() {
        val probe = FakeExactPackageProbe(
            setOf(
                "ru.sberbankmobile",
                "com.idamob.tinkoff.android",
                "ru.alfabank.mobile.android"
            )
        )

        val states = BankTargetLock.resolveTargets(
            probe = probe,
            selectedBankProfileIds = setOf("sber_ru", "tbank_ru"),
            enabledBankProfileIds = setOf("sber_ru"),
            listenerReady = true,
            observedSignalBankProfileIds = setOf("sber_ru"),
            learningActiveBankProfileIds = setOf("sber_ru")
        )

        assertEquals(
            listOf("Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Gazprombank"),
            states.map { it.target.displayName }
        )
        assertEquals(BankTargetVisibleStatus.ENABLED, states.first { it.bankProfileId == "sber_ru" }.visibleStatus)
        assertEquals(BankTargetVisibleStatus.DETECTED, states.first { it.bankProfileId == "tbank_ru" }.visibleStatus)
        assertEquals(BankTargetVisibleStatus.NOT_DETECTED, states.first { it.bankProfileId == "vtb_ru" }.visibleStatus)
        assertTrue(states.first { it.bankProfileId == "sber_ru" }.internalStates.contains(BankTargetInternalState.TARGET_LEARNING_ACTIVE))
        assertEquals(setOf("ru.sberbankmobile"), BankTargetLock.enabledPackages(states))
        assertTrue(BankTargetLock.isNotificationAllowed("ru.sberbankmobile", BankTargetLock.enabledPackages(states).toSet()))
        assertFalse(BankTargetLock.isNotificationAllowed("com.example.unrelated", BankTargetLock.enabledPackages(states).toSet()))
        assertFalse(BankTargetLock.isNotificationAllowed("com.idamob.tinkoff.android", BankTargetLock.enabledPackages(states).toSet()))
    }

    @Test
    fun packageVisibilityAndProbeDoNotUseBroadInstalledAppEnumeration() {
        val mainManifest = File("src/main/AndroidManifest.xml").readText()
        val debugManifest = File("src/debug/AndroidManifest.xml").readText()
        val manifest = "$mainManifest\n$debugManifest"
        val targetLock = File("src/main/java/com/swimpay/receiver/BankTargetLock.kt").readText()

        assertFalse(manifest.contains("QUERY_ALL_PACKAGES"))
        assertFalse(manifest.contains("android.permission.READ_SMS"))
        assertFalse(manifest.contains("android.permission.RECEIVE_SMS"))
        assertFalse(manifest.contains("AccessibilityService"))
        assertFalse(mainManifest.contains("ru.sberbankmobile"))
        assertFalse(targetLock.contains("getInstalledPackages"))
        assertFalse(targetLock.contains("queryIntentActivities"))
        assertFalse(targetLock.contains("QUERY_ALL_PACKAGES"))
        BankTargetLock.supportedTargets.forEach { target ->
            assertTrue(manifest.contains(target.packageName))
        }
    }

    @Test
    fun premiumRuntimeMapsBankTargetsToMerchantSafeLabels() {
        val runtime = PremiumMerchantRuntime.disconnected()
        val banks = runtime.loadBanks(
            probe = FakeExactPackageProbe(setOf("ru.sberbankmobile", "com.idamob.tinkoff.android")),
            enabledBankProfileIds = setOf("sber_ru")
        ) as PremiumScreenState.Content<PremiumBanksUiState>

        val labels = banks.value.items.associate { it.displayName to it.status }
        assertEquals("Activée", labels["Sberbank"])
        assertEquals("Détectée", labels["T-Bank"])
        assertEquals("Non détectée", labels["VTB"])
        assertFalse(banks.value.visibleTexts().joinToString(" ").contains("package", ignoreCase = true))
        assertFalse(banks.value.visibleTexts().joinToString(" ").contains("cert", ignoreCase = true))
    }

    private class FakeExactPackageProbe(
        private val installedPackages: Set<String>
    ) : ExactPackageProbe {
        override fun isInstalled(packageName: String): Boolean {
            require(BankTargetLock.isSupportedPackage(packageName)) {
                "Only supported bank packages can be probed"
            }
            return installedPackages.contains(packageName)
        }
    }
}
