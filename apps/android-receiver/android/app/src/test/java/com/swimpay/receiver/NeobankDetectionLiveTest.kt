package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * End-to-end proof that an international neobank (Wise / Revolut / Payoneer) incoming-payment
 * notification now flows through the LIVE receiver pipeline (ReceiverNotificationPipeline — the
 * one SwimPayNotificationListenerService actually calls): the package is accepted, the amount
 * and non-RUB currency are extracted by the universal MoneyGrammar, and the direction is
 * classified as an incoming customer transfer via the shared English/RU polarity lexicon.
 *
 * This was impossible while the live parser was RUB-only ("currency = RUB", a single ₽ regex):
 * a USD/EUR notification produced no amount and no currency, so nothing could match.
 */
class NeobankDetectionLiveTest {

    private fun detect(packageName: String, title: String, text: String): Map<String, Any> {
        val pipeline = ReceiverNotificationPipeline(
            debugEnabled = false,
            enabledBankPackages = setOf(packageName)
        )
        val snapshot = StagingSyntheticNotificationHarness.supportedBankSnapshot(
            packageName = packageName,
            title = title,
            text = text
        )
        val result = pipeline.process(listOf(snapshot))
        assertTrue("the neobank package must be accepted by the live gate", result.accepted)
        return result.payload ?: error("payload expected")
    }

    @Test
    fun wiseUsdIncomingIsDetectedEndToEnd() {
        val payload = detect(
            packageName = "com.transferwise.android",
            title = "You received 50.00 USD",
            text = "You received 50.00 USD from John"
        )
        assertEquals(5000L, payload["amount_minor"])
        assertEquals("USD", payload["currency"])
        assertEquals("incoming_customer_transfer", payload["direction_hint"])
        assertEquals("wise_int", payload["bank_profile_id"])
    }

    @Test
    fun revolutEurIncomingIsDetectedEndToEnd() {
        val payload = detect(
            packageName = "com.revolut.revolut",
            title = "Payment received",
            text = "You received €9,99 from Maria"
        )
        assertEquals(999L, payload["amount_minor"])
        assertEquals("EUR", payload["currency"])
        assertEquals("incoming_customer_transfer", payload["direction_hint"])
        assertEquals("revolut_int", payload["bank_profile_id"])
    }

    @Test
    fun payoneerUsdIncomingWithThousandsSeparatorIsDetectedEndToEnd() {
        val payload = detect(
            packageName = "com.payoneer.android",
            title = "Payment received",
            text = "Payment from Acme Inc credited: \$1,250.00"
        )
        assertEquals(125000L, payload["amount_minor"])
        assertEquals("USD", payload["currency"])
        assertEquals("incoming_customer_transfer", payload["direction_hint"])
    }

    @Test
    fun neobankOutgoingIsNotMistakenForIncoming() {
        val payload = detect(
            packageName = "com.transferwise.android",
            title = "You sent money",
            text = "You paid 50.00 USD to John"
        )
        // Negative direction is correctly classified, so the backend will reject it.
        assertEquals("outgoing", payload["direction_hint"])
    }

    @Test
    fun russianRoubleStillDetectedAfterGoingUniversal() {
        val payload = detect(
            packageName = "ru.sberbankmobile",
            title = "Поступление 1 390,00 ₽",
            text = "Перевод от Ивана"
        )
        assertEquals(139000L, payload["amount_minor"])
        assertEquals("RUB", payload["currency"])
        assertEquals("incoming_customer_transfer", payload["direction_hint"])
    }

    @Test
    fun russianOutgoingTransferFormIsNotMistakenForIncoming() {
        // "<amount> отправлен" (VTB/Т-Банк notif form) contains the "перевод" stem but is an
        // OUTGOING transfer — the "отправл" outgoing stem must win over the "перевод" incoming
        // stem, otherwise a sent transfer uploads as a high-quality incoming signal.
        val payload = detect(
            packageName = "ru.sberbankmobile",
            title = "Перевод отправлен",
            text = "5 000 ₽ отправлен Ивану И."
        )
        assertEquals("outgoing", payload["direction_hint"])
    }

    @Test
    fun westAfricaFrenchIncomingIsDetectedEndToEnd() {
        // MTN MoMo notifies in French ("Vous avez reçu … FCFA"); the shared polarity lexicon
        // must recognise the French "reçu" credit form and XOF (zero-decimal, x1).
        val payload = detect(
            packageName = "mtnft.momo.consumer",
            title = "Paiement reçu",
            text = "Vous avez reçu 2 500 FCFA de +225 07 00 00 00 00"
        )
        assertEquals(2500L, payload["amount_minor"])
        assertEquals("XOF", payload["currency"])
        assertEquals("incoming_customer_transfer", payload["direction_hint"])
    }
}
