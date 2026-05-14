plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("io.github.takahirom.roborazzi")
}

val swimpayBackendBaseUrl = providers.gradleProperty("swimpayBackendBaseUrl")
    .orElse(providers.environmentVariable("SWIMPAY_ANDROID_BACKEND_BASE_URL"))
    .orElse("http://127.0.0.1:8080")

val swimpayGoogleServerClientId = providers.gradleProperty("swimpayGoogleServerClientId")
    .orElse(providers.environmentVariable("SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID"))
    .orElse("")

val stagingSwimpayBackendBaseUrl = providers.gradleProperty("swimpayStagingBackendBaseUrl")
    .orElse(providers.environmentVariable("SWIMPAY_ANDROID_STAGING_BACKEND_BASE_URL"))
    .orElse("https://staging.swimpay.pro")

val stagingSwimpayGoogleServerClientId = providers.gradleProperty("swimpayStagingGoogleServerClientId")
    .orElse(providers.environmentVariable("SWIMPAY_ANDROID_STAGING_GOOGLE_SERVER_CLIENT_ID"))
    .orElse("983049539084-8k91arvoocd6d1q8fbjq1auvmigkeg6u.apps.googleusercontent.com")

fun String.toBuildConfigString(): String {
    return "\"" + replace("\\", "\\\\").replace("\"", "\\\"") + "\""
}

android {
    namespace = "com.swimpay.receiver"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.swimpay.receiver"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "SWIMPAY_BACKEND_BASE_URL", swimpayBackendBaseUrl.get().toBuildConfigString())
        buildConfigField("String", "SWIMPAY_GOOGLE_SERVER_CLIENT_ID", swimpayGoogleServerClientId.get().toBuildConfigString())
    }

    buildTypes {
        create("staging") {
            initWith(getByName("debug"))
            signingConfig = signingConfigs.getByName("debug")
            isDebuggable = false
            matchingFallbacks += listOf("debug")
            buildConfigField("String", "SWIMPAY_BACKEND_BASE_URL", stagingSwimpayBackendBaseUrl.get().toBuildConfigString())
            buildConfigField("String", "SWIMPAY_GOOGLE_SERVER_CLIENT_ID", stagingSwimpayGoogleServerClientId.get().toBuildConfigString())
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    testImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.biometric:biometric:1.1.0")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
    testImplementation("androidx.compose.ui:ui-test-junit4")
    testImplementation("androidx.test.ext:junit:1.2.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.46.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.46.1")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-junit-rule:1.46.1")
    testImplementation("org.robolectric:robolectric:4.15.1")
    testImplementation("junit:junit:4.13.2")
}

roborazzi {
    outputDir.set(file("src/test/snapshots"))
}

val requestedGradleTasks = gradle.startParameter.taskNames
val visualGoldensExplicitlyRequested = providers.gradleProperty("runVisualGoldens")
    .map { it.equals("true", ignoreCase = true) }
    .orElse(
        providers.environmentVariable("RUN_VISUAL_GOLDENS")
            .map { it.equals("true", ignoreCase = true) }
            .orElse(false)
    )
val isRoborazziTaskRequested = requestedGradleTasks.any { task ->
    task.contains("Roborazzi", ignoreCase = true) ||
        task.contains("recordRoborazzi", ignoreCase = true) ||
        task.contains("verifyRoborazzi", ignoreCase = true)
}

tasks.withType<Test>().configureEach {
    maxParallelForks = 1
    forkEvery = 0
    jvmArgs = listOf("-Xmx256m")
    if (!visualGoldensExplicitlyRequested.get() && !isRoborazziTaskRequested) {
        exclude("**/PremiumGoldenScreenshotTest.class")
        exclude("**/PremiumReferencePngComparisonTest.class")
    }
    if (!visualGoldensExplicitlyRequested.get()) {
        exclude("**/PremiumDesignGuardrailsTest.class")
    }
}

tasks.register("validateStagingBuildConfig") {
    doLast {
        val backend = stagingSwimpayBackendBaseUrl.get().trim().trimEnd('/')
        val googleClientId = stagingSwimpayGoogleServerClientId.get().trim()

        require(backend.startsWith("https://")) {
            "Staging Android backend must use HTTPS."
        }
        require(!backend.contains("127.0.0.1") && !backend.contains("localhost")) {
            "Staging Android backend must not target localhost."
        }
        require(googleClientId.isNotBlank()) {
            "Staging Android Google server client ID must be configured."
        }
        require(googleClientId.endsWith(".apps.googleusercontent.com")) {
            "Staging Android Google server client ID must be a Google OAuth client ID."
        }
    }
}

tasks.matching { it.name == "preStagingBuild" }.configureEach {
    dependsOn("validateStagingBuildConfig")
}
