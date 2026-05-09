package com.swimpay.receiver

import java.security.MessageDigest

object SyntheticNotificationConstants {
    const val PACKAGE_NAME = "synthetic_debug_only.com.swimpay.syntheticbank"
    const val CERT_SHA256 = "synthetic_debug_only.cert_sha256"
    const val BANK_PROFILE_ID = "sber_ru"
    const val PACKAGE_TRUST_LABEL = "synthetic_debug_only"
    const val CHANNEL_ID = "swimpay_synthetic_debug"
    const val TAG_PREFIX = "swimpay_synthetic_debug"
}

data class PackageGateResult(
    val accepted: Boolean,
    val reason: String,
    val packageTrustLabel: String
)

class SyntheticPackageGate(
    private val debugEnabled: Boolean
) {
    fun evaluate(snapshot: NotificationSnapshot): PackageGateResult {
        return RuntimePackageGate(
            debugEnabled = debugEnabled,
            enabledBankPackages = emptySet()
        ).evaluate(snapshot)
    }
}

class RuntimePackageGate(
    private val debugEnabled: Boolean,
    private val enabledBankPackages: Set<String>
) {
    fun evaluate(snapshot: NotificationSnapshot): PackageGateResult {
        if (snapshot.syntheticDebugOnly) {
            return if (debugEnabled &&
                snapshot.packageName == SyntheticNotificationConstants.PACKAGE_NAME &&
                snapshot.packageCertSha256 == SyntheticNotificationConstants.CERT_SHA256
            ) {
                PackageGateResult(true, "synthetic_debug_package_allowed", SyntheticNotificationConstants.PACKAGE_TRUST_LABEL)
            } else {
                PackageGateResult(false, "synthetic_debug_package_disabled", "untrusted")
            }
        }

        if (!BankTargetLock.isSupportedPackage(snapshot.packageName)) {
            return PackageGateResult(false, "unsupported_package_ignored", "untrusted")
        }

        if (!BankTargetLock.isNotificationAllowed(snapshot.packageName, enabledBankPackages)) {
            return PackageGateResult(false, "supported_package_not_enabled", "untrusted")
        }

        return PackageGateResult(true, "enabled_supported_bank_package_allowed", "enabled_supported_bank_package")
    }
}

data class CoalescedNotification(
    val representative: NotificationSnapshot,
    val snapshotCount: Int,
    val firstSnapshotAt: Long,
    val lastSnapshotAt: Long,
    val notificationHash: String,
    val semanticHash: String
)

class NotificationCoalescer {
    fun coalesce(snapshots: List<NotificationSnapshot>): CoalescedNotification {
        require(snapshots.isNotEmpty()) { "snapshots are required" }
        val distinct = snapshots.distinctBy { snapshot ->
            listOf(
                snapshot.packageName,
                snapshot.notificationId.toString(),
                snapshot.tag.orEmpty(),
                snapshot.postTime.toString(),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.title.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.text.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.bigText.orEmpty())
            ).joinToString("|")
        }
        val first = distinct.minBy { it.postTime }
        val last = distinct.maxBy { it.postTime }
        val representative = distinct.last()
        val notificationBasis = distinct.joinToString("||") { snapshot ->
            listOf(
                snapshot.packageName,
                snapshot.notificationId.toString(),
                snapshot.tag.orEmpty(),
                snapshot.postTime.toString(),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.title.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.text.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.bigText.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.subText.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.summaryText.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.textLines.joinToString("|"))
            ).joinToString("|")
        }
        val semanticBasis = distinct.joinToString("||") { snapshot ->
            listOf(
                snapshot.packageName,
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.title.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.text.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.bigText.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.subText.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.summaryText.orEmpty()),
                NotificationPrivacyCanonicalizer.canonicalize(snapshot.textLines.joinToString("|"))
            ).joinToString("|")
        }
        return CoalescedNotification(
            representative = representative,
            snapshotCount = distinct.size,
            firstSnapshotAt = first.postTime,
            lastSnapshotAt = last.postTime,
            notificationHash = "${SyntheticNotificationConstants.PACKAGE_TRUST_LABEL}:${sha256Hex("notification:$notificationBasis")}",
            semanticHash = "semantic:${sha256Hex("semantic:$semanticBasis")}"
        )
    }
}

data class ReceiverNotificationPipelineResult(
    val accepted: Boolean,
    val nextAction: String,
    val reason: String,
    val safeCategory: String,
    val packageTrustLabel: String,
    val payload: Map<String, Any>? = null
)

class ReceiverNotificationPipeline(
    private val debugEnabled: Boolean,
    enabledBankPackages: Set<String> = emptySet(),
    private val coalescer: NotificationCoalescer = NotificationCoalescer(),
    private val gate: RuntimePackageGate = RuntimePackageGate(debugEnabled, enabledBankPackages)
) {
    fun process(snapshots: List<NotificationSnapshot>): ReceiverNotificationPipelineResult {
        val coalesced = coalescer.coalesce(snapshots)
        val gateResult = gate.evaluate(coalesced.representative)
        if (!gateResult.accepted) {
            return ReceiverNotificationPipelineResult(
                accepted = false,
                nextAction = "ignored",
                reason = gateResult.reason,
                safeCategory = "ignored",
                packageTrustLabel = gateResult.packageTrustLabel
            )
        }

        val redacted = redact(coalesced.representative)
        val payload = linkedMapOf<String, Any>(
            "event_id" to "evt_listener_${coalesced.notificationHash.substringAfter(':').take(24)}",
            "bank_profile_id" to coalesced.representative.bankProfileId,
            "package_name" to coalesced.representative.packageName,
            "package_cert_sha256" to coalesced.representative.packageCertSha256,
            "observed_at" to isoFromMillis(coalesced.lastSnapshotAt),
            "notification_hash" to coalesced.notificationHash,
            "semantic_hash" to coalesced.semanticHash,
            "snapshot_count" to coalesced.snapshotCount,
            "coalesced" to true,
            "amount_minor" to (redacted.localParserHints.amountMinor ?: 0L),
            "currency" to (redacted.localParserHints.currency ?: "RUB"),
            "sender_phone_hmac" to (redacted.localParserHints.senderPhoneMasked?.let { sha256Hex("phone:$it") } ?: ""),
            "sender_phone_masked" to (redacted.localParserHints.senderPhoneMasked ?: ""),
            "reference_hmac" to (redacted.localParserHints.referenceMasked?.let { sha256Hex("reference:$it") } ?: ""),
            "reference_code_masked" to (redacted.localParserHints.referenceMasked ?: ""),
            "direction_hint" to redacted.localParserHints.directionHint,
            "parser_hint" to if (coalesced.representative.syntheticDebugOnly) {
                "android-listener-synthetic-debug"
            } else {
                "android-listener-runtime-redacted"
            },
            "signal_quality_hint" to if (redacted.localParserHints.directionHint == "incoming_customer_transfer") 50 else 10,
            "redacted_title" to (redacted.redactedTitle ?: ""),
            "redacted_body" to redacted.redactedBody,
            "raw_text_present" to false
        )

        return ReceiverNotificationPipelineResult(
            accepted = true,
            nextAction = "enqueued",
            reason = if (coalesced.representative.syntheticDebugOnly) {
                "synthetic_notification_processed"
            } else {
                "runtime_notification_processed"
            },
            safeCategory = redacted.localParserHints.directionHint,
            packageTrustLabel = gateResult.packageTrustLabel,
            payload = payload
        )
    }

    private fun redact(snapshot: NotificationSnapshot): PrivacyFirewallResult {
        val combined = listOfNotNull(snapshot.title, snapshot.text, snapshot.bigText, snapshot.summaryText)
            .plus(snapshot.textLines)
            .joinToString(" ")
        val direction = classifyDirection(combined)
        val amountMinor = extractAmountMinor(combined)
        val redactedTitle = snapshot.title?.let(NotificationPrivacyCanonicalizer::redactText)
        val redactedBody = NotificationPrivacyCanonicalizer.redactText(combined)
        return PrivacyFirewallResult(
            redactedTitle = redactedTitle,
            redactedBody = redactedBody,
            rawTextPresent = false,
            localParserHints = LocalParserHints(
                amountMinor = amountMinor,
                currency = if (amountMinor != null) "RUB" else null,
                senderPhoneMasked = if (NotificationPrivacyCanonicalizer.containsPhone(combined)) "<PHONE>" else null,
                referenceMasked = if (NotificationPrivacyCanonicalizer.containsReference(combined)) "<REFERENCE>" else null,
                directionHint = direction
            )
        )
    }

    private fun classifyDirection(value: String): String {
        val lower = value.lowercase()
        return when {
            lower.contains("cashback") || lower.contains("кэшбек") || lower.contains("кешбек") -> "cashback"
            lower.contains("refund") || lower.contains("возврат") -> "refund"
            lower.contains("outgoing") || lower.contains("списан") || lower.contains("исход") -> "outgoing"
            lower.contains("promo") || lower.contains("бонус") || lower.contains("промо") -> "promo"
            lower.contains("failed") || lower.contains("не выполн") || lower.contains("отклон") -> "failed"
            lower.contains("поступ") || lower.contains("перевод") || lower.contains("incoming") -> "incoming_customer_transfer"
            else -> "unknown"
        }
    }

    private fun extractAmountMinor(value: String): Long? {
        val match = Regex("""(\d+)(?:[,.](\d{1,2}))?\s*(₽|rub|руб)""", RegexOption.IGNORE_CASE).find(value)
            ?: return null
        val major = match.groupValues[1].toLong()
        val minor = match.groupValues[2].padEnd(2, '0').take(2).ifBlank { "00" }.toLong()
        return major * 100 + minor
    }

    private fun redactText(value: String): String {
        return value
            .replace(PHONE_REGEX, "<PHONE>")
            .replace(REFERENCE_REGEX, "<REFERENCE>")
            .replace(Regex("""\d+(?:[,.]\d{1,2})?\s*(₽|rub|руб)""", RegexOption.IGNORE_CASE), "<AMOUNT> <CURRENCY>")
    }

    private fun isoFromMillis(value: Long): String {
        return java.time.Instant.ofEpochMilli(value).toString()
    }

    companion object {
        private val PHONE_REGEX = Regex("""\+?\d[\d\s()\-]{7,}\d""")
        private val REFERENCE_REGEX = Regex("""\bSWP-[A-Z0-9-]+\b""", RegexOption.IGNORE_CASE)
    }
}

private object NotificationPrivacyCanonicalizer {
    private val PHONE_REGEX = Regex("""\+?\d[\d\s()\-]{7,}\d""")
    private val REFERENCE_REGEX = Regex(
        """\b(?:SWP-[A-Z0-9-]+|(?:ref|reference|order|invoice|comment)\s*[:#-]?\s*[A-Z0-9][A-Z0-9-]{3,})\b""",
        RegexOption.IGNORE_CASE
    )
    private val CARD_MASK_REGEX = Regex(
        """(?i)\b(?:card|visa|mir|mastercard|account)?\s*(?:[*x]{1,4}[\s-]?\d{3,4}|\d{4}[\s-]?[*x]{2,}[\s-]?[*x]{2,}[\s-]?\d{2,4}|[*x]{2,}[\s-]?\d{2,4})\b"""
    )
    private val PERSON_FROM_REGEX = Regex(
        """\b(from|sender)\s+[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,2}""",
        RegexOption.IGNORE_CASE
    )
    private val AMOUNT_REGEX = Regex("""\d+(?:[,.]\d{1,2})?\s*(₽|rub|руб\.?)""", RegexOption.IGNORE_CASE)
    private val SPACES_REGEX = Regex("""\s+""")

    fun containsPhone(value: String): Boolean = PHONE_REGEX.containsMatchIn(value)

    fun containsReference(value: String): Boolean = REFERENCE_REGEX.containsMatchIn(value)

    fun redactText(value: String): String {
        return value
            .replace(PHONE_REGEX, "<PHONE>")
            .replace(CARD_MASK_REGEX, "<CARD_MASK>")
            .replace(REFERENCE_REGEX, "<REFERENCE>")
            .replace(PERSON_FROM_REGEX) { match ->
                val prefix = match.groupValues[1]
                "$prefix <PERSON>"
            }
            .replace(AMOUNT_REGEX, "<AMOUNT> <CURRENCY>")
            .replace(SPACES_REGEX, " ")
            .trim()
    }

    fun canonicalize(value: String): String {
        return redactText(value).lowercase().replace(SPACES_REGEX, " ").trim()
    }
}

object SyntheticNotificationFixtures {
    fun incomingTransferSnapshot(
        title: String = "Поступление 137 ₽",
        text: String = "Перевод от <PERSON> +79991234567. Коммент SWP-ABC123",
        postTime: Long = 1_775_000_000_000L
    ): NotificationSnapshot {
        return NotificationSnapshot(
            packageName = SyntheticNotificationConstants.PACKAGE_NAME,
            notificationId = 137,
            tag = "${SyntheticNotificationConstants.TAG_PREFIX}_incoming",
            postTime = postTime,
            channelId = SyntheticNotificationConstants.CHANNEL_ID,
            groupKey = null,
            sortKey = null,
            title = title,
            text = text,
            bigText = text,
            subText = null,
            summaryText = null,
            textLines = listOf(text),
            tickerText = null,
            syntheticDebugOnly = true,
            bankProfileId = SyntheticNotificationConstants.BANK_PROFILE_ID,
            packageCertSha256 = SyntheticNotificationConstants.CERT_SHA256,
            verificationStatus = BankPackageVerificationStatus.VERIFIED
        )
    }

    fun negativeSnapshot(category: String): NotificationSnapshot {
        val body = when (category) {
            "cashback" -> "Cashback 137 RUB for synthetic purchase"
            "refund" -> "Refund 137 RUB from synthetic merchant"
            "outgoing" -> "Outgoing transfer 137 RUB to <PERSON>"
            "promo" -> "Promo bonus 137 RUB"
            "failed" -> "Transfer failed 137 RUB"
            else -> "Unknown notification"
        }
        return incomingTransferSnapshot(
            title = "Synthetic $category",
            text = body,
            postTime = 1_775_000_000_000L + category.length
        )
    }
}

data class StagingSyntheticHarnessResult(
    val supportedBankAccepted: Boolean,
    val unsupportedPackageIgnored: Boolean,
    val rawTextBlockedAtBoundary: Boolean,
    val redactedSignalEnvelopeCreated: Boolean,
    val androidConfirmedPayment: Boolean,
    val androidDeveloperWebhookEmitted: Boolean,
    val safeEnvelope: Map<String, Any>?
)

object StagingSyntheticNotificationHarness {
    fun supportedBankSnapshot(
        packageName: String = "ru.sberbankmobile",
        bankProfileId: String = BankTargetLock.bankProfileIdForPackage(packageName) ?: "sber_ru",
        title: String = "Incoming transfer 137 RUB",
        text: String = "Transfer from Ivan +79991234567. Ref SWP-ABC123",
        postTime: Long = 1_775_000_100_000L
    ): NotificationSnapshot {
        require(BankTargetLock.isSupportedPackage(packageName)) {
            "Synthetic staging harness only simulates supported bank packages"
        }
        return NotificationSnapshot(
            packageName = packageName,
            notificationId = 585,
            tag = "swimpay_staging_synthetic",
            postTime = postTime,
            channelId = "synthetic_staging",
            groupKey = null,
            sortKey = null,
            title = title,
            text = text,
            bigText = text,
            subText = null,
            summaryText = null,
            textLines = listOf(text),
            tickerText = null,
            syntheticDebugOnly = false,
            bankProfileId = bankProfileId,
            packageCertSha256 = "TO_VERIFY",
            verificationStatus = BankPackageVerificationStatus.TO_VERIFY
        )
    }

    fun unsupportedPackageSnapshot(): NotificationSnapshot {
        return NotificationSnapshot(
            packageName = "com.example.unrelated",
            notificationId = 586,
            tag = "swimpay_staging_synthetic_unsupported",
            postTime = 1_775_000_100_500L,
            channelId = "synthetic_staging",
            groupKey = null,
            sortKey = null,
            title = "Incoming transfer 137 RUB",
            text = "Transfer from Ivan +79991234567. Ref SWP-ABC123",
            bigText = "Transfer from Ivan +79991234567. Ref SWP-ABC123",
            subText = null,
            summaryText = null,
            textLines = listOf("Transfer from Ivan +79991234567. Ref SWP-ABC123"),
            tickerText = null,
            syntheticDebugOnly = false,
            bankProfileId = "unknown",
            packageCertSha256 = "TO_VERIFY",
            verificationStatus = BankPackageVerificationStatus.TO_VERIFY
        )
    }

    fun runSmoke(enabledBankPackages: Set<String>): StagingSyntheticHarnessResult {
        val pipeline = ReceiverNotificationPipeline(
            debugEnabled = false,
            enabledBankPackages = enabledBankPackages
        )
        val supported = pipeline.process(listOf(supportedBankSnapshot()))
        val unsupported = pipeline.process(listOf(unsupportedPackageSnapshot()))
        val rawTextBlocked = runCatching {
            com.swimpay.receiver.outbox.AndroidEncryptedOutboxStore(
                com.swimpay.receiver.outbox.FakeEncryptedStorageAdapter()
            ).enqueue(
                com.swimpay.receiver.outbox.OutboxRecord(
                    localId = "outbox_raw",
                    eventId = "evt_raw",
                    notificationHash = "hash_raw",
                    semanticHash = "semantic_raw",
                    payloadHash = "payload_hash_raw",
                    encryptedPayload = """{"raw_notification_text":"Transfer +79991234567"}""",
                    status = com.swimpay.receiver.outbox.OutboxStatus.PENDING_UPLOAD,
                    attemptCount = 0,
                    firstSeenAt = "2026-05-08T00:00:00.000Z",
                    lastAttemptAt = null,
                    nextRetryAt = null,
                    ackReceivedAt = null
                )
            )
        }.isFailure
        val envelopeCreated = supported.payload != null &&
            supported.payload.toString().contains("<PHONE>") &&
            !supported.payload.toString().contains("+79991234567")

        return StagingSyntheticHarnessResult(
            supportedBankAccepted = supported.accepted,
            unsupportedPackageIgnored = !unsupported.accepted && unsupported.reason == "unsupported_package_ignored",
            rawTextBlockedAtBoundary = rawTextBlocked,
            redactedSignalEnvelopeCreated = envelopeCreated,
            androidConfirmedPayment = false,
            androidDeveloperWebhookEmitted = false,
            safeEnvelope = supported.payload
        )
    }
}

private fun sha256Hex(value: String): String {
    return MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8))
        .joinToString("") { byte -> "%02x".format(byte) }
}
