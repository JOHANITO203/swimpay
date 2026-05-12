package com.swimpay.receiver

data class ActiveIntentWindow(
    val paymentIntentActive: Boolean,
    val receiverArmed: Boolean,
    val expectedPaymentProfilePresent: Boolean,
    val receivingRouteLocked: Boolean = false
) {
    fun canSweep(): Boolean =
        paymentIntentActive && receiverArmed && expectedPaymentProfilePresent && receivingRouteLocked
}

enum class ActiveNotificationSweepSource {
    LIVE_LISTENER,
    ACTIVE_NOTIFICATIONS,
    KEYED_RECALL,
    SNOOZED_NOTIFICATIONS,
    REDACTED_RECENT_BUFFER
}

data class RedactedRecentObservation(
    val packageName: String,
    val bankId: String,
    val observedAt: String,
    val notificationHash: String,
    val semanticHash: String,
    val categoryGuess: String,
    val amountMinor: Long?,
    val rawTextPresent: Boolean = false
)

class RedactedRecentNotificationBuffer(
    private val maxRecords: Int = 32,
    private val maxAgeMs: Long = 15 * 60 * 1000,
    private val nowEpochMs: () -> Long = System::currentTimeMillis
) {
    private val observations = ArrayDeque<RedactedRecentObservation>()

    fun add(observation: RedactedRecentObservation) {
        require(!observation.rawTextPresent) { "recent buffer accepts redacted observations only" }
        requireRedactedValue(observation.packageName, "package_name")
        requireRedactedValue(observation.bankId, "bank_id")
        requireRedactedValue(observation.notificationHash, "notification_hash")
        requireRedactedValue(observation.semanticHash, "semantic_hash")
        requireRedactedValue(observation.categoryGuess, "category_guess")
        purgeExpired()
        observations.removeAll { it.notificationHash == observation.notificationHash }
        observations.addLast(observation)
        while (observations.size > maxRecords) {
            observations.removeFirst()
        }
    }

    fun list(): List<RedactedRecentObservation> {
        purgeExpired()
        return observations.toList()
    }

    private fun purgeExpired() {
        val cutoff = nowEpochMs() - maxAgeMs
        observations.removeAll { observation ->
            observation.observedAt.toEpochMsOrNull()?.let { it < cutoff } ?: false
        }
    }

    private fun requireRedactedValue(value: String, field: String) {
        require(!SENSITIVE_VALUE_PATTERN.containsMatchIn(value)) {
            "recent buffer field $field must not contain raw notification, card or phone data"
        }
    }

    private fun String.toEpochMsOrNull(): Long? {
        return runCatching { java.time.Instant.parse(this).toEpochMilli() }.getOrNull()
    }

    companion object {
        private val SENSITIVE_VALUE_PATTERN = Regex(
            "(raw[_ -]?(notification|title|body|text)|\\+?7\\d{10}|\\b\\d{12,19}\\b)",
            RegexOption.IGNORE_CASE
        )
    }
}

data class ActiveIntentNotificationSweepResult(
    val source: ActiveNotificationSweepSource,
    val skipped: Boolean,
    val reason: String,
    val acceptedCount: Int,
    val ignoredCount: Int,
    val observations: List<RedactedRecentObservation>
)

class ActiveIntentNotificationSweep(
    private val debugEnabled: Boolean,
    private val enabledBankPackages: Set<String>,
    private val recentBuffer: RedactedRecentNotificationBuffer = RedactedRecentNotificationBuffer()
) {
    fun processSnapshots(
        window: ActiveIntentWindow,
        source: ActiveNotificationSweepSource,
        snapshots: List<NotificationSnapshot>
    ): ActiveIntentNotificationSweepResult {
        if (!window.canSweep()) {
            return ActiveIntentNotificationSweepResult(
                source = source,
                skipped = true,
                reason = "active_payment_intent_required",
                acceptedCount = 0,
                ignoredCount = snapshots.size,
                observations = emptyList()
            )
        }

        val safeSnapshots = snapshots.filter { snapshot ->
            ReceiverBoundaries.isRuntimeNotificationAllowed(
                packageName = snapshot.packageName,
                appPackageName = "",
                debugEnabled = debugEnabled,
                enabledBankPackages = enabledBankPackages
            )
        }
        val processor = ReceiverNotificationPipeline(
            debugEnabled = debugEnabled,
            enabledBankPackages = enabledBankPackages
        )
        val observations = safeSnapshots.mapNotNull { snapshot ->
            val result = processor.process(listOf(snapshot))
            if (!result.accepted) {
                return@mapNotNull null
            }
            val payload = result.payload ?: return@mapNotNull null
            val observation = RedactedRecentObservation(
                packageName = payload["package_name"].toString(),
                bankId = payload["bank_profile_id"].toString(),
                observedAt = payload["observed_at"].toString(),
                notificationHash = payload["notification_hash"].toString(),
                semanticHash = payload["semantic_hash"].toString(),
                categoryGuess = payload["direction_hint"].toString(),
                amountMinor = payload["amount_minor"]?.toString()?.toLongOrNull(),
                rawTextPresent = payload["raw_text_present"] == true
            )
            recentBuffer.add(observation)
            observation
        }

        return ActiveIntentNotificationSweepResult(
            source = source,
            skipped = false,
            reason = "redacted_observations_ready_for_signed_upload",
            acceptedCount = observations.size,
            ignoredCount = snapshots.size - safeSnapshots.size,
            observations = observations
        )
    }

    fun recentRedactedObservations(): List<RedactedRecentObservation> = recentBuffer.list()
}
