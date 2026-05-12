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
        assertTrue(premiumOnboarding.contains("Activer l’accès"))
        assertTrue(premiumOnboarding.contains("SwimPay recherche uniquement les banques compatibles."))
        assertTrue(premiumOnboarding.contains("Activer ces banques"))
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
        assertTrue(premiumComponents.contains("fun PremiumBottomNav"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Home"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Reviews"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Orders"))
        assertTrue(premiumComponents.contains("PremiumMainTab.Menu"))
        assertTrue(premiumComponents.contains("fun <T> PremiumStatePanel"))
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

        assertTrue(premiumRuntime.contains("Paiements confirm\u00e9s"))
        assertTrue(apiWiring.contains("metrics_summary"))
        assertTrue(apiWiring.contains("metrics_timeseries"))
        assertTrue(mainCard.contains("AccountBalanceWallet"))
        assertTrue(premiumDashboard.contains("state.metrics.chunked(2)"))
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

        assertTrue(premiumDashboard.contains("Manuel — Activé"))
        assertTrue(premiumDashboard.contains("Assisté — Disponible"))
        assertTrue(premiumDashboard.contains("IA - Prochaine mise a jour"))
        assertTrue(premiumDashboard.contains("Inactive"))
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
        assertTrue(premiumApp.contains("bankTargetsState = banksState"))
        assertTrue(premiumOnboarding.contains("bankTargetsState: PremiumScreenState<PremiumBanksUiState>"))
        assertFalse(premiumOnboarding.contains("\"Sberbank\" to \"Détectée\""))
        assertFalse(premiumOnboarding.contains("\"VTB\" to \"Non détectée\""))
        assertTrue(mainActivity.contains("PackageManagerExactPackageProbe(this)"))
    }

    @Test
    fun premiumReceivingMethodComposeExposesOperationalDraftWithoutRawSavedDisplay() {
        val premiumDashboard = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()
        val premiumOnboarding = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumOnboardingScreens.kt").readText()
        val premiumApp = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()
        val receivingSource = sourceFunction(premiumDashboard, "fun PremiumReceivingMethodsStateScreen")
        val onboardingSource = sourceFunction(premiumOnboarding, "private fun ReceivingMethodDetailsStep")

        assertTrue(receivingSource.contains("onSaveDraft"))
        assertTrue(receivingSource.contains("onEditMethod"))
        assertTrue(receivingSource.contains("onDisableMethod"))
        assertTrue(receivingSource.contains("onSetDefaultMethod"))
        assertTrue(receivingSource.contains("onDeleteMethod"))
        assertTrue(receivingSource.contains("Ajouter une carte"))
        assertTrue(receivingSource.contains("Ajoutez téléphone SBP"))
        assertTrue(receivingSource.contains("ReceivingMethodActionButton"))
        assertTrue(premiumDashboard.contains("ReceivingMethodMutationButton"))
        assertTrue(premiumDashboard.contains("Icons.Default.Edit"))
        assertTrue(premiumDashboard.contains("Icons.Default.Block"))
        assertTrue(premiumDashboard.contains("Icons.Default.Star"))
        assertTrue(premiumDashboard.contains("Icons.Default.Delete"))
        assertTrue(receivingSource.contains("Choisir la banque"))
        assertTrue(premiumDashboard.contains("Sberbank"))
        assertTrue(premiumDashboard.contains("T-Bank"))
        assertTrue(premiumDashboard.contains("VTB"))
        assertTrue(premiumDashboard.contains("Alfa-Bank"))
        assertTrue(premiumDashboard.contains("Gazprombank"))
        assertTrue(receivingSource.contains("Identifiant utilisé seulement pour l'enregistrement"))
        assertTrue(receivingSource.contains("Enregistrer"))
        assertTrue(receivingSource.contains("Les informations complètes ne sont jamais envoyées dans les webhooks."))
        assertTrue(receivingSource.contains("clearDraftSignal"))
        assertTrue(receivingSource.contains("LaunchedEffect(clearDraftSignal)"))
        assertFalse(receivingSource.contains("identifierInput = cleared.rawIdentifierInput"))
        assertFalse(receivingSource.contains("rawIdentifier)"))
        assertFalse(receivingSource.contains("method.actions.forEach"))
        assertFalse(receivingSource.contains("payment.confirmed"))
        assertTrue(premiumApp.contains("createReceivingMethod("))
        assertTrue(premiumApp.contains("disableReceivingMethod("))
        assertTrue(premiumApp.contains("markReceivingMethodRecommended("))
        assertTrue(premiumApp.contains("updateReceivingMethodLabel("))
        assertTrue(premiumApp.contains("deleteReceivingMethod("))
        assertTrue(premiumApp.contains("loadReceivingMethods()"))

        assertTrue(onboardingSource.contains("selectedBankDisplayName"))
        assertTrue(onboardingSource.contains("Carte bancaire"))
        assertTrue(onboardingSource.contains("Numéro de téléphone"))
        assertTrue(onboardingSource.contains("Choisir la banque"))
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

        assertTrue(standaloneSource.contains("background(PremiumColors.Background)"))
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
        assertTrue(connectedSiteSource.contains("LocalClipboardManager.current"))
        assertTrue(connectedSiteSource.contains("AnnotatedString(onCopyDeveloperExport(value))"))
        assertTrue(connectedSiteSource.contains("onAuthorizeCopy: (onAuthorized: () -> Unit) -> Unit = { onAuthorized -> onAuthorized() }"))
        assertTrue(connectedSiteSource.contains("onCopyDeveloperExport: (PremiumConnectedSiteUiState) -> String"))
        assertTrue(connectedSiteSource.contains("onAuthorizeCopy {"))
        assertTrue(connectedSiteRoute.contains("onAuthorizeCopy = { onAuthorized -> onRequestUnlock(onAuthorized) }"))
        assertTrue(connectedSiteRoute.contains("onCopyDeveloperExport = { value ->"))
        assertTrue(connectedSiteRoute.contains("activeRuntime.consumeDeveloperExportText(value)"))
        assertTrue(connectedSiteSource.contains("contentDescription = \"Copier\""))
        assertTrue(connectedSiteSource.contains("Icons.Default.ContentCopy"))
        assertFalse(connectedSiteSource.contains("Copier pour dev"))
        assertFalse(connectedSiteSource.contains("secretKeyOnce"))
        assertFalse(connectedSiteSource.contains("webhookSecretOnce"))
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
    fun androidLauncherUsesSwimPayAppIconResources() {
        val manifest = File("src/main/AndroidManifest.xml").readText()
        val adaptiveIcon = File("src/main/res/mipmap-anydpi-v26/ic_launcher.xml")
        val adaptiveRoundIcon = File("src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml")
        val xxhdpiIcon = File("src/main/res/mipmap-xxhdpi/ic_launcher.webp")
        val xxhdpiForeground = File("src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp")
        val launcherBackground = File("src/main/res/values/colors.xml")

        assertTrue(manifest.contains("""android:icon="@mipmap/ic_launcher""""))
        assertTrue(manifest.contains("""android:roundIcon="@mipmap/ic_launcher_round""""))
        assertTrue(adaptiveIcon.exists())
        assertTrue(adaptiveRoundIcon.exists())
        assertTrue(xxhdpiIcon.exists())
        assertTrue(xxhdpiForeground.exists())
        assertTrue(launcherBackground.readText().contains("ic_launcher_background"))
        assertTrue(adaptiveIcon.readText().contains("@mipmap/ic_launcher_foreground"))
        assertTrue(adaptiveRoundIcon.readText().contains("@mipmap/ic_launcher_foreground"))
        assertFalse(adaptiveIcon.readText().contains("monochrome"))
        assertFalse(adaptiveRoundIcon.readText().contains("monochrome"))
        assertTrue("launcher WebP should come from IconKitchen output", xxhdpiIcon.length() > 100L)
    }

    private fun sourceFunction(source: String, signature: String): String {
        val start = source.indexOf(signature)
        require(start >= 0) { "missing source function $signature" }
        val nextComposable = source.indexOf("\n@Composable", start + signature.length)
        return if (nextComposable >= 0) source.substring(start, nextComposable) else source.substring(start)
    }

    private fun sourceBetween(source: String, startMarker: String, endMarker: String): String {
        val start = source.indexOf(startMarker)
        require(start >= 0) { "missing start marker $startMarker" }
        val end = source.indexOf(endMarker, start + startMarker.length)
        require(end >= 0) { "missing end marker $endMarker" }
        return source.substring(start, end)
    }
}
