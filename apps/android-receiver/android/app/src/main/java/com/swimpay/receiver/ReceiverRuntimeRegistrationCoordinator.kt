package com.swimpay.receiver

import com.swimpay.receiver.security.PayloadSigner

data class ReceiverRuntimeRegistrationRefreshResult(
    val success: Boolean,
    val registered: Boolean,
    val safeMessage: String
)

class ReceiverRuntimeRegistrationCoordinator(
    private val registrationClient: ReceiverDeviceRegistrationClient,
    private val deviceStateStore: PersistentDeviceStateStore,
    private val runtimeConfigStore: ReceiverRuntimeConfigReader,
    private val payloadSigner: PayloadSigner
) {
    fun ensureCurrentAsymmetricRegistration(
        session: AuthenticatedMerchantSession,
        notificationAccessEnabled: Boolean,
        appVersion: String,
        androidVersion: String
    ): ReceiverRuntimeRegistrationRefreshResult {
        if (!session.isAuthenticated) {
            return ReceiverRuntimeRegistrationRefreshResult(
                success = false,
                registered = false,
                safeMessage = "Session marchand requise"
            )
        }

        val runtimeConfig = runtimeConfigStore.load()
        if (runtimeConfig.merchantId.isBlank() || runtimeConfig.enabledBankProfileIds.isEmpty()) {
            return ReceiverRuntimeRegistrationRefreshResult(
                success = false,
                registered = false,
                safeMessage = "Configuration receiver incomplete"
            )
        }

        val currentKeyId = runCatching { payloadSigner.keyId() }.getOrElse {
            return ReceiverRuntimeRegistrationRefreshResult(
                success = false,
                registered = false,
                safeMessage = "Cle receiver indisponible"
            )
        }
        val existing = deviceStateStore.load()
        if (!ReceiverRuntimeRegistrationFreshness.needsRegistration(existing, currentKeyId, notificationAccessEnabled)) {
            return ReceiverRuntimeRegistrationRefreshResult(
                success = true,
                registered = false,
                safeMessage = "Receiver deja aligne"
            )
        }

        val publicKeyPem = runCatching { payloadSigner.publicKeyPem() }.getOrElse {
            return ReceiverRuntimeRegistrationRefreshResult(
                success = false,
                registered = false,
                safeMessage = "Cle publique receiver indisponible"
            )
        }
        val result = registrationClient.registerAndHeartbeat(
            session = session,
            enabledBankProfileIds = runtimeConfig.enabledBankProfileIds,
            publicKeyPem = publicKeyPem,
            notificationAccessEnabled = notificationAccessEnabled,
            appVersion = appVersion,
            androidVersion = androidVersion
        )

        val deviceState = result.deviceState
        return if (result.status == AndroidMerchantAuthResultStatus.SUCCESS && deviceState != null) {
            deviceStateStore.save(deviceState.copy(receiverKeyId = currentKeyId))
            ReceiverRuntimeRegistrationRefreshResult(
                success = true,
                registered = true,
                safeMessage = "Receiver aligne avec la cle Android"
            )
        } else {
            ReceiverRuntimeRegistrationRefreshResult(
                success = false,
                registered = false,
                safeMessage = result.safeMessage.ifBlank { "Receiver non aligne" }
            )
        }
    }
}

object ReceiverRuntimeRegistrationFreshness {
    fun needsRegistration(
        existing: ReceiverDeviceState?,
        currentKeyId: String,
        notificationAccessEnabled: Boolean? = null
    ): Boolean {
        if (currentKeyId.isBlank()) return true
        if (existing == null) return true
        if (existing.receiverKeyId != currentKeyId) return true
        return notificationAccessEnabled != null &&
            existing.lastNotificationListenerAccessEnabled != notificationAccessEnabled
    }
}
