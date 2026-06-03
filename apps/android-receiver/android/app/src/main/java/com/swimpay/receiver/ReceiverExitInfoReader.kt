package com.swimpay.receiver

import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Context
import android.os.Build
import android.util.Log

/**
 * Reads why the receiver process last died (API 30+) so OEM-kill / OOM patterns
 * are diagnosable from logs without Firebase. Read-only; logs model + ABI +
 * reason. The reason->label mapping is pure and unit-tested; the system read is
 * guarded by SDK level so it never loads ApplicationExitInfo on older devices.
 */
object ReceiverExitInfoReader {
    const val TAG = "SwimPayReceiverExit"

    fun logLastExitReason(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            return
        }
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return
        val exits = runCatching {
            activityManager.getHistoricalProcessExitReasons(context.packageName, 0, 1)
        }.getOrNull().orEmpty()
        val last = exits.firstOrNull() ?: return
        val abi = Build.SUPPORTED_ABIS?.firstOrNull() ?: "unknown"
        Log.i(
            TAG,
            "last_exit reason=${describeReason(last.reason)} code=${last.reason} status=${last.status} " +
                "importance=${last.importance} model=${Build.MODEL} abi=$abi desc=${last.description.orEmpty()}"
        )
    }

    fun describeReason(reason: Int): String = when (reason) {
        ApplicationExitInfo.REASON_UNKNOWN -> "unknown"
        ApplicationExitInfo.REASON_LOW_MEMORY -> "low_memory"
        ApplicationExitInfo.REASON_CRASH -> "crash"
        ApplicationExitInfo.REASON_CRASH_NATIVE -> "crash_native"
        ApplicationExitInfo.REASON_ANR -> "anr"
        ApplicationExitInfo.REASON_USER_REQUESTED -> "user_requested"
        ApplicationExitInfo.REASON_USER_STOPPED -> "user_stopped"
        ApplicationExitInfo.REASON_DEPENDENCY_DIED -> "dependency_died"
        ApplicationExitInfo.REASON_OTHER -> "other"
        ApplicationExitInfo.REASON_SIGNALED -> "signaled"
        ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE -> "excessive_resource_usage"
        ApplicationExitInfo.REASON_PERMISSION_CHANGE -> "permission_change"
        ApplicationExitInfo.REASON_EXIT_SELF -> "exit_self"
        ApplicationExitInfo.REASON_INITIALIZATION_FAILURE -> "initialization_failure"
        else -> "unmapped_$reason"
    }
}
