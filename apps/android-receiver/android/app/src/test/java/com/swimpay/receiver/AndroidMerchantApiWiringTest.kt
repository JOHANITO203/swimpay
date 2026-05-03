package com.swimpay.receiver

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidMerchantApiWiringTest {
    @Test
    fun merchantAuthSessionKeepsTokensOutOfVisibleState() {
        val missing = AuthenticatedMerchantSession.missing()

        assertFalse(missing.isAuthenticated)
        assertEquals("Action requise", missing.merchantStatusLabel)
        assertFalse(missing.visibleTexts().joinToString(" ").contains("Bearer", ignoreCase = true))
        assertFalse(missing.visibleTexts().joinToString(" ").contains("test_", ignoreCase = true))

        val dev = AuthenticatedMerchantSession.localDev(merchantId = "mch_demo")

        assertTrue(dev.isAuthenticated)
        assertEquals("Bearer test_mch_demo", dev.authorizationHeader())
        assertTrue(dev.safeModeLabel.contains("local/dev"))
        assertFalse(dev.visibleTexts().joinToString(" ").contains("test_mch_demo"))
    }

    @Test
    fun receivingMethodsRepositoryMapsBackendRoutesAndClearsRawSubmissionValues() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "routes": [
                    {
                      "route_id": "route_card_1",
                      "bank_profile_id": "sber_ru",
                      "rail_type": "card_transfer",
                      "receiver_identifier_masked": "•••• 4821",
                      "route_code": "SBER-CARD",
                      "enabled": true,
                      "recommended": true,
                      "review_policy": "review_first"
                    }
                  ],
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                201,
                """
                {
                  "route": {
                    "route_id": "route_card_2",
                    "bank_profile_id": "sber_ru",
                    "rail_type": "card_transfer",
                    "receiver_identifier_masked": "•••• 9911",
                    "route_code": "SBER-CARD-2",
                    "enabled": true,
                    "recommended": false,
                    "review_policy": "review_first"
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "route": {
                    "route_id": "route_card_2",
                    "bank_profile_id": "sber_ru",
                    "rail_type": "card_transfer",
                    "receiver_identifier_masked": "•••• 9911",
                    "route_code": "SBER-CARD-2",
                    "enabled": false,
                    "recommended": false,
                    "review_policy": "review_first"
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val repository = MerchantReceivingMethodsApiRepository(transport)
        val session = AuthenticatedMerchantSession.localDev("mch_demo")

        val list = repository.list(session)
        assertEquals(MerchantRepositoryState.SUCCESS, list.state)
        assertEquals("Carte bancaire", list.items.single().title)
        assertEquals("Sberbank · •••• 4821", list.items.single().subtitle)
        assertFalse(list.visibleTexts().joinToString(" ").contains("2200123412344821"))
        assertEquals("GET", transport.requests[0].method)
        assertEquals("/v1/merchant/receiving-routes", transport.requests[0].path)
        assertEquals("Bearer test_mch_demo", transport.requests[0].headers["Authorization"])

        val draft = MerchantReceivingMethodSubmission(
            bankProfileId = "sber_ru",
            type = ReceivingMethodType.CARD_TRANSFER,
            rawIdentifier = "2200123412349911",
            routeCode = "SBER-CARD-2",
            displayLabel = "Sberbank"
        )
        val created = repository.create(session, draft)
        assertEquals(MerchantRepositoryState.SUCCESS, created.state)
        assertEquals("", created.clearedSubmission.rawIdentifier)
        assertFalse(created.visibleTexts().joinToString(" ").contains("2200123412349911"))
        assertTrue(transport.requests[1].body.contains("\"receiver_identifier\":\"2200123412349911\""))

        val disabled = repository.disable(session, "route_card_2")
        assertEquals(MerchantRepositoryState.SUCCESS, disabled.state)
        assertTrue(transport.requests[2].body.contains("\"enabled\":false"))
    }

    @Test
    fun reviewQueueAndActionsUseBackendEndpointsWithoutOrderRejectByDefaultOrWebhooks() {
        val transport = RecordingMerchantApiTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "reviews": [
                    {
                      "review_id": "rev_01",
                      "status": "open",
                      "reason_code": "receiver_route_review_only",
                      "order_id": "ord_01",
                      "payment_session_id": "ps_01",
                      "signal_id": "sig_01",
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
                  "review_id": "rev_01",
                  "status": "confirmed",
                  "order_id": "ord_01",
                  "payment_session_id": "ps_01",
                  "order_status": "manual_confirmed",
                  "payment_session_status": "manual_confirmed"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "review_id": "rev_02",
                  "status": "rejected",
                  "order_id": "ord_02",
                  "payment_session_id": "ps_02",
                  "order_status": "needs_review",
                  "payment_session_status": "needs_review",
                  "rejection_scope": "signal"
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "review_id": "rev_03",
                  "status": "rejected",
                  "order_id": "ord_03",
                  "payment_session_id": "ps_03",
                  "order_status": "rejected",
                  "payment_session_status": "rejected",
                  "rejection_scope": "order"
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val queueRepository = MerchantReviewQueueApiRepository(transport)
        val actionsRepository = MerchantReviewActionsApiRepository(transport)

        val queue = queueRepository.list(session)
        assertEquals(MerchantRepositoryState.SUCCESS, queue.state)
        assertEquals("58,41 ₽", queue.items.single().amountLabel)
        assertEquals("Sberbank", queue.items.single().bankDisplayName)
        assertTrue(queue.items.single().reasonLabels.contains("Validation manuelle en bêta"))
        assertTrue(queue.items.single().reasonLabels.contains("Référence non visible"))
        assertFalse(queue.visibleTexts().joinToString(" ").contains("receiver_route_review_only"))

        val confirmed = actionsRepository.confirm(session, "rev_01")
        assertEquals(MerchantReviewActionResultStatus.MANUAL_CONFIRMED, confirmed.status)
        assertEquals("POST", transport.requests[1].method)
        assertEquals("/v1/reviews/rev_01/confirm", transport.requests[1].path)

        val signalRejected = actionsRepository.rejectSignal(session, "rev_02")
        assertFalse(signalRejected.rejectsOrder)
        assertEquals("/v1/reviews/rev_02/reject", transport.requests[2].path)
        assertTrue(transport.requests[2].body.contains("\"scope\":\"signal\""))

        val orderRejected = actionsRepository.rejectOrder(session, "rev_03")
        assertTrue(orderRejected.rejectsOrder)
        assertTrue(transport.requests[3].body.contains("\"scope\":\"order\""))
        assertFalse(actionsRepository.sendsDeveloperWebhookDirectly)
    }

    @Test
    fun mockOnlyRepositoriesAreExplicitAndSafeUntilBackendEndpointsExist() {
        val session = AuthenticatedMerchantSession.localDev("mch_demo")

        val dashboard = MerchantDashboardRepository.mockOnly().load(session)
        assertEquals(MerchantRepositoryState.SUCCESS, dashboard.state)
        assertTrue(dashboard.visibleTexts().contains("À vérifier"))
        assertFalse(dashboard.visibleTexts().joinToString(" ").contains("payment signal engine", ignoreCase = true))

        val connectedSite = MerchantConnectedSiteRepository.mockOnly().load(session, developerDetailsEnabled = false)
        assertEquals(MerchantRepositoryState.SUCCESS, connectedSite.state)
        assertTrue(connectedSite.visibleTexts().contains("Tester la connexion"))
        assertFalse(connectedSite.visibleTexts().joinToString(" ").contains("webhook_secret", ignoreCase = true))
        assertFalse(connectedSite.visibleTexts().joinToString(" ").contains("payment.confirmed"))

        val configTest = MerchantConfigurationTestRepository.mockOnly().run(
            session,
            MerchantConfigurationChecklist.allReady()
        )
        assertEquals(MerchantConfigurationTestOutcome.READY, configTest.outcome)
        assertFalse(configTest.confirmsRealPayment)
        assertTrue(configTest.visibleTexts().contains("SwimPay est prêt"))

        val contracts = AndroidMerchantFrontendContracts.sprint7EContracts()
        assertFalse(contracts.receivingMethods.usesMockRepository)
        assertFalse(contracts.reviewQueue.usesMockRepository)
        assertFalse(contracts.reviewActions.usesMockRepository)
        assertTrue(contracts.dashboardSummary.usesMockRepository)
        assertTrue(contracts.connectedSite.usesMockRepository)
        assertTrue(contracts.configurationTest.usesMockRepository)
    }
}

private class RecordingMerchantApiTransport(
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
