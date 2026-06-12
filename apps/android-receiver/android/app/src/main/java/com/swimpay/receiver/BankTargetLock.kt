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
    val packageName: String,
    /** Additional package names that belong to the same bank profile (e.g. regional variants).
     *  These are recognised by [BankTargetLock.isSupportedPackage] and
     *  [BankTargetLock.bankProfileIdForPackage] but do NOT produce extra entries in
     *  [BankTargetLock.resolveTargets], preventing duplicate UI rows. */
    val alternatePackageNames: Set<String> = emptySet()
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
        SupportedBankTarget("ozon_bank", "Ozon Банк", "ru.ozon.fintech.finance"),
        SupportedBankTarget("mtn_momo_ci", "MTN MoMo", "mtnft.momo.consumer",
            alternatePackageNames = setOf("com.consumerug")),
        SupportedBankTarget("wise_int", "Wise", "com.transferwise.android"),
        SupportedBankTarget("revolut_int", "Revolut", "com.revolut.revolut"),
        SupportedBankTarget("payoneer_int", "Payoneer", "com.payoneer.android")
    )

    /** All package names recognised by this lock — primary + alternates. */
    private val supportedPackages: Set<String> = buildSet {
        for (target in supportedTargets) {
            add(target.packageName)
            addAll(target.alternatePackageNames)
        }
    }

    fun isSupportedPackage(packageName: String): Boolean {
        return packageName in supportedPackages
    }

    fun bankProfileIdForPackage(packageName: String): String? {
        return supportedTargets.firstOrNull {
            it.packageName == packageName || packageName in it.alternatePackageNames
        }?.bankProfileId
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
            // Detection considers the primary AND any alternate package (e.g. MTN
            // MoMo CI ships as com.consumerug on real devices), so a user who has
            // only an alternate installed still sees the bank as detected/activatable.
            val detected = probe.isInstalled(target.packageName) ||
                target.alternatePackageNames.any { probe.isInstalled(it) }
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
        return enabledPackages(
            states
                .filter { BankTargetInternalState.TARGET_ENABLED in it.internalStates }
                .map { it.bankProfileId }
                .toSet()
        )
    }

    /**
     * Canonical bank-profile-id → notification-package projection. The single source of
     * truth for "which packages does the runtime listen for once these banks are
     * enabled". Includes a target's primary AND alternate packages (e.g. MTN MoMo CI
     * ships as com.consumerug on real devices) so an alternate-package notification is
     * allowed once the bank is enabled — never silently dropped. Both
     * [ReceiverRuntimeConfig.enabledBankPackages] and `ReceivingCatalog.packagesFor`
     * delegate here so the projections can never diverge.
     */
    fun enabledPackages(enabledBankProfileIds: Set<String>): Set<String> {
        return supportedTargets
            .filter { it.bankProfileId in enabledBankProfileIds }
            .flatMap { listOf(it.packageName) + it.alternatePackageNames }
            .toSet()
    }

    fun isNotificationAllowed(packageName: String, enabledPackages: Set<String>): Boolean {
        return packageName in enabledPackages
    }
}
