package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.InMemoryPremiumOnboardingStateStore
import com.swimpay.receiver.ui.premium.PremiumMainTab
import com.swimpay.receiver.ui.premium.PremiumNavigation
import com.swimpay.receiver.ui.premium.PremiumRoute
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumOnboardingStateTest {
    @Test
    fun incompleteOnboardingStartsAtLandingAndCompletedStartsAtMain() {
        val store = InMemoryPremiumOnboardingStateStore(completed = false)

        assertFalse(store.isCompleted())
        assertEquals(PremiumRoute.Landing, PremiumNavigation.initialRoute(store.isCompleted()))

        store.markCompleted()

        assertTrue(store.isCompleted())
        assertEquals(PremiumRoute.Main(PremiumMainTab.Home), PremiumNavigation.initialRoute(store.isCompleted()))
    }
}
