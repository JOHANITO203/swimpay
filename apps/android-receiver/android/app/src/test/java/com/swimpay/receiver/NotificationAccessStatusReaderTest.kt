package com.swimpay.receiver

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class NotificationAccessStatusReaderTest {
    @Test
    fun detectsEnabledNotificationListenerFromSecureSetting() {
        val component = "com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService"
        val setting = "com.other/.Listener:$component"

        assertTrue(NotificationAccessStatusReader.isListenerEnabled(setting, component))
    }

    @Test
    fun returnsDisabledWhenComponentIsMissing() {
        val component = "com.swimpay.receiver/com.swimpay.receiver.SwimPayNotificationListenerService"

        assertFalse(NotificationAccessStatusReader.isListenerEnabled("com.other/.Listener", component))
        assertFalse(NotificationAccessStatusReader.isListenerEnabled(null, component))
    }
}

