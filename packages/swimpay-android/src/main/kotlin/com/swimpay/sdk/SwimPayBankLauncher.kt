package com.swimpay.sdk

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

enum class SwimPayBankLauncherStatus {
    Opened,
    Ready,
    Error
}

enum class SwimPayBankLauncherError {
    InvalidTarget,
    InvalidHandoffUri,
    UnsupportedScheme,
    NoBankAppAvailable,
    ActivityNotFound,
    Unknown
}

data class SwimPayBankLauncherOptions(
    val packageName: String,
    val explicitActivityClassName: String? = null,
    val launchUri: String? = null,
    val fallbackPackageNames: List<String> = emptyList()
)

data class SwimPayBankLauncherResult(
    val status: SwimPayBankLauncherStatus,
    val error: SwimPayBankLauncherError? = null,
    val intent: Intent? = null,
    val openedPackageName: String? = null,
    val launchDoesNotConfirm: Boolean = true,
    val safeMessage: String? = null
)

object SwimPayBankLauncher {
    fun open(
        activity: Activity,
        options: SwimPayBankLauncherOptions
    ): SwimPayBankLauncherResult {
        val result = createIntent(activity, options)
        val intent = result.intent ?: return result

        return try {
            activity.startActivity(intent)
            SwimPayBankLauncherResult(
                status = SwimPayBankLauncherStatus.Opened,
                openedPackageName = result.openedPackageName,
                safeMessage = "Bank app opened."
            )
        } catch (_: ActivityNotFoundException) {
            errorResult(
                SwimPayBankLauncherError.ActivityNotFound,
                "Bank app could not be opened."
            )
        } catch (_: RuntimeException) {
            errorResult(
                SwimPayBankLauncherError.Unknown,
                "Bank app could not be opened."
            )
        }
    }

    fun createIntent(
        context: Context,
        options: SwimPayBankLauncherOptions
    ): SwimPayBankLauncherResult {
        val primaryPackage = options.packageName.trim()
        if (primaryPackage.isEmpty()) {
            return errorResult(
                SwimPayBankLauncherError.InvalidTarget,
                "Bank app target is invalid."
            )
        }

        val explicitActivity = options.explicitActivityClassName?.trim()?.takeIf { it.isNotEmpty() }
        if (explicitActivity != null) {
            val explicitIntent = cleanExplicitIntent(primaryPackage, explicitActivity)
            if (explicitIntent.resolveActivity(context.packageManager) != null) {
                return readyResult(explicitIntent, primaryPackage)
            }
        }

        val launchUri = options.launchUri?.trim()?.takeIf { it.isNotEmpty() }
        if (launchUri != null) {
            val deeplinkIntent = cleanDeeplinkIntent(primaryPackage, launchUri)
            if (deeplinkIntent.resolveActivity(context.packageManager) != null) {
                return readyResult(deeplinkIntent, primaryPackage)
            }
        }

        val targetPackages = listOf(primaryPackage) + options.fallbackPackageNames
        for (targetPackage in targetPackages.map { it.trim() }.filter { it.isNotEmpty() }.distinct()) {
            val packageIntent = context.packageManager.getLaunchIntentForPackage(targetPackage)
                ?: continue
            val cleanIntent = cleanPackageIntent(packageIntent, targetPackage)
            if (cleanIntent.resolveActivity(context.packageManager) != null) {
                return readyResult(cleanIntent, targetPackage)
            }
        }

        return errorResult(
            SwimPayBankLauncherError.NoBankAppAvailable,
            "Bank app is not available."
        )
    }

    fun openFromHandoffIntent(
        activity: Activity,
        intent: Intent?,
        expectedScheme: String
    ): SwimPayBankLauncherResult? {
        val options = parseHandoffIntent(intent, expectedScheme) ?: return null
        return open(activity, options)
    }

    fun parseHandoffIntent(
        intent: Intent?,
        expectedScheme: String
    ): SwimPayBankLauncherOptions? {
        return parseHandoffUri(intent?.data, expectedScheme)
    }

    fun parseHandoffUri(
        uri: Uri?,
        expectedScheme: String
    ): SwimPayBankLauncherOptions? {
        if (uri == null) {
            return null
        }
        if (!uri.scheme.equals(expectedScheme, ignoreCase = true)) {
            return null
        }
        if (!uri.host.equals("swimpay-bank-launch", ignoreCase = true)) {
            return null
        }

        val packageName = uri.getQueryParameter("package_name")
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: return null
        val explicitActivityClassName = uri.getQueryParameter("explicit_activity_class_name")
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
        val launchUri = uri.getQueryParameter("launch_uri")
            ?.trim()
            ?.takeIf { it.isNotEmpty() }

        return SwimPayBankLauncherOptions(
            packageName = packageName,
            explicitActivityClassName = explicitActivityClassName,
            launchUri = launchUri
        )
    }

    private fun cleanExplicitIntent(
        packageName: String,
        explicitActivityClassName: String
    ): Intent {
        return Intent(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .setClassName(packageName, explicitActivityClassName)
    }

    private fun cleanPackageIntent(
        sourceIntent: Intent,
        packageName: String
    ): Intent {
        val cleanIntent = Intent(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)

        val component = sourceIntent.component
        if (component != null) {
            cleanIntent.component = component
        } else {
            cleanIntent.setPackage(packageName)
        }

        return cleanIntent
    }

    private fun cleanDeeplinkIntent(
        packageName: String,
        launchUri: String
    ): Intent {
        return Intent(Intent.ACTION_VIEW, Uri.parse(launchUri))
            .addCategory(Intent.CATEGORY_BROWSABLE)
            .setPackage(packageName)
    }

    private fun readyResult(
        intent: Intent,
        packageName: String
    ): SwimPayBankLauncherResult {
        return SwimPayBankLauncherResult(
            status = SwimPayBankLauncherStatus.Ready,
            intent = intent,
            openedPackageName = packageName,
            safeMessage = "Bank app is available."
        )
    }

    private fun errorResult(
        error: SwimPayBankLauncherError,
        message: String
    ): SwimPayBankLauncherResult {
        return SwimPayBankLauncherResult(
            status = SwimPayBankLauncherStatus.Error,
            error = error,
            safeMessage = message
        )
    }
}
