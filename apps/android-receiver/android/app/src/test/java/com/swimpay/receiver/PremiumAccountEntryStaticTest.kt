package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumNavigation
import com.swimpay.receiver.ui.premium.InMemoryPremiumMobileMerchantSessionStore
import com.swimpay.receiver.ui.premium.PremiumMobileMerchantSession
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class PremiumAccountEntryStaticTest {
    @Test
    fun firstLaunchWithoutMobileSessionStartsAtAccountEntryNotOnboarding() {
        val initialRoute = PremiumNavigation.initialRoute(onboardingCompleted = false)

        assertTrue(initialRoute.javaClass.simpleName.contains("AccountEntry"))
        assertFalse(initialRoute.javaClass.simpleName.contains("Onboarding"))
    }

    @Test
    fun mobileMerchantSessionIsPersistedOutsideCompositionMemory() {
        val stateSource = accountEntryStateSource()
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()

        assertTrue(stateSource.contains("SharedPreferencesPremiumMobileMerchantSessionStore"))
        assertTrue(stateSource.contains("mobile_merchant_session_merchant_id"))
        assertTrue(stateSource.contains("mobile_merchant_session_token"))
        assertTrue(mainActivity.contains("SharedPreferencesPremiumMobileMerchantSessionStore(this)"))
        assertTrue(mainActivity.contains("mobileMerchantSessionStore = mobileMerchantSessionStore"))
    }

    @Test
    fun apkBackendBaseUrlIsConfigurableForStagingWithoutHardcodingProduction() {
        val gradle = File("build.gradle.kts").readText()
        val mainActivity = File("src/main/java/com/swimpay/receiver/MainActivity.kt").readText()

        assertTrue(gradle.contains("SWIMPAY_BACKEND_BASE_URL"))
        assertTrue(gradle.contains("swimpayBackendBaseUrl"))
        assertTrue(mainActivity.contains("AndroidMerchantBackendConfig.configuredBaseUrl()"))
        assertFalse(mainActivity.contains("DebugBackendConfig.DEFAULT_BASE_URL"))
    }

    @Test
    fun mobileMerchantSessionStoreKeepsOpaqueTokenOutOfVisibleState() {
        val store = InMemoryPremiumMobileMerchantSessionStore()
        val session = PremiumMobileMerchantSession(
            merchantId = "mch_mobile",
            userId = "usr_mobile",
            displayHandle = "merchant-12345678",
            mobileSessionToken = "spm_secret_value",
            expiresAtEpochMs = Long.MAX_VALUE
        )

        store.save(session)

        assertTrue(store.hasValidSession())
        assertTrue(store.currentSession()?.authorizationTokenForRuntime() == "spm_secret_value")
        assertFalse(store.currentSession().toString().contains("spm_secret_value"))
        assertFalse(store.currentSession()?.visibleTexts()?.joinToString(" ").orEmpty().contains("spm_secret_value"))
    }

    @Test
    fun accountEntryScreensExposeCreateAndLoginBeforeOnboarding() {
        val source = accountEntryStateSource() + "\n" + accountEntryScreensSource()

        listOf(
            "Créer un compte",
            "Se connecter",
            "Profil personnel",
            "Profil commerce"
        ).forEach { copy ->
            assertTrue("missing account entry copy: $copy", source.contains(copy))
        }

        assertTrue(source.contains("onCreateAccount"))
        assertTrue(source.contains("onSignIn"))
        assertTrue(source.contains("onSelectProfile"))
    }

    @Test
    fun accountEntryStateKeepsProfileRightsEqualAndAvoidsPersonalNameCollection() {
        val stateSource = accountEntryStateSource()
        val screensSource = accountEntryScreensSource()
        val combined = "$stateSource\n$screensSource"

        assertTrue(stateSource.contains("sameAppRights"))
        assertTrue(stateSource.contains("PERSONAL"))
        assertTrue(stateSource.contains("COMMERCE"))

        listOf(
            "firstName",
            "lastName",
            "first_name",
            "last_name",
            "Prénom",
            "Nom de famille",
            "administrateur",
            "admin"
        ).forEach { forbidden ->
            assertFalse(
                "account entry must not collect names or expose admin personas: $forbidden",
                combined.contains(forbidden, ignoreCase = true)
            )
        }
    }

    @Test
    fun loginProviderScreenIsRecoveryOnlyAndDoesNotStartOnboarding() {
        val source = accountEntryScreensSource()
        val stateSource = accountEntryStateSource()
        val loginProviderSource = sourceFunction(source, "fun PremiumAccountLoginProviderScreen")

        assertTrue(source.contains("Google"))
        assertTrue(source.contains("recovery", ignoreCase = true))
        assertTrue(source.contains("récupération"))
        assertTrue(source.contains("déjà créée"))
        assertTrue(stateSource.contains("Récupérer un compte déjà lié"))
        assertTrue(loginProviderSource.contains("PremiumGoogleIcon"))
        assertFalse(loginProviderSource.contains("Icons.AutoMirrored.Filled.Login"))
        assertFalse(
            "login provider choice must not route directly into onboarding",
            source.contains("onStartOnboarding")
        )
    }

    @Test
    fun accountEntryAppCallsBackendLookupCreateAndGoogleExchangeContracts() {
        val appSource = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt").readText()

        assertTrue(appSource.contains("lookupDevice(AndroidMerchantDeviceLookupIntent.CREATE_ACCOUNT)"))
        assertTrue(appSource.indexOf("lookupDevice(AndroidMerchantDeviceLookupIntent.CREATE_ACCOUNT)") < appSource.indexOf("createAccount("))
        assertTrue(appSource.contains("googleExchange"))
        assertTrue(appSource.contains("googleLink"))
        assertTrue(appSource.contains("mobileMerchantSessionStore.save"))
    }

    @Test
    fun accountEntryVisualGrammarKeepsTouchTargetsAndNoEmojiIcons() {
        val source = accountEntryScreensSource()

        assertTrue("back button must keep the minimum Android touch target", source.contains(".size(48.dp)"))
        assertTrue("choice rows should expose button semantics", source.contains("role = Role.Button"))
        assertTrue("choice rows should expose accessible labels", source.contains("contentDescription = \"\$title. \$description\""))
        assertFalse("account entry must use vector icons, not emoji", emojiRegex.containsMatchIn(source))
    }

    companion object {
        private val emojiRegex = Regex("[\\uD83C-\\uDBFF][\\uDC00-\\uDFFF]")
    }

    private fun accountEntryStateSource(): String {
        val file = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryState.kt")
        assertTrue("PremiumAccountEntryState.kt must exist", file.exists())
        return file.readText()
    }

    private fun accountEntryScreensSource(): String {
        val file = File("src/main/java/com/swimpay/receiver/ui/premium/PremiumAccountEntryScreens.kt")
        assertTrue("PremiumAccountEntryScreens.kt must exist", file.exists())
        return file.readText()
    }

    private fun sourceFunction(source: String, signature: String): String {
        val start = source.indexOf(signature)
        assertTrue("missing source function $signature", start >= 0)
        val nextComposable = source.indexOf("\n@Composable", start + signature.length)
        return if (nextComposable >= 0) source.substring(start, nextComposable) else source.substring(start)
    }
}
