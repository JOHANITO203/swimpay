package com.swimpay.receiver

import android.content.Context
import android.content.pm.PackageManager

enum class BankTargetInternalState {
    TARGET_SUPPORTED,
    TARGET_DETECTED,
    TARGET_NOT_DETECTED,
    TARGET_SELECTED,
    TARGET_ENABLED,
    TARGET_LISTENER_READY,
    TARGET_SIGNAL_OBSERVED,
    TARGET_LEARNING_ACTIVE
}

enum class BankTargetVisibleStatus(val label: String) {
    DETECTED("Détectée"),
    NOT_DETECTED("Non détectée"),
    ENABLED("Activée"),
    CONFIGURE("À configurer")
}

data class SupportedBankTarget(
    val bankProfileId: String,
    val displayName: String,
    val packageName: String
)

data class BankTargetState(
    val target: SupportedBankTarget,
    val internalStates: Set<BankTargetInternalState>,
    val visibleStatus: BankTargetVisibleStatus,
    val canActivate: Boolean
) {
    val bankProfileId: String = target.bankProfileId
    val displayName: String = target.displayName
}

interface ExactPackageProbe {
    fun isInstalled(packageName: String): Boolean
}

class PackageManagerExactPackageProbe(
    private val context: Context
) : ExactPackageProbe {
    override fun isInstalled(packageName: String): Boolean {
        require(BankTargetLock.isSupportedPackage(packageName)) {
            "Only supported bank packages can be probed"
        }
        return try {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(packageName, 0)
            true
        } catch (_: PackageManager.NameNotFoundException) {
            false
        }
    }
}

object BankTargetLock {
    val supportedTargets: List<SupportedBankTarget> = listOf(
        SupportedBankTarget("sber_ru", "Sberbank", "ru.sberbankmobile"),
        SupportedBankTarget("tbank_ru", "T-Bank", "com.idamob.tinkoff.android"),
        SupportedBankTarget("vtb_ru", "VTB", "ru.vtb24.mobilebanking.android"),
        SupportedBankTarget("alfa_ru", "Alfa-Bank", "ru.alfabank.mobile.android"),
        SupportedBankTarget("gazprombank_ru", "Gazprombank", "ru.gazprombank.android.mobilebank.app"),
        SupportedBankTarget("ozon_bank", "Ozon Банк", "ru.ozon.fintech.finance")
    )

    private val supportedPackages: Set<String> = supportedTargets.map { it.packageName }.toSet()

    fun isSupportedPackage(packageName: String): Boolean {
        return packageName in supportedPackages
    }

    fun bankProfileIdForPackage(packageName: String): String? {
        return supportedTargets.firstOrNull { it.packageName == packageName }?.bankProfileId
    }

    fun resolveTargets(
        probe: ExactPackageProbe,
        selectedBankProfileIds: Set<String>,
        enabledBankProfileIds: Set<String>,
        listenerReady: Boolean,
        observedSignalBankProfileIds: Set<String> = emptySet(),
        learningActiveBankProfileIds: Set<String> = emptySet()
    ): List<BankTargetState> {
        return supportedTargets.map { target ->
            val detected = probe.isInstalled(target.packageName)
            val selected = target.bankProfileId in selectedBankProfileIds
            val enabled = detected && target.bankProfileId in enabledBankProfileIds
            val states = buildSet {
                add(BankTargetInternalState.TARGET_SUPPORTED)
                add(if (detected) BankTargetInternalState.TARGET_DETECTED else BankTargetInternalState.TARGET_NOT_DETECTED)
                if (selected) add(BankTargetInternalState.TARGET_SELECTED)
                if (enabled) add(BankTargetInternalState.TARGET_ENABLED)
                if (enabled && listenerReady) add(BankTargetInternalState.TARGET_LISTENER_READY)
                if (target.bankProfileId in observedSignalBankProfileIds) add(BankTargetInternalState.TARGET_SIGNAL_OBSERVED)
                if (target.bankProfileId in learningActiveBankProfileIds) add(BankTargetInternalState.TARGET_LEARNING_ACTIVE)
            }
            BankTargetState(
                target = target,
                internalStates = states,
                visibleStatus = when {
                    enabled -> BankTargetVisibleStatus.ENABLED
                    detected -> BankTargetVisibleStatus.DETECTED
                    else -> BankTargetVisibleStatus.NOT_DETECTED
                },
                canActivate = detected
            )
        }
    }

    fun enabledPackages(states: List<BankTargetState>): Set<String> {
        return states
            .filter { BankTargetInternalState.TARGET_ENABLED in it.internalStates }
            .map { it.target.packageName }
            .toSet()
    }

    fun isNotificationAllowed(packageName: String, enabledPackages: Set<String>): Boolean {
        return packageName in enabledPackages
    }
}
