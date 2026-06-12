package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.ReceivingCatalog

/**
 * Outcome of a single allowlist sync. [registered] is true when the device was
 * re-registered with a non-empty derived allowlist; [cleared] is true when the active
 * methods derive to an EMPTY allowlist (only package-less wallets, or none) and the
 * stale runtime config was cleared instead of persisted/registered.
 */
data class ReceivingMethodAllowlistSyncResult(
    val registered: Boolean,
    val cleared: Boolean,
    val enabledBankProfileIds: Set<String>,
    val deviceState: ReceiverDeviceState? = null,
    val safeMessage: String = ""
) {
    /**
     * True when the sync settled coherently: either the device was re-registered with a
     * non-empty allowlist, or the allowlist legitimately derived to empty (package-less
     * only / none) and the stale config was cleared. False only when a non-empty allowlist
     * failed to re-register with the backend.
     */
    val settled: Boolean get() = registered || cleared
}

/**
 * Gap #1 — keep the notification allowlist a CONTINUOUS consequence of the merchant's
 * active receiving methods.
 *
 * The allowlist (`ReceiverRuntimeConfig.enabledBankProfileIds` / `enabledBankPackages`)
 * must be re-derived, persisted, and re-registered after EVERY receiving-method mutation
 * (add / delete / replace), not just once at onboarding. This object is the single
 * derivation+persist+register code path shared by:
 *  - onboarding completion (`finishOnboarding`), and
 *  - every post-onboarding mutation handler in `PremiumMerchantApp`.
 *
 * It lives at a pure-logic seam (interfaces only, no Android Context / Compose), so the
 * exact same code the @Composable app runs is exercised directly by tests.
 *
 * Empty-allowlist case: a set with only package-less WA wallets (Wave, Orange Money CI),
 * or an empty set, derives to NO bank-profile ids. The runtime config store rejects an
 * empty allowlist and `registerAndHeartbeat` rejects an empty bank set, so we CLEAR the
 * stale config and skip registration rather than crash or fabricate a monitored bank —
 * consistent with how `finishOnboarding` skips the save for a package-less choice (T2).
 */
object ReceivingMethodAllowlistSync {

    /**
     * The single derivation: from the active methods' bank-profile ids, the subset that
     * actually carries a receiver notification package. Delegates to [ReceivingCatalog]
     * (the same source `PremiumOnboardingSessionState.derivedEnabledBankProfileIds` uses),
     * so onboarding and mutations can never diverge.
     */
    fun deriveEnabledBankProfileIds(activeBankProfileIds: Set<String>): Set<String> =
        ReceivingCatalog.notificationProfileIdsFor(activeBankProfileIds)

    fun syncFromActiveMethods(
        session: AuthenticatedMerchantSession,
        activeBankProfileIds: Set<String>,
        configWriter: ReceiverRuntimeConfigWriter,
        clearConfig: () -> Unit,
        deviceStateStore: PersistentDeviceStateStore,
        registrationClient: ReceiverDeviceRegistrationClient,
        publicKeyPem: String,
        receiverKeyId: String,
        notificationAccessEnabled: Boolean,
        appVersion: String,
        androidVersion: String
    ): ReceivingMethodAllowlistSyncResult {
        val enabledBankProfileIds = deriveEnabledBankProfileIds(activeBankProfileIds)
        val merchantId = session.merchantId?.trim().orEmpty()

        // Empty allowlist (package-less-only or no method), or no merchant binding yet:
        // clear the stale config and do NOT register — the store require()s a non-empty
        // allowlist and non-blank merchant id, and the backend rejects an empty bank set.
        // We never claim to monitor an app we cannot read.
        if (enabledBankProfileIds.isEmpty() || merchantId.isBlank()) {
            clearConfig()
            return ReceivingMethodAllowlistSyncResult(
                registered = false,
                cleared = true,
                enabledBankProfileIds = emptySet()
            )
        }

        // Persist the derived allowlist (same shape `finishOnboarding` persists).
        configWriter.save(
            ReceiverRuntimeConfig(
                enabledBankProfileIds = enabledBankProfileIds,
                merchantId = merchantId
            )
        )

        // Re-register the device with the UPDATED allowlist so the backend stays in sync.
        val result = registrationClient.registerAndHeartbeat(
            session = session,
            enabledBankProfileIds = enabledBankProfileIds,
            publicKeyPem = publicKeyPem,
            notificationAccessEnabled = notificationAccessEnabled,
            appVersion = appVersion,
            androidVersion = androidVersion
        )
        val deviceState = result.deviceState
        return if (result.status == AndroidMerchantAuthResultStatus.SUCCESS && deviceState != null) {
            val boundState = deviceState.copy(receiverKeyId = receiverKeyId)
            deviceStateStore.save(boundState)
            ReceivingMethodAllowlistSyncResult(
                registered = true,
                cleared = false,
                enabledBankProfileIds = enabledBankProfileIds,
                deviceState = boundState
            )
        } else {
            // The allowlist was persisted locally; the backend re-registration is retried
            // by the existing registration coordinator on next app start.
            ReceivingMethodAllowlistSyncResult(
                registered = false,
                cleared = false,
                enabledBankProfileIds = enabledBankProfileIds,
                safeMessage = result.safeMessage
            )
        }
    }
}
