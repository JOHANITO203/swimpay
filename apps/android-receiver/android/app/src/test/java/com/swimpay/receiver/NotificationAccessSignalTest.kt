package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Robustness guard: when the OS revokes notification access, the
 * [SwimPayNotificationListenerService] stops receiving anything and SwimPay can no
 * longer detect incoming payments. The app MUST signal this on the MAIN surface
 * (Home) — not only in a buried sub-screen — and offer a one-tap path back to the
 * system "notification access" setting. MainActivity already re-reads the live state
 * on every onResume and binds onOpenNotificationSettings to
 * NotificationListenerSettingsAction.createIntent.
 */
class NotificationAccessSignalTest {

    private val dashboardSource: String =
        File("src/main/java/com/swimpay/receiver/ui/premium/PremiumDashboardScreens.kt").readText()

    @Test
    fun homeScreenAcceptsLiveAccessStateAndAnOpenSettingsCallback() {
        assertTrue(
            "Home must accept the live notification-access state",
            dashboardSource.contains("notificationAccessEnabled: Boolean = true")
        )
        assertTrue(
            "Home must accept an open-settings callback",
            dashboardSource.contains("onOpenNotificationSettings: () -> Unit")
        )
    }

    @Test
    fun homeShowsTheReenableBannerOnlyWhenAccessIsDisabled() {
        assertTrue(
            "the banner must be gated on disabled access (not always shown)",
            dashboardSource.contains("if (!notificationAccessEnabled)")
        )
        assertTrue(
            "the banner must be rendered on Home",
            dashboardSource.contains("NoirNotificationAccessBanner(")
        )
        assertTrue(
            "the banner button must open the system notification settings",
            dashboardSource.contains("onReactivate = onOpenNotificationSettings")
        )
    }

    @Test
    fun reenableBannerCarriesAClearPausedSignalAndReactivateAction() {
        assertTrue(dashboardSource.contains("Détection en pause"))
        assertTrue(dashboardSource.contains("Réactiver l'accès"))
    }

    @Test
    fun settingsReflectsTheRealAccessStateNotAHardcodedActif() {
        // Honesty (zero invented data): the Settings "Accès aux notifications" row must
        // reflect the REAL state — Actif (green) / Action requise (amber) — never a
        // hardcoded green "Actif" that lies when the OS has revoked access.
        assertTrue(
            "settings pill text must depend on the real access state",
            dashboardSource.contains("if (notificationAccessEnabled) language.ui(\"Actif\") else language.ui(\"Action requise\")")
        )
        assertTrue(
            "settings pill must use the Warn tone when action is required",
            dashboardSource.contains("else SettingsPillTone.Warn")
        )
        assertFalse(
            "settings must not hardcode the access pill as always Actif/Success",
            dashboardSource.contains("language.ui(\"Accès aux notifications\"), language.ui(\"Actif\"), SettingsPillTone.Success)")
        )
    }
}
