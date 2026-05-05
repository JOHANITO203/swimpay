package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.premium.PremiumConfigurationUiState
import com.swimpay.receiver.ui.premium.PremiumConnectedSiteUiState
import com.swimpay.receiver.ui.premium.PremiumDashboardUiState
import com.swimpay.receiver.ui.premium.PremiumPaymentDetailUiState
import com.swimpay.receiver.ui.premium.PremiumReviewsUiState
import com.swimpay.receiver.ui.premium.PremiumScreenState
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
                    "reason_labels": ["Validation manuelle en b\u00eata", "R\u00e9f\u00e9rence non visible"],
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
        val runtime = runtimeWith(session, transport)

        val dashboard = runtime.loadDashboard() as PremiumScreenState.Content<PremiumDashboardUiState>
        val reviews = runtime.loadReviews() as PremiumScreenState.Content<PremiumReviewsUiState>
        val detail = runtime.loadPaymentDetail("rev_01") as PremiumScreenState.Content<PremiumPaymentDetailUiState>
        val connectedSite = runtime.loadConnectedSite() as PremiumScreenState.Content<PremiumConnectedSiteUiState>
        val configuration = runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady()) as PremiumScreenState.Content<PremiumConfigurationUiState>

        assertTrue(dashboard.value.usesLiveApi)
        assertEquals("2", dashboard.value.metrics.first().value)
        assertTrue(reviews.value.usesLiveApi)
        assertEquals("rev_01", reviews.value.items.single().reviewId)
        assertTrue(detail.value.usesLiveApi)
        assertTrue(detail.value.reasons.any { it.contains("Validation manuelle") })
        assertTrue(connectedSite.value.usesLiveApi)
        assertTrue(configuration.value.usesLiveApi)
        assertTrue(runtime.reviewActionsAreBackendOwned)

        assertEquals("/v1/android-merchant/dashboard-summary", transport.requests[0].path)
        assertEquals("/v1/reviews", transport.requests[1].path)
        assertEquals("/v1/android-merchant/payments/rev_01", transport.requests[2].path)
        assertEquals("/v1/android-merchant/connected-site", transport.requests[3].path)
        assertEquals("/v1/android-merchant/configuration-test", transport.requests[4].path)

        val visible = listOf(
            dashboard.value.recentPayments.map { it.amount + it.detail + it.status },
            reviews.value.items.flatMap { listOf(it.amount, it.bank, it.status, it.helper) + it.reasons },
            detail.value.summaryRows.flatMap { listOf(it.first, it.second) } + detail.value.reasons,
            connectedSite.value.rows.flatMap { listOf(it.first, it.second) },
            configuration.value.checklist + configuration.value.outcomeTitle + configuration.value.outcomeText
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

        assertTrue(dashboard is PremiumScreenState.ActionRequired)
        assertTrue(reviews is PremiumScreenState.ActionRequired)
        assertEquals("Session marchand requise", reviews.message)
        assertTrue(runtime.reviewActionsAreBackendOwned)
    }

    @Test
    fun premiumRuntimeDoesNotUsePreviewRowsForEmptyOrFailedStates() {
        val runtime = PremiumMerchantRuntime(
            session = AuthenticatedMerchantSession.localDev("mch_demo"),
            dashboardRepository = MerchantDashboardApiRepository(
                RecordingPremiumTransport(
                    MerchantApiResponse(
                        200,
                        """{"payments_to_review_count":0,"confirmed_today_count":0,"notifications_sent_count":0,"receiver_status":{"display":"Connecté"},"recent_detected_payments":[]}"""
                    )
                )
            ),
            reviewQueueRepository = MerchantReviewQueueApiRepository(
                RecordingPremiumTransport(MerchantApiResponse(200, """{"reviews":[]}"""))
            ),
            paymentDetailRepository = MerchantPaymentDetailApiRepository(
                RecordingPremiumTransport(MerchantApiResponse(404, """{"error":{"code":"not_found"}}"""))
            ),
            reviewActionsRepository = MerchantReviewActionsApiRepository(RecordingPremiumTransport()),
            receivingMethodsRepository = MerchantReceivingMethodsApiRepository(
                RecordingPremiumTransport(MerchantApiResponse(200, """{"routes":[]}"""))
            ),
            connectedSiteRepository = MerchantConnectedSiteApiRepository(
                RecordingPremiumTransport(MerchantApiResponse(503, """{"error":{"code":"offline"}}"""))
            ),
            configurationTestRepository = MerchantConfigurationTestApiRepository(
                RecordingPremiumTransport(MerchantApiResponse(503, """{"error":{"code":"offline"}}"""))
            )
        )

        val dashboard = runtime.loadDashboard()
        val reviews = runtime.loadReviews()
        val detail = runtime.loadPaymentDetail("rev_missing")
        val receivingMethods = runtime.loadReceivingMethods()
        val connectedSite = runtime.loadConnectedSite()
        val configuration = runtime.runConfigurationTest(MerchantConfigurationChecklist.allReady())

        assertTrue(dashboard is PremiumScreenState.Empty)
        assertTrue(reviews is PremiumScreenState.Empty)
        assertTrue(detail is PremiumScreenState.Error)
        assertTrue(receivingMethods is PremiumScreenState.Empty)
        assertTrue(connectedSite is PremiumScreenState.Error)
        assertTrue(configuration is PremiumScreenState.Error)

        val stateText = listOf(
            dashboard.title,
            dashboard.message,
            reviews.title,
            reviews.message,
            detail.title,
            detail.message,
            receivingMethods.title,
            receivingMethods.message,
            connectedSite.title,
            connectedSite.message,
            configuration.title,
            configuration.message
        ).joinToString(" ")

        assertFalse(stateText.contains("rev_demo"))
        assertFalse(stateText.contains("58,41"))
        assertFalse(stateText.contains("TANGO ALFA"))
        assertFalse(stateText.contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(stateText.contains("webhook_secret", ignoreCase = true))
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
                    "reason_labels": ["Validation manuelle en b\u00eata"],
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
                  "review_id": "rev_02",
                  "status": "rejected",
                  "order_status": "needs_review",
                  "rejection_scope": "signal"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "payment": {
                    "review_id": "rev_02",
                    "amount_expected": { "value": "129.00", "currency": "RUB" },
                    "amount_detected": { "value": "129.00", "currency": "RUB" },
                    "bank_display_name": "T-Bank",
                    "receiving_method_masked": "T\u00e9l\u00e9phone \u00b7 +7 *** *** 45-67",
                    "payment_reference": "NOVA KILO",
                    "reason_labels": ["Validation manuelle en b\u00eata"],
                    "allowed_actions": ["confirm", "reject_signal", "reject_order"]
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val runtime = runtimeWith(session, transport)

        val confirmed = runtime.confirm("rev_01") as PremiumScreenState.Content<PremiumPaymentDetailUiState>
        val signalRejected = runtime.rejectSignal("rev_02") as PremiumScreenState.Content<PremiumPaymentDetailUiState>

        assertEquals("Valid\u00e9", confirmed.value.actionMessage)
        assertEquals("Signal rejet\u00e9", signalRejected.value.actionMessage)
        assertEquals("/v1/reviews/rev_01/confirm", transport.requests[0].path)
        assertEquals("/v1/reviews/rev_02/reject", transport.requests[2].path)
        assertTrue(transport.requests[2].body.contains("\"scope\":\"signal\""))
        assertTrue(runtime.reviewActionsAreBackendOwned)
        assertTrue(MerchantReviewActionsApiRepository(transport).backendOwnsReviewDecisions)
        assertFalse(MerchantReviewActionsApiRepository(transport).sendsDeveloperWebhookDirectly)
    }
}

private fun runtimeWith(
    session: AuthenticatedMerchantSession,
    transport: MerchantApiTransport
): PremiumMerchantRuntime {
    return PremiumMerchantRuntime(
        session = session,
        dashboardRepository = MerchantDashboardApiRepository(transport),
        reviewQueueRepository = MerchantReviewQueueApiRepository(transport),
        paymentDetailRepository = MerchantPaymentDetailApiRepository(transport),
        reviewActionsRepository = MerchantReviewActionsApiRepository(transport),
        receivingMethodsRepository = MerchantReceivingMethodsApiRepository(transport),
        connectedSiteRepository = MerchantConnectedSiteApiRepository(transport),
        configurationTestRepository = MerchantConfigurationTestApiRepository(transport)
    )
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
