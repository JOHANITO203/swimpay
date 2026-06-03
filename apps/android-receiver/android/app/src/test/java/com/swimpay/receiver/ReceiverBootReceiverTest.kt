package com.swimpay.receiver

import android.content.Intent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiverBootReceiverTest {
    @Test
    fun rearmsOnBootCompleted() {
        assertTrue(ReceiverBootReceiver.shouldRearm(Intent.ACTION_BOOT_COMPLETED))
    }

    @Test
    fun rearmsOnPackageReplaced() {
        assertTrue(ReceiverBootReceiver.shouldRearm(Intent.ACTION_MY_PACKAGE_REPLACED))
    }

    @Test
    fun ignoresUnrelatedAndNullActions() {
        assertFalse(ReceiverBootReceiver.shouldRearm(null))
        assertFalse(ReceiverBootReceiver.shouldRearm(""))
        assertFalse(ReceiverBootReceiver.shouldRearm(Intent.ACTION_LOCKED_BOOT_COMPLETED))
        assertFalse(ReceiverBootReceiver.shouldRearm("com.swimpay.receiver.DEBUG_SMOKE"))
    }
}
