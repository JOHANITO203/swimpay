package com.swimpay.receiver

import java.security.MessageDigest
import java.util.Locale

enum class NotificationCategory(val wireValue: String) {
    INCOMING_CUSTOMER_TRANSFER("incoming_customer_transfer"),
    INCOMING_CARD_TRANSFER("incoming_card_transfer"),
    INCOMING_SBP_TRANSFER("incoming_sbp_transfer"),
    CASHBACK("cashback"),
    REFUND("refund"),
    OUTGOING_PAYMENT("outgoing_payment"),
    OUTGOING_TRANSFER("outgoing_transfer"),
    FAILED_TRANSFER("failed_transfer"),
    PROMO("promo"),
    BALANCE_UPDATE("balance_update"),
    SYSTEM_NOTICE("system_notice"),
    UNKNOWN("unknown")
}

data class BankProfileVersion(val value: String)

data class BankNotificationAgent(
    private val profiles: List<StaticBankProfile>,
    private val merchantScopedHash: (String) -> String
) {
    private val profilesByPackage = profiles.associateBy { it.packageName }

    fun process(input: BankNotificationInput, enabledPackages: Set<String>): BankNotificationAgentResult {
        val profile = profilesByPackage[input.packageName]
        if (profile == null) {
            return BankNotificationAgentResult(
                filterDecision = NotificationFilterDecision(accepted = false, reason = "unsupported_package")
            )
        }
        if (input.packageName !in enabledPackages) {
            return BankNotificationAgentResult(
                filterDecision = NotificationFilterDecision(accepted = false, reason = "bank_package_not_enabled")
            )
        }

        val firewall = PrivacyFirewallV1.redact(input.title, input.body, merchantScopedHash)
        val shape = DirectionAwareShapeHasher.hash(firewall.redactedText)
        val classification = DeterministicNotificationClassifier().classify(profile, firewall.redactedText)
        return BankNotificationAgentResult(
            filterDecision = NotificationFilterDecision(accepted = true, reason = "enabled_bank_package"),
            privacyFirewallResult = firewall,
            shapeHashResult = shape,
            classification = classification,
            uploadPayload = RedactedSignalUploadPayload(
                eventId = "evt_${sha256Hex("${input.packageName}:${input.observedAtEpochMs}:${shape.shapeHash}").take(24)}",
                notificationHash = "notification_v1:${sha256Hex("${input.packageName}:${shape.shapeHash}:${input.observedAtEpochMs}")}",
                shapeHash = shape.shapeHash,
                bankProfileId = profile.bankProfileId,
                packageName = profile.packageName,
                profileVersion = profile.version.value,
                classification = classification.classification,
                confidence = classification.confidence,
                amountMinor = firewall.amountMinor,
                currency = firewall.currency,
                merchantScopedReferenceHmac = firewall.referenceHmac,
                merchantScopedSenderPhoneHmac = firewall.senderPhoneHmac,
                reasonCodes = classification.reasonCodes,
                autoConfirmAllowed = false,
                rawTextPresent = false
            )
        )
    }
}

data class BankNotificationInput(
    val packageName: String,
    val title: String?,
    val body: String?,
    val observedAtEpochMs: Long
)

data class NotificationFilterDecision(
    val accepted: Boolean,
    val reason: String
)

data class BankNotificationAgentResult(
    val filterDecision: NotificationFilterDecision,
    val privacyFirewallResult: AgentPrivacyFirewallResult? = null,
    val shapeHashResult: ShapeHashResult? = null,
    val classification: NotificationClassification = NotificationClassification.ignored(),
    val uploadPayload: RedactedSignalUploadPayload? = null
)

data class AgentPrivacyFirewallResult(
    val redactedText: String,
    val amountMinor: Long?,
    val currency: String?,
    val senderPhoneHmac: String?,
    val referenceHmac: String?,
    val rawTextPresent: Boolean = false
)

data class ShapeHashResult(
    val tokens: List<String>,
    val canonicalShape: String,
    val shapeHash: String
)

data class StaticBankProfile(
    val bankProfileId: String,
    val displayName: String,
    val packageName: String,
    val version: BankProfileVersion,
    val profileSignature: String,
    val keywordRules: BankKeywordRules,
    val negativeGates: Set<NotificationCategory>,
    val autoConfirmEnabled: Boolean = false
)

data class BankKeywordRules(
    val incoming: Set<String>,
    val card: Set<String>,
    val sbp: Set<String>,
    val cashback: Set<String>,
    val refund: Set<String>,
    val outgoing: Set<String>,
    val failed: Set<String>,
    val promo: Set<String>,
    val balance: Set<String>,
    val system: Set<String>
)

data class BankProfileValidationResult(
    val valid: Boolean,
    val reason: String
)

object StaticBankProfileRegistry {
    private val version = BankProfileVersion("intelligence-v1")
    private val commonRules = BankKeywordRules(
        incoming = setOf("поступ", "зачисл", "incoming", "received", "перевод"),
        card = setOf("карта", "карт", "card"),
        sbp = setOf("сбп", "sbp", "телефон"),
        cashback = setOf("кэшбэк", "кешбэк", "cashback"),
        refund = setOf("возврат", "refund"),
        outgoing = setOf("списан", "исход", "outgoing", "оплата"),
        failed = setOf("не выполн", "отклон", "failed"),
        promo = setOf("промо", "bonus", "бонус", "promo"),
        balance = setOf("баланс", "balance"),
        system = setOf("систем", "system")
    )

    fun v1Profiles(): List<StaticBankProfile> = BankTargetLock.supportedTargets.map { target ->
        StaticBankProfile(
            bankProfileId = target.bankProfileId,
            displayName = target.displayName,
            packageName = target.packageName,
            version = version,
            profileSignature = "profile_v1:${sha256Hex("${target.bankProfileId}:${target.packageName}:${version.value}")}",
            keywordRules = commonRules,
            negativeGates = setOf(
                NotificationCategory.CASHBACK,
                NotificationCategory.REFUND,
                NotificationCategory.OUTGOING_PAYMENT,
                NotificationCategory.OUTGOING_TRANSFER,
                NotificationCategory.FAILED_TRANSFER,
                NotificationCategory.PROMO,
                NotificationCategory.UNKNOWN
            ),
            autoConfirmEnabled = false
        )
    }

    fun requireProfile(bankProfileId: String): StaticBankProfile {
        return v1Profiles().first { it.bankProfileId == bankProfileId }
    }

    fun validate(profile: StaticBankProfile): BankProfileValidationResult {
        if (profile.autoConfirmEnabled) {
            return BankProfileValidationResult(false, "auto_confirm_not_allowed")
        }
        if (!BankTargetLock.isSupportedPackage(profile.packageName)) {
            return BankProfileValidationResult(false, "unsupported_package")
        }
        if (profile.version.value.isBlank() || profile.profileSignature.isBlank()) {
            return BankProfileValidationResult(false, "profile_integrity_missing")
        }
        return BankProfileValidationResult(true, "valid_static_profile")
    }
}

object DirectionAwareShapeHasher {
    private val phoneRegex = Regex("""\+?\d[\d\s()\-]{7,}\d""")
    private val amountRegex = Regex("""\d+(?:[,.]\d{1,2})?\s*(₽|руб\.?|rub)""", RegexOption.IGNORE_CASE)
    private val referenceRegex = Regex("""\b(?:SWP-[A-Z0-9-]+|[A-Z]{3,}\s+[A-Z]{3,})\b""", RegexOption.IGNORE_CASE)

    fun hash(value: String): ShapeHashResult {
        val normalized = normalize(value)
        val tokens = buildList {
            add(directionToken(normalized))
            if (amountRegex.containsMatchIn(normalized)) {
                add("AMOUNT")
                add("CURRENCY")
            }
            if (phoneRegex.containsMatchIn(normalized)) {
                add("PHONE_HINT")
            }
            if (referenceRegex.containsMatchIn(normalized)) {
                add("REFERENCE_HINT")
            }
        }.distinct()
        val canonical = tokens.joinToString(" ")
        return ShapeHashResult(
            tokens = tokens,
            canonicalShape = canonical,
            shapeHash = "shape_v1:${sha256Hex(canonical)}"
        )
    }

    private fun normalize(value: String): String {
        return value
            .lowercase(Locale.ROOT)
            .replace('ё', 'е')
            .replace(Regex("""[\r\n\t]+"""), " ")
            .replace(Regex("""[!?:;,]+"""), " ")
            .replace(Regex("""\s+"""), " ")
            .trim()
    }

    private fun directionToken(value: String): String {
        return when {
            containsAny(value, "кэшбэк", "кешбек", "cashback") -> "CASHBACK"
            containsAny(value, "возврат", "refund") -> "REFUND"
            containsAny(value, "не выполн", "отклон", "failed") -> "FAILED"
            containsAny(value, "промо", "bonus", "бонус", "promo") -> "PROMO"
            containsAny(value, "баланс", "balance") -> "BALANCE"
            containsAny(value, "систем", "system") -> "SYSTEM"
            containsAny(value, "списан", "исход", "outgoing", "оплата") -> "OUTGOING"
            containsAny(value, "поступ", "зачисл", "incoming", "received", "перевод") -> "INCOMING"
            else -> "UNKNOWN"
        }
    }
}

data class NotificationClassification(
    val classification: NotificationCategory,
    val confidence: Int,
    val suggestedAction: String,
    val autoConfirmAllowed: Boolean,
    val reasonCodes: List<String>,
    val reasonLabels: List<String>
) {
    companion object {
        fun ignored(): NotificationClassification = NotificationClassification(
            classification = NotificationCategory.UNKNOWN,
            confidence = 0,
            suggestedAction = "ignore",
            autoConfirmAllowed = false,
            reasonCodes = listOf("notification_ignored"),
            reasonLabels = listOf("Notification ignorée")
        )
    }
}

class DeterministicNotificationClassifier {
    fun classify(profile: StaticBankProfile, redactedText: String): NotificationClassification {
        require(StaticBankProfileRegistry.validate(profile).valid) { "Static profile is invalid" }
        val text = redactedText.lowercase(Locale.ROOT).replace('ё', 'е')
        val category = when {
            containsAny(text, profile.keywordRules.cashback) -> NotificationCategory.CASHBACK
            containsAny(text, profile.keywordRules.refund) -> NotificationCategory.REFUND
            containsAny(text, profile.keywordRules.failed) -> NotificationCategory.FAILED_TRANSFER
            containsAny(text, profile.keywordRules.promo) -> NotificationCategory.PROMO
            containsAny(text, profile.keywordRules.balance) -> NotificationCategory.BALANCE_UPDATE
            containsAny(text, profile.keywordRules.system) -> NotificationCategory.SYSTEM_NOTICE
            containsAny(text, profile.keywordRules.outgoing) -> if (containsAny(text, "перевод", "transfer")) {
                NotificationCategory.OUTGOING_TRANSFER
            } else {
                NotificationCategory.OUTGOING_PAYMENT
            }
            containsAny(text, profile.keywordRules.incoming) && containsAny(text, profile.keywordRules.sbp) -> NotificationCategory.INCOMING_SBP_TRANSFER
            containsAny(text, profile.keywordRules.incoming) && containsAny(text, profile.keywordRules.card) -> NotificationCategory.INCOMING_CARD_TRANSFER
            containsAny(text, profile.keywordRules.incoming) -> NotificationCategory.INCOMING_CUSTOMER_TRANSFER
            else -> NotificationCategory.UNKNOWN
        }
        return buildClassification(category)
    }

    private fun buildClassification(category: NotificationCategory): NotificationClassification {
        val action = when (category) {
            NotificationCategory.INCOMING_CUSTOMER_TRANSFER,
            NotificationCategory.INCOMING_CARD_TRANSFER,
            NotificationCategory.INCOMING_SBP_TRANSFER -> "needs_review"
            NotificationCategory.UNKNOWN -> "ask_human_feedback"
            else -> "ignore"
        }
        val reason = when (category) {
            NotificationCategory.UNKNOWN -> "unknown_shape_passive_feedback"
            NotificationCategory.CASHBACK -> "cashback_never_confirms"
            NotificationCategory.REFUND -> "refund_never_confirms"
            NotificationCategory.OUTGOING_PAYMENT,
            NotificationCategory.OUTGOING_TRANSFER -> "outgoing_never_confirms"
            NotificationCategory.FAILED_TRANSFER -> "failed_transfer_never_confirms"
            NotificationCategory.PROMO -> "promo_never_confirms"
            else -> "review_first_notification_signal"
        }
        return NotificationClassification(
            classification = category,
            confidence = if (category == NotificationCategory.UNKNOWN) 25 else 90,
            suggestedAction = action,
            autoConfirmAllowed = false,
            reasonCodes = listOf(reason, "auto_confirm_disabled_v1"),
            reasonLabels = listOf("Validation manuelle en bêta")
        )
    }
}

data class RedactedSignalUploadPayload(
    val eventId: String,
    val notificationHash: String,
    val shapeHash: String,
    val bankProfileId: String,
    val packageName: String,
    val profileVersion: String,
    val classification: NotificationCategory,
    val confidence: Int,
    val amountMinor: Long?,
    val currency: String?,
    val merchantScopedReferenceHmac: String?,
    val merchantScopedSenderPhoneHmac: String?,
    val reasonCodes: List<String>,
    val autoConfirmAllowed: Boolean = false,
    val rawTextPresent: Boolean = false
)

object PrivacyFirewallV1 {
    private val phoneRegex = Regex("""\+?\d[\d\s()\-]{7,}\d""")
    private val amountRegex = Regex("""(\d+)(?:[,.](\d{1,2}))?\s*(₽|руб\.?|rub)""", RegexOption.IGNORE_CASE)
    private val referenceRegex = Regex("""\bSWP-[A-Z0-9-]+\b""", RegexOption.IGNORE_CASE)
    private val latinNameAfterFromRegex = Regex("""(?i)\b(?:from|от)\s+[A-Z][a-z]+""")

    fun redact(title: String?, body: String?, merchantScopedHash: (String) -> String): AgentPrivacyFirewallResult {
        val combined = listOfNotNull(title, body).joinToString(" ")
        val amount = extractAmountMinor(combined)
        val currency = if (amount != null) "RUB" else null
        val phone = phoneRegex.find(combined)?.value
        val reference = referenceRegex.find(combined)?.value
        val redacted = combined
            .replace(phoneRegex, "<PHONE>")
            .replace(referenceRegex, "<REFERENCE>")
            .replace(amountRegex, "<AMOUNT> <CURRENCY>")
            .replace(latinNameAfterFromRegex) { match ->
                match.value.substringBeforeLast(" ") + " <PERSON>"
            }
            .replace("Ivan", "<PERSON>")
        return AgentPrivacyFirewallResult(
            redactedText = redacted,
            amountMinor = amount,
            currency = currency,
            senderPhoneHmac = phone?.let(merchantScopedHash),
            referenceHmac = reference?.let(merchantScopedHash),
            rawTextPresent = false
        )
    }

    private fun extractAmountMinor(value: String): Long? {
        val match = amountRegex.find(value) ?: return null
        val major = match.groupValues[1].toLong()
        val minor = match.groupValues.getOrNull(2).orEmpty().padEnd(2, '0').take(2).ifBlank { "00" }.toLong()
        return major * 100 + minor
    }
}

enum class PassiveFeedbackAction(val wireValue: String) {
    CORRECT("correct"),
    CORRECTED("corrected"),
    IGNORED("ignored")
}

enum class PassiveFeedbackReviewStatus(val wireValue: String) {
    PENDING("pending"),
    ACCEPTED("accepted"),
    REJECTED("rejected"),
    DUPLICATE("duplicate")
}

data class PassiveFeedbackEvent(
    val shapeHash: String,
    val bankProfileId: String,
    val packageName: String,
    val profileVersion: String,
    val classificationGuess: NotificationCategory,
    val humanLabel: NotificationCategory,
    val feedback: PassiveFeedbackAction,
    val timestamp: String,
    val reviewStatus: PassiveFeedbackReviewStatus,
    val mutatesRuntimeRules: Boolean = false
)

class PassiveFeedbackCollector {
    fun collect(
        shapeHash: String,
        profile: StaticBankProfile,
        classificationGuess: NotificationCategory,
        humanLabel: NotificationCategory,
        feedback: PassiveFeedbackAction,
        timestamp: String
    ): PassiveFeedbackEvent {
        return PassiveFeedbackEvent(
            shapeHash = shapeHash,
            bankProfileId = profile.bankProfileId,
            packageName = profile.packageName,
            profileVersion = profile.version.value,
            classificationGuess = classificationGuess,
            humanLabel = humanLabel,
            feedback = feedback,
            timestamp = timestamp,
            reviewStatus = PassiveFeedbackReviewStatus.PENDING,
            mutatesRuntimeRules = false
        )
    }
}

enum class LocalDriftMode {
    NORMAL,
    WATCH,
    FORCE_REVIEW_LOCAL
}

data class LocalDriftState(
    val bankProfileId: String,
    val unknownRate: Double,
    val mode: LocalDriftMode,
    val disablesBank: Boolean = false,
    val mutatesProfiles: Boolean = false
)

class LocalDriftGuard(
    private val windowSize: Int = 10,
    private val unknownThreshold: Double = 0.5
) {
    fun evaluate(bankProfileId: String, recentClassifications: List<NotificationCategory>): LocalDriftState {
        val window = recentClassifications.takeLast(windowSize)
        val unknownRate = if (window.isEmpty()) 0.0 else window.count { it == NotificationCategory.UNKNOWN }.toDouble() / window.size
        val mode = when {
            unknownRate > unknownThreshold -> LocalDriftMode.FORCE_REVIEW_LOCAL
            unknownRate > 0.0 -> LocalDriftMode.WATCH
            else -> LocalDriftMode.NORMAL
        }
        return LocalDriftState(
            bankProfileId = bankProfileId,
            unknownRate = unknownRate,
            mode = mode,
            disablesBank = false,
            mutatesProfiles = false
        )
    }
}

data class FiveBankRegressionFixture(
    val bankProfileId: String,
    val redactedText: String,
    val expectedCategory: NotificationCategory
)

object FiveBankRegressionFixtures {
    private val categoryTexts = mapOf(
        NotificationCategory.INCOMING_CUSTOMER_TRANSFER to "Поступление 500 ₽ перевод от клиента",
        NotificationCategory.INCOMING_CARD_TRANSFER to "Поступление на карту 500 ₽",
        NotificationCategory.INCOMING_SBP_TRANSFER to "Поступление СБП по телефону 500 ₽",
        NotificationCategory.CASHBACK to "Кэшбэк 50 ₽ начислен",
        NotificationCategory.REFUND to "Возврат 500 ₽",
        NotificationCategory.OUTGOING_PAYMENT to "Списание оплата 500 ₽",
        NotificationCategory.OUTGOING_TRANSFER to "Списание перевод 500 ₽",
        NotificationCategory.FAILED_TRANSFER to "Платеж не выполнен 500 ₽",
        NotificationCategory.PROMO to "Промо бонус 50 ₽",
        NotificationCategory.BALANCE_UPDATE to "Баланс карты 500 ₽",
        NotificationCategory.SYSTEM_NOTICE to "Системное уведомление банка",
        NotificationCategory.UNKNOWN to "Новый формат уведомления"
    )

    fun all(): List<FiveBankRegressionFixture> {
        return StaticBankProfileRegistry.v1Profiles().flatMap { profile ->
            categoryTexts.map { (category, text) ->
                FiveBankRegressionFixture(profile.bankProfileId, text, category)
            }
        }
    }
}

private fun containsAny(value: String, candidates: Iterable<String>): Boolean {
    return candidates.any { value.contains(it.lowercase(Locale.ROOT)) }
}

private fun containsAny(value: String, vararg candidates: String): Boolean {
    return candidates.any { value.contains(it.lowercase(Locale.ROOT)) }
}

private fun sha256Hex(value: String): String {
    return MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8))
        .joinToString("") { byte -> "%02x".format(byte) }
}
