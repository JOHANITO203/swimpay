package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumOnboardingSessionState
import com.swimpay.receiver.ui.premium.PremiumOnboardingStep
import com.swimpay.receiver.ui.premium.PremiumReceivingMethodDraft
import com.swimpay.receiver.MerchantReceivingMethodDraft as MerchantReceivingRouteDraft
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumOnboardingFullFlowTest {
    @Test
    fun approvedOnboardingStepsAreTypedMergedAndOrdered() {
        assertEquals(
            listOf(
                PremiumOnboardingStep.WELCOME,
                PremiumOnboardingStep.NOTIFICATION_ACCESS,
                PremiumOnboardingStep.COMPATIBLE_BANK_SELECTION,
                PremiumOnboardingStep.RECEIVING_METHOD,
                PremiumOnboardingStep.CONNECTED_SITE,
                PremiumOnboardingStep.CONFIGURATION_TEST
            ),
            PremiumOnboardingStep.requiredSequence
        )
    }

    @Test
    fun notificationAccessBlocksContinuationUntilEnabled() {
        val disabled = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.NOTIFICATION_ACCESS,
            notificationAccessEnabled = false
        )

        assertFalse(disabled.canContinueFrom())
        assertTrue(disabled.withNotificationAccess(true).canContinueFrom())
    }

    @Test
    fun connectedSiteSkipCompletesOnboardingWithoutRunningWebhookTest() {
        val skipped = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONNECTED_SITE,
            notificationAccessEnabled = true,
            selectedBankIds = setOf("sber_ru"),
            receivingMethodConfigured = true
        ).skipConnectedSite()

        assertTrue(skipped.canContinueFrom())
        val completed = skipped.completeAndMoveNext()

        assertTrue(completed.skippedConnectedSite)
        assertTrue(completed.onboardingCompleted)
        assertFalse(completed.connectedSiteConfigured)
        assertFalse(completed.configurationTestRan)
        assertEquals(PremiumOnboardingStep.CONNECTED_SITE, completed.currentStep)
        assertTrue(completed.completedSteps.contains(PremiumOnboardingStep.CONNECTED_SITE))
    }

    @Test
    fun connectedSiteAddNowContinuesToBackendOwnedWebhookTestOnly() {
        val readyForSite = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONNECTED_SITE,
            notificationAccessEnabled = true,
            selectedBankIds = setOf("sber_ru"),
            receivingMethodConfigured = true
        )
        val next = readyForSite.connectSite().completeAndMoveNext()

        assertTrue(next.connectedSiteConfigured)
        assertFalse(next.skippedConnectedSite)
        assertFalse(next.onboardingCompleted)
        assertFalse(next.configurationTestRan)
        assertEquals(PremiumOnboardingStep.CONFIGURATION_TEST, next.currentStep)
        assertTrue(next.canContinueFrom())
        assertEquals(
            listOf(
                "Accès notifications activé",
                "Banque choisie",
                "Moyen de réception ajouté",
                "Webhook configuré"
            ),
            next.configurationChecklistLabels()
        )
    }

    @Test
    fun webhookTestRequiresConnectedSiteConfiguration() {
        val missingWebhook = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONFIGURATION_TEST,
            notificationAccessEnabled = true,
            selectedBankIds = setOf("sber_ru"),
            receivingMethodConfigured = true,
            connectedSiteConfigured = false
        )

        assertFalse(missingWebhook.configurationTestReady)
        assertFalse(missingWebhook.canContinueFrom())
        assertTrue(missingWebhook.configurationResultLabels().contains("Webhook à configurer"))
    }

    @Test
    fun bankSelectionUsesSupportedDetectedBanksAndIgnoresUnsupportedIds() {
        val state = PremiumOnboardingSessionState()
            .withDetectedBanks(setOf("sber_ru", "tbank_ru", "evil_bank"))
            .withDefaultDetectedBanksSelected()

        assertEquals(setOf("sber_ru", "tbank_ru"), state.detectedCompatibleBankIds)
        assertEquals(setOf("sber_ru", "tbank_ru"), state.selectedBankIds)
        assertEquals(state, state.toggleBank("evil_bank"))
    }

    @Test
    fun receivingMethodAndWebhookTestDoNotRepresentPaymentConfirmation() {
        val submission = MerchantReceivingRouteDraft(
            bankProfileId = "sber_ru",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifierInput = "2200123412344821"
        ).toSubmission()
        val ready = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.CONFIGURATION_TEST,
            notificationAccessEnabled = true,
            selectedBankIds = setOf("sber_ru"),
            connectedSiteConfigured = true
        ).withReceivingMethod(submission)

        assertTrue(ready.configurationTestReady)
        assertTrue(ready.canContinueFrom())
        assertFalse(ready.withConfigurationTestRan().onboardingCompleted)
        assertTrue(ready.completeAndMoveNext().onboardingCompleted)
    }

    @Test
    fun receivingMethodStepRequiresPersistentSubmissionNotJustChoice() {
        val choiceOnly = PremiumOnboardingSessionState(
            currentStep = PremiumOnboardingStep.RECEIVING_METHOD,
            notificationAccessEnabled = true,
            selectedBankIds = setOf("sber_ru")
        ).withReceivingMethod(PremiumReceivingMethodDraft.CARD_TRANSFER)

        assertFalse(choiceOnly.receivingMethodConfigured)
        assertFalse(choiceOnly.canContinueFrom())

        val submission = MerchantReceivingRouteDraft(
            bankProfileId = "sber_ru",
            type = ReceivingMethodType.PHONE_TRANSFER,
            rawIdentifierInput = "+79991234567"
        ).toSubmission()
        val configured = choiceOnly.withReceivingMethod(submission)

        assertTrue(configured.receivingMethodConfigured)
        assertTrue(configured.canContinueFrom())
        assertEquals(submission, configured.receivingMethodSubmission)
        assertEquals(PremiumReceivingMethodDraft.PHONE_TRANSFER, configured.receivingMethodDraft)
    }

    @Test
    fun activeOnboardingSourceContainsApprovedMergedScreenCopy() {
        val source = onboardingSource()
        val approvedCopy = listOf(
            "Recevez vos paiements plus facilement",
            "SwimPay détecte les paiements reçus, vous aide à les confirmer et prévient votre site ou votre application.",
            "Connectez votre téléphone",
            "Accès nécessaire",
            "Activer l’accès",
            "SwimPay recherche uniquement les banques compatibles.",
            "Choisissez vos banques",
            "Activer ces banques",
            "Ajoutez votre moyen de réception",
            "Connectez votre site ou application",
            "Configurer plus tard",
            "Test webhook",
            "Lancer le test webhook",
            "déclenché par le backend",
            "Pratique pour les virements via SBP."
        )

        approvedCopy.forEach { copy ->
            assertTrue("missing approved onboarding copy: $copy", source.contains(copy))
        }
        assertTrue(source.contains("CompatibleBankSelectionStep"))
        assertFalse(source.contains("CompatibleBankDetectionStep"))
        assertFalse(source.contains("private fun BankSelectionStep("))
        assertFalse(source.contains("Tester sans site connecté"))
        assertFalse(source.contains("Lancer un test complet"))
        assertFalse(source.contains("paiement est confirmé", ignoreCase = true))
    }

    @Test
    fun activeOnboardingSourceRemovesLegacyBusinessAndPolicySteps() {
        val source = onboardingSource()
        val forbiddenLegacyCopy = listOf(
            "Profil Marchand",
            "Policy Engine",
            "Terminal synchronisé",
            "CONFIRMATION MANUELLE",
            "IA PLUS TARD",
            "FINALISER LA CONFIGURATION",
            "webhook Instant",
            "paiements automatiques"
        )

        forbiddenLegacyCopy.forEach { copy ->
            assertFalse("legacy onboarding copy still active: $copy", source.contains(copy, ignoreCase = true))
        }
    }

    @Test
    fun onboardingSafetyGuardrailsRemainStatic() {
        val manifest = File("src/main/AndroidManifest.xml").readText() +
            "\n" +
            File("src/debug/AndroidManifest.xml").readText()
        val source = onboardingSource() +
            "\n" +
            File("src/main/java/com/swimpay/receiver/BankTargetLock.kt").readText()

        listOf(
            "QUERY_ALL_PACKAGES",
            "android.permission.READ_SMS",
            "android.permission.RECEIVE_SMS",
            "AccessibilityService",
            "getInstalledPackages",
            "getInstalledApplications",
            "payment.confirmed",
            "official_bank_confirmation = true",
            "confirmation bancaire officielle"
        ).forEach { forbidden ->
            assertFalse("forbidden onboarding behavior exposed: $forbidden", "$manifest\n$source".contains(forbidden, ignoreCase = true))
        }
    }

    private fun onboardingSource(): String {
        return File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
    }
}
