package com.swimpay.receiver

import org.junit.Assert.assertTrue
import org.junit.Test

class OemAutostartGuideTest {
    @Test
    fun includesXiaomiMiuiAutostartManager() {
        val xiaomi = OemAutostartGuide.targets.firstOrNull { it.oem == "xiaomi" }
        assertTrue("MIUI autostart target must be present", xiaomi != null)
        assertTrue(xiaomi!!.packageName == "com.miui.securitycenter")
        assertTrue(xiaomi.className.contains("AutoStartManagementActivity"))
    }

    @Test
    fun coversTheMainOemKillerFamilies() {
        val oems = OemAutostartGuide.targets.map { it.oem }.toSet()
        listOf("xiaomi", "oppo", "vivo", "huawei").forEach {
            assertTrue("missing OEM autostart family: $it", oems.contains(it))
        }
    }

    @Test
    fun everyTargetIsFullyQualifiedAndNonBlank() {
        OemAutostartGuide.targets.forEach { target ->
            assertTrue(target.oem.isNotBlank())
            assertTrue(target.packageName.contains("."))
            assertTrue("class must be fully qualified", target.className.contains("."))
        }
    }
}
