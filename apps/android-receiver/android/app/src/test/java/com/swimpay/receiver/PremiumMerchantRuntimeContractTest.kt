package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.premium.PremiumConfigurationUiState
import com.swimpay.receiver.ui.premium.PremiumConnectedSiteUiState
import com.swimpay.receiver.ui.premium.PremiumDashboardUiState
import com.swimpay.receiver.ui.premium.PremiumOrdersUiState
import com.swimpay.receiver.ui.premium.PremiumPaymentDetailUiState
import com.swimpay.receiver.ui.premium.PremiumBanksUiState
import com.swimpay.receiver.ui.premium.PremiumReceiverHealthUiState
import com.swimpay.receiver.ui.premium.PremiumReceivingMethodMutationUiState
import com.swimpay.receiver.ui.premium.PremiumReceivingMethodsUiState
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
                  "metrics_summary": {
                    "range": "30d",
                    "currency": "RUB",
                    "confirmed_payment_count": 18,
                    "confirmed_amount_minor": 4250000,
                    "pending_review_count": 7,
                    "rejected_payment_count": 3,
                    "expired_payment_count": 2,
                    "failed_count": 1,
                    "confirmation_rate": 75,
                    "average_manual_confirmation_delay_seconds": 90
                  },
                  "metrics_timeseries": {
                    "range": "30d",
                    "bucket": "day",
                    "points": [
                      {
                        "date": "2026-05-01",
                        "confirmed_payment_count": 4,
                        "confirmed_amount_minor": 900000,
                        "pending_review_count": 1,
                        "rejected_payment_count": 0,
                        "expired_payment_count": 0,
                        "confirmation_rate": 100
                      },
                      {
                        "date": "2026-05-02",
                        "confirmed_payment_count": 0,
                        "confirmed_amount_minor": 0,
                        "pending_review_count": 2,
                        "rejected_payment_count": 0,
                        "expired_payment_count": 0,
                        "confirmation_rate": 0
                      }
                    ]
                  },
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
                  "routes": [
                    {
                      "route_id": "route_card",
                      "bank_profile_id": "sber_ru",
                      "rail_type": "card_transfer",
                      "receiver_identifier_masked": "•••• 4821",
                      "enabled": true,
                      "recommended": true
                    }
                  ]
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
                    "score": 68,
                    "reason_labels": ["Validation manuelle en b\u00eata", "R\u00e9f\u00e9rence non visible"],
                    "timeline": [
                      { "label": "Signal re\u00e7u" },
                      { "label": "Review cr\u00e9\u00e9e" }
                    ],
                    "allowed_actions": ["reject_signal", "reject_order"]
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
                    { "label": "Webhook configur\u00e9", "status": "passed" }
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
        assertEquals("Paiements confirm\u00e9s", dashboard.value.mainMetricLabel)
        assertEquals("42 500 \u20bd", dashboard.value.monthlyAmount)
        assertEquals(listOf("\u00c0 confirmer", "Confirm\u00e9s", "Rejet\u00e9s", "Expir\u00e9s", "\u00c9checs", "Taux"), dashboard.value.metrics.map { it.label })
        assertEquals(listOf("7", "18", "3", "2", "1", "75 %"), dashboard.value.metrics.map { it.value })
        assertEquals(2, dashboard.value.chartPoints.size)
        assertEquals(900000L, dashboard.value.chartPoints.first().confirmedAmountMinor)
        assertTrue(reviews.value.usesLiveApi)
        assertEquals("rev_01", reviews.value.items.single().reviewId)
        assertTrue(detail.value.usesLiveApi)
        assertTrue(detail.value.reasons.any { it.contains("Validation manuelle") })
        assertTrue(detail.value.summaryRows.any { it.first == "Score" && it.second == "68 %" })
        assertEquals(listOf("Signal re\u00e7u", "Review cr\u00e9\u00e9e"), detail.value.timeline)
        assertTrue(connectedSite.value.usesLiveApi)
        assertTrue(configuration.value.usesLiveApi)
        assertTrue(runtime.reviewActionsAreBackendOwned)

        assertEquals("/v1/android-merchant/dashboard-summary", transport.requests[0].path)
        assertEquals("/v1/merchant/receiving-methods", transport.requests[1].path)
        assertEquals("/v1/reviews", transport.requests[2].path)
        assertEquals("/v1/android-merchant/payments/rev_01", transport.requests[3].path)
        assertEquals("/v1/android-merchant/connected-site", transport.requests[4].path)
        assertEquals("/v1/android-merchant/configuration-test", transport.requests[5].path)

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
    fun premiumRuntimeUsesBackendDeveloperIntegrationWizardForMobileSession() {
        val transport = RecordingPremiumTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_live_masked",
                  "secret_key_masked": "sk_live_****1234",
                  "webhook_secret_masked": "whsec_****5678",
                  "webhook_url": "",
                  "webhook_status": "not_configured",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                201,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_live_masked",
                  "secret_key_masked": "sk_live_****9999",
                  "secret_key_once": "sk_live_show_once",
                  "webhook_secret_masked": "whsec_****5678",
                  "webhook_url": "",
                  "webhook_status": "not_configured",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_live_masked",
                  "secret_key_masked": "sk_live_****9999",
                  "webhook_secret_masked": "whsec_****2222",
                  "webhook_secret_once": "whsec_show_once",
                  "webhook_url": "",
                  "webhook_status": "not_configured",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_live_masked",
                  "secret_key_masked": "sk_live_****9999",
                  "webhook_secret_masked": "whsec_****2222",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(202, """{"safe_status":"Webhook de test envoye","android_sent_webhook_directly":false}"""),
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_live_masked",
                  "secret_key_masked": "sk_live_****9999",
                  "webhook_secret_masked": "whsec_****2222",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "merchant_id": "mch_mobile",
                  "public_key": "pk_live_masked",
                  "secret_key_masked": "sk_live_****9999",
                  "webhook_secret_masked": "whsec_****2222",
                  "webhook_url": "https://merchant.example/swimpay/webhook",
                  "webhook_status": "active",
                  "public_webhook_events": ["payment.confirmed", "payment.rejected", "payment.expired"]
                }
                """.trimIndent()
            )
        )
        val runtime = runtimeWithDeveloperIntegration(
            AuthenticatedMerchantSession.mobile("mch_mobile", "spm_mobile_session_secret"),
            transport
        )

        val initial = runtime.loadConnectedSite() as PremiumScreenState.Content<PremiumConnectedSiteUiState>
        val keyCreated = runtime.createDeveloperApiKey() as PremiumScreenState.Content<PremiumConnectedSiteUiState>
        val secretRotated = runtime.rotateDeveloperWebhookSecret() as PremiumScreenState.Content<PremiumConnectedSiteUiState>
        val urlUpdated = runtime.updateDeveloperWebhookUrl("https://merchant.example/swimpay/webhook") as PremiumScreenState.Content<PremiumConnectedSiteUiState>
        val webhookTest = runtime.testDeveloperWebhook() as PremiumScreenState.Content<PremiumConnectedSiteUiState>

        assertTrue(initial.value.oneTimeSecrets.isEmpty())
        assertTrue(initial.value.developerExportText().contains("SWIMPAY_STAGING_API_BASE_URL=https://staging.swimpay.pro"))
        assertTrue(initial.value.developerExportText().contains("SWIMPAY_STAGING_SECRET_KEY=sk_live_****1234"))
        assertFalse(initial.value.developerExportText().contains("sk_live_show_once"))
        assertFalse(initial.value.developerExportText().contains("whsec_show_once"))
        assertTrue(keyCreated.value.oneTimeSecrets.any { it.second == "sk_live_show_once" })
        assertFalse(keyCreated.value.exportLines.any { it.contains("sk_live_show_once") })
        assertTrue(keyCreated.value.developerExportText().contains("SWIMPAY_STAGING_SECRET_KEY=sk_live_show_once"))
        assertTrue(keyCreated.value.exportLines.any { it == "SWIMPAY_STAGING_SECRET_KEY=sk_live_****9999" })
        assertTrue(secretRotated.value.oneTimeSecrets.any { it.second == "whsec_show_once" })
        assertFalse(secretRotated.value.exportLines.any { it.contains("whsec_show_once") })
        assertTrue(secretRotated.value.developerExportText().contains("SWIMPAY_STAGING_SECRET_KEY=sk_live_show_once"))
        assertTrue(secretRotated.value.developerExportText().contains("SWIMPAY_STAGING_WEBHOOK_SECRET=whsec_show_once"))
        assertTrue(urlUpdated.value.developerExportText().contains("SWIMPAY_STAGING_SECRET_KEY=sk_live_show_once"))
        assertTrue(urlUpdated.value.developerExportText().contains("SWIMPAY_STAGING_WEBHOOK_SECRET=whsec_show_once"))
        assertEquals("Integration active", urlUpdated.value.statusTitle)
        assertEquals("Webhook de test envoye", webhookTest.value.safeMessage)
        assertTrue(webhookTest.value.developerExportText().contains("SWIMPAY_STAGING_SECRET_KEY=sk_live_show_once"))
        assertTrue(webhookTest.value.developerExportText().contains("SWIMPAY_STAGING_WEBHOOK_SECRET=whsec_show_once"))

        val reloaded = runtime.loadConnectedSite() as PremiumScreenState.Content<PremiumConnectedSiteUiState>
        assertFalse(reloaded.value.developerExportText().contains("sk_live_show_once"))
        assertFalse(reloaded.value.developerExportText().contains("whsec_show_once"))

        assertEquals("/v1/merchant/integration", transport.requests[0].path)
        assertEquals("/v1/merchant/integration/keys", transport.requests[1].path)
        assertEquals("/v1/merchant/integration/webhook-secret/rotate", transport.requests[2].path)
        assertEquals("/v1/merchant/integration/webhook-url", transport.requests[3].path)
        assertTrue(transport.requests[3].body.contains("https://merchant.example/swimpay/webhook"))
        assertEquals("/v1/merchant/integration/test-webhook", transport.requests[4].path)
        assertEquals("/v1/merchant/integration", transport.requests[5].path)
        assertEquals("/v1/merchant/integration", transport.requests[6].path)
        transport.requests.forEach {
            assertEquals("Bearer spm_mobile_session_secret", it.headers["Authorization"])
        }
    }

    @Test
    fun premiumRuntimeHasSafeDisconnectedModeForNonDebugBuilds() {
        val runtime = PremiumMerchantRuntime.disconnected()

        val dashboard = runtime.loadDashboard()
        val reviews = runtime.loadReviews()

        assertTrue(dashboard is PremiumScreenState.Content<*>)
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
                RecordingPremiumTransport(
                    MerchantApiResponse(200, """{"routes":[]}"""),
                    MerchantApiResponse(200, """{"routes":[]}""")
                )
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

        assertTrue(dashboard is PremiumScreenState.Content<*>)
        assertTrue(reviews is PremiumScreenState.Empty)
        assertTrue(detail is PremiumScreenState.Offline)
        assertTrue(receivingMethods is PremiumScreenState.Content<*>)
        val receivingMethodsContent = receivingMethods as PremiumScreenState.Content<PremiumReceivingMethodsUiState>
        assertTrue(receivingMethodsContent.value.items.isEmpty())
        assertTrue(connectedSite is PremiumScreenState.Content<*>)
        assertTrue(configuration is PremiumScreenState.Offline)

        val stateText = listOf(
            (dashboard as PremiumScreenState.Content).value.visibleTexts().joinToString(" "),
            reviews.title,
            reviews.message,
            detail.title,
            detail.message,
            receivingMethodsContent.value.safeMessage,
            (connectedSite as PremiumScreenState.Content).value.statusTitle,
            connectedSite.value.statusText,
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
    fun emptyReceivingMethodsStillReturnEditableContentState() {
        val runtime = runtimeWith(
            AuthenticatedMerchantSession.localDev("mch_demo"),
            RecordingPremiumTransport(
                MerchantApiResponse(200, """{"routes":[]}""")
            )
        )

        val receivingMethods = runtime.loadReceivingMethods()

        assertTrue(receivingMethods is PremiumScreenState.Content<PremiumReceivingMethodsUiState>)
        val content = receivingMethods as PremiumScreenState.Content<PremiumReceivingMethodsUiState>
        assertTrue(content.value.usesLiveApi)
        assertTrue(content.value.items.isEmpty())
    }

    @Test
    fun premiumRuntimeReceivingMethodsExposeTypedRowsAndSafeMutations() {
        val transport = RecordingPremiumTransport(
            MerchantApiResponse(
                200,
                """
                {
                  "routes": [
                    {
                      "route_id": "route_card",
                      "bank_profile_id": "sber_ru",
                      "rail_type": "card_transfer",
                      "receiver_identifier_masked": "\u2022\u2022\u2022\u2022 4821",
                      "enabled": true,
                      "recommended": true
                    }
                  ]
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                201,
                """
                {
                  "route": {
                    "route_id": "route_phone",
                    "bank_profile_id": "tbank_ru",
                    "rail_type": "phone_transfer",
                    "receiver_identifier_masked": "+7 *** *** 45-67",
                    "enabled": true,
                    "recommended": false
                  }
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "route": {
                    "route_id": "route_card",
                    "bank_profile_id": "sber_ru",
                    "rail_type": "card_transfer",
                    "receiver_identifier_masked": "\u2022\u2022\u2022\u2022 4821",
                    "enabled": false,
                    "recommended": true
                  }
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "route": {
                    "route_id": "route_phone",
                    "bank_profile_id": "tbank_ru",
                    "rail_type": "phone_transfer",
                    "receiver_identifier_masked": "+7 *** *** 45-67",
                    "enabled": true,
                    "recommended": true
                  }
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "method": {
                    "id": "route_card",
                    "type": "card",
                    "bank_id": "sber_ru",
                    "label": "Carte caisse",
                    "masked_value": "•••• 4821",
                    "last4": "4821",
                    "status": "active",
                    "is_default": true
                  }
                }
                """.trimIndent()
            ),
            MerchantApiResponse(
                200,
                """
                {
                  "method": {
                    "id": "route_card",
                    "type": "card",
                    "bank_id": "sber_ru",
                    "label": "Carte caisse",
                    "masked_value": "•••• 4821",
                    "last4": "4821",
                    "status": "inactive",
                    "is_default": false
                  }
                }
                """.trimIndent()
            )
        )
        val runtime = runtimeWith(AuthenticatedMerchantSession.localDev("mch_demo"), transport)

        val methods = runtime.loadReceivingMethods() as PremiumScreenState.Content<PremiumReceivingMethodsUiState>
        val item = methods.value.items.single()
        assertEquals("route_card", item.routeId)
        assertEquals("Carte bancaire", item.title)
        assertEquals("Sberbank · •••• 4821", item.subtitle)
        assertTrue(item.enabled)
        assertTrue(item.recommended)
        assertTrue(item.actions.contains("Modifier"))
        assertTrue(item.actions.contains("Désactiver"))

        val created = runtime.createReceivingMethod(
            MerchantReceivingMethodSubmission(
                bankProfileId = "tbank_ru",
                type = ReceivingMethodType.PHONE_TRANSFER,
                rawIdentifier = "+79991234567",
                routeCode = "tb_phone",
                displayLabel = "T-Bank"
            )
        ) as PremiumScreenState.Content<PremiumReceivingMethodMutationUiState>
        assertEquals("", created.value.clearedRawIdentifier)
        assertEquals("route_phone", created.value.item?.routeId)
        assertFalse(created.value.visibleTexts().joinToString(" ").contains("+79991234567"))
        assertFalse(created.value.visibleTexts().joinToString(" ").contains("sbp_transfer", ignoreCase = true))

        val disabled = runtime.disableReceivingMethod("route_card") as PremiumScreenState.Content<PremiumReceivingMethodMutationUiState>
        assertEquals("Désactivée", disabled.value.item?.status)
        val recommended = runtime.markReceivingMethodRecommended("route_phone") as PremiumScreenState.Content<PremiumReceivingMethodMutationUiState>
        assertTrue(recommended.value.item?.recommended == true)
        val edited = runtime.updateReceivingMethodLabel("route_card", "Carte caisse") as PremiumScreenState.Content<PremiumReceivingMethodMutationUiState>
        assertEquals("Carte caisse", edited.value.item?.helper)
        val deleted = runtime.deleteReceivingMethod("route_card") as PremiumScreenState.Content<PremiumReceivingMethodMutationUiState>
        assertEquals("Moyen supprimé", deleted.value.message)

        assertEquals("/v1/merchant/receiving-methods", transport.requests[0].path)
        assertEquals("POST", transport.requests[1].method)
        assertEquals("/v1/merchant/receiving-methods", transport.requests[1].path)
        assertEquals("/v1/merchant/receiving-methods/route_card/disable", transport.requests[2].path)
        assertEquals("/v1/merchant/receiving-methods/route_phone/set-default", transport.requests[3].path)
        assertEquals("PATCH", transport.requests[4].method)
        assertEquals("/v1/merchant/receiving-methods/route_card", transport.requests[4].path)
        assertEquals("DELETE", transport.requests[5].method)
        assertEquals("/v1/merchant/receiving-methods/route_card", transport.requests[5].path)
    }

    @Test
    fun premiumRuntimeProvidesBankAndReceiverHealthStatesWithoutBackendJargon() {
        val runtime = PremiumMerchantRuntime.disconnected()

        val banks = runtime.loadBanks() as PremiumScreenState.Content<PremiumBanksUiState>
        assertEquals(listOf("Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Gazprombank"), banks.value.items.map { it.displayName })
        assertTrue(banks.value.items.all { it.status in setOf("Détectée", "Non détectée", "Activée", "À configurer") })
        assertTrue(banks.value.items.filter { it.status == "Détectée" }.all { it.canActivate })
        assertTrue(banks.value.items.filter { it.status == "Non détectée" }.none { it.canActivate })

        val health = runtime.loadReceiverHealth(notificationAccessEnabled = false) as PremiumScreenState.Content<PremiumReceiverHealthUiState>
        assertEquals("Action nécessaire", health.value.statusTitle)
        assertTrue(health.value.rows.any { it.first == "Accès notifications" && it.second == "Action requise" })
        assertTrue(health.value.rows.any { it.first == "Banques surveillées" })

        val visible = (banks.value.visibleTexts() + health.value.visibleTexts()).joinToString(" ")
        assertFalse(visible.contains("package", ignoreCase = true))
        assertFalse(visible.contains("cert", ignoreCase = true))
        assertFalse(visible.contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(visible.contains("SBP", ignoreCase = true))
    }

    @Test
    fun premiumRuntimeDoesNotInventSalesRowsWhenOrdersApiIsNotReady() {
        val runtime = PremiumMerchantRuntime.disconnected()

        val orders = runtime.loadOrders() as PremiumScreenState.Content<PremiumOrdersUiState>

        assertFalse(orders.value.usesLiveApi)
        assertTrue(orders.value.rows.isEmpty())
        val visible = orders.value.visibleTexts().joinToString(" ")
        assertTrue(visible.contains("Aucune vente confirmée"))
        assertTrue(visible.contains("Vos ventes apparaîtront ici après confirmation des paiements."))
        assertTrue(visible.contains("Lancer un test"))
        assertTrue(visible.contains("Voir les paiements à confirmer"))
        assertFalse(visible.contains("ord_123"))
        assertFalse(visible.contains("ord_124"))
        assertFalse(visible.contains("Client #"))
        assertFalse(visible.contains("58,41"))
        assertFalse(visible.contains("129,00"))
        assertFalse(visible.contains("official_bank_confirmation", ignoreCase = true))
        assertFalse(visible.contains("auto-confirmation", ignoreCase = true))
    }

    @Test
    fun premiumRuntimeReviewActionsStayBackendOwnedAndSignalRejectDoesNotRejectOrder() {
        val transport = RecordingPremiumTransport(
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
                    "allowed_actions": ["reject_signal", "reject_order"]
                  },
                  "official_bank_confirmation": false
                }
                """.trimIndent()
            )
        )
        val session = AuthenticatedMerchantSession.localDev("mch_demo")
        val runtime = runtimeWith(session, transport)

        val signalRejected = runtime.rejectSignal("rev_02") as PremiumScreenState.Content<PremiumPaymentDetailUiState>

        assertEquals("Signal rejet\u00e9", signalRejected.value.actionMessage)
        assertEquals("/v1/reviews/rev_02/reject", transport.requests[0].path)
        assertTrue(transport.requests[0].body.contains("\"scope\":\"signal\""))
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

private fun runtimeWithDeveloperIntegration(
    session: AuthenticatedMerchantSession,
    transport: MerchantApiTransport
): PremiumMerchantRuntime {
    return PremiumMerchantRuntime(
        session = session,
        dashboardRepository = MerchantDashboardApiRepository(RecordingPremiumTransport()),
        reviewQueueRepository = MerchantReviewQueueApiRepository(RecordingPremiumTransport()),
        paymentDetailRepository = MerchantPaymentDetailApiRepository(RecordingPremiumTransport()),
        reviewActionsRepository = MerchantReviewActionsApiRepository(RecordingPremiumTransport()),
        receivingMethodsRepository = MerchantReceivingMethodsApiRepository(RecordingPremiumTransport()),
        connectedSiteRepository = MerchantConnectedSiteApiRepository(RecordingPremiumTransport()),
        configurationTestRepository = MerchantConfigurationTestApiRepository(RecordingPremiumTransport()),
        developerIntegrationRepository = MerchantDeveloperIntegrationApiRepository(transport)
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
