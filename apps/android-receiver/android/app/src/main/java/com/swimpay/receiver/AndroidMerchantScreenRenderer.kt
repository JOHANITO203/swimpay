package com.swimpay.receiver

import android.content.Context
import android.view.View
import android.widget.LinearLayout

class AndroidMerchantScreenRenderer(
    context: Context,
    private val catalog: AndroidMerchantUiCatalog = AndroidMerchantUiCatalog()
) {
    private val ui = AndroidMerchantViewComponents(context)

    fun render(
        screen: AndroidMerchantVisualScreen,
        snapshot: AndroidMerchantVisualSnapshot,
        navigate: (AndroidMerchantVisualScreen) -> Unit,
        openNotificationSettings: () -> Unit
    ): LinearLayout {
        return ui.screenContainer().apply {
            val backTarget = onboardingBackTarget(screen)
            addView(ui.brandHeader(backTarget?.let { { navigate(it) } }))
            addView(ui.waveBand())
            when (screen) {
                AndroidMerchantVisualScreen.WELCOME -> renderWelcome(this, navigate)
                AndroidMerchantVisualScreen.CONNECT_PHONE -> renderConnectPhone(this, snapshot, navigate, openNotificationSettings)
                AndroidMerchantVisualScreen.CHOOSE_BANKS -> renderChooseBanks(this, navigate)
                AndroidMerchantVisualScreen.ADD_RECEIVING_METHOD -> renderReceivingMethodSetup(this, navigate)
                AndroidMerchantVisualScreen.TEST_CONFIGURATION -> renderConfigurationTest(this, snapshot, navigate)
                AndroidMerchantVisualScreen.DASHBOARD -> renderDashboard(this, snapshot, navigate)
                AndroidMerchantVisualScreen.RECEIVING_METHODS -> renderReceivingMethods(this, snapshot)
                AndroidMerchantVisualScreen.REVIEW_QUEUE -> renderReviewQueue(this, snapshot, navigate)
                AndroidMerchantVisualScreen.PAYMENT_DETAIL -> renderPaymentDetail(this, snapshot, navigate)
                AndroidMerchantVisualScreen.CONNECTED_SITE -> renderConnectedSite(this, snapshot)
                AndroidMerchantVisualScreen.RECEIVER_HEALTH -> renderReceiverHealth(this, snapshot)
            }
            if (screen in merchantScreens) {
                addView(ui.bottomNav(screen, navigate))
            }
        }
    }

    private fun renderWelcome(container: LinearLayout, navigate: (AndroidMerchantVisualScreen) -> Unit) {
        val screen = catalog.welcomeScreen()
        container.addView(ui.pageHeader(screen.title, screen.subtitle))
        container.addView(featureCard("⚡", "Détection rapide", "Repérez plus vite les paiements reçus."))
        container.addView(featureCard("✓", "Validation simple", "Confirmez ou rejetez en quelques secondes."))
        container.addView(featureCard("↗", "Business connecté", "Votre site ou application reçoit la mise à jour."))
        container.addView(ui.primaryButton("Commencer") { navigate(AndroidMerchantVisualScreen.CONNECT_PHONE) })
        container.addView(stepDots(active = 1, total = 5))
    }

    private fun renderConnectPhone(
        container: LinearLayout,
        snapshot: AndroidMerchantVisualSnapshot,
        navigate: (AndroidMerchantVisualScreen) -> Unit,
        openNotificationSettings: () -> Unit
    ) {
        val screen = catalog.connectPhoneScreen(
            if (snapshot.notificationAccessEnabled) NotificationAccessMerchantState.ACTIVE else NotificationAccessMerchantState.ACTION_REQUIRED
        )
        container.addView(ui.pageHeader(screen.title, screen.subtitle))
        container.addView(ui.card(listOf(
            ui.rowCard(
                iconText = "!",
                title = if (snapshot.notificationAccessEnabled) "Téléphone connecté" else "Accès nécessaire",
                subtitle = if (snapshot.notificationAccessEnabled) "Accès notifications activé." else "Activez l’accès aux notifications pour détecter les paiements reçus.",
                trailing = if (snapshot.notificationAccessEnabled) "✓" else null,
                selected = snapshot.notificationAccessEnabled
            ),
            ui.body("SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.")
        )))
        container.addView(ui.primaryButton(if (snapshot.notificationAccessEnabled) "Continuer" else "Activer l’accès") {
            if (snapshot.notificationAccessEnabled) {
                navigate(AndroidMerchantVisualScreen.CHOOSE_BANKS)
            } else {
                openNotificationSettings()
            }
        })
        container.addView(stepDots(active = 2, total = 5))
    }

    private fun renderChooseBanks(container: LinearLayout, navigate: (AndroidMerchantVisualScreen) -> Unit) {
        val screen = catalog.chooseBanksScreen(selectedBankIds = setOf("sber_ru", "tbank_ru"))
        container.addView(ui.pageHeader(screen.title, screen.subtitle, "Validation manuelle en bêta"))
        screen.bankRows.forEach { bank ->
            container.addView(ui.rowCard(
                iconText = bank.displayName.take(1),
                title = bank.displayName,
                trailing = if (bank.selected) "✓" else "□",
                selected = bank.selected
            ))
        }
        container.addView(ui.primaryButton("Continuer") { navigate(AndroidMerchantVisualScreen.ADD_RECEIVING_METHOD) })
        container.addView(stepDots(active = 3, total = 5))
    }

    private fun renderReceivingMethodSetup(container: LinearLayout, navigate: (AndroidMerchantVisualScreen) -> Unit) {
        val screen = catalog.receivingMethodSetupScreen(ReceivingMethodType.CARD_TRANSFER)
        container.addView(ui.pageHeader(screen.title, screen.subtitle))
        container.addView(ui.rowCard("Card", "Carte bancaire", "Recevez les paiements sur votre carte.", trailing = "✓", selected = true))
        container.addView(ui.rowCard("Tel", "Numéro de téléphone", "Pratique pour les virements via SBP.", trailing = "○"))
        container.addView(ui.primaryButton("Ajouter") { navigate(AndroidMerchantVisualScreen.TEST_CONFIGURATION) })
        container.addView(stepDots(active = 4, total = 5))
    }

    private fun renderConfigurationTest(
        container: LinearLayout,
        snapshot: AndroidMerchantVisualSnapshot,
        navigate: (AndroidMerchantVisualScreen) -> Unit
    ) {
        val screen = snapshot.configurationTestScreen
        container.addView(ui.pageHeader(screen.title, screen.subtitle))
        val checklist = MerchantConfigurationChecklist.REQUIRED_LABELS.map {
            ui.rowCard("✓", it, trailing = "›", selected = true)
        }
        container.addView(ui.card(checklist))
        container.addView(ui.primaryButton("Lancer un test") { navigate(AndroidMerchantVisualScreen.DASHBOARD) })
        container.addView(stepDots(active = 5, total = 5))
    }

    private fun renderDashboard(
        container: LinearLayout,
        snapshot: AndroidMerchantVisualSnapshot,
        navigate: (AndroidMerchantVisualScreen) -> Unit
    ) {
        val screen = snapshot.dashboardScreen
        container.addView(ui.pageHeader("Tableau de bord"))
        container.addView(ui.card(listOf(
            ui.rowCard(
                iconText = "✓",
                title = if (snapshot.onboardingReady) "SwimPay est prêt" else "Action nécessaire",
                subtitle = if (snapshot.onboardingReady) "Votre téléphone est connecté et vos paiements peuvent être détectés." else "Votre téléphone n’est pas connecté. Les paiements ne peuvent pas être détectés.",
                selected = snapshot.onboardingReady
            )
        )))
        container.addView(twoColumnMetrics(
            listOf(
                Triple("À vérifier", "7", "◉"),
                Triple("Validés aujourd’hui", "24", "✓"),
                Triple("Notifications envoyées", "31", "♢"),
                Triple("Téléphone", if (snapshot.notificationAccessEnabled) "Connecté" else "Action", "▯")
            )
        ))
        container.addView(ui.title("Derniers paiements détectés").apply {
            layoutParams = ui.matchWrap().withMargins(top = ui.dp(18), bottom = ui.dp(10))
        })
        listOf(
            Triple("58,41 ₽", "Sberbank", "À vérifier"),
            Triple("129,00 ₽", "T-Bank", "Validé"),
            Triple("45,00 ₽", "Alfa-Bank", "En attente")
        ).forEach { (amount, bank, status) ->
            container.addView(ui.rowCard(bank.take(1), amount, bank, status, onClick = { navigate(AndroidMerchantVisualScreen.PAYMENT_DETAIL) }))
        }
        screen.primaryAction?.let { /* Keep API-backed screen data consumed without exposing internals. */ }
    }

    private fun renderReceivingMethods(container: LinearLayout, snapshot: AndroidMerchantVisualSnapshot) {
        container.addView(ui.pageHeader(
            title = "Moyens de réception",
            subtitle = "Ajoutez les cartes ou numéros que vos clients utiliseront pour vous payer."
        ))
        val actions = LinearLayout(container.context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = ui.matchWrap().withMargins(bottom = ui.dp(16))
            addView(ui.outlineButton("Ajouter une carte") {})
            addView(ui.outlineButton("Ajouter un numéro") {}.apply {
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).withMargins(left = ui.dp(10))
            })
            getChildAt(0).layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        container.addView(actions)
        val methods = snapshot.receivingMethods.ifEmpty {
            listOf(
                MerchantReceivingMethodDisplay.masked("Carte bancaire", "Sberbank · •••• 4821"),
                MerchantReceivingMethodDisplay.masked("Numéro de téléphone", "T-Bank · +7 *** *** 45-67")
            )
        }
        methods.forEach { method ->
            container.addView(ui.card(listOf(
                ui.rowCard(if (method.title == "Carte bancaire") "Card" else "Tel", method.title, method.subtitle, method.status, selected = true),
                method.badge?.let { ui.statusChip(it, "info") } ?: View(container.context),
                method.helper?.let { ui.body(it) } ?: View(container.context),
                ui.body(method.actions.joinToString("   "))
            )))
        }
        container.addView(ui.card(listOf(ui.body("Les informations complètes ne sont jamais envoyées dans les webhooks."))))
    }

    private fun renderReviewQueue(
        container: LinearLayout,
        snapshot: AndroidMerchantVisualSnapshot,
        navigate: (AndroidMerchantVisualScreen) -> Unit
    ) {
        container.addView(ui.pageHeader("Paiements à vérifier", "Confirmez uniquement les paiements que vous reconnaissez."))
        container.addView(filterRow(listOf("Tous", "À vérifier", "Validés", "Rejetés", "Expirés")))
        listOf(
            Triple("58,41 ₽", "Sberbank", "Signal détecté il y a 2 min"),
            Triple("129,00 ₽", "T-Bank", "Référence non visible"),
            Triple("45,00 ₽", "Alfa-Bank", "Confirmé manuellement")
        ).forEachIndexed { index, (amount, bank, helper) ->
            val status = if (index == 2) "Validé" else "À vérifier"
            container.addView(ui.card(listOf(
                ui.rowCard(bank.take(1), amount, bank, status, onClick = { navigate(AndroidMerchantVisualScreen.PAYMENT_DETAIL) }),
                ui.body(helper),
                ui.primaryButton(if (index == 2) "Voir" else "Examiner") { navigate(AndroidMerchantVisualScreen.PAYMENT_DETAIL) }
            )))
        }
        snapshot.reviewQueueScreen.primaryAction?.let { /* Keeps snapshot read without changing backend behavior. */ }
    }

    private fun renderPaymentDetail(
        container: LinearLayout,
        snapshot: AndroidMerchantVisualSnapshot,
        navigate: (AndroidMerchantVisualScreen) -> Unit
    ) {
        container.addView(ui.pageHeader("Vérifier ce paiement"))
        container.addView(ui.card(listOf(
            ui.rowCard("!", "À vérifier", "Ce paiement nécessite une validation manuelle.", selected = true)
        ), selected = true))
        val rows = listOf(
            "Montant attendu" to "58,41 ₽",
            "Montant détecté" to "58,41 ₽",
            "Banque" to "Sberbank",
            "Moyen de réception" to "Carte · •••• 4821",
            "Référence" to "TANGO ALFA",
            "Signal reçu" to "Il y a 2 min"
        ).map { (label, value) -> ui.rowCard("•", label, trailing = value) }
        container.addView(ui.card(rows))
        container.addView(ui.title("Pourquoi ce paiement est à vérifier ?").apply {
            layoutParams = ui.matchWrap().withMargins(top = ui.dp(10), bottom = ui.dp(10))
        })
        container.addView(ui.card(listOf(
            ui.body("Validation manuelle en bêta"),
            ui.body("Référence non visible")
        )))
        container.addView(ui.primaryButton("Confirmer le paiement") { navigate(AndroidMerchantVisualScreen.REVIEW_QUEUE) })
        container.addView(ui.outlineButton("Rejeter le signal") { navigate(AndroidMerchantVisualScreen.REVIEW_QUEUE) })
        container.addView(ui.outlineButton("Rejeter la commande", danger = true) { navigate(AndroidMerchantVisualScreen.REVIEW_QUEUE) })
        snapshot.paymentDetailScreen.primaryAction?.let { /* Preserve snapshot dependency. */ }
    }

    private fun renderConnectedSite(container: LinearLayout, snapshot: AndroidMerchantVisualSnapshot) {
        container.addView(ui.pageHeader(
            title = "Site ou application connecté",
            subtitle = "Votre site ou application reçoit une notification quand un paiement change de statut."
        ))
        container.addView(ui.card(listOf(
            ui.rowCard("✓", "Connexion active", "Dernière notification envoyée il y a 3 min.", selected = true),
            ui.rowCard("↗", "URL de notification", "https://votre-site.com/swimpay/webhook"),
            ui.rowCard("●", "Statut", "Actif")
        )))
        listOf("Tester la connexion", "Copier la clé développeur", "Voir les derniers envois").forEach {
            container.addView(ui.rowCard("›", it, trailing = "›"))
        }
        container.addView(ui.title("Derniers envois").apply {
            layoutParams = ui.matchWrap().withMargins(top = ui.dp(14), bottom = ui.dp(10))
        })
        container.addView(ui.card(listOf(
            ui.rowCard("✓", "Paiement confirmé", "Envoyé · il y a 3 min"),
            ui.rowCard("!", "Paiement à vérifier", "Envoyé · il y a 8 min"),
            ui.rowCard("×", "Paiement détecté", "Échec · il y a 12 min")
        )))
        container.addView(ui.outlineButton("Afficher les détails développeur") {})
        snapshot.connectedSiteScreen.primaryAction?.let { /* Preserve snapshot dependency. */ }
    }

    private fun renderReceiverHealth(container: LinearLayout, snapshot: AndroidMerchantVisualSnapshot) {
        container.addView(ui.pageHeader(
            title = "Téléphone Receiver",
            subtitle = "Ce téléphone permet à SwimPay de détecter les paiements reçus."
        ))
        container.addView(ui.card(listOf(
            ui.rowCard(
                iconText = if (snapshot.notificationAccessEnabled) "✓" else "!",
                title = if (snapshot.notificationAccessEnabled) "Téléphone connecté" else "Action nécessaire",
                subtitle = if (snapshot.notificationAccessEnabled) "Dernière activité : il y a 12 s" else "L’accès aux notifications est désactivé.",
                selected = snapshot.notificationAccessEnabled
            ),
            ui.rowCard("•", "Accès notifications", trailing = if (snapshot.notificationAccessEnabled) "Activé" else "Action requise"),
            ui.rowCard("•", "Banques surveillées", trailing = "${snapshot.allowedBanksCount.coerceAtLeast(5)} banques"),
            ui.rowCard("•", "File d’envoi", trailing = "OK"),
            ui.rowCard("•", "Dernière synchronisation", trailing = "Il y a 12 s"),
            ui.body("SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.")
        )))
        container.addView(ui.card(listOf(
            ui.title("Mode bêta"),
            ui.body("Validation manuelle activée"),
            ui.body("Les paiements doivent être confirmés avant notification finale.")
        )))
    }

    private fun featureCard(icon: String, title: String, subtitle: String): View {
        return ui.rowCard(icon, title, subtitle, trailing = "›")
    }

    private fun filterRow(filters: List<String>): LinearLayout {
        return LinearLayout(ui.screenContainer().context).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = ui.matchWrap().withMargins(bottom = ui.dp(16))
            filters.forEachIndexed { index, filter ->
                addView(ui.statusChip(filter, if (filter == "À vérifier") "info" else "neutral").apply {
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).withMargins(
                        left = if (index == 0) 0 else ui.dp(6)
                    )
                })
            }
        }
    }

    private fun twoColumnMetrics(metrics: List<Triple<String, String, String>>): LinearLayout {
        return LinearLayout(ui.screenContainer().context).apply {
            orientation = LinearLayout.VERTICAL
            metrics.chunked(2).forEach { row ->
                addView(LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = ui.matchWrap().withMargins(bottom = ui.dp(12))
                    row.forEachIndexed { index, metric ->
                        addView(ui.metricCard(metric.first, metric.second, metric.third).apply {
                            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).withMargins(
                                left = if (index == 0) 0 else ui.dp(12)
                            )
                        })
                    }
                })
            }
        }
    }

    private fun stepDots(active: Int, total: Int): LinearLayout {
        return LinearLayout(ui.screenContainer().context).apply {
            gravity = android.view.Gravity.CENTER
            orientation = LinearLayout.HORIZONTAL
            layoutParams = ui.matchWrap().withMargins(top = ui.dp(10), bottom = ui.dp(8))
            repeat(total) { index ->
                addView(View(context).apply {
                    background = ui.rounded(
                        if (index + 1 == active) AndroidMerchantColors.TEAL else android.graphics.Color.rgb(207, 214, 222),
                        999,
                        android.graphics.Color.TRANSPARENT,
                        0
                    )
                    layoutParams = LinearLayout.LayoutParams(ui.dp(10), ui.dp(10)).withMargins(left = ui.dp(5), right = ui.dp(5))
                })
            }
        }
    }

    private fun onboardingBackTarget(screen: AndroidMerchantVisualScreen): AndroidMerchantVisualScreen? {
        return when (screen) {
            AndroidMerchantVisualScreen.CONNECT_PHONE -> AndroidMerchantVisualScreen.WELCOME
            AndroidMerchantVisualScreen.CHOOSE_BANKS -> AndroidMerchantVisualScreen.CONNECT_PHONE
            AndroidMerchantVisualScreen.ADD_RECEIVING_METHOD -> AndroidMerchantVisualScreen.CHOOSE_BANKS
            AndroidMerchantVisualScreen.TEST_CONFIGURATION -> AndroidMerchantVisualScreen.ADD_RECEIVING_METHOD
            AndroidMerchantVisualScreen.PAYMENT_DETAIL -> AndroidMerchantVisualScreen.REVIEW_QUEUE
            AndroidMerchantVisualScreen.CONNECTED_SITE -> AndroidMerchantVisualScreen.RECEIVER_HEALTH
            else -> null
        }
    }

    private companion object {
        val merchantScreens: Set<AndroidMerchantVisualScreen> = setOf(
            AndroidMerchantVisualScreen.DASHBOARD,
            AndroidMerchantVisualScreen.RECEIVING_METHODS,
            AndroidMerchantVisualScreen.REVIEW_QUEUE,
            AndroidMerchantVisualScreen.PAYMENT_DETAIL,
            AndroidMerchantVisualScreen.CONNECTED_SITE,
            AndroidMerchantVisualScreen.RECEIVER_HEALTH
        )
    }
}
