package com.swimpay.receiver

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BankSelectionOnboardingUiTest {
    @Test
    fun reviewOnlyWarningUsesRequiredSafeWording() {
        val ui = BankSelectionOnboardingUiModel().build(
            selections = listOf(ReceiverBankProfileSelectionDefaults.sberToVerify(selected = true)),
            debugEnabled = false
        )

        assertTrue(ui.rows.single().reviewOnly)
        assertTrue(
            ui.rows.single().warning.contains(
                "Cette banque peut être utilisée pour détecter des signaux et les envoyer en review. Elle n’est pas encore vérifiée pour l’auto-confirmation."
            )
        )
        assertFalse(ui.toString().contains("confirmation bancaire", ignoreCase = true))
        assertFalse(ui.toString().contains("trusted bank app", ignoreCase = true))
        assertFalse(ui.toString().contains("ready_auto_confirm", ignoreCase = true))
    }

    @Test
    fun syntheticDebugProfileIsVisibleOnlyWhenDebugEnabled() {
        val profiles = listOf(ReceiverBankProfileSelectionDefaults.syntheticDebug(selected = true))

        val debugUi = BankSelectionOnboardingUiModel().build(profiles, debugEnabled = true)
        val releaseUi = BankSelectionOnboardingUiModel().build(profiles, debugEnabled = false)

        assertTrue(debugUi.rows.single().syntheticDebugOnly)
        assertTrue(debugUi.rows.single().statusLabel.contains("synthetic_debug_only"))
        assertTrue(releaseUi.rows.isEmpty())
    }
}
