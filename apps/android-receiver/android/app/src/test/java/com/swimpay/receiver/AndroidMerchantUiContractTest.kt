package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantUiContractTest {
    private val catalog = AndroidMerchantUiCatalog()

    @Test
    fun onboardingCopyMatchesApprovedMerchantLanguage() {
        val welcome = catalog.welcomeScreen()
        assertEquals("Recevez vos paiements plus facilement", welcome.title)
        assertEquals(
            "SwimPay détecte les paiements reçus, vous aide à les valider et prévient votre site ou votre application.",
            welcome.subtitle
        )
        assertTrue(welcome.visibleTexts().contains("Détection rapide"))
        assertTrue(welcome.visibleTexts().contains("Repérez plus vite les paiements reçus."))
        assertTrue(welcome.visibleTexts().contains("Validation simple"))
        assertTrue(welcome.visibleTexts().contains("Confirmez ou rejetez en quelques secondes."))
        assertTrue(welcome.visibleTexts().contains("Business connecté"))
        assertTrue(welcome.visibleTexts().contains("Votre site ou application reçoit la mise à jour."))
        assertEquals("Commencer", welcome.primaryAction)

        val connectPhone = catalog.connectPhoneScreen(NotificationAccessMerchantState.ACTION_REQUIRED)
        assertEquals("Connectez votre téléphone", connectPhone.title)
        assertEquals(
            "SwimPay a besoin d’accéder aux notifications de cet appareil pour fonctionner.",
            connectPhone.subtitle
        )
        assertTrue(connectPhone.visibleTexts().contains("Accès nécessaire"))
        assertTrue(connectPhone.visibleTexts().contains("Activez l’accès aux notifications pour détecter les paiements reçus."))
        assertTrue(connectPhone.visibleTexts().contains("SwimPay ne lit pas vos SMS et ne contrôle pas votre banque."))
        assertEquals("Activer l’accès", connectPhone.primaryAction)

        val banks = catalog.chooseBanksScreen(selectedBankIds = setOf("sber_ru"))
        assertEquals("Choisissez vos banques", banks.title)
        assertEquals("Sélectionnez les banques que vous utilisez pour recevoir vos paiements.", banks.subtitle)
        assertTrue(banks.visibleTexts().contains("Validation manuelle en bêta"))
        assertEquals("Continuer", banks.primaryAction)

        val method = catalog.receivingMethodSetupScreen(selectedType = ReceivingMethodType.CARD_TRANSFER)
        assertEquals("Ajoutez votre moyen de réception", method.title)
        assertEquals("Vos clients utiliseront ces informations pour vous payer.", method.subtitle)
        assertTrue(method.visibleTexts().contains("Carte bancaire"))
        assertTrue(method.visibleTexts().contains("Recevez les paiements sur votre carte."))
        assertTrue(method.visibleTexts().contains("Numéro de téléphone"))
        assertTrue(method.visibleTexts().contains("Pratique pour les virements par numéro."))
        assertEquals("Ajouter", method.primaryAction)

        val testScreen = catalog.configurationTestScreen(MerchantConfigurationChecklist.allReady())
        assertEquals("Test webhook", testScreen.title)
        assertEquals("Lancez un test backend vers votre endpoint, sans notification réelle ni confirmation de paiement.", testScreen.subtitle)
        assertTrue(testScreen.visibleTexts().containsAll(MerchantConfigurationChecklist.REQUIRED_LABELS))
        assertEquals("Lancer le test webhook", testScreen.primaryAction)
    }

    @Test
    fun merchantFacingScreensDoNotExposeForbiddenJargonOrConfirmationClaims() {
        val merchantText = catalog.merchantFacingScreens(includeDeveloperDetails = false)
            .flatMap { it.visibleTexts() }
            .joinToString("\n")

        MerchantUiLanguageContract.forbiddenMerchantFacingTerms.forEach { term ->
            assertFalse("merchant UI exposed forbidden term $term", merchantText.contains(term, ignoreCase = true))
        }
        assertFalse(merchantText.contains("confirmation bancaire", ignoreCase = true))
        assertFalse(merchantText.contains("confirmera automatiquement", ignoreCase = true))
        assertFalse(merchantText.contains("bank_confirmed", ignoreCase = true))
        assertFalse(merchantText.contains("psp_confirmed", ignoreCase = true))
        assertFalse(merchantText.contains("SBP", ignoreCase = true))
    }

    @Test
    fun notificationAccessGateUsesMerchantStatusAndSettingsAction() {
        val disabled = MerchantNotificationAccessGate().evaluate(
            notificationListenerAccessEnabled = false
        )
        assertEquals("Accès notifications", disabled.label)
        assertEquals("Action requise", disabled.statusLabel)
        assertFalse(disabled.allowsNextOnboardingStep)
        assertEquals(NotificationListenerSettingsAction.intentAction, disabled.settingsIntentAction)

        val enabled = MerchantNotificationAccessGate().evaluate(
            notificationListenerAccessEnabled = true
        )
        assertEquals("Activé", enabled.statusLabel)
        assertTrue(enabled.allowsNextOnboardingStep)
    }

    @Test
    fun fiveBanksAndReceivingMethodsUseSimpleMaskedLabelsOnly() {
        val banks = catalog.chooseBanksScreen(selectedBankIds = setOf("sber_ru", "tbank_ru"))
        assertEquals(
            listOf("Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Gazprombank"),
            banks.bankRows.map { it.displayName }
        )
        assertTrue(banks.visibleTexts().contains("Validation manuelle en bêta"))
        assertFalse(banks.visibleTexts().joinToString(" ").contains("package", ignoreCase = true))

        val card = MerchantReceivingMethodDisplay.fromSaved(
            bankDisplayName = "Sberbank",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "2200123412344821",
            enabled = true,
            recommended = true
        )
        val phone = MerchantReceivingMethodDisplay.fromSaved(
            bankDisplayName = "T-Bank",
            type = ReceivingMethodType.PHONE_TRANSFER,
            rawIdentifier = "+79991234567",
            enabled = true,
            recommended = false
        )

        assertEquals("Sberbank · •••• 4821", card.subtitle)
        assertEquals("T-Bank · +7 *** *** 45-67", phone.subtitle)
        assertFalse(card.visibleTexts().joinToString(" ").contains("2200123412344821"))
        assertFalse(phone.visibleTexts().joinToString(" ").contains("+79991234567"))
        assertEquals("Carte bancaire", ReceivingMethodType.CARD_TRANSFER.merchantLabel)
        assertEquals("Numéro de téléphone", ReceivingMethodType.PHONE_TRANSFER.merchantLabel)
    }

    @Test
    fun configurationDashboardReceivingMethodsAndHealthStatesUseApprovedCopy() {
        val actionRequired = catalog.configurationTestScreen(
            MerchantConfigurationChecklist(
                phoneConnected = true,
                bankChosen = true,
                receivingMethodAdded = false,
                connectedSiteReady = false
            )
        )
        assertTrue(actionRequired.visibleTexts().contains("Action requise"))
        assertTrue(actionRequired.visibleTexts().contains("Ajoutez un moyen de réception pour continuer."))
        assertTrue(actionRequired.visibleTexts().contains("Configurez un webhook pour tester l'envoi backend."))

        val dashboard = catalog.dashboardScreen(receiverReady = true)
        assertEquals("Tableau de bord", dashboard.title)
        assertTrue(dashboard.visibleTexts().contains("SwimPay est prêt"))
        assertTrue(dashboard.visibleTexts().contains("Votre téléphone est connecté et vos paiements peuvent être détectés."))
        assertTrue(dashboard.visibleTexts().containsAll(listOf("À vérifier", "Validés aujourd’hui", "Notifications envoyées", "Téléphone")))
        assertTrue(dashboard.visibleTexts().containsAll(listOf("Accueil", "Revue", "Commandes", "Plus")))

        val receivingMethods = catalog.receivingMethodsScreen(
            methods = listOf(
                MerchantReceivingMethodDisplay.masked("Carte bancaire", "Sberbank · •••• 4821"),
                MerchantReceivingMethodDisplay.masked("Numéro de téléphone", "T-Bank · +7 *** *** 45-67")
            )
        )
        assertEquals("Moyens de réception", receivingMethods.title)
        assertTrue(receivingMethods.visibleTexts().contains("Les informations complètes ne sont jamais envoyées dans les webhooks."))
        assertFalse(receivingMethods.visibleTexts().joinToString(" ").contains("2200123412344821"))

        val health = catalog.receiverHealthScreen(notificationAccessEnabled = false)
        assertEquals("Téléphone Receiver", health.title)
        assertTrue(health.visibleTexts().contains("Action nécessaire"))
        assertTrue(health.visibleTexts().contains("L’accès aux notifications est désactivé."))
        assertTrue(health.visibleTexts().contains("Réactiver l’accès"))
        assertTrue(health.visibleTexts().contains("Validation manuelle activée"))
        assertTrue(health.visibleTexts().contains("Automatisation disponible"))
    }

    @Test
    fun reviewQueueDetailAndActionsStayMerchantFriendly() {
        val queue = catalog.reviewQueueScreen()
        assertEquals("Paiements à vérifier", queue.title)
        assertTrue(queue.visibleTexts().contains("Confirmez uniquement les paiements que vous reconnaissez."))
        assertTrue(queue.visibleTexts().containsAll(listOf("Tous", "À vérifier", "Validés", "Rejetés", "Expirés")))
        assertTrue(queue.visibleTexts().contains("Examiner"))

        val detail = catalog.paymentReviewDetailScreen(
            reasonCodes = listOf(
                MerchantReviewReasonCode.MANUAL_VALIDATION_BETA,
                MerchantReviewReasonCode.REFERENCE_NOT_VISIBLE,
                MerchantReviewReasonCode.AMOUNT_ONLY_RECOGNIZED
            )
        )
        assertEquals("Vérifier ce paiement", detail.title)
        assertTrue(detail.visibleTexts().contains("Ce paiement nécessite une validation manuelle."))
        assertTrue(detail.visibleTexts().contains("Pourquoi ce paiement est à vérifier ?"))
        assertTrue(detail.visibleTexts().contains("Validation manuelle en bêta"))
        assertTrue(detail.visibleTexts().contains("Référence non visible"))
        assertTrue(detail.visibleTexts().contains("Seul le montant a été reconnu"))
        assertFalse(detail.visibleTexts().joinToString(" ").contains("MANUAL_VALIDATION_BETA"))
        assertEquals(false, MerchantReviewAction.REJECT_SIGNAL.rejectsOrderByDefault)
        assertEquals(true, MerchantReviewAction.REJECT_ORDER.rejectsOrderByDefault)
    }

    @Test
    fun connectedSiteHidesDeveloperDetailsByDefault() {
        val merchant = catalog.connectedSiteScreen(developerDetailsEnabled = false)
        assertEquals("Site ou application connecté", merchant.title)
        assertTrue(merchant.visibleTexts().contains("Connexion active"))
        assertTrue(merchant.visibleTexts().contains("Afficher les détails développeur"))
        assertFalse(merchant.visibleTexts().joinToString(" ").contains("payment.confirmed"))
        assertFalse(merchant.visibleTexts().joinToString(" ").contains("event_id"))
        assertFalse(merchant.visibleTexts().joinToString(" ").contains("signature"))

        val developer = catalog.connectedSiteScreen(developerDetailsEnabled = true)
        assertTrue(developer.visibleTexts().contains("payment.confirmed"))
        assertTrue(developer.visibleTexts().contains("event_id"))
        assertTrue(developer.visibleTexts().contains("signature status"))
        assertTrue(developer.visibleTexts().contains("delivery attempts"))
    }

    @Test
    fun frontendContractsUseMocksForMissingEndpointsAndDocumentGaps() {
        val contracts = AndroidMerchantFrontendContracts.defaultContracts()

        assertTrue(contracts.onboardingReadiness.supportsLoadingEmptySuccessActionRequiredError)
        assertTrue(contracts.reviewQueue.usesMockRepository)
        assertTrue(contracts.paymentDetail.usesMockRepository)
        assertTrue(contracts.connectedSite.usesMockRepository)
        assertTrue(contracts.receiverHealth.usesExistingLocalModel)
        assertTrue(contracts.missingBackendEndpoints.isNotEmpty())
        assertFalse(contracts.toString().contains("official_bank_confirmation", ignoreCase = true))
    }

    @Test
    fun manifestDoesNotRequestSmsOrAccessibilityScraping() {
        val manifest = File("src/main/AndroidManifest.xml").readText()

        assertFalse(manifest.contains("READ_SMS"))
        assertFalse(manifest.contains("RECEIVE_SMS"))
        assertFalse(manifest.contains("BIND_ACCESSIBILITY_SERVICE"))
        assertFalse(manifest.contains("QUERY_ALL_PACKAGES"))
    }
}
