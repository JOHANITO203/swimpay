package com.swimpay.receiver.ui.premium

import android.content.Context

enum class PremiumOnboardingStep {
    WELCOME,
    NOTIFICATION_ACCESS,
    COMPATIBLE_BANK_SELECTION,
    RECEIVING_METHOD,
    CONNECTED_SITE,
    CONFIGURATION_TEST;

    companion object {
        val requiredSequence: List<PremiumOnboardingStep> = listOf(
            WELCOME,
            NOTIFICATION_ACCESS,
            COMPATIBLE_BANK_SELECTION,
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
    val detectedCompatibleBankIds: Set<String> = emptySet(),
    val selectedBankIds: Set<String> = emptySet(),
    val receivingMethodConfigured: Boolean = false,
    val receivingMethodDraft: PremiumReceivingMethodDraft? = null,
    val connectedSiteConfigured: Boolean = false,
    val configurationTestRan: Boolean = false,
    val onboardingCompleted: Boolean = false
) {
    val configurationTestReady: Boolean
        get() = notificationAccessEnabled &&
            selectedBankIds.isNotEmpty() &&
            receivingMethodConfigured &&
            connectedSiteConfigured

    fun withNotificationAccess(enabled: Boolean): PremiumOnboardingSessionState {
        return copy(notificationAccessEnabled = enabled)
    }

    fun withDetectedBanks(bankIds: Set<String>): PremiumOnboardingSessionState {
        val supportedIds = bankIds.intersect(SUPPORTED_BANK_PROFILE_IDS)
        return copy(detectedCompatibleBankIds = supportedIds)
    }

    fun withDefaultDetectedBanksSelected(): PremiumOnboardingSessionState {
        return if (selectedBankIds.isEmpty()) {
            copy(selectedBankIds = detectedCompatibleBankIds)
        } else {
            this
        }
    }

    fun toggleBank(bankProfileId: String): PremiumOnboardingSessionState {
        if (bankProfileId !in SUPPORTED_BANK_PROFILE_IDS) return this
        val nextSelected = if (bankProfileId in selectedBankIds) {
            selectedBankIds - bankProfileId
        } else {
            selectedBankIds + bankProfileId
        }
        return copy(selectedBankIds = nextSelected)
    }

    fun withReceivingMethod(method: PremiumReceivingMethodDraft): PremiumOnboardingSessionState {
        return copy(
            receivingMethodConfigured = true,
            receivingMethodDraft = method
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
            PremiumOnboardingStep.COMPATIBLE_BANK_SELECTION -> selectedBankIds.isNotEmpty()
            PremiumOnboardingStep.RECEIVING_METHOD -> receivingMethodConfigured
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
            "Banque choisie",
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
            if (selectedBankIds.isNotEmpty()) add("Réussi") else add("Banque à choisir")
            if (receivingMethodConfigured) add("Réussi") else add("Moyen de réception à ajouter")
            if (connectedSiteConfigured) add("Réussi") else add("Webhook à configurer")
            if (!configurationTestReady) add("Action nécessaire")
        }
    }

    companion object {
        val SUPPORTED_BANK_PROFILE_IDS = setOf(
            "sber_ru",
            "tbank_ru",
            "vtb_ru",
            "alfa_ru",
            "gazprombank_ru"
        )
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
