package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantVisualArchitectureTest {
    @Test
    fun premiumUiIsTheOnlyAndroidMerchantVisualSourceOfTruth() {
        val premiumDir = File("src/main/java/com/swimpay/receiver/ui/premium")
        val legacyScreensDir = File("src/main/java/com/swimpay/receiver/ui/screens")
        val legacyRenderer = File("src/main/java/com/swimpay/receiver/AndroidMerchantScreenRenderer.kt")
        val legacyViewComponents = File("src/main/java/com/swimpay/receiver/AndroidMerchantViewComponents.kt")
        val legacyVisualDesign = File("src/main/java/com/swimpay/receiver/AndroidMerchantVisualDesign.kt")

        assertTrue(premiumDir.exists())
        assertTrue(File(premiumDir, "PremiumMerchantApp.kt").exists())
        assertTrue(File(premiumDir, "PremiumComponents.kt").exists())
        assertTrue(File(premiumDir, "PremiumOnboardingScreens.kt").exists())
        assertTrue(File(premiumDir, "PremiumDashboardScreens.kt").exists())
        assertTrue(File(premiumDir, "PremiumReviewScreens.kt").exists())
        assertTrue(File(premiumDir, "PremiumDesignTokens.kt").exists())
        val legacyScreenFiles = if (legacyScreensDir.exists()) {
            legacyScreensDir.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
        } else {
            emptyList()
        }
        assertTrue("legacy ui/screens package must not contain Kotlin visual files", legacyScreenFiles.isEmpty())
        assertFalse("legacy renderer must be removed", legacyRenderer.exists())
        assertFalse("legacy view components must be removed", legacyViewComponents.exists())
        assertFalse("legacy visual design must be removed", legacyVisualDesign.exists())
    }

    @Test
    fun homeCardVisualSupportsLayeredArtworkWithoutChangingDefaultDashboard() {
        val premiumDir = File("src/main/java/com/swimpay/receiver/ui/premium")
        val cardVisual = File(premiumDir, "CardVisual.kt").readText()
        val cardTheme = File(premiumDir, "CardVisualTheme.kt").readText()
        val cardLayers = File(premiumDir, "CardVisualLayers.kt").readText()
        val cardDefaults = File(premiumDir, "CardVisualDefaults.kt").readText()
        val premiumDashboard = File(premiumDir, "PremiumDashboardScreens.kt").readText()

        assertTrue(cardVisual.contains("fun CardVisual("))
        assertTrue(cardVisual.contains("CardSurfaceLayer("))
        assertTrue(cardVisual.contains("SurfaceTextureLayer("))
        assertTrue(cardVisual.contains("ArtworkSkinLayer("))
        assertTrue(cardVisual.contains("SurfaceEffectsLayer("))
        assertTrue(cardVisual.contains("CardDetailsLayer("))
        assertTrue(cardTheme.contains("surfaceTextureRes: Int?"))
        assertTrue(cardTheme.contains("surfaceTextureAlpha: Float"))
        assertTrue(cardTheme.contains("surfaceTextureScale: Float"))
        assertTrue(cardTheme.contains("surfaceTextureContentScale: ContentScale"))
        assertTrue(cardTheme.contains("artworkRes: Int?"))
        assertTrue(cardTheme.contains("artworkAlpha: Float"))
        assertTrue(cardTheme.contains("artworkScale: Float"))
        assertTrue(cardTheme.contains("artworkOffsetX: Dp"))
        assertTrue(cardTheme.contains("artworkOffsetY: Dp"))
        assertTrue(cardTheme.contains("artworkRotation: Float"))
        assertTrue(cardLayers.contains("graphicsLayer"))
        assertTrue(cardLayers.contains("clip(cardShape)"))
        assertTrue(cardLayers.contains("ContentScale.Crop"))
        assertTrue(cardLayers.contains("textureRes ?: return"))
        assertTrue(cardLayers.contains("SurfaceFinishTextureLayer("))
        assertTrue(cardDefaults.contains("DragonGoldPreview"))
        assertTrue(cardDefaults.contains("HomeDashboardDragonGoldCandidate"))
        assertTrue(cardDefaults.contains("HomeDashboardDragonGoldMaterial"))
        assertTrue(cardDefaults.contains("HomeDashboardDragonGoldTrial"))
        assertTrue(cardDefaults.contains("surfaceTextureAlpha = 0.32f"))
        assertTrue(cardDefaults.contains("R.drawable.card_texture_brushed_black_metal"))
        assertTrue(cardDefaults.contains("Color(0xFF010204)"))
        assertTrue(cardDefaults.contains("Color(0xFF030509)"))
        assertTrue(cardDefaults.contains("Color(0xFF0A0704)"))
        assertTrue(cardDefaults.contains("R.drawable.card_artwork_dragon_gold"))
        assertTrue(File("src/main/res/drawable-nodpi/card_artwork_dragon_gold.png").exists())
        assertTrue(File("src/main/res/drawable-nodpi/card_texture_brushed_black_metal.webp").exists())
        assertTrue(premiumDashboard.contains("MonthlyActivityCard"))
        assertTrue(premiumDashboard.contains("CardVisual("))
        assertTrue(premiumDashboard.contains("CardVisualDefaults.HomeDashboard"))
        assertTrue(premiumDashboard.contains("CardVisualDefaults.HomeDashboardDragonGoldMaterial"))
        assertTrue(premiumDashboard.contains("TODO: migrate card container from fixed height to bank-card aspectRatio(1.586f) after visual parity validation."))
        assertFalse(premiumDashboard.contains("card_artwork_dragon_gold"))
    }

    @Test
    fun mainActivityDelegatesVisualRenderingToComposeScreens() {
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val premiumComponents = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumReviews = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt").readText()
        val premiumRuntime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()
        val readiness = File("src/main/java/com/swimpay/receiver/ReceiverOnboardingReadiness.kt").readText()
        val theme = File("src/main/java/com/swimpay/receiver/ui/theme/Theme.kt").readText()

        assertTrue(mainActivity.contains("setContent"))
        assertTrue(mainActivity.contains("PremiumMerchantRuntime.forAppBuild("))
        assertTrue(mainActivity.contains("PremiumMerchantApp("))
        assertTrue(mainActivity.contains("NotificationAccessStatusReader"))
        assertTrue(mainActivity.contains("SharedPreferencesPremiumOnboardingStateStore"))
        assertTrue(premiumApp.contains("fun PremiumMerchantApp("))
        assertTrue(premiumApp.contains("PremiumNavigation.initialRoute"))
        assertTrue(premiumApp.contains("PremiumRoute.PaymentDetail"))
        assertTrue(premiumApp.contains("PremiumMainTab.Home"))
        assertFalse(premiumApp.contains("mutableIntStateOf"))
        assertFalse(premiumApp.contains("route =="))
        assertFalse(premiumApp.contains("""route = "payment_detail""""))
        assertTrue(premiumApp.contains("markCompleted"))
        assertFalse(premiumApp.contains("""mutableStateOf("landing")"""))
        assertFalse(premiumApp.contains("AndroidMerchantScreenRenderer"))
        assertFalse(premiumApp.contains("AndroidMerchantViewComponents"))
        assertFalse(premiumApp.contains("ui.screens"))
        assertTrue(premiumOnboarding.contains("fun PremiumLandingScreen"))
        assertTrue(premiumOnboarding.contains("fun PremiumOnboardingFlow"))
        assertTrue(premiumOnboarding.contains("openNotificationSettings"))
        assertTrue(premiumOnboarding.contains("Recevez vos paiements plus facilement"))
        assertTrue(premiumOnboarding.contains("Connectez votre téléphone"))
        assertTrue(premiumOnboarding.contains("Activer l'accès"))
        // Receiving-first flow: the manual bank-allowlist step is removed; the
        // receiving-method step is the single place the user declares what they receive on.
        assertFalse(premiumOnboarding.contains("SwimPay recherche uniquement les banques compatibles."))
        assertFalse(premiumOnboarding.contains("Activer ces banques"))
        assertTrue(premiumOnboarding.contains("Ajoutez votre moyen de réception"))
        assertTrue(premiumOnboarding.contains("Connectez votre site ou application"))
        assertTrue(premiumOnboarding.contains("Lancer le test webhook"))
        assertFalse(premiumOnboarding.contains("Tester sans site connecté"))
        assertTrue(readiness.contains("Settings.EXTRA_APP_PACKAGE"))
        assertTrue(mainActivity.contains("NotificationListenerSettingsAction.createIntent(packageName)"))
        assertFalse(premiumOnboarding.contains("paiements automatiques", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("Profil Marchand", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("Policy Engine", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("AI (EXPERT)", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("ALGORITHME DE CONFIANCE", ignoreCase = true))
        assertTrue(premiumComponents.contains("fun PremiumAppShell"))
        assertTrue(premiumComponents.contains("fun PremiumNavigationBar"))
        assertTrue(premiumComponents.contains("PremiumMainTab.entries"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Home -> Icons.Default.Home"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Reviews -> Icons.AutoMirrored.Filled.ReceiptLong"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Payment -> Icons.Default.AccountBalanceWallet"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Business -> Icons.Default.Business"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Settings -> Icons.Default.Settings"))
        assertTrue(premiumComponents.contains("fun PremiumStatePanel"))
        assertTrue(premiumDashboard.contains("fun PremiumDashboardScreen"))
        assertTrue(premiumDashboard.contains("PremiumScreenState<PremiumDashboardUiState>"))
        assertTrue(premiumDashboard.contains("PremiumScreenState<PremiumOrdersUiState>"))
        assertFalse(premiumDashboard.contains("""items(listOf("ord_123""""))
        assertTrue(premiumReviews.contains("fun PremiumReviewsScreen"))
        assertTrue(premiumReviews.contains("PremiumScreenState<PremiumReviewsUiState>"))
        assertTrue(premiumReviews.contains("PremiumScreenState<PremiumPaymentDetailUiState>"))
        assertTrue(premiumReviews.contains("PremiumStatePanel"))
        assertTrue(premiumDashboard.contains("fun PremiumOrdersScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumSettingsScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumReceivingMethodsStateScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumBanksStateScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumReceiverHealthStateScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumConfirmationModeScreen"))
        assertTrue(premiumDashboard.contains("fun PremiumSecurityScreen"))
        assertTrue(premiumDashboard.contains("onNavigate"))
        assertTrue(premiumApp.contains("PremiumNavigation.openReceivingMethods()"))
        assertTrue(premiumApp.contains("PremiumNavigation.openBanks()"))
        assertTrue(premiumApp.contains("PremiumNavigation.openReceiverHealth()"))
        assertTrue(premiumApp.contains("PremiumNavigation.openConfirmationMode()"))
        assertTrue(premiumApp.contains("PremiumNavigation.openSecurity()"))
        assertTrue(premiumApp.contains("PremiumSecurityScreen("))
        assertTrue(premiumApp.contains("route = PremiumNavigation.openAccountRecovery"))
        assertTrue(premiumReviews.contains("onConfirmReceived"))
        assertFalse(premiumReviews.contains("Confirmer le paiement"))
        assertTrue(premiumReviews.contains("onRejectSignal"))
        assertTrue(premiumReviews.contains("onRejectOrder"))
        assertTrue(premiumRuntime.contains("fun rejectSignal"))
        assertTrue(premiumRuntime.contains("fun rejectOrder"))
        assertFalse(premiumRuntime.contains("return PremiumDashboardUiState.preview()"))
        assertFalse(premiumRuntime.contains("return PremiumPaymentDetailUiState.preview(reviewId)"))
        assertFalse(premiumRuntime.contains("PremiumReviewsUiState.preview().copy"))
        assertTrue(premiumRuntime.contains("fun disconnected()"))
        assertTrue(premiumRuntime.contains("NoopMerchantApiTransport"))
        assertFalse(premiumRuntime.contains("sendsDeveloperWebhookDirectly = true"))
        assertTrue(theme.contains("fun SwimPayMerchantTheme("))
    }

    @Test
    fun visualMerchantModelDoesNotExposeForbiddenPublicWording() {
        val merchantText = AndroidMerchantUiCatalog().merchantFacingScreens(includeDeveloperDetails = false)
            .flatMap { it.visibleTexts() }
            .joinToString("\n")

        MerchantUiLanguageContract.forbiddenMerchantFacingTerms.forEach { term ->
            assertFalse("merchant visual UI exposed forbidden term $term", merchantText.contains(term, ignoreCase = true))
        }
        assertFalse(merchantText.contains("confirmation bancaire officielle", ignoreCase = true))
        assertFalse(merchantText.contains("auto-confirm", ignoreCase = true))
    }

    @Test
    fun premiumSourceDoesNotExposeRawPiiSecretsOrOfficialBankConfirmationClaims() {
        val premiumText = File("src/main/java/com/swimpay/receiver/ui/premium")
            .walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { it.readText() }

        val forbiddenPublicTerms = listOf(
            "package/cert",
            "TO_VERIFY",
            "approved_for_review_only",
            "webhook_secret",
            "raw notification",
            "raw_notification",
            "confirmation bancaire officielle",
            "bank_confirmed",
            "psp_confirmed",
            "guaranteed_payment"
        )

        forbiddenPublicTerms.forEach { term ->
            assertFalse("premium UI exposed forbidden term $term", premiumText.contains(term, ignoreCase = true))
        }
        listOf("\u00C3", "\u00E2").forEach { mojibakeMarker ->
            assertFalse("premium UI source contains broken encoding marker", premiumText.contains(mojibakeMarker))
        }
        assertFalse(premiumText.contains("official_bank_confirmation = true", ignoreCase = true))
        assertFalse(premiumText.contains("2200123412344821"))
        assertFalse(premiumText.contains("+79991234567"))
    }

    @Test
    fun dashboardMetricsAreBackendWiredAndKeepShortLabels() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumRuntime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()
        val apiWiring = File("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt").readText()
        val mainCard = sourceFunction(premiumDashboard, "private fun MonthlyActivityCard")
        val mainCardDetails = sourceFunction(premiumDashboard, "internal fun MonthlyActivityCardDetails")

        assertTrue(premiumRuntime.contains("Paiements confirm\u00e9s"))
        assertTrue(apiWiring.contains("metrics_summary"))
        assertTrue(apiWiring.contains("metrics_timeseries"))
        assertTrue(mainCardDetails.contains("AccountBalanceWallet"))
        // T6 « papier calme » : hero encre chaude unique, themes dragon/oni reserves aux previews QA.
        assertTrue(mainCard.contains("val cardTheme = CardVisualDefaults.HomeDashboardPaper"))
        assertFalse(mainCard.contains("HomeDashboardDragonGoldMaterial"))
        assertFalse(mainCard.contains("HomeDashboardDark"))
        assertTrue(premiumDashboard.contains("ChartMetricPill(language.ui(\"Montant\"), state.chartConfirmedAmountLabel"))
        assertTrue(premiumDashboard.contains("state.chartConfirmedAmountLabel"))
        assertTrue(premiumDashboard.contains("state.chartConfirmationRateLabel"))
        assertFalse(mainCard.contains("Paiement suivi"))
        assertFalse(mainCard.contains("Paiements suivis"))
        assertFalse(premiumDashboard.contains("Montant / taux"))
        assertFalse(mainCard.contains("+12.5%"))
        assertFalse(premiumDashboard.contains("BentoMetricCard(\"0\", \"REJET"))
        assertFalse(premiumDashboard.contains("BentoMetricCard(\"5\", \"BANQUES ACTIVES"))
    }

    @Test
    fun googleAccountLinkingAppearsOnlyInSecuritySettings() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val securitySource = sourceFunction(premiumDashboard, "fun PremiumSecurityScreen")
        val googleRowSource = sourceFunction(premiumDashboard, "private fun GoogleAccountLinkRow")
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val navigation = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumNavigationState.kt").readText()
        val accountScreens = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt").readText()
        val settingsState = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantSettingsState.kt").readText()

        assertTrue(securitySource.contains("GoogleAccountLinkRow"))
        assertTrue(premiumDashboard.contains("PremiumGoogleIcon"))
        assertTrue(googleRowSource.contains("Lier le compte Google"))
        assertTrue(googleRowSource.contains("reconnexion", ignoreCase = true))
        assertTrue(googleRowSource.contains("sauvegarde", ignoreCase = true))
        assertTrue(navigation.contains("data class GoogleAccountLink"))
        assertTrue(navigation.contains("fun openGoogleAccountLink"))
        assertTrue(accountScreens.contains("fun PremiumGoogleAccountLinkScreen"))
        assertTrue(settingsState.contains("googleAccountLinked"))
        assertTrue(settingsState.contains("saveGoogleAccountLinked"))
        assertTrue(premiumApp.contains("PremiumNavigation.openGoogleAccountLink"))
        assertTrue(premiumApp.contains("accountAuthRepository?.googleLink"))
        assertTrue(premiumApp.contains("merchantSettingsStore.saveGoogleAccountLinked(true)"))
        val securityLinkFlow = sourceBetween(premiumApp, "onGoogleAccountLink = {", "PremiumRoute.HelpCenter")
        assertFalse(securityLinkFlow.contains("openAccountRecovery"))
        assertFalse(securityLinkFlow.contains("googleExchange"))
        assertFalse(googleRowSource.contains("Google requis", ignoreCase = true))
        assertFalse(googleRowSource.contains("Google obligatoire", ignoreCase = true))
        assertFalse(googleRowSource.contains("required", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("Google", ignoreCase = true))
        listOf("Prénom", "Nom de famille", "first name", "last name").forEach { forbidden ->
            assertFalse("onboarding must not collect merchant names: $forbidden", premiumOnboarding.contains(forbidden, ignoreCase = true))
        }
    }

    @Test
    fun securityScreenOnlyShowsWorkingAppLockAndGoogleLink() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val securitySource = sourceFunction(premiumDashboard, "fun PremiumSecurityScreen")

        assertTrue(securitySource.contains("GoogleAccountLinkRow"))
        assertTrue(securitySource.contains("Verrouillage de l"))
        assertTrue(securitySource.contains("PremiumLockTimeout.entries"))
        listOf(
            "Code PIN",
            "Mot de passe",
            "Empreinte",
            "Reconnaissance faciale",
            "Sessions connect",
            "Capacites du telephone"
        ).forEach { forbidden ->
            assertFalse("security screen must not show non-functional option: $forbidden", securitySource.contains(forbidden, ignoreCase = true))
        }
    }

    @Test
    fun premiumOperatingModelUsesIaConfirmationCopyWithoutEnablingAndroidDecisioning() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val receiverBoundaries = File("src/main/java/com/swimpay/receiver/ReceiverBoundaries.kt").readText()
        val apiWiring = File("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt").readText()

        assertTrue(premiumDashboard.contains("Mode manuel V1"))
        assertTrue(premiumDashboard.contains("Assistance de revue"))
        assertTrue(premiumDashboard.contains("Lecture seule"))
        assertFalse(premiumDashboard.contains("IA - Prochaine mise a jour"))
        assertFalse(premiumDashboard.contains("Assisté — Disponible"))
        assertFalse(premiumDashboard.contains("Activer la confirmation IA"))
        assertTrue(premiumOnboarding.contains("Confirmation simple"))
        assertTrue(premiumOnboarding.contains("Confirmez ou rejetez en quelques secondes."))
        assertTrue(premiumOnboarding.contains("Test webhook"))
        assertTrue(premiumOnboarding.contains("déclenché par le backend"))
        assertFalse(premiumOnboarding.contains("CONFIRMATION MANUELLE"))
        assertFalse(premiumOnboarding.contains("IA PLUS TARD"))
        assertFalse(premiumOnboarding.contains("FINALISER LA CONFIGURATION"))
        assertFalse(premiumOnboarding.contains("MODE DE VALIDATION", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("REVUE HUMAINE", ignoreCase = true))
        assertFalse(premiumOnboarding.contains("FINALISER LE LINK", ignoreCase = true))
        assertFalse(premiumDashboard.contains("auto-confirm bancaire", ignoreCase = true))
        assertTrue(receiverBoundaries.contains("androidConfirmsPayments: Boolean = false"))
        assertTrue(apiWiring.contains("sendsDeveloperWebhookDirectly: Boolean = false"))
    }

    @Test
    fun onboardingBankDetectionUsesRuntimeTargetLockInsteadOfStaticStatuses() {
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()

        assertTrue(premiumApp.contains("activeRuntime.loadBanks(enabledBankProfileIds = receiverRuntimeConfigStore?.load()?.enabledBankProfileIds ?: emptySet())"))
        // Receiving-first: onboarding no longer consumes a separate bank-detection state;
        // the Banks management screen still derives its rows from the runtime target lock.
        assertTrue(premiumApp.contains("PremiumBanksStateScreen(banksState"))
        assertFalse(premiumOnboarding.contains("bankTargetsState: PremiumScreenState<PremiumBanksUiState>"))
        assertFalse(premiumOnboarding.contains("\"Sberbank\" to \"Détectée\""))
        assertFalse(premiumOnboarding.contains("\"VTB\" to \"Non détectée\""))
        assertTrue(mainActivity.contains("PackageManagerExactPackageProbe(this)"))
    }

    @Test
    fun premiumReceivingMethodComposeExposesOperationalDraftWithoutRawSavedDisplay() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val bankCatalog = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumReceivingMethodBankCatalog.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val receivingSource = sourceFunction(premiumDashboard, "fun PremiumReceivingMethodsStateScreen")
        val draftPanelSource = sourceFunction(premiumDashboard, "private fun ReceivingMethodDraftPanel")
        val onboardingSource = sourceFunction(premiumOnboarding, "private fun ReceivingMethodDetailsStep")

        assertTrue(receivingSource.contains("onSaveDraft"))
        assertTrue(receivingSource.contains("rememberLazyListState"))
        assertTrue(receivingSource.contains("animateScrollToItem"))
        assertTrue(receivingSource.contains("ReceivingMethodDraftPanel"))
        assertTrue(receivingSource.contains("onEditMethod"))
        assertTrue(receivingSource.contains("onReplaceMethod"))
        assertTrue(receivingSource.contains("onDisableMethod"))
        assertTrue(receivingSource.contains("onSetDefaultMethod"))
        assertTrue(receivingSource.contains("onDeleteMethod"))
        assertTrue(receivingSource.contains("Ajouter une carte"))
        assertTrue(receivingSource.contains("Ajouter téléphone SBP"))
        assertTrue(receivingSource.contains("ReceivingMethodActionButton"))
        assertTrue(premiumDashboard.contains("ReceivingMethodMutationButton"))
        assertTrue(premiumDashboard.contains("Icons.Default.Edit"))
        assertTrue(premiumDashboard.contains("Icons.Default.Block"))
        assertTrue(premiumDashboard.contains("Icons.Default.Star"))
        assertTrue(premiumDashboard.contains("Icons.Default.Delete"))
        assertTrue(premiumDashboard.contains("ReceivingMethodDeleteDialog("))
        assertTrue(premiumDashboard.contains("Dialog(onDismissRequest = onCancel)"))
        assertTrue(premiumDashboard.contains("language.ui(\"Confirmer\")"))
        assertFalse(premiumDashboard.contains("\"delete\" -> ReceivingMethodConfirmPanel"))
        assertTrue(premiumDashboard.contains("Banque compatible"))
        assertTrue(premiumDashboard.contains("Destination de réception"))
        assertTrue(premiumDashboard.contains("Seule la version masquée sera affichée dans l'app."))
        assertTrue(premiumDashboard.contains("fun CompactReceivingBankSelector("))
        assertTrue(premiumDashboard.contains("LazyRow("))
        assertTrue(draftPanelSource.contains("CompactReceivingBankSelector("))
        assertFalse(draftPanelSource.contains("bankOptions.forEach { bank ->"))
        assertTrue(onboardingSource.contains("CompactReceivingBankSelector("))
        assertTrue(onboardingSource.contains("leadingIcon ="))
        assertTrue(onboardingSource.contains("Icons.Default.CreditCard"))
        assertTrue(onboardingSource.contains("Icons.Default.PhoneAndroid"))
        assertFalse(onboardingSource.contains("bankOptions.forEach { bank ->"))
        assertTrue(premiumDashboard.contains("PremiumReceivingMethodBankCatalog.availableBanks"))
        // Receiving-first onboarding consumes the unified catalog (all regions incl. WA),
        // not the RU+INT-only availableBanks list.
        assertTrue(premiumOnboarding.contains("ReceivingCatalog.allMethods"))
        assertTrue(bankCatalog.contains("BankTargetLock.supportedTargets"))
        assertTrue(bankCatalog.contains("bankProfileId"))
        assertTrue(bankCatalog.contains("displayName"))
        assertTrue(premiumDashboard.contains("Numéro de carte"))
        assertTrue(premiumDashboard.contains("Numéro de téléphone"))
        assertTrue(receivingSource.contains("Modifier la destination"))
        assertTrue(receivingSource.contains("Enregistrer"))
        assertTrue(receivingSource.contains("Les informations complètes ne sont jamais envoyées dans les webhooks."))
        assertTrue(receivingSource.contains("clearDraftSignal"))
        assertTrue(receivingSource.contains("LaunchedEffect(clearDraftSignal)"))
        assertFalse(receivingSource.contains("identifierInput = cleared.rawIdentifierInput"))
        assertFalse(receivingSource.contains("rawIdentifier)"))
        assertFalse(receivingSource.contains("method.actions.forEach"))
        assertFalse(receivingSource.contains("payment.confirmed"))
        assertTrue(premiumApp.contains("createReceivingMethod("))
        assertTrue(premiumApp.contains("replaceReceivingMethod("))
        assertTrue(premiumApp.contains("disableReceivingMethod("))
        assertTrue(premiumApp.contains("markReceivingMethodRecommended("))
        assertTrue(premiumApp.contains("updateReceivingMethodLabel("))
        assertTrue(premiumApp.contains("deleteReceivingMethod("))
        assertTrue(premiumApp.contains("loadReceivingMethods()"))

        assertTrue(onboardingSource.contains("selectedBankDisplayName"))
        assertTrue(premiumOnboarding.contains("SwimPayLauncherBadge"))
        assertTrue(onboardingSource.contains("CompactReceivingBankSelector"))
        assertTrue(onboardingSource.contains("Carte bancaire"))
        assertTrue(onboardingSource.contains("Numéro de téléphone"))
        assertTrue(premiumDashboard.contains("Banque compatible"))
        assertTrue(onboardingSource.contains("Enregistrer et continuer"))
        assertTrue(onboardingSource.contains("Pratique pour les virements via SBP."))
        assertFalse(onboardingSource.contains("sbp_transfer"))
    }

    @Test
    fun standalonePremiumScreensReserveSystemBarsAndLongTitleSpace() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val standaloneSource = sourceFunction(premiumDashboard, "private fun PremiumStandaloneStateScreen")

        assertTrue(standaloneSource.contains(".statusBarsPadding()"))
        assertTrue(standaloneSource.contains(".heightIn(min = 96.dp)"))
        assertTrue(standaloneSource.contains("Modifier.weight(1f)"))
        assertTrue(standaloneSource.contains("lineHeight = 28.sp"))
        assertFalse(standaloneSource.contains(".height(64.dp)"))
    }

    @Test
    fun developerIntegrationScreenUsesThemeTokensAndStandaloneBackground() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val connectedSiteSource = sourceFunction(premiumDashboard, "fun PremiumConnectedSiteStateScreen")
        val valueRowSource = sourceFunction(premiumDashboard, "private fun DeveloperIntegrationValueRow")
        val standaloneSource = sourceFunction(premiumDashboard, "private fun PremiumStandaloneStateScreen")

        assertTrue(standaloneSource.contains("PremiumPaperBackground(Modifier.matchParentSize())"))
        assertTrue(connectedSiteSource.contains("PremiumColors.PanelTint"))
        assertTrue(valueRowSource.contains("PremiumColors.SurfaceAlt"))
        assertFalse(connectedSiteSource.contains("Color("))
        assertFalse(connectedSiteSource.contains("0xFF"))
        assertFalse(valueRowSource.contains("Color("))
        assertFalse(valueRowSource.contains("0xFF"))
        assertFalse(standaloneSource.contains("Color("))
        assertFalse(standaloneSource.contains("0xFF"))
    }

    @Test
    fun developerIntegrationScreenOffersSafeCopyActionForDeveloperExport() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val premiumRuntime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()
        val connectedSiteSource = sourceFunction(premiumDashboard, "fun PremiumConnectedSiteStateScreen")
        val connectedSiteRoute = sourceBetween(premiumApp, "PremiumRoute.ConnectedSite -> PremiumConnectedSiteStateScreen(", "PremiumRoute.ConfigurationTest ->")

        assertTrue(premiumRuntime.contains("fun developerExportText(): String"))
        assertTrue(premiumRuntime.contains("fun clearDeveloperShowOnceExport"))
        assertTrue(premiumRuntime.contains("DEVELOPER_SHOW_ONCE_COPY_TTL_MS"))
        assertTrue(premiumDashboard.contains("ClipData.newPlainText(\"SwimPay developer export\", exportText)"))
        assertTrue(connectedSiteSource.contains("LocalContext.current"))
        assertTrue(connectedSiteSource.contains("context.copyDeveloperExportToClipboard(onCopyDeveloperExport(value))"))
        assertTrue(connectedSiteSource.contains("onAuthorizeCopy: (onAuthorized: () -> Unit) -> Unit = { onAuthorized -> onAuthorized() }"))
        assertTrue(connectedSiteSource.contains("onCopyDeveloperExport: (PremiumConnectedSiteUiState) -> String"))
        assertTrue(connectedSiteSource.contains("onOpenDeveloperGuide: () -> Unit = {}"))
        assertTrue(connectedSiteSource.contains("\"Guide SDK (PDF)\""))
        assertTrue(connectedSiteSource.contains("onAuthorizeCopy {"))
        assertTrue(connectedSiteSource.contains("onClick = onOpenDeveloperGuide"))
        assertTrue(connectedSiteRoute.contains("onAuthorizeCopy = { onAuthorized -> onRequestUnlock(onAuthorized) }"))
        assertTrue(connectedSiteRoute.contains("onOpenDeveloperGuide = {"))
        assertTrue(connectedSiteRoute.contains("onCopyDeveloperExport = { value ->"))
        assertTrue(connectedSiteRoute.contains("activeRuntime.consumeDeveloperExportText(value)"))
        assertTrue(connectedSiteSource.contains("contentDescription = \"Copier\""))
        assertTrue(connectedSiteSource.contains("Icons.Default.ContentCopy"))
        assertFalse(connectedSiteSource.contains("Copier pour dev"))
        assertFalse(connectedSiteSource.contains("secretKeyOnce"))
        assertFalse(connectedSiteSource.contains("webhookSecretOnce"))
    }

    @Test
    fun premiumRuntimeScreensDoNotUseStaticMerchantProfileOrReadinessData() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumComponents = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val premiumRuntime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()
        val apiWiring = File("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt").readText()

        assertFalse("runtime menu must not show fake initials", premiumDashboard.contains("""Text("JD""""))
        assertFalse("runtime top chrome must not show fake initials", premiumComponents.contains("""Text("JD""""))
        assertFalse("runtime top chrome must not show static SwimPay initials as merchant profile", premiumComponents.contains("""Text("S.""""))
        assertTrue(premiumComponents.contains("profileInitials: String"))
        assertFalse("runtime top chrome should not render profile initials text", premiumComponents.contains("Text(profileInitials"))
        assertFalse("runtime menu must not show fake UID", premiumDashboard.contains("UID: #7114-4466-8301"))
        assertTrue(premiumDashboard.contains("PremiumMerchantProfileUiState"))
        assertTrue(premiumApp.contains("currentMerchantProfileUiState"))
        assertTrue(premiumApp.contains("profileInitials = currentMerchantProfileUiState().initials"))
        assertFalse("configuration runtime must not assume all checklist items ready", premiumApp.contains("runConfigurationTest(MerchantConfigurationChecklist.allReady())"))
        assertTrue(premiumApp.contains("currentConfigurationChecklist("))
        assertFalse("receiver health must not invent fixed bank count", premiumRuntime.contains("allowedBanksCount = 5"))
        assertFalse("receiver health must not invent trusted bank count", premiumRuntime.contains("trustedBanksCount = 0"))
        assertFalse("receiver health must not invent outbox depth", premiumRuntime.contains("queueLength = 0"))
        assertFalse("payment detail must not invent a relative signal age", apiWiring.contains("\"Il y a 2 min\""))
    }

    @Test
    fun premiumPolishUsesSharedBankCatalogAndRealReviewFilters() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val premiumReviews = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumReviewScreens.kt").readText()

        assertTrue(premiumDashboard.contains("PremiumReceivingMethodBankCatalog.availableBanks"))
        // Onboarding shares the unified receiving catalog (single source of truth, all regions).
        assertTrue(premiumOnboarding.contains("ReceivingCatalog.allMethods"))
        assertFalse(premiumDashboard.contains("private val ReceivingMethodBankOptions"))
        assertFalse(premiumOnboarding.contains("private val OnboardingReceivingMethodBankOptions"))
        assertTrue(premiumReviews.contains("selectedFilter"))
        assertTrue(premiumReviews.contains("filteredItems"))
        assertTrue(premiumReviews.contains("filter.countFor(state.items)"))
        assertTrue(premiumReviews.contains("ReviewUiStatus"))
        assertFalse(premiumReviews.contains("status.contains("))
        assertFalse(premiumReviews.contains("FilterLabel(Icons.Default.Sync, \"À confirmer\", true"))
    }

    @Test
    fun developerAndConfirmationPolishDoNotShowMisleadingPlaceholdersOrAutoConfirmOptions() {
        val apiWiring = File("src/main/java/com/swimpay/receiver/AndroidMerchantApiWiring.kt").readText()
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()

        assertTrue(apiWiring.contains("# EXTERNAL_APP_BASE_URL non configuree"))
        assertFalse(apiWiring.contains("""EXTERNAL_APP_BASE_URL=${'$'}safeExternalBaseUrl"""))
        assertTrue(apiWiring.contains("EXTERNAL_APP_BASE_URL_EXAMPLE"))
        assertFalse(apiWiring.contains("EXTERNAL_APP_BASE_URL=https://votre-app.example"))
        assertTrue(premiumDashboard.contains("Mode manuel V1"))
        assertFalse(premiumDashboard.contains("Assisté — Disponible"))
        assertFalse(premiumDashboard.contains("IA - Prochaine mise a jour"))
        assertFalse(premiumDashboard.contains("Automatisation disponible"))
    }

    @Test
    fun appLockPreventsSensitiveRuntimeLoadsWhileUiLocked() {
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val registrationEffect = sourceBetween(
            premiumApp,
            "LaunchedEffect(activeRuntime, notificationAccessEnabled",
            "fun finishOnboarding"
        )
        val routeLoadEffect = sourceBetween(
            premiumApp,
            "LaunchedEffect(route, activeRuntime",
            "\n    if (uiLocked) {"
        )

        assertTrue(registrationEffect.contains("uiLocked"))
        assertTrue(registrationEffect.contains("if (uiLocked) return@LaunchedEffect"))
        assertTrue(routeLoadEffect.contains("uiLocked"))
        assertTrue(routeLoadEffect.contains("if (uiLocked) return@LaunchedEffect"))
        assertTrue(routeLoadEffect.indexOf("if (uiLocked) return@LaunchedEffect") < routeLoadEffect.indexOf("loadConnectedSite"))
        assertTrue(routeLoadEffect.indexOf("if (uiLocked) return@LaunchedEffect") < routeLoadEffect.indexOf("loadReviews"))
    }

    @Test
    fun reviewDecisionActionsRunNetworkCallsOffTheComposeMainThread() {
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val confirmAction = sourceBetween(premiumApp, "onConfirmReceived = {", "onRejectSignal = {")
        val rejectSignalAction = sourceBetween(premiumApp, "onRejectSignal = {", "onRejectOrder = {")
        val rejectOrderAction = sourceBetween(premiumApp, "onRejectOrder = {", "\n        )\n        is PremiumRoute.Main")

        listOf(
            "confirmReceived" to confirmAction,
            "rejectSignal" to rejectSignalAction,
            "rejectOrder" to rejectOrderAction
        ).forEach { (methodName, actionSource) ->
            assertTrue("$methodName must launch asynchronously from Compose", actionSource.contains("scope.launch"))
            assertTrue("$methodName must execute backend IO off the main thread", actionSource.contains("withContext(Dispatchers.IO)"))
            assertTrue("$methodName must still call the backend-owned runtime action", actionSource.contains("activeRuntime.$methodName(currentRoute.reviewId)"))
        }
    }

    @Test
    fun androidLauncherUsesSwimPayAppIconResources() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        val adaptiveIcon = File("src/main/res/mipmap-anydpi-v26/ic_launcher.xml")
        val adaptiveRoundIcon = File("src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml")
        val xxhdpiIcon = File("src/main/res/mipmap-xxhdpi/ic_launcher.webp")
        val vectorForeground = File("src/main/res/drawable/ic_launcher_foreground.xml")
        val launcherBackground = File("src/main/res/values/colors.xml")
        val notificationIcon = File("src/main/res/drawable/ic_notification_small.xml")
        val merchantReviewNotifier = File("src/main/java/com/swimpay/receiver/AndroidMerchantReviewNotifier.kt").readText()
        val debugSyntheticSource = File("src/main/java/com/swimpay/receiver/DebugSyntheticNotificationSource.kt").readText()

        assertTrue(manifest.contains("""android:icon="@mipmap/ic_launcher""""))
        assertTrue(manifest.contains("""android:roundIcon="@mipmap/ic_launcher_round""""))
        assertTrue(adaptiveIcon.exists())
        assertTrue(adaptiveRoundIcon.exists())
        assertTrue(notificationIcon.exists())
        val notificationIconSource = notificationIcon.readText()
        assertTrue("notification small icon must be an Android vector drawable", notificationIconSource.contains("<vector"))
        assertTrue("notification vector must expose Android small-icon intrinsic size", notificationIconSource.contains("""android:width="24dp""""))
        assertTrue("notification vector must keep the traced 256 viewport", notificationIconSource.contains("""android:viewportWidth="256""""))
        assertTrue("notification icon must be monochrome white", notificationIconSource.contains("""android:fillColor="#FFFFFFFF""""))
        assertFalse("notification small icon must not use the old wave stroke logo", notificationIconSource.contains("strokeWidth"))
        assertTrue(merchantReviewNotifier.contains("R.drawable.ic_notification_small"))
        assertTrue(debugSyntheticSource.contains("R.drawable.ic_notification_small"))
        assertFalse(merchantReviewNotifier.contains("android.R.drawable.ic_dialog_info"))
        assertFalse(debugSyntheticSource.contains("android.R.drawable.stat_notify_more"))
        assertTrue(xxhdpiIcon.exists())
        assertTrue(vectorForeground.exists())
        assertTrue(launcherBackground.readText().contains("ic_launcher_background"))
        assertTrue(adaptiveIcon.readText().contains("@mipmap/ic_launcher_foreground"))
        assertTrue(adaptiveRoundIcon.readText().contains("@mipmap/ic_launcher_foreground"))
        assertTrue(vectorForeground.readText().contains("swimpay three-wave launcher mark"))
        assertFalse(adaptiveIcon.readText().contains("monochrome"))
        assertFalse(adaptiveRoundIcon.readText().contains("monochrome"))
        assertTrue("launcher WebP should come from IconKitchen output", xxhdpiIcon.length() > 100L)
    }

    @Test
    fun visualQualityGateLocksOfficialAssetsAndPreventsNewRuntimeLogos() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        val resourceRoot = File("src/main/res")
        val runtimeLogoAssets = resourceRoot.walkTopDown()
            .filter { it.isFile }
            .filter { file ->
                val name = file.name.lowercase()
                name.contains("logo") || name.contains("swimpay")
            }
            .map { it.relativeTo(resourceRoot).invariantSeparatorsPath }
            .toList()

        assertTrue(manifest.contains("""android:icon="@mipmap/ic_launcher""""))
        assertTrue(manifest.contains("""android:roundIcon="@mipmap/ic_launcher_round""""))
        assertTrue("runtime must not add ad-hoc logo assets outside launcher resources", runtimeLogoAssets.isEmpty())

        listOf(
            "drawable-nodpi/ic_bank_sberbank.png",
            "drawable-nodpi/ic_bank_tbank.png",
            "drawable-nodpi/ic_bank_vtb.png",
            "drawable-nodpi/ic_bank_alfa.png",
            "drawable-nodpi/ic_bank_gazprombank.png"
        ).forEach { path ->
            assertTrue("bank icon must remain available for runtime catalog: $path", File(resourceRoot, path).exists())
        }
    }

    @Test
    fun premiumDesignTokensExposeVisualGatePrimitives() {
        val tokens = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDesignTokens.kt").readText()

        listOf(
            "object PremiumColors",
            "object PremiumRadius",
            "object PremiumSpacing",
            "object PremiumType",
            "object PremiumElevation",
            "object PremiumIconSize",
            "object PremiumComponentSize",
            "object PremiumToneColors",
            "object PremiumBrandGradient",
            "object ExternalBrandTokens"
        ).forEach { token ->
            assertTrue("missing visual token primitive $token", tokens.contains(token))
        }
        assertTrue(tokens.contains("ButtonHeight = 56.dp"))
        assertTrue(tokens.contains("TouchTarget = 48.dp"))
        assertTrue(tokens.contains("PrimaryDeep"))
        assertTrue(tokens.contains("Google"))
    }

    @Test
    fun premiumRuntimeBrandUsesOfficialLauncherAssetInsteadOfGeneratedWaterMark() {
        val components = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val onboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val logoFunction = sourceFunction(components, "fun SwimPayLogo(")

        assertTrue("runtime logo should delegate to the shared launcher badge", logoFunction.contains("SwimPayLauncherBadge"))
        assertTrue("shared launcher badge should reuse the official launcher foreground asset", components.contains("fun SwimPayLauncherBadge("))
        assertTrue("shared launcher badge should render the current launcher foreground", components.contains("painterResource(R.mipmap.ic_launcher_foreground)"))
        assertFalse("runtime logo must not draw a generated Material water mark", logoFunction.contains("Icons.Default.Water"))
        assertFalse("premium runtime brand surfaces must not draw a generated Material water mark", components.contains("Icons.Default.Water"))
        assertFalse("premium onboarding brand surfaces must not draw a generated Material water mark", onboarding.contains("Icons.Default.Water"))
        assertTrue("premium onboarding should reuse the launcher badge", onboarding.contains("SwimPayLauncherBadge"))
        assertFalse("premium onboarding must not keep the old waves mark as the landing card brand", onboarding.contains("SwimPayWavesMark(Modifier.size(PremiumIconSize.Large)"))
    }

    @Test
    fun premiumComponentsUseCentralVisualTokensForButtonsAndExternalBrands() {
        val components = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val primaryButton = sourceFunction(components, "fun PremiumPrimaryButton(")
        val outlineButton = sourceFunction(components, "fun PremiumSecondaryButton(")
        val blueButton = sourceFunction(components, "fun PremiumBlueButton(")
        val googleIcon = sourceFunction(components, "fun PremiumGoogleIcon(")

        listOf(primaryButton, outlineButton).forEach { button ->
            assertTrue("premium buttons must use shared height token", button.contains("PremiumComponentSize.ButtonHeight"))
            assertTrue("premium buttons must use shared button radius token", button.contains("PremiumRadius.Button"))
        }
        assertTrue("primary button must use shared primary brand gradient", primaryButton.contains("PremiumBrandGradient.Primary"))
        assertTrue("blue button must delegate to the shared primary button", blueButton.contains("PremiumPrimaryButton"))
        assertTrue("disabled primary button must use shared disabled gradient", primaryButton.contains("PremiumBrandGradient.Disabled"))

        assertTrue("Google icon blue must come from external brand tokens", googleIcon.contains("ExternalBrandTokens.Google.Blue"))
        assertTrue("Google icon green must come from external brand tokens", googleIcon.contains("ExternalBrandTokens.Google.Green"))
        assertTrue("Google icon yellow must come from external brand tokens", googleIcon.contains("ExternalBrandTokens.Google.Yellow"))
        assertTrue("Google icon red must come from external brand tokens", googleIcon.contains("ExternalBrandTokens.Google.Red"))
    }

    @Test
    fun premiumScreensUseSelectedToneAndElevationTokensForKnownHardcodes() {
        val onboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val components = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumComponents.kt").readText()
        val dashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()

        assertFalse("selected onboarding tone must use PremiumToneColors.Selected", onboarding.contains("Color(0xFFF7FEFE)"))
        assertTrue(onboarding.contains("PremiumToneColors.Selected.background"))
        assertFalse("known 3dp card elevations must use PremiumElevation.Card", components.contains("shadowElevation = 3.dp"))
        assertFalse("known 3dp card elevations must use PremiumElevation.Card", dashboard.contains("shadowElevation = 3.dp"))
        assertTrue(components.contains("shadowElevation = PremiumElevation.Card"))
        assertTrue(dashboard.contains("shadowElevation = PremiumElevation.Card"))
    }

    @Test
    fun redesignedScreensDoNotRenderFabricatedPreviewDataWidgets() {
        val dashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val walletDetail = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumWalletDetailScreen.kt").readText()
        val runtime = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt").readText()

        // Accueil: invented wallet balances, donut provenance rate and recent payer
        // chips had no real UiState backing and were removed with their helpers.
        listOf(
            "walletPreview",
            "WalletPreviewItem",
            "ReceptionWalletCard",
            "provenancePreview",
            "ProvenanceVerifiedCard",
            "ProvenanceDonut",
            "payersPreview",
            "PayerPreviewItem",
            "RecentPayerChip"
        ).forEach { removed ->
            assertFalse("Accueil must not reference removed preview helper $removed", dashboard.contains(removed))
        }
        assertFalse("Accueil must not show an invented vs-hier delta", dashboard.contains("+12% vs hier"))

        // Activité: the fabricated payment list, sparkline fallback and +18% delta
        // had no backing in PremiumOrdersUiState and were removed.
        listOf(
            "activityPaymentPreview",
            "cumulativeChartValues",
            "parseAmountForChart",
            "activityGroupRowsByDay",
            "ActivityDayGroup",
            "ActivityDateGroupLabel"
        ).forEach { removed ->
            assertFalse("Activité must not reference removed preview helper $removed", dashboard.contains(removed))
        }
        assertFalse("Activité must not show an invented +18% delta", dashboard.contains("\"+18%\""))
        assertFalse("Activité must not fall back to an invented monthly amount", dashboard.contains("2 480 000 FCFA"))

        // Détail portefeuille: the per-wallet received aggregate, verification rate
        // and history list had no real runtime source and were removed.
        listOf(
            "WalletProvenanceCard",
            "WalletActivityCard",
            "WalletStatTile",
            "WalletReceivedPaymentRow",
            "totalReceivedLabel",
            "verifiedRate",
            "receivedPayments"
        ).forEach { removed ->
            assertFalse("Wallet detail must not reference removed preview widget $removed", walletDetail.contains(removed))
        }
        assertFalse("Wallet detail state must drop the preview aggregate fields", runtime.contains("PremiumWalletReceivedPaymentUiItem"))
        assertFalse("Wallet detail preview must not invent a received total", runtime.contains("1 248 500 XOF"))

        // Receiving-methods region overview (chooser): the fabricated masked accounts,
        // received amounts and per-row "detection tones" had no real UiState backing and
        // were removed. The chooser now lists what is addable from the unified catalog.
        listOf(
            "receivingRegionGroupsPreview",
            "ReceivingMethodRowPreview",
            "ReceivingRowTone",
            "RUSSIAN_PREVIEW_BANK_IDS",
            "westAfricaCount",
            "russianCount"
        ).forEach { removed ->
            assertFalse("Receiving overview must not reference removed preview helper $removed", dashboard.contains(removed))
        }
        listOf(
            "•• 7782",
            "145 000",
            "+680 USD",
            "18 400 RUB"
        ).forEach { fabricated ->
            assertFalse("Receiving overview must not render fabricated literal $fabricated", dashboard.contains(fabricated))
        }
        // The overview must source its regions/counts from the real unified catalog.
        assertTrue("Receiving overview must build region groups from the real catalog", dashboard.contains("ReceivingCatalog.byRegion("))
    }

    private fun sourceFunction(source: String, signature: String): String {
        val normalizedSource = source.replace("\r\n", "\n")
        val start = normalizedSource.indexOf(signature)
        require(start >= 0) { "missing source function $signature" }
        val nextComposable = normalizedSource.indexOf("\n@Composable", start + signature.length)
        return if (nextComposable >= 0) {
            normalizedSource.substring(start, nextComposable)
        } else {
            normalizedSource.substring(start)
        }
    }

    private fun sourceBetween(source: String, startMarker: String, endMarker: String): String {
        val normalizedSource = source.replace("\r\n", "\n")
        val start = normalizedSource.indexOf(startMarker)
        require(start >= 0) { "missing start marker $startMarker" }
        val end = normalizedSource.indexOf(endMarker, start + startMarker.length)
        require(end >= 0) { "missing end marker $endMarker" }
        return normalizedSource.substring(start, end)
    }
}
