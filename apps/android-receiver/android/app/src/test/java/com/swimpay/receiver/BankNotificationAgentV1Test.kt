package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BankNotificationAgentV1Test {
    @Test
    fun shapeHasherPreservesDirectionAndRemovesPersonalData() {
        val incoming = DirectionAwareShapeHasher.hash("Поступление 500 ₽ от Иван +79991234567")
        val outgoing = DirectionAwareShapeHasher.hash("Списание 500 ₽ получатель Иван +79991234567")
        val incomingComma = DirectionAwareShapeHasher.hash("Поступление 500,00 руб. от клиента +79991234567")

        assertEquals(listOf("INCOMING", "AMOUNT", "CURRENCY", "PHONE_HINT"), incoming.tokens)
        assertEquals(listOf("OUTGOING", "AMOUNT", "CURRENCY", "PHONE_HINT"), outgoing.tokens)
        assertNotEquals(incoming.shapeHash, outgoing.shapeHash)
        assertEquals(incoming.shapeHash, incomingComma.shapeHash)
        assertFalse(incoming.canonicalShape.contains("Иван"))
        assertFalse(incoming.canonicalShape.contains("79991234567"))
    }

    @Test
    fun shapeHasherSeparatesNegativeAndSystemCategories() {
        val shapes = listOf(
            DirectionAwareShapeHasher.hash("Кэшбэк 100 ₽ начислен").tokens.first(),
            DirectionAwareShapeHasher.hash("Возврат 100 ₽").tokens.first(),
            DirectionAwareShapeHasher.hash("Платеж не выполнен 100 ₽").tokens.first(),
            DirectionAwareShapeHasher.hash("Промо бонус 100 ₽").tokens.first(),
            DirectionAwareShapeHasher.hash("Баланс карты 100 ₽").tokens.first(),
            DirectionAwareShapeHasher.hash("Системное уведомление банка").tokens.first()
        )

        assertEquals(listOf("CASHBACK", "REFUND", "FAILED", "PROMO", "BALANCE", "SYSTEM"), shapes)
    }

    @Test
    fun staticProfilesCoverRuntimeVerifiedBanksAndRejectAutoConfirmProfiles() {
        val profiles = StaticBankProfileRegistry.v1Profiles()

        assertEquals(
            setOf("sber_ru", "tbank_ru", "vtb_ru", "alfa_ru", "gazprombank_ru", "ozon_bank",
                "mtn_momo_ci", "wise_int", "revolut_int", "payoneer_int"),
            profiles.map { it.bankProfileId }.toSet()
        )
        assertTrue(profiles.all { it.version == BankProfileVersion("intelligence-v1") })
        assertTrue(profiles.all { !it.autoConfirmEnabled })

        val malformed = profiles.first().copy(autoConfirmEnabled = true)
        assertFalse(StaticBankProfileRegistry.validate(malformed).valid)
    }

    @Test
    fun classifierIsDeterministicAndNeverAllowsAutoConfirm() {
        val profile = StaticBankProfileRegistry.requireProfile("sber_ru")
        val classifier = DeterministicNotificationClassifier()

        val incoming = classifier.classify(profile, "Поступление 500 ₽ перевод от клиента")
        val cashback = classifier.classify(profile, "Кэшбэк 50 ₽ за покупку")
        val unknown = classifier.classify(profile, "Новый странный формат")

        assertEquals(NotificationCategory.INCOMING_CUSTOMER_TRANSFER, incoming.classification)
        assertEquals("needs_review", incoming.suggestedAction)
        assertFalse(incoming.autoConfirmAllowed)

        assertEquals(NotificationCategory.CASHBACK, cashback.classification)
        assertEquals("ignore", cashback.suggestedAction)
        assertFalse(cashback.autoConfirmAllowed)

        assertEquals(NotificationCategory.UNKNOWN, unknown.classification)
        assertEquals("ask_human_feedback", unknown.suggestedAction)
        assertFalse(unknown.autoConfirmAllowed)
    }

    @Test
    fun fiveBankFixturesClassifyAllAllowedCategoriesWithoutConfirmableOutput() {
        val classifier = DeterministicNotificationClassifier()

        for (fixture in FiveBankRegressionFixtures.all()) {
            val profile = StaticBankProfileRegistry.requireProfile(fixture.bankProfileId)
            val result = classifier.classify(profile, fixture.redactedText)
            val shape = DirectionAwareShapeHasher.hash(fixture.redactedText)

            assertEquals(fixture.expectedCategory, result.classification)
            assertFalse("${fixture.bankProfileId} ${fixture.expectedCategory}", result.autoConfirmAllowed)
            assertTrue(shape.shapeHash.startsWith("shape_v1:"))
            assertFalse(result.toString().contains("+7999"))
            assertFalse(result.toString().contains("Ivan", ignoreCase = true))
        }
    }

    @Test
    fun agentFiltersOnlyEnabledSupportedBankPackagesAndBuildsRedactedUploadPayload() {
        val agent = BankNotificationAgent(
            profiles = StaticBankProfileRegistry.v1Profiles(),
            merchantScopedHash = { value -> "merchant_hmac:${value.length}" }
        )

        val ignored = agent.process(
            input = BankNotificationInput(
                packageName = "com.example.unsupported",
                title = "Поступление 500 ₽",
                body = "Перевод +79991234567",
                observedAtEpochMs = 1_700_000_000_000L
            ),
            enabledPackages = setOf("ru.sberbankmobile")
        )
        val accepted = agent.process(
            input = BankNotificationInput(
                packageName = "ru.sberbankmobile",
                title = "Поступление 500 ₽",
                body = "Перевод от Ivan +79991234567 SWP-ABC123",
                observedAtEpochMs = 1_700_000_000_000L
            ),
            enabledPackages = setOf("ru.sberbankmobile")
        )

        assertEquals(NotificationFilterDecision(false, "unsupported_package"), ignored.filterDecision)
        assertEquals(NotificationFilterDecision(true, "enabled_bank_package"), accepted.filterDecision)
        assertEquals(NotificationCategory.INCOMING_CUSTOMER_TRANSFER, accepted.classification.classification)
        assertFalse(accepted.uploadPayload?.autoConfirmAllowed ?: true)
        assertEquals(false, accepted.uploadPayload?.rawTextPresent)
        assertTrue(accepted.uploadPayload?.shapeHash.orEmpty().startsWith("shape_v1:"))
        assertFalse(accepted.toString().contains("+79991234567"))
        assertFalse(accepted.toString().contains("SWP-ABC123"))
        assertFalse(accepted.toString().contains("Ivan"))
    }

    @Test
    fun passiveFeedbackAndDriftGuardDoNotMutateRuntimeRules() {
        val profile = StaticBankProfileRegistry.requireProfile("tbank_ru")
        val feedback = PassiveFeedbackCollector().collect(
            shapeHash = "shape_v1:abc",
            profile = profile,
            classificationGuess = NotificationCategory.UNKNOWN,
            humanLabel = NotificationCategory.INCOMING_CARD_TRANSFER,
            feedback = PassiveFeedbackAction.CORRECTED,
            timestamp = "2026-05-06T00:00:00Z"
        )
        val drift = LocalDriftGuard(windowSize = 10, unknownThreshold = 0.5)
            .evaluate("tbank_ru", List(6) { NotificationCategory.UNKNOWN } + List(4) { NotificationCategory.INCOMING_CUSTOMER_TRANSFER })

        assertEquals(PassiveFeedbackReviewStatus.PENDING, feedback.reviewStatus)
        assertFalse(feedback.mutatesRuntimeRules)
        assertEquals(LocalDriftMode.FORCE_REVIEW_LOCAL, drift.mode)
        assertFalse(drift.disablesBank)
        assertFalse(drift.mutatesProfiles)
    }

    @Test
    fun intelligenceAgentSafetyGuardrailsStayStaticAndPrivacyFirst() {
        val manifest = File("src/main/AndroidManifest.xml").readText() + "\n" + File("src/debug/AndroidManifest.xml").readText()
        val agentSource = File("src/main/java/com/swimpay/receiver/BankNotificationAgentV1.kt").readText()

        assertFalse(manifest.contains("QUERY_ALL_PACKAGES"))
        assertFalse(manifest.contains("android.permission.READ_SMS"))
        assertFalse(manifest.contains("android.permission.RECEIVE_SMS"))
        assertFalse(manifest.contains("AccessibilityService"))
        assertFalse(agentSource.contains("getInstalledPackages"))
        assertFalse(agentSource.contains("getInstalledApplications"))
        assertFalse(agentSource.contains("queryIntentActivities"))
        assertFalse(agentSource.contains("openai", ignoreCase = true))
        assertFalse(agentSource.contains("anthropic", ignoreCase = true))
        assertFalse(agentSource.contains("llm", ignoreCase = true))
        assertFalse(agentSource.contains("payment.confirmed"))
        assertFalse(agentSource.contains("official_bank_confirmation = true"))
        assertFalse(agentSource.contains("autoConfirmAllowed = true"))
    }
}
