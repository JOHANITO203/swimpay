package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PremiumMerchantRuntimeContractTest {
    @Test
    fun premiumRuntimeUsesLiveMerchantRepositoriesAndKeepsUiSafe() {
        val transport = RecordingPremiumTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "payments_to_review_count": 2,
                  "confirmed_today_count": 5,
                  "notifications_sent_count": 8,
                  "receiver_status": { "status": "connected", "display": "Connect\u00e9" },
                  "recent_detected_payments": [
                    {
                      "review_id": "rev_01",
                      "amount": { "value": "58.41", "currency": "RUB" },
                      "bank_display_name": "Sberbank",
                      "status_label": "\u00c0 v\u00e9rifier"
                    }
                  ],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "reviews": [
                    {
                      "review_id": "rev_01",
                      "reason_code": "receiver_route_review_only",
                      "amount": { "value": "58.41", "currency": "RUB" },
                      "bank_profile_id": "sber_ru",
                      "negative_reasons": ["reference_not_observed"],
                      "positive_reasons": []
                    }
                  ]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "payment": {
                    "review_id": "rev_01",
                    "amount_expected": { "value": "58.41", "currency": "RUB" },
                    "amount_detected": { "value": "58.41", "currency": "RUB" },
                    "bank_display_name": "Sberbank",
                    "receiving_method_masked": "Carte bancaire \u00b7 \u2022\u2022\u2022\u2022 4821",
                    "payment_reference": "TANGO ALFA",
                    "reason_labels": ["Validation manuelle en bêta", "Référence non visible"],
                    "allowed_actions": ["confirm", "reject_signal", "reject_order"]
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "webhook_url_display": "https://merchant.example/swimpay/webhook",
                  "status": "active",
                  "status_label": "Connexion active",
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "outcome": "ready",
                  "confirms_real_payment": false,
                  "checklist": [
                    { "label": "T\u00e9l\u00e9phone connect\u00e9", "status": "passed" },
                    { "label": "Banque choisie", "status": "passed" },
                    { "label": "Moyen de r\u00e9ception ajout\u00e9", "status": "passed" },
                    { "label": "Site ou application connect\u00e9", "status": "passed" }
                  ],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val runtime = PremiumMerchantRuntime(
            session = session,
            dashboardRepository = MerchantDashboardApiRepository(transport),
            reviewQueueRepository = MerchantReviewQueueApiRepository(transport),
            paymentDetailRepository = MerchantPaymentDetailApiRepository(transport),
            reviewActionsRepository = MerchantReviewActionsApiRepository(transport),
            receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
            connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
            configurationTestRepository = MerchantConfigurationTestApiRepository(transport)
        )

        val dashboard = runtime.loadDashboard()
        val reviews = runtime.loadReviews()
        val detail = runtime.loadPaymentDetail("rev_01")
        val connectedSite = runtime.loadConnectedSite()
        val configuration = runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady())

        assertTrue(dashboard.usesLiveApi)
        assertEquals("2", dashboard.metrics.first().value)
        assertTrue(reviews.usesLiveApi)
        assertEquals("rev_01", reviews.items.single().reviewId)
        assertTrue(detail.usesLiveApi)
        assertTrue(detail.reasons.contains("Validation manuelle en bêta"))
        assertTrue(connectedSite.usesLiveApi)
        assertTrue(configuration.usesLiveApi)
        assertTrue(runtime.reviewActionsAreBackendOwned)

        assertEquals("/v1/android-merchant/dashboard-summary", transport.requests[0].path)
        assertEquals("/v1/reviews", transport.requests[1].path)
        assertEquals("/v1/android-merchant/payments/rev_01", transport.requests[2].path)
        assertEquals("/v1/android-merchant/connected-site", transport.requests[3].path)
        assertEquals("/v1/android-merchant/configuration-test", transport.requests[4].path)

        val visible = listOf(
            dashboard.recentPayments.map { it.amount + it.detail + it.status },
            reviews.items.flatMap { listOf(it.amount, it.bank, it.status, it.helper) + it.reasons },
            detail.summaryRows.flatMap { listOf(it.first, it.second) } + detail.reasons,
            connectedSite.rows.flatMap { listOf(it.first, it.second) },
            configuration.checklist + configuration.outcomeTitle + configuration.outcomeText
        ).flatten().joinToString(" ")

        assertFalse(visible.contains("receiver_route_review_only"))
        assertFalse(visible.contains("2200123412344821"))
        assertFalse(visible.contains("+79991234567"))
        assertFalse(visible.contains("webhook_secret", ignoreCase = true))
        assertFalse(visible.contains("official_bank_confirmation", ignoreCase = true))
    }

    @Test
    fun premiumRuntimeHasSafeDisconnectedModeForNonDebugBuilds() {
        val runtime = PremiumMerchantRuntime.disconnected()

        val dashboard = runtime.loadDashboard()
        val reviews = runtime.loadReviews()

        assertFalse(dashboard.usesLiveApi)
        assertFalse(reviews.usesLiveApi)
        assertEquals("Session marchand requise", reviews.safeMessage)
        assertTrue(runtime.reviewActionsAreBackendOwned)
    }

    @Test
    fun premiumRuntimeReviewActionsStayBackendOwnedAndSignalRejectDoesNotRejectOrder() {
        val transport = RecordingPremiumTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "review_id": "rev_01",
                  "status": "confirmed",
                  "order_status": "manual_confirmed"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(404, """{"error":{"code":"not_found"}}"""),
            MerchantApiResponse(
                200,
                """
                {
                  "review_id": "rev_02",
                  "status": "rejected",
                  "order_status": "needs_review",
                  "rejection_scope": "signal"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(404, """{"error":{"code":"not_found"}}""")
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val runtime = PremiumMerchantRuntime(
            session = session,
            dashboardRepository = MerchantDashboardApiRepository(transport),
            reviewQueueRepository = MerchantReviewQueueApiRepository(transport),
            paymentDetailRepository = MerchantPaymentDetailApiRepository(transport),
            reviewActionsRepository = MerchantReviewActionsApiRepository(transport),
            receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
            connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
            configurationTestRepository = MerchantConfigurationTestApiRepository(transport)
        )

        val confirmed = runtime.confirm("rev_01")
        val signalRejected = runtime.rejectSignal("rev_02")

        assertEquals("Validé", confirmed.actionMessage)
        assertEquals("Signal rejeté", signalRejected.actionMessage)
        assertEquals("/v1/reviews/rev_01/confirm", transport.requests[0].path)
        assertEquals("/v1/reviews/rev_02/reject", transport.requests[2].path)
        assertTrue(transport.requests[2].body.contains("\"scope\":\"signal\""))
        assertTrue(runtime.reviewActionsAreBackendOwned)
        assertTrue(MerchantReviewActionsApiRepository(transport).backendOwnsReviewDecisions)
        assertFalse(MerchantReviewActionsApiRepository(transport).sendsDeveloperWebhookDirectly)
    }
}

private class RecordingPremiumTransport(
    private vararg val responses: MerchantApiResponse
) : MerchantApiTransport {
    val requests: MutableList<MerchantApiRequest> = mutableListOf()

    override fun execute(request: MerchantApiRequest): MerchantApiResponse {
        requests.add(request)
        return responses.getOrElse(requests.lastIndex) {
            MerchantApiResponse(500, """{"error":{"code":"missing_test_response"}}""")
        }
    }
}
