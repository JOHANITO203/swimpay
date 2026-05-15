package com.swimpay.receiver

import com.swimpay.receiver.ui.premium.PremiumConnectedSiteUiState
import com.swimpay.receiver.ui.premium.PremiumDashboardUiState
import com.swimpay.receiver.ui.premium.PremiumMerchantRuntime
import com.swimpay.receiver.ui.premium.PremiumReviewsUiState
import com.swimpay.receiver.ui.premium.PremiumScreenState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidDataHydrationTest {
    @Test
    fun dashboardStaysAliveFromLocalSystemStateWhenBackendIsOffline() {
        val runtime = runtimeWith(
            dashboardTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}""")),
            receivingTransport = StaticTransport(
                MerchantApiResponse(
                    200,
                    """{"routes":[{"route_id":"route_card","bank_profile_id":"sber_ru","rail_type":"card_transfer","receiver_identifier_masked":"•••• 4821","enabled":true,"recommended":true}]}"""
                )
            )
        )

        val dashboard = runtime.loadDashboard(notificationAccessEnabled = true)

        assertTrue(dashboard is PremiumScreenState.Content<*>)
        val visible = (dashboard as PremiumScreenState.Content).value.visibleTexts().joinToString(" ")
        assertTrue(visible.contains("SwimPay Intelligence"))
        assertTrue(visible.contains("Téléphone connecté"))
        assertTrue(visible.contains("Notifications activées"))
        assertTrue(visible.contains("Banques actives"))
        assertTrue(visible.contains("Moyens de réception"))
        assertTrue(visible.contains("1 actif"))
        assertFalse(visible.contains("À vérifier"))
        assertTrue(visible.contains("Aucun paiement détecté pour le moment"))
        assertFalse(visible.contains("Lancez un test"))
        assertTrue(visible.contains("Connexion en attente"))
        assertTrue(visible.contains("Les données seront synchronisées dès que SwimPay sera connecté."))
        assertSafeMerchantHydrationCopy(visible)
    }

    @Test
    fun dashboardWithNoPaymentsUsesLivelyEmptyCopyInsteadOfDeadState() {
        val runtime = runtimeWith(
            dashboardTransport = StaticTransport(
                MerchantApiResponse(
                    200,
                    """{"payments_to_review_count":0,"confirmed_today_count":0,"notifications_sent_count":0,"receiver_status":{"display":"Connecté"},"recent_detected_payments":[]}"""
                )
            )
        )

        val dashboard = runtime.loadDashboard(notificationAccessEnabled = true)

        assertTrue(dashboard is PremiumScreenState.Content<*>)
        val content = (dashboard as PremiumScreenState.Content).value
        assertTrue(content.recentPayments.isEmpty())
        val visible = content.visibleTexts().joinToString(" ")
        assertTrue(visible.contains("Aucun paiement détecté pour le moment"))
        assertFalse(visible.contains("Lancez un test"))
        assertSafeMerchantHydrationCopy(visible)
    }

    @Test
    fun dashboardReceivingMethodsCardUsesLocalLiveCountOrActionState() {
        val oneMethodRuntime = runtimeWith(
            receivingTransport = StaticTransport(
                MerchantApiResponse(
                    200,
                    """{"routes":[{"route_id":"route_card","bank_profile_id":"sber_ru","rail_type":"card_transfer","receiver_identifier_masked":"•••• 4821","enabled":true,"recommended":true}]}"""
                )
            )
        )
        val noMethodRuntime = runtimeWith(
            receivingTransport = StaticTransport(MerchantApiResponse(200, """{"routes":[]}"""))
        )
        val offlineRuntime = runtimeWith(
            receivingTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}"""))
        )

        val oneMethod = (oneMethodRuntime.loadDashboard() as PremiumScreenState.Content<PremiumDashboardUiState>).value
            .localSystemCards.single { it.title == "Moyens de réception" }
        val noMethod = (noMethodRuntime.loadDashboard() as PremiumScreenState.Content<PremiumDashboardUiState>).value
            .localSystemCards.single { it.title == "Moyens de réception" }
        val offline = (offlineRuntime.loadDashboard() as PremiumScreenState.Content<PremiumDashboardUiState>).value
            .localSystemCards.single { it.title == "Moyens de réception" }

        assertTrue(oneMethod.value == "1 actif")
        assertTrue(noMethod.value == "À ajouter")
        assertTrue(offline.value == "Connexion en attente")
        assertFalse(listOf(oneMethod.value, noMethod.value, offline.value).joinToString(" ").contains("À vérifier"))
    }

    @Test
    fun reviewsUseConfirmationEmptyAndOfflineStates() {
        val emptyRuntime = runtimeWith(
            reviewTransport = StaticTransport(MerchantApiResponse(200, """{"reviews":[]}"""))
        )
        val offlineRuntime = runtimeWith(
            reviewTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}"""))
        )

        val empty = emptyRuntime.loadReviews()
        val offline = offlineRuntime.loadReviews()

        assertTrue(empty is PremiumScreenState.Empty)
        assertTrue(empty.title.contains("Aucun paiement à confirmer"))
        assertTrue(offline is PremiumScreenState.Offline)
        assertTrue(offline.title.contains("Connexion en attente"))
        assertSafeMerchantHydrationCopy("${empty.title} ${empty.message} ${offline.title} ${offline.message}")
    }

    @Test
    fun connectedSiteMissingIsOptionalAndDoesNotMakeMenuDead() {
        val runtime = runtimeWith(
            connectedSiteTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"not_configured"}}"""))
        )

        val connectedSite = runtime.loadConnectedSite()

        assertTrue(connectedSite is PremiumScreenState.Content<*>)
        val content = (connectedSite as PremiumScreenState.Content).value
        val visible = listOf(content.statusTitle, content.statusText).joinToString(" ")
        assertTrue(visible.contains("Site ou application à configurer"))
        assertTrue(visible.contains("Vous pouvez continuer à utiliser SwimPay."))
        assertFalse(content.usesLiveApi)
        assertSafeMerchantHydrationCopy(visible + " " + content.rows.joinToString(" "))
    }

    @Test
    fun webhookMissingDoesNotMakeDashboardOrSalesDead() {
        val runtime = runtimeWith(
            connectedSiteTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"not_configured"}}"""))
        )

        val dashboard = runtime.loadDashboard()
        val orders = runtime.loadOrders()
        val connectedSite = runtime.loadConnectedSite()

        assertTrue(dashboard is PremiumScreenState.Content<*>)
        assertTrue(orders is PremiumScreenState.Content<*>)
        assertTrue(connectedSite is PremiumScreenState.Content<*>)
        val orderText = (orders as PremiumScreenState.Content).value.visibleTexts().joinToString(" ")
        assertTrue(orderText.contains("Aucune vente confirmée"))
        assertTrue(orderText.contains("Voir les paiements à confirmer"))
        assertSafeMerchantHydrationCopy(orderText)
    }

    @Test
    fun salesScreenHydratesConfirmedOrdersFromBackendContract() {
        val runtime = runtimeWith(
            ordersTransport = StaticTransport(
                MerchantApiResponse(
                    200,
                    """{"summary":{"confirmed_order_count":1,"confirmed_amount_minor":29904,"failed_count":0,"confirmation_rate":100,"currency":"RUB"},"orders":[{"order_id":"ord_01","external_id":"ext_01","amount":{"value":"299.04","currency":"RUB"},"status":"manual_confirmed","status_label":"Confirmee","helper":"Confirmation marchand"}],"confirmation_type":"notification_signal","official_bank_confirmation":false}"""
                )
            )
        )

        val orders = runtime.loadOrders()

        assertTrue(orders is PremiumScreenState.Content<*>)
        val content = (orders as PremiumScreenState.Content).value
        assertTrue(content.usesLiveApi)
        assertEquals("1", content.confirmedSalesCount)
        assertTrue(content.confirmedAmount.contains("299,04"))
        assertEquals("0", content.failedCount)
        assertEquals("100 %", content.confirmationRate)
        assertEquals(1, content.rows.size)
        val visible = content.visibleTexts().joinToString(" ")
        assertTrue(visible.contains("ord_01"))
        assertTrue(visible.contains("299,04"))
        assertTrue(visible.contains("Confirmee"))
        assertSafeMerchantHydrationCopy(visible)
    }

    @Test
    fun backendOfflineUsesMerchantFriendlySyncCopyForReceivingMethods() {
        val runtime = runtimeWith(
            receivingTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}"""))
        )

        val methods = runtime.loadReceivingMethods()

        assertTrue(methods is PremiumScreenState.Offline)
        assertTrue(methods.title.contains("Connexion en attente"))
        assertTrue(methods.message.contains("Les données seront synchronisées dès que SwimPay sera connecté."))
        assertSafeMerchantHydrationCopy("${methods.title} ${methods.message}")
    }

    private fun assertSafeMerchantHydrationCopy(visible: String) {
        val forbidden = listOf(
            "HMAC",
            "package/cert",
            "TO_VERIFY",
            "approved_for_review_only",
            "official_bank_confirmation",
            "bank_confirmed",
            "psp_confirmed",
            "guaranteed_payment",
            "signal runtime",
            "template confidence",
            "receiver route",
            "production trust",
            "package",
            "cert",
            "certificate",
            "webhook payload",
            "webhook_secret",
            "payment.confirmed",
            "confirmation bancaire officielle",
            "2200123412344821",
            "+79991234567",
            "raw notification",
            "raw_notification",
            "notification_text"
        )
        forbidden.forEach { token ->
            assertFalse("Forbidden visible token: $token", visible.contains(token, ignoreCase = true))
        }
    }

    private fun runtimeWith(
        dashboardTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(200, """{"payments_to_review_count":0,"confirmed_today_count":0,"notifications_sent_count":0,"receiver_status":{"display":"Connecté"},"recent_detected_payments":[]}""")),
        reviewTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(200, """{"reviews":[]}""")),
        paymentTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(404, """{"error":{"code":"not_found"}}""")),
        ordersTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}""")),
        receivingTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(200, """{"routes":[]}""")),
        connectedSiteTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"not_configured"}}""")),
        configurationTransport: MerchantApiTransport = StaticTransport(MerchantApiResponse(503, """{"error":{"code":"backend_unreachable"}}"""))
    ): PremiumMerchantRuntime {
        return PremiumMerchantRuntime(
            session = AuthenticatedMerchantSession.localDev("mch_demo"),
            dashboardRepository = MerchantDashboardApiRepository(dashboardTransport),
            reviewQueueRepository = MerchantReviewQueueApiRepository(reviewTransport),
            paymentDetailRepository = MerchantPaymentDetailApiRepository(paymentTransport),
            reviewActionsRepository = MerchantReviewActionsApiRepository(StaticTransport(MerchantApiResponse(503, "{}"))),
            ordersRepository = MerchantOrdersApiRepository(ordersTransport),
            receivingMethodsRepository = MerchantReceivingMethodsApiRepository(receivingTransport),
            connectedSiteRepository = MerchantConnectedSiteApiRepository(connectedSiteTransport),
            configurationTestRepository = MerchantConfigurationTestApiRepository(configurationTransport)
        )
    }

    private class StaticTransport(
        private val response: MerchantApiResponse
    ) : MerchantApiTransport {
        override fun execute(request: MerchantApiRequest): MerchantApiResponse = response
    }
}
