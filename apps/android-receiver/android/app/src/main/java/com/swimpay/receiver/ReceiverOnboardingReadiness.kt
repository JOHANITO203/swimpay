package com.swimpay.receiver

import android.content.Intent
import android.provider.Settings

enum class ReceiverReadinessState(val wireValue: String) {
    NOT_INSTALLED("not_installed"),
    INSTALLED("installed"),
    NOTIFICATION_ACCESS_REQUIRED("notification_access_required"),
    BANK_SELECTION_REQUIRED("bank_selection_required"),
    BACKEND_CONFIG_REQUIRED("backend_config_required"),
    DEVICE_REGISTRATION_REQUIRED("device_registration_required"),
    READY_REVIEW_ONLY("ready_review_only"),
    READY("ready"),
    DEGRADED("degraded")
}

enum class DeviceRegistrationReadinessStatus {
    NONE,
    PENDING,
    ACTIVE,
    DEGRADED,
    DISABLED
}

data class SelectedBankOnboardingProfile(
    val bankProfileId: String,
    val selected: Boolean,
    val verificationStatus: BankPackageVerificationStatus,
    val reviewOnly: Boolean,
    val syntheticDebugOnly: Boolean = false
) {
    fun isTrustedForReadyState(): Boolean {
        return selected &&
            !reviewOnly &&
            !syntheticDebugOnly &&
            verificationStatus == BankPackageVerificationStatus.VERIFIED &&
            !bankProfileId.contains("TO_VERIFY", ignoreCase = true) &&
            !bankProfileId.contains("synthetic_debug_only", ignoreCase = true)
    }
}

data class ReceiverOnboardingInput(
    val appNotificationsPermissionEnabled: Boolean,
    val notificationListenerAccessEnabled: Boolean,
    val listenerConnected: Boolean,
    val selectedBankProfiles: List<SelectedBankOnboardingProfile>,
    val backendConfigured: Boolean,
    val deviceRegistrationStatus: DeviceRegistrationReadinessStatus,
    val previouslyHadNotificationListenerAccess: Boolean,
    val appInstalled: Boolean
)

data class ReceiverOnboardingReadiness(
    val state: ReceiverReadinessState,
    val receiverReady: Boolean,
    val captureEnabled: Boolean,
    val uploadEnabled: Boolean,
    val appNotificationsPermissionEnabled: Boolean,
    val notificationListenerAccessEnabled: Boolean,
    val diagnostics: List<String>,
    val onboardingSteps: List<String>
)

object NotificationListenerSettingsAction {
    const val intentAction: String = Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS

    fun createIntent(packageName: String? = null): Intent {
        return Intent(intentAction).apply {
            if (!packageName.isNullOrBlank()) {
                putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            }
        }
    }
}

class ReceiverOnboardingReadinessEvaluator {
    fun evaluate(input: ReceiverOnboardingInput): ReceiverOnboardingReadiness {
        val diagnostics = buildList {
            if (!input.appNotificationsPermissionEnabled) add("app_notifications_disabled")
            if (!input.notificationListenerAccessEnabled) add("notification_access_disabled")
            if (!input.listenerConnected) add("listener_disconnected")
            if (input.previouslyHadNotificationListenerAccess && !input.notificationListenerAccessEnabled) {
                add("regrant_required_after_reinstall")
            }
            if (input.selectedBankProfiles.none { it.selected }) add("no_banks_allowed")
            if (input.selectedBankProfiles.any { it.selected && !it.isTrustedForReadyState() }) {
                add("bank_profile_unverified")
            }
            if (!input.backendConfigured) add("backend_config_missing")
            if (input.deviceRegistrationStatus == DeviceRegistrationReadinessStatus.NONE) {
                add("device_registration_required")
            }
            if (input.deviceRegistrationStatus == DeviceRegistrationReadinessStatus.DISABLED) {
                add("device_disabled")
            }
        }

        val state = when {
            !input.appInstalled -> ReceiverReadinessState.NOT_INSTALLED
            !input.notificationListenerAccessEnabled || !input.listenerConnected ->
                ReceiverReadinessState.NOTIFICATION_ACCESS_REQUIRED
            input.selectedBankProfiles.none { it.selected } ->
                ReceiverReadinessState.BANK_SELECTION_REQUIRED
            !input.backendConfigured ->
                ReceiverReadinessState.BACKEND_CONFIG_REQUIRED
            input.deviceRegistrationStatus == DeviceRegistrationReadinessStatus.NONE ->
                ReceiverReadinessState.DEVICE_REGISTRATION_REQUIRED
            input.deviceRegistrationStatus == DeviceRegistrationReadinessStatus.DISABLED ->
                ReceiverReadinessState.DEGRADED
            input.selectedBankProfiles.none { it.isTrustedForReadyState() } ->
                ReceiverReadinessState.READY_REVIEW_ONLY
            input.deviceRegistrationStatus == DeviceRegistrationReadinessStatus.DEGRADED ->
                ReceiverReadinessState.DEGRADED
            else -> ReceiverReadinessState.READY
        }

        val receiverReady = state == ReceiverReadinessState.READY ||
            state == ReceiverReadinessState.READY_REVIEW_ONLY
        val captureEnabled = receiverReady
        val uploadEnabled = receiverReady

        val onboardingSteps = buildList {
            if (!input.notificationListenerAccessEnabled) add("Activer l'accès aux notifications")
            if (input.selectedBankProfiles.none { it.selected }) add("Choisir au moins une banque")
            if (!input.backendConfigured) add("Configurer le backend local")
            if (input.deviceRegistrationStatus == DeviceRegistrationReadinessStatus.NONE) {
                add("Enregistrer l'appareil Receiver")
            }
        }

        return ReceiverOnboardingReadiness(
            state = state,
            receiverReady = receiverReady,
            captureEnabled = captureEnabled,
            uploadEnabled = uploadEnabled,
            appNotificationsPermissionEnabled = input.appNotificationsPermissionEnabled,
            notificationListenerAccessEnabled = input.notificationListenerAccessEnabled,
            diagnostics = diagnostics,
            onboardingSteps = onboardingSteps
        )
    }
}
