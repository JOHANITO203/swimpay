plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val swimpayBackendBaseUrl = providers.gradleProperty("swimpayBackendBaseUrl")
    .orElse(providers.environmentVariable("SWIMPAY_ANDROID_BACKEND_BASE_URL"))
    .orElse("http://127.0.0.1:8080")

val swimpayGoogleServerClientId = providers.gradleProperty("swimpayGoogleServerClientId")
    .orElse(providers.environmentVariable("SWIMPAY_ANDROID_GOOGLE_SERVER_CLIENT_ID"))
    .orElse("")

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
        }
    }

    buildFeatures {
        buildConfig = true
        compose = true
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
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.8.5")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}

tasks.withType<Test>().configureEach {
    maxParallelForks = 1
    forkEvery = 0
    jvmArgs = listOf("-Xmx256m")
}
