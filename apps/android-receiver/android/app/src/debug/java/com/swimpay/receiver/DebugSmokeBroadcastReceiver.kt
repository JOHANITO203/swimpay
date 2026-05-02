package com.swimpay.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.WorkManager
import com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore
import com.swimpay.receiver.outbox.AndroidOutboxStorageFactory
import com.swimpay.receiver.work.SignalUploadWorker

class DebugSmokeBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val actionId = intent.getStringExtra("action").orEmpty()

        Thread {
            try {
                if (actionId == "schedule_background_retry") {
                    SignalUploadWorker.enqueue(WorkManager.getInstance(context), 0)
                    Log.i(TAG, "action=$actionId success=true message=background retry scheduled; backend decision pending; not official bank confirmation")
                    return@Thread
                }
                val controller = DebugReceiverSmokeController(
                    debugEnabled = BuildConfig.DEBUG,
                    deviceStateStore = PersistentDeviceStateStore(SharedPreferencesDeviceStateStorage(context)),
                    outboxStore = AndroidEncryptedOutboxStore(AndroidOutboxStorageFactory.createMigrating(context))
                )
                val result = controller.performAction(actionId)
                Log.i(TAG, "action=$actionId success=${result.success} message=${result.safeMessage}")
            } catch (error: Exception) {
                Log.i(TAG, "action=$actionId success=false message=${redactDebugMessage(error.message ?: "debug smoke failed")}")
            } finally {
                pendingResult.finish()
            }
        }.start()
    }

    companion object {
        const val ACTION = "com.swimpay.receiver.DEBUG_SMOKE"
        const val TAG = "SwimPayDebugSmoke"
    }
}
