package com.swimpay.receiver

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class AndroidProductionReleaseConfigTest {
    @Test
    fun releaseBuildUsesProductionConfigAndSigningGuardrails() {
        val gradle = File("build.gradle.kts").readText()

        assertTrue(gradle.contains("productionSwimpayBackendBaseUrl"))
        assertTrue(gradle.contains("SWIMPAY_ANDROID_PRODUCTION_BACKEND_BASE_URL"))
        assertTrue(gradle.contains("stagingSwimpayBackendBaseUrl"))
        assertTrue(gradle.contains("productionSwimpayGoogleServerClientId"))
        assertTrue(gradle.contains("SWIMPAY_ANDROID_PRODUCTION_GOOGLE_SERVER_CLIENT_ID"))
        assertTrue(gradle.contains("SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID"))
        assertTrue(gradle.contains("SWIMPAY_ANDROID_STAGING_GOOGLE_SERVER_CLIENT_ID"))
        assertTrue(gradle.contains("validateProductionReleaseBuildConfig"))
        assertTrue(gradle.contains("preReleaseBuild"))
        assertTrue(gradle.contains("swimpayReleaseStoreFile"))
        assertTrue(gradle.contains("SWIMPAY_ANDROID_RELEASE_STORE_FILE"))
        assertTrue(gradle.contains("swimpayReleaseKeyAlias"))
    }

    @Test
    fun productionReleaseMustUseExplicitProductionConfigWithSafeStagingFallback() {
        val gradle = File("build.gradle.kts").readText()
        val releaseBlock = sourceBetween(
            gradle,
            "getByName(\"release\")",
            "create(\"staging\")"
        )
        val validationBlock = sourceBetween(
            gradle,
            "tasks.register(\"validateProductionReleaseBuildConfig\")",
            "tasks.register(\"validateDebugVpsBuildConfig\")"
        )

        assertTrue(releaseBlock.contains("productionSwimpayBackendBaseUrl"))
        assertTrue(releaseBlock.contains("productionSwimpayGoogleServerClientId"))
        assertTrue(releaseBlock.contains("isMinifyEnabled = true"))
        assertTrue(releaseBlock.contains("isShrinkResources = true"))
        assertTrue(releaseBlock.contains("proguardFiles("))
        assertTrue(releaseBlock.contains("proguard-android-optimize.txt"))
        assertTrue(releaseBlock.contains("proguard-rules.pro"))
        assertFalse(releaseBlock.contains("stagingSwimpayBackendBaseUrl"))
        assertFalse(releaseBlock.contains("swimpayBackendBaseUrl.get()"))
        assertTrue(gradle.contains(".orElse(stagingSwimpayBackendBaseUrl)"))
        assertFalse(validationBlock.contains("backend != stagingBackend"))
        assertFalse(validationBlock.contains("googleClientId != stagingGoogleClientId"))
        assertFalse(validationBlock.contains("must not reuse the staging OAuth client"))
        assertTrue(validationBlock.contains("Release keystore"))
        assertTrue(validationBlock.contains("requireRemoteAndroidBackend(\"Production\""))
    }

    @Test
    fun packageScriptsExposeReleaseBuildCommands() {
        val packageJson = File("../../../../package.json").readText()

        assertTrue(packageJson.contains("\"android:assemble:release\""))
        assertTrue(packageJson.contains(":app:assembleRelease"))
        assertTrue(packageJson.contains("\"android:bundle:release\""))
        assertTrue(packageJson.contains(":app:bundleRelease"))
    }

    @Test
    fun releaseProguardRulesKeepAndroidEntrypointsWithoutWeakeningPaymentBoundaries() {
        val rules = File("proguard-rules.pro").readText()

        assertTrue(rules.contains("com.swimpay.receiver.work"))
        assertTrue(rules.contains("com.google.android.libraries.identity.googleid"))
        assertTrue(rules.contains("androidx.credentials"))
        assertFalse(rules.contains("bank_confirmed"))
        assertFalse(rules.contains("allow_auto_confirmation"))
    }

    private fun sourceBetween(source: String, startMarker: String, endMarker: String): String {
        val start = source.indexOf(startMarker)
        assertTrue("missing source marker $startMarker", start >= 0)
        val end = source.indexOf(endMarker, start + startMarker.length)
        assertTrue("missing end marker $endMarker", end >= 0)
        return source.substring(start, end)
    }
}
