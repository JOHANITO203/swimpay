package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.InMemoryPremiumOnboardingStateStore
import com.swimpay.receiver.ui.premium.PremiumOnboardingNavigation
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumOnboardingStateTest {
    @Test
    fun incompleteOnboardingStartsAtLandingAndCompletedStartsAtMain() {
        val store = InMemoryPremiumOnboardingStateStore(completed = false)

        assertFalse(store.isCompleted())
        assertEquals("landing", PremiumOnboardingNavigation.initialRoute(store.isCompleted()))

        store.markCompleted()

        assertTrue(store.isCompleted())
        assertEquals("main", PremiumOnboardingNavigation.initialRoute(store.isCompleted()))
    }
}
