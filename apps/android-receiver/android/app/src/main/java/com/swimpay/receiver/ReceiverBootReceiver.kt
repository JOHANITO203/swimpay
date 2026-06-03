package com.swimpay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.WorkManager
import com.swimpay.receiver.work.ReceiverHeartbeatWorker
import com.swimpay.receiver.work.SignalUploadWorker

/**
 * Re-arms capture after a device reboot or an app update so the receiver works
 * without the user re-opening the app.
 *
 * Android 12+ forbids starting a "background" foreground service from boot, and
 * specialUse is not exempted, so the real guarantee here is [requestListenerRebind]
 * (allowed from any context) plus WorkManager scheduling. A foreground start is
 * still attempted but handled gracefully when the platform refuses it.
 */
class ReceiverBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (!shouldRearm(intent?.action)) {
            return
        }
        Log.i(TAG, "re-arming capture after action=${intent?.action}")

        // Allowed from background/boot: rebind the listener and schedule work.
        ReceiverForegroundService.requestListenerRebind(context)
        runCatching {
            val workManager = WorkManager.getInstance(context)
            ReceiverHeartbeatWorker.enqueuePeriodic(workManager)
            SignalUploadWorker.enqueueExpedited(workManager)
        }.onFailure { Log.w(TAG, "work scheduling on boot failed: ${it.javaClass.simpleName}") }

        // Best-effort: refused on Android 12+ for a background specialUse start
        // (handled inside start()); the rebind above is the actual guarantee.
        ReceiverForegroundService.start(context)
    }

    companion object {
        const val TAG = "SwimPayReceiverBoot"

        /** Pure action filter so the boot/update gate is unit-testable without Android. */
        fun shouldRearm(action: String?): Boolean {
            return action == Intent.ACTION_BOOT_COMPLETED ||
                action == Intent.ACTION_MY_PACKAGE_REPLACED
        }
    }
}
