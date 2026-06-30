package com.swimpay.receiver.ui.premium

import android.content.Context
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.ReceivingMethodType

enum class PremiumOnboardingStep {
    WELCOME,
    NOTIFICATION_ACCESS,
    RECEIVING_METHOD,
    CONNECTED_SITE,
    CONFIGURATION_TEST;

    companion object {
        val requiredSequence: List<PremiumOnboardingStep> = listOf(
            WELCOME,
            NOTIFICATION_ACCESS,
            RECEIVING_METHOD,
            CONNECTED_SITE,
            CONFIGURATION_TEST
        )
    }
}

enum class PremiumReceivingMethodDraft {
    CARD_TRANSFER,
    PHONE_TRANSFER
}

data class PremiumOnboardingSessionState(
    val currentStep: PremiumOnboardingStep = PremiumOnboardingStep.WELCOME,
    val completedSteps: Set<PremiumOnboardingStep> = emptySet(),
    val skippedConnectedSite: Boolean = false,
    val notificationAccessEnabled: Boolean = false,
    val receivingMethodConfigured: Boolean = false,
    val receivingMethodDraft: PremiumReceivingMethodDraft? = null,
    val receivingMethodSubmission: MerchantReceivingMethodSubmission? = null,
    val connectedSiteConfigured: Boolean = false,
    val configurationTestRan: Boolean = false,
    val onboardingCompleted: Boolean = false
) {
    /**
     * Receiving-first derivation: the bank-profile ids that make up the notification
     * allowlist are a CONSEQUENCE of the chosen receiving method(s), never a separate
     * manual screen. Only methods that actually carry a receiver notification package
     * contribute; package-less WA wallets (Wave, Orange Money CI) derive to nothing, so
     * the runtime never claims to monitor an app it cannot read.
     */
    val derivedEnabledBankProfileIds: Set<String>
        get() = ReceivingCatalog.notificationProfileIdsFor(chosenReceivingMethodIds)

    /** Notification packages derived from the chosen receiving method(s). */
    val derivedNotificationPackages: Set<String>
        get() = ReceivingCatalog.packagesFor(chosenReceivingMethodIds)

    private val chosenReceivingMethodIds: Set<String>
        get() = setOfNotNull(receivingMethodSubmission?.bankProfileId)

    val configurationTestReady: Boolean
        get() = notificationAccessEnabled &&
            receivingMethodConfigured &&
            connectedSiteConfigured

    fun withNotificationAccess(enabled: Boolean): PremiumOnboardingSessionState {
        return copy(notificationAccessEnabled = enabled)
    }

    fun withReceivingMethod(method: PremiumReceivingMethodDraft): PremiumOnboardingSessionState {
        return copy(
            receivingMethodConfigured = false,
            receivingMethodDraft = method,
            receivingMethodSubmission = null
        )
    }

    fun withReceivingMethod(submission: MerchantReceivingMethodSubmission): PremiumOnboardingSessionState {
        return copy(
            receivingMethodConfigured = true,
            receivingMethodDraft = when (submission.type) {
                ReceivingMethodType.CARD_TRANSFER -> PremiumReceivingMethodDraft.CARD_TRANSFER
                // Mobile money and international wallets are single-identifier addressed
                // (phone / e-mail / @tag): reuse the phone draft field type.
                ReceivingMethodType.PHONE_TRANSFER,
                ReceivingMethodType.MOBILE_MONEY,
                ReceivingMethodType.WALLET_TRANSFER -> PremiumReceivingMethodDraft.PHONE_TRANSFER
            },
            receivingMethodSubmission = submission
        )
    }

    fun connectSite(): PremiumOnboardingSessionState {
        return copy(
            connectedSiteConfigured = true,
            skippedConnectedSite = false
        )
    }

    fun skipConnectedSite(): PremiumOnboardingSessionState {
        return copy(
            connectedSiteConfigured = false,
            skippedConnectedSite = true
        )
    }

    fun withConfigurationTestRan(): PremiumOnboardingSessionState {
        return copy(configurationTestRan = true)
    }

    fun canContinueFrom(step: PremiumOnboardingStep = currentStep): Boolean {
        return when (step) {
            PremiumOnboardingStep.WELCOME -> true
            PremiumOnboardingStep.NOTIFICATION_ACCESS -> notificationAccessEnabled
            PremiumOnboardingStep.RECEIVING_METHOD -> receivingMethodConfigured && receivingMethodSubmission != null
            PremiumOnboardingStep.CONNECTED_SITE -> connectedSiteConfigured || skippedConnectedSite
            PremiumOnboardingStep.CONFIGURATION_TEST -> configurationTestReady
        }
    }

    fun completeAndMoveNext(): PremiumOnboardingSessionState {
        val completed = completedSteps + currentStep
        if (currentStep == PremiumOnboardingStep.CONNECTED_SITE && skippedConnectedSite) {
            return copy(
                completedSteps = completed,
                configurationTestRan = false,
                onboardingCompleted = true
            )
        }
        val nextIndex = PremiumOnboardingStep.requiredSequence.indexOf(currentStep) + 1
        return if (nextIndex >= PremiumOnboardingStep.requiredSequence.size) {
            copy(
                completedSteps = completed,
                configurationTestRan = true,
                onboardingCompleted = true
            )
        } else {
            copy(
                currentStep = PremiumOnboardingStep.requiredSequence[nextIndex],
                completedSteps = completed
            )
        }
    }

    fun goBack(): PremiumOnboardingSessionState {
        val index = PremiumOnboardingStep.requiredSequence.indexOf(currentStep)
        return if (index <= 0) {
            this
        } else {
            copy(currentStep = PremiumOnboardingStep.requiredSequence[index - 1])
        }
    }

    fun goTo(step: PremiumOnboardingStep): PremiumOnboardingSessionState {
        return copy(currentStep = step)
    }

    fun configurationChecklistLabels(): List<String> {
        return listOf(
            "Accès notifications activé",
            "Moyen de réception ajouté",
            if (connectedSiteConfigured) {
                "Webhook configuré"
            } else {
                "Webhook à configurer"
            }
        )
    }

    fun configurationResultLabels(): List<String> {
        return buildList {
            if (notificationAccessEnabled) add("Réussi") else add("Téléphone non connecté")
            if (receivingMethodConfigured) add("Réussi") else add("Moyen de réception à ajouter")
            if (connectedSiteConfigured) add("Réussi") else add("Webhook à configurer")
            if (!configurationTestReady) add("Action nécessaire")
        }
    }
}

interface PremiumOnboardingCompletionStore {
    fun isCompleted(): Boolean
    fun markCompleted()
    fun clear()
}

class InMemoryPremiumOnboardingStateStore(
    private var completed: Boolean = false
) : PremiumOnboardingCompletionStore {
    override fun isCompleted(): Boolean = completed

    override fun markCompleted() {
        completed = true
    }

    override fun clear() {
        completed = false
    }
}

class SharedPreferencesPremiumOnboardingStateStore(
    context: Context
) : PremiumOnboardingCompletionStore {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    override fun isCompleted(): Boolean {
        return preferences.getBoolean(KEY_ONBOARDING_COMPLETED, false)
    }

    override fun markCompleted() {
        preferences.edit().putBoolean(KEY_ONBOARDING_COMPLETED, true).apply()
    }

    override fun clear() {
        preferences.edit().remove(KEY_ONBOARDING_COMPLETED).apply()
    }

    companion object {
        const val PREFERENCES_NAME = "swimpay_premium_onboarding"
        const val KEY_ONBOARDING_COMPLETED = "onboarding_completed"
    }
}
