package com.swimpay.receiver

import android.provider.Settings
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverOnboardingReadinessTest {
    @Test
    fun appNotificationsOnButListenerAccessOffBlocksReceiverReadiness() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = true,
                notificationListenerAccessEnabled = false,
                listenerConnected = false,
                selectedBankProfiles = listOf(unverifiedBank()),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.PENDING,
                previouslyHadNotificationListenerAccess = false,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.NOTIFICATION_ACCESS_REQUIRED, readiness.state)
        assertFalse(readiness.receiverReady)
        assertFalse(readiness.captureEnabled)
        assertFalse(readiness.uploadEnabled)
        assertTrue(readiness.diagnostics.contains("notification_access_disabled"))
        assertTrue(readiness.diagnostics.contains("listener_disconnected"))
        assertFalse(readiness.diagnostics.contains("app_notifications_disabled"))
    }

    @Test
    fun selectedUnverifiedBankWithListenerAccessIsReadyReviewOnly() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = false,
                notificationListenerAccessEnabled = true,
                listenerConnected = true,
                selectedBankProfiles = listOf(unverifiedBank()),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.PENDING,
                previouslyHadNotificationListenerAccess = true,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.READY_REVIEW_ONLY, readiness.state)
        assertTrue(readiness.receiverReady)
        assertTrue(readiness.captureEnabled)
        assertTrue(readiness.uploadEnabled)
        assertTrue(readiness.diagnostics.contains("app_notifications_disabled"))
        assertTrue(readiness.diagnostics.contains("bank_profile_unverified"))
        assertFalse(readiness.toString().contains("ready_auto_confirm"))
    }

    @Test
    fun noSelectedBanksBlocksReadiness() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = true,
                notificationListenerAccessEnabled = true,
                listenerConnected = true,
                selectedBankProfiles = emptyList(),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.ACTIVE,
                previouslyHadNotificationListenerAccess = true,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.BANK_SELECTION_REQUIRED, readiness.state)
        assertFalse(readiness.receiverReady)
        assertFalse(readiness.captureEnabled)
        assertTrue(readiness.diagnostics.contains("no_banks_allowed"))
    }

    @Test
    fun activeReceiverWithSelectedToVerifyBankIsReadyReviewOnly() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = true,
                notificationListenerAccessEnabled = true,
                listenerConnected = true,
                selectedBankProfiles = listOf(
                    ReceiverBankProfileSelectionDefaults.sberToVerify(selected = true)
                        .toOnboardingProfile()
                ),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.ACTIVE,
                previouslyHadNotificationListenerAccess = true,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.READY_REVIEW_ONLY, readiness.state)
        assertTrue(readiness.receiverReady)
        assertTrue(readiness.captureEnabled)
        assertTrue(readiness.uploadEnabled)
        assertTrue(readiness.diagnostics.contains("bank_profile_unverified"))
        assertFalse(readiness.toString().contains("ready_auto_confirm", ignoreCase = true))
    }

    @Test
    fun selectedTrustedSyntheticDebugBankDoesNotCreateProductionReadyState() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = true,
                notificationListenerAccessEnabled = true,
                listenerConnected = true,
                selectedBankProfiles = listOf(
                    ReceiverBankProfileSelection(
                        bankProfileId = "synthetic_debug_only_verified",
                        displayName = "Synthetic Debug Bank",
                        packageName = "com.swimpay.syntheticbank.debug",
                        packageCertSha256 = "synthetic_debug_only_cert",
                        verificationStatus = BankPackageVerificationStatus.VERIFIED,
                        selected = true,
                        reviewOnly = false,
                        syntheticDebugOnly = true
                    ).toOnboardingProfile()
                ),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.ACTIVE,
                previouslyHadNotificationListenerAccess = true,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.READY_REVIEW_ONLY, readiness.state)
        assertFalse(readiness.toString().contains("ready_auto_confirm", ignoreCase = true))
    }

    @Test
    fun detectsRegrantRequiredAfterReinstallOrDataClear() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = true,
                notificationListenerAccessEnabled = false,
                listenerConnected = false,
                selectedBankProfiles = listOf(unverifiedBank()),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.ACTIVE,
                previouslyHadNotificationListenerAccess = true,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.NOTIFICATION_ACCESS_REQUIRED, readiness.state)
        assertTrue(readiness.diagnostics.contains("regrant_required_after_reinstall"))
    }

    @Test
    fun trustedSelectedBankCanReachReadyButNeverAutoConfirmState() {
        val readiness = ReceiverOnboardingReadinessEvaluator().evaluate(
            ReceiverOnboardingInput(
                appNotificationsPermissionEnabled = true,
                notificationListenerAccessEnabled = true,
                listenerConnected = true,
                selectedBankProfiles = listOf(
                    SelectedBankOnboardingProfile(
                        bankProfileId = "test_verified_bank_profile",
                        selected = true,
                        verificationStatus = BankPackageVerificationStatus.VERIFIED,
                        reviewOnly = false
                    )
                ),
                backendConfigured = true,
                deviceRegistrationStatus = DeviceRegistrationReadinessStatus.ACTIVE,
                previouslyHadNotificationListenerAccess = true,
                appInstalled = true
            )
        )

        assertEquals(ReceiverReadinessState.READY, readiness.state)
        assertTrue(readiness.receiverReady)
        assertFalse(readiness.toString().contains("auto_confirm", ignoreCase = true))
    }

    @Test
    fun settingsActionUsesAndroidNotificationListenerSettings() {
        assertEquals(
            Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS,
            NotificationListenerSettingsAction.intentAction
        )
    }

    private fun unverifiedBank(): SelectedBankOnboardingProfile {
        return SelectedBankOnboardingProfile(
            bankProfileId = "sber_ru",
            selected = true,
            verificationStatus = BankPackageVerificationStatus.TO_VERIFY,
            reviewOnly = true
        )
    }
}
