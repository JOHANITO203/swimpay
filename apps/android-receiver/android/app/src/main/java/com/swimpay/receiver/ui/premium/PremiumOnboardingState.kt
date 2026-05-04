package com.swimpay.receiver.ui.premium

import android.content.Context

interface PremiumOnboardingCompletionStore {
    fun isCompleted(): Boolean
    fun markCompleted()
    fun clear()
}

object PremiumOnboardingNavigation {
    const val ROUTE_LANDING = "landing"
    const val ROUTE_MAIN = "main"

    fun initialRoute(onboardingCompleted: Boolean): String {
        return if (onboardingCompleted) ROUTE_MAIN else ROUTE_LANDING
    }
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
