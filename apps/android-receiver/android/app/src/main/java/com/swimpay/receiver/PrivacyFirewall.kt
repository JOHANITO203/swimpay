package com.swimpay.receiver

data class LocalParserHints(
    val amountMinor: Long?,
    val currency: String?,
    val senderPhoneMasked: String?,
    val referenceMasked: String?,
    val directionHint: String
)

data class PrivacyFirewallResult(
    val redactedTitle: String?,
    val redactedBody: String,
    val rawTextPresent: Boolean = false,
    val localParserHints: LocalParserHints
)
