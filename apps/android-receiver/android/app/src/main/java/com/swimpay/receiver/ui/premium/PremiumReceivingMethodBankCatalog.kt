package com.swimpay.receiver.ui.premium

import com.swimpay.receiver.BankTargetLock

data class PremiumReceivingMethodBankOption(
    val bankProfileId: String,
    val displayName: String,
    val configurable: Boolean = true
)

object PremiumReceivingMethodBankCatalog {
    val availableBanks: List<PremiumReceivingMethodBankOption> = BankTargetLock.supportedTargets.map {
        PremiumReceivingMethodBankOption(
            bankProfileId = it.bankProfileId,
            displayName = it.displayName
        )
    }
}
