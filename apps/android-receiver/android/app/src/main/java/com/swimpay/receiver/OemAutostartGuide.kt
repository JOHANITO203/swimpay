package com.swimpay.receiver

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/** One OEM "autostart"/"auto-launch" manager screen. Plain data so it is unit-testable. */
data class OemAutostartTarget(
    val oem: String,
    val packageName: String,
    val className: String
)

/**
 * Best-effort guidance to the OEM autostart screen. On MIUI/ColorOS/Funtouch this
 * "auto-launch" allowlist is frequently the real blocker that kills the receiver,
 * beyond the standard battery-optimization exemption.
 *
 * The target table is pure/testable; launching is a thin try-each wrapper that
 * relies on ActivityNotFoundException rather than package-visibility lookups
 * (so it needs no broad package-visibility permission and no per-OEM query entries).
 */
object OemAutostartGuide {
    val targets: List<OemAutostartTarget> = listOf(
        OemAutostartTarget("xiaomi", "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
        OemAutostartTarget("oppo", "com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
        OemAutostartTarget("oppo", "com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"),
        OemAutostartTarget("oppo", "com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"),
        OemAutostartTarget("vivo", "com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"),
        OemAutostartTarget("vivo", "com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"),
        OemAutostartTarget("huawei", "com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
        OemAutostartTarget("huawei", "com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"),
        OemAutostartTarget("letv", "com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"),
        OemAutostartTarget("asus", "com.asus.mobilemanager", "com.asus.mobilemanager.MainActivity")
    )

    /** Opens the first OEM autostart screen that exists on this device. Returns false on stock Android. */
    fun launchBestEffort(context: Context): Boolean {
        for (target in targets) {
            val intent = Intent()
                .setClassName(target.packageName, target.className)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val launched = runCatching {
                context.startActivity(intent)
                true
            }.getOrDefault(false)
            if (launched) {
                return true
            }
        }
        return false
    }
}

/** Builds the standard "ignore battery optimizations" request intent for this app. */
object BatteryOptimizationRequestAction {
    val intentAction: String = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS

    fun createIntent(packageName: String): Intent {
        return Intent(intentAction).setData(Uri.parse("package:$packageName"))
    }
}
