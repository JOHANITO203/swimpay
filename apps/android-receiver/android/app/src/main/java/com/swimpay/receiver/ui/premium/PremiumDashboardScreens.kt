package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swimpay.receiver.BuildConfig
import com.swimpay.receiver.MerchantReceivingMethodDraft
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.R
import com.swimpay.receiver.ReceivingMethodType

@Composable
private fun premiumMockupTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = PremiumMockupColors.White,
    unfocusedTextColor = PremiumMockupColors.White,
    focusedContainerColor = PremiumMockupColors.Field,
    unfocusedContainerColor = PremiumMockupColors.Field,
    focusedBorderColor = PremiumMockupColors.Green,
    unfocusedBorderColor = PremiumMockupColors.Border,
    focusedLabelColor = PremiumMockupColors.Green,
    unfocusedLabelColor = PremiumMockupColors.Muted,
    focusedPlaceholderColor = PremiumMockupColors.MutedDark,
    unfocusedPlaceholderColor = PremiumMockupColors.MutedDark,
    cursorColor = PremiumMockupColors.Green
)

private fun premiumDesignFixtureEnabled(): Boolean {
    return BuildConfig.BUILD_TYPE == "debug" || BuildConfig.BUILD_TYPE == "staging"
}

private fun premiumReceivingMethodsPreviewState(): PremiumReceivingMethodsUiState {
    return PremiumReceivingMethodsUiState(
        items = listOf(
            PremiumReceivingMethodUiItem("demo_sber_card", "Sberbank", "Sberbank - 4276 **** **** 5421", "Carte - Visa - Debit", "Validee", "Validee", true, true, emptyList()),
            PremiumReceivingMethodUiItem("demo_tbank_card", "T-Bank", "T-Bank - 5536 **** **** 8876", "Carte - Mastercard - Debit", "Validee", "Validee", true, false, emptyList()),
            PremiumReceivingMethodUiItem("demo_vtb_phone", "VTB", "VTB - +7 900 *** ** 33", "Telephone - SBP", "Validee", "Validee", true, false, emptyList()),
            PremiumReceivingMethodUiItem("demo_alfa_card", "Alfa-Bank", "Alfa-Bank - 2200 **** **** 1122", "Carte - Mir - Debit", "A verifier", "A verifier", true, false, emptyList()),
            PremiumReceivingMethodUiItem("demo_gazprom_card", "Gazprombank", "Gazprombank - 4249 **** **** 7788", "Carte - Visa - Credit", "Validee", "Validee", true, false, emptyList()),
            PremiumReceivingMethodUiItem("demo_sber_phone", "Sberbank", "Sberbank - +7 911 *** ** 44", "Telephone - SBP", "Inactive", "Inactive", false, false, emptyList()),
            PremiumReceivingMethodUiItem("demo_tbank_phone", "T-Bank", "T-Bank - +7 995 *** ** 55", "Telephone - SBP", "Inactive", "Inactive", false, false, emptyList())
        ),
        usesLiveApi = false
    )
}

private fun premiumReceiverHealthPreviewState(): PremiumReceiverHealthUiState {
    return PremiumReceiverHealthUiState(
        statusTitle = "Sain",
        statusText = "Le recepteur fonctionne correctement et detecte les signaux de paiement en temps reel.",
        rows = listOf(
            "Dernier heartbeat" to "09:41:23",
            "Intervalle attendu" to "30 s",
            "Temps de reponse moyen" to "187 ms",
            "File locale" to "0"
        ),
        notices = emptyList()
    )
}

private fun premiumConnectedSitePreviewState(): PremiumConnectedSiteUiState {
    return PremiumConnectedSiteUiState(
        statusTitle = "merchant.example",
        statusText = "Integration active",
        rows = listOf(
            "Site" to "merchant.example",
            "Statut" to "Actif",
            "Cree le" to "21 mai 2025"
        ),
        usesLiveApi = false,
        developerRows = listOf(
            "Cle API" to "sp_live_**************abcd",
            "Webhook" to "https://merchant.example/webhook",
            "Dernier test du webhook" to "200 OK",
            "Sante de livraison (7 derniers jours)" to "Excellent"
        ),
        exportLines = listOf(
            "SWIMPAY_API_KEY=sp_live_**************abcd",
            "SWIMPAY_WEBHOOK_URL=https://merchant.example.com/webhook/swimpay"
        ),
        webhookUrl = "https://merchant.example.com/webhook/swimpay",
        merchantAuthorizationHeaderMasked = "Bearer sp_live_**************abcd",
        actionButtonsEnabled = true
    )
}

private fun premiumDashboardPreviewState(): PremiumDashboardUiState {
    return PremiumDashboardUiState(
        readyTitle = "SwimPay Merchant",
        readyText = "Apercu de votre activite aujourd'hui",
        mainMetricLabel = "CA du jour",
        monthlyAmount = "85 920 ?",
        metrics = listOf(
            PremiumMetricUiState("126", "Paiements en attente de revue", "+8 vs hier"),
            PremiumMetricUiState("342", "Signaux detectes", "+18,3% vs hier"),
            PremiumMetricUiState("92%", "Taux de confirmations operationnelles", "+2,6 pts vs hier"),
            PremiumMetricUiState("Excellent", "Webhook sante", "100% livre"),
            PremiumMetricUiState("0", "Echecs"),
            PremiumMetricUiState("92%", "Taux", "+2,6 pts vs hier")
        ),
        recentPayments = listOf(
            PremiumRecentPaymentUiState("Nouveau signal detecte", "Sberbank - Carte **** 5421 - 9 450,00 RUB"),
            PremiumRecentPaymentUiState("Confirmation operationnelle", "T-Bank - Tinkoff - 14 200,00 RUB"),
            PremiumRecentPaymentUiState("Webhook livre", "merchant.example - /webhook/payment")
        ),
        usesLiveApi = true
    )
}

@Composable
fun PremiumDashboardScreen(
    state: PremiumScreenState<PremiumDashboardUiState> = PremiumScreenState.content(PremiumDashboardUiState.preview())
) {
    val visualState = if (premiumDesignFixtureEnabled()) {
        PremiumScreenState.content(premiumDashboardPreviewState())
    } else {
        state
    }
    when (visualState) {
        is PremiumScreenState.Content -> PremiumDashboardContent(visualState.value)
        else -> PremiumStateList(visualState)
    }
}

@Composable
private fun PremiumDashboardContent(state: PremiumDashboardUiState) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(top = 8.dp, bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Row {
                            Text("Bonjour, ", color = PremiumMockupColors.White, fontSize = mockupSp(28), lineHeight = mockupSp(34))
                            Text("Merchant", color = PremiumMockupColors.Green, fontSize = mockupSp(28), lineHeight = mockupSp(34))
                        }
                        Text("Aperçu de votre activité aujourd’hui", color = PremiumMockupColors.Muted, fontSize = mockupSp(16), lineHeight = mockupSp(22))
                    }
                    MockupSmallButton("Aujourd’hui")
                }
            }
            item { DashboardRevenueMockCard(state) }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                    DashboardMetricMockCard("En revue", state.metrics.getOrNull(0)?.value ?: "0", state.metrics.getOrNull(0)?.trend ?: "", Icons.Default.AccessTime, PremiumMockupColors.Warning, Modifier.weight(1f))
                    DashboardMetricMockCard("Signaux", state.metrics.getOrNull(1)?.value ?: "0", state.metrics.getOrNull(1)?.trend ?: "", Icons.Default.BarChart, PremiumMockupColors.Blue, Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                    DashboardMetricMockCard("Taux confirme", state.metrics.lastOrNull()?.value ?: "0%", state.metrics.lastOrNull()?.trend ?: "", Icons.Default.Security, PremiumMockupColors.Green, Modifier.weight(1f), ring = true)
                    DashboardMetricMockCard("Webhook", if (state.usesLiveApi) "Excellent" else "En attente", "100% livre", Icons.Default.Visibility, Color(0xFFA166FF), Modifier.weight(1f))
                }
            }
            item {
                MockupInfoBanner(
                    title = "Verification manuelle",
                    body = "Les signaux importants passent par une revue.",
                    icon = Icons.Default.Info,
                    tone = PremiumMockupColors.Blue
                )
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(18)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(14))) {
                        Text("Actions rapides", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                        Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                            QuickActionMock("Revue", "Voir les paiements\nà examiner", Icons.AutoMirrored.Filled.ReceiptLong, PremiumMockupColors.Warning, Modifier.weight(1f))
                            QuickActionMock("Méthodes", "Gérer vos méthodes\nde réception", Icons.Default.CreditCard, PremiumMockupColors.Green, Modifier.weight(1f))
                            QuickActionMock("Intégration", "Sites & webhooks\nconnectés", Icons.Default.Code, PremiumMockupColors.Blue, Modifier.weight(1f))
                        }
                    }
                }
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(18)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Activité récente", color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = mockupSp(18))
                            Text("Voir tout", color = PremiumMockupColors.Green, fontWeight = FontWeight.Medium, fontSize = mockupSp(16))
                        }
                        val rows = state.recentPayments.ifEmpty {
                            listOf(
                                PremiumRecentPaymentUiState("Nouveau signal détecté", "Sberbank • Carte **** 5421 • 9 450,00 ?"),
                                PremiumRecentPaymentUiState("Confirmation opérationnelle", "T-Bank • Tinkoff • 14 200,00 ?"),
                                PremiumRecentPaymentUiState("Webhook livré", "merchant.example • /webhook/payment")
                            )
                        }
                        rows.take(3).forEachIndexed { index, row ->
                            RecentActivityMock(row.amount, row.detail, index)
                            if (index < rows.take(3).lastIndex) Box(Modifier.fillMaxWidth().height(mockupDp(1)).background(PremiumMockupColors.BorderSoft))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MockupSmallButton(label: String) {
    Row(
        Modifier
            .height(48.dp)
            .background(PremiumMockupColors.Field, RoundedCornerShape(14.dp))
            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, color = PremiumMockupColors.White, fontSize = mockupSp(14), fontWeight = FontWeight.Medium)
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun DashboardRevenueMockCard(state: PremiumDashboardUiState) {
    MockupGlassCard(Modifier.fillMaxWidth().height(156.dp), radius = 18.dp, border = PremiumMockupColors.Border) {
        Row(Modifier.fillMaxSize().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(0.46f), verticalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                Text("CA du jour", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                Text(state.monthlyAmount, color = PremiumMockupColors.White, fontSize = mockupSp(33), lineHeight = mockupSp(37), fontWeight = FontWeight.Black)
                Text("+12,4% vs hier", color = PremiumMockupColors.Green, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
                Box(
                    Modifier
                        .background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(8)))
                        .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(8)))
                        .padding(horizontal = mockupDp(7), vertical = mockupDp(5))
                ) {
                    Text("Hier 76 421 ?", color = PremiumMockupColors.Muted, fontSize = mockupSp(12))
                }
            }
            MockRevenueChart(Modifier.weight(0.54f).height(110.dp))
        }
    }
}

@Composable
private fun MockRevenueChart(modifier: Modifier = Modifier) {
    val values = listOf(0.08f, 0.17f, 0.15f, 0.22f, 0.2f, 0.31f, 0.35f, 0.48f, 0.46f, 0.58f, 0.63f, 0.72f, 0.69f, 0.82f, 0.78f, 0.94f)
    Box(modifier) {
        Canvas(Modifier.fillMaxSize()) {
            val labelWidth = size.width * 0.17f
            val chartLeft = labelWidth + 6f
            val chartRight = size.width
            val chartTop = size.height * 0.06f
            val chartBottom = size.height * 0.78f
            repeat(4) { index ->
                val y = chartTop + (chartBottom - chartTop) * index / 3f
                drawLine(
                    PremiumMockupColors.BorderSoft,
                    Offset(chartLeft, y),
                    Offset(chartRight, y),
                    strokeWidth = 1.2f
                )
            }
            val points = values.mapIndexed { index, value ->
                val x = chartLeft + (chartRight - chartLeft) * index / (values.lastIndex).coerceAtLeast(1)
                val y = chartBottom - (chartBottom - chartTop) * value
                Offset(x, y)
            }
            val area = Path().apply {
                moveTo(points.first().x, chartBottom)
                points.forEachIndexed { index, point ->
                    if (index == 0) lineTo(point.x, point.y) else lineTo(point.x, point.y)
                }
                lineTo(points.last().x, chartBottom)
                close()
            }
            drawPath(area, PremiumMockupColors.Green.copy(alpha = 0.14f))
            val line = Path().apply {
                points.forEachIndexed { index, point ->
                    if (index == 0) moveTo(point.x, point.y) else lineTo(point.x, point.y)
                }
            }
            drawPath(line, PremiumMockupColors.Green, style = Stroke(width = 3.5f))
        }
        Column(Modifier.width(mockupDp(30)).height(mockupDp(82)), verticalArrangement = Arrangement.SpaceBetween) {
            listOf("90K", "60K", "30K", "0").forEach {
                Text(it, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(10))
            }
        }
    }
}

@Composable
private fun DashboardMetricMockCard(
    title: String,
    value: String,
    trend: String,
    icon: ImageVector,
    tone: Color,
    modifier: Modifier = Modifier,
    ring: Boolean = false
) {
    MockupGlassCard(modifier.height(112.dp), radius = 16.dp) {
        Row(Modifier.fillMaxSize().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(mockupDp(4))) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(6))) {
                    Icon(icon, null, tint = tone, modifier = Modifier.size(22.dp))
                    Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(14), lineHeight = mockupSp(17), fontWeight = FontWeight.Medium, maxLines = 2)
                }
                Text(value, color = if (title.contains("Webhook")) PremiumMockupColors.Green else PremiumMockupColors.White, fontSize = mockupSp(29), lineHeight = mockupSp(31), fontWeight = FontWeight.Black, maxLines = 1)
                Text(trend.ifBlank { "vs hier" }, color = if (trend.startsWith("+")) PremiumMockupColors.Green else PremiumMockupColors.Muted, fontSize = mockupSp(12))
            }
            if (ring) {
                Box(Modifier.size(48.dp).border(5.dp, PremiumMockupColors.Green, CircleShape), contentAlignment = Alignment.Center) {
                    Text(value, color = PremiumMockupColors.White, fontSize = mockupSp(14))
                }
            } else {
                Box(Modifier.size(44.dp).background(PremiumMockupColors.Field, RoundedCornerShape(12.dp)).border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(24.dp))
                }
            }
        }
    }
}

@Composable
private fun QuickActionMock(title: String, body: String, icon: ImageVector, tone: Color, modifier: Modifier = Modifier) {
    MockupGlassCard(modifier.height(88.dp), radius = 14.dp) {
        Row(Modifier.fillMaxSize().padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(icon, null, tint = tone, modifier = Modifier.size(28.dp))
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
                Text(body, color = PremiumMockupColors.Muted, fontSize = mockupSp(11), lineHeight = mockupSp(15))
            }
        }
    }
}

@Composable
private fun RecentActivityMock(title: String, body: String, index: Int) {
    val tones = listOf(PremiumMockupColors.Warning, PremiumMockupColors.Green, PremiumMockupColors.Blue)
    Row(Modifier.fillMaxWidth().height(mockupDp(54)), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(mockupDp(38)).background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(10))).border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(10))), contentAlignment = Alignment.Center) {
            Icon(if (index == 1) Icons.Default.CheckCircle else Icons.Default.AccessTime, null, tint = tones[index % tones.size], modifier = Modifier.size(mockupDp(24)))
        }
        Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
            Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(14), fontWeight = FontWeight.Black)
            Text(body, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(16))
        }
        Text("Il y a ${index * 2 + 1} min", color = PremiumMockupColors.Muted, fontSize = mockupSp(12))
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(mockupDp(22)))
    }
}

@Composable
private fun ChartMetricPill(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier.height(mockupDp(52)).border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(18))),
        color = PremiumMockupColors.Field,
        shape = RoundedCornerShape(mockupDp(20))
    ) {
        Column(Modifier.padding(horizontal = mockupDp(14)), verticalArrangement = Arrangement.Center) {
            Text(label, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(10), fontWeight = FontWeight.Black)
            Text(value, color = PremiumMockupColors.White, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun LocalSystemCard(state: PremiumLocalSystemUiState, modifier: Modifier) {
    MockupGlassCard(modifier.height(mockupDp(96)), radius = mockupDp(22)) {
        Column(Modifier.padding(mockupDp(16)), verticalArrangement = Arrangement.Center) {
            Text(state.title, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(11), lineHeight = mockupSp(15), fontWeight = FontWeight.Black)
            Text(state.value, color = PremiumMockupColors.White, fontSize = mockupSp(16), lineHeight = mockupSp(20), fontWeight = FontWeight.Black, modifier = Modifier.padding(top = mockupDp(4)))
            if (state.helper.isNotBlank()) {
                Text(state.helper, color = PremiumMockupColors.Muted, fontSize = mockupSp(10), lineHeight = mockupSp(13), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun PremiumStateList(state: PremiumScreenState<*>) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = mockupDp(22)),
        verticalArrangement = Arrangement.spacedBy(mockupDp(18))
    ) {
        item { PremiumStatePanel(state) }
    }
}

@Composable
private fun MonthlyActivityCard(label: String, amount: String, usesLiveApi: Boolean) {
    MockupGlassCard(Modifier.fillMaxWidth().height(mockupDp(214)), radius = mockupDp(30), border = PremiumMockupColors.Cyan.copy(alpha = 0.38f)) {
        Column(Modifier.padding(mockupDp(26))) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MockupIconTile(Icons.Default.AccountBalanceWallet, size = mockupDp(46), tint = PremiumMockupColors.Cyan)
                Text("Aujourd'hui", color = PremiumMockupColors.Muted, fontWeight = FontWeight.Black, fontSize = mockupSp(13))
            }
            Spacer(Modifier.height(mockupDp(24)))
            Text(label, color = PremiumMockupColors.Muted, fontSize = mockupSp(15), lineHeight = mockupSp(19), fontWeight = FontWeight.Black)
            Spacer(Modifier.height(mockupDp(6)))
            Text(amount, color = PremiumMockupColors.White, fontSize = mockupSp(36), lineHeight = mockupSp(40), fontWeight = FontWeight.Black)
            Spacer(Modifier.height(mockupDp(18)))
            MockupSignalPill(if (usesLiveApi) "Live" else "En attente")
        }
    }
}

private fun metricIcon(label: String): ImageVector {
    return when (label.lowercase()) {
        "à confirmer" -> Icons.Default.Visibility
        "confirmés" -> Icons.Default.CheckCircle
        "rejetés" -> Icons.Default.Security
        "expirés" -> Icons.Default.AccountBalance
        "échecs" -> Icons.Default.Link
        "taux" -> Icons.Default.Description
        else -> Icons.Default.Visibility
    }
}

@Composable
private fun BentoMetricCard(value: String, label: String, trend: String, icon: ImageVector, modifier: Modifier) {
    MockupGlassCard(modifier.height(mockupDp(142)), radius = mockupDp(24)) {
        Column(Modifier.padding(mockupDp(20)), verticalArrangement = Arrangement.Center) {
            MockupIconTile(icon, size = mockupDp(38), tint = PremiumMockupColors.Cyan)
            Spacer(Modifier.height(mockupDp(8)))
            Text(value, color = PremiumMockupColors.White, fontSize = mockupSp(32), lineHeight = mockupSp(34), fontWeight = FontWeight.Black)
            Row {
                Text(label, color = PremiumMockupColors.Muted, fontSize = mockupSp(11), fontWeight = FontWeight.Black)
                if (trend.isNotBlank()) {
                    Text(" $trend", color = PremiumMockupColors.Green, fontSize = mockupSp(11), fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun RecentPaymentRow(amount: String, detail: String) {
    MockupGlassCard(Modifier.fillMaxWidth().height(mockupDp(88)), radius = mockupDp(24)) {
        Row(Modifier.padding(horizontal = mockupDp(18)), verticalAlignment = Alignment.CenterVertically) {
            MockupIconTile(Icons.Default.Visibility, size = mockupDp(48), tint = PremiumMockupColors.Cyan)
            Column(Modifier.weight(1f).padding(start = mockupDp(18))) {
                Text(amount, color = PremiumMockupColors.White, fontSize = mockupSp(20), fontWeight = FontWeight.Black)
                Text(detail, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold)
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.MutedDark)
        }
    }
}

@Composable
private fun MockupSectionHeader(title: String, body: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(mockupDp(7))) {
        Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(24), lineHeight = mockupSp(29), fontWeight = FontWeight.Black)
        body?.let {
            Text(it, color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(19), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MockupSignalPill(text: String, modifier: Modifier = Modifier, danger: Boolean = false) {
    val foreground = if (danger) PremiumMockupColors.Danger else PremiumMockupColors.Green
    Box(
        modifier
            .background(foreground.copy(alpha = 0.13f), RoundedCornerShape(PremiumMockupRadius.Pill))
            .border(mockupDp(1), foreground.copy(alpha = 0.28f), RoundedCornerShape(PremiumMockupRadius.Pill))
            .padding(horizontal = mockupDp(12), vertical = mockupDp(6))
    ) {
        Text(text, color = foreground, fontSize = mockupSp(11), fontWeight = FontWeight.Black)
    }
}

@Composable
fun PremiumOrdersScreen(
    state: PremiumScreenState<PremiumOrdersUiState> = PremiumScreenState.empty(
        "Aucune commande",
        "Les commandes synchronisées apparaîtront ici."
    )
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumOrdersContent(state.value)
        else -> PremiumStateList(state)
    }
}

@Composable
private fun PremiumOrdersContent(state: PremiumOrdersUiState) {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = mockupDp(34)),
        verticalArrangement = Arrangement.spacedBy(mockupDp(18))
    ) {
        item {
            Text("Ventes confirmées", color = PremiumColors.Ink, fontSize = mockupSp(24), lineHeight = mockupSp(29), fontWeight = FontWeight.Black)
            Text("Suivez les commandes reliées aux paiements confirmés.", color = PremiumColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(20), fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(mockupDp(24)))
            SalesMetricCard(state.confirmedSalesCount, "VENTES CONFIRMÉES", Icons.Default.CheckCircle)
            Spacer(Modifier.height(mockupDp(12)))
            SalesMetricCard(state.confirmedAmount, "MONTANT CONFIRMÉ", Icons.Default.ShoppingCart)
            Spacer(Modifier.height(mockupDp(12)))
            SalesMetricCard(state.failedCount, "ÉCHECS", Icons.Default.Security)
            Spacer(Modifier.height(mockupDp(12)))
            SalesMetricCard(state.confirmationRate, "TAUX DE CONFIRMATION", Icons.Default.Visibility)
            Spacer(Modifier.height(mockupDp(18)))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(mockupDp(6))) {
                StatusChip("Aujourd'hui", StatusTone.Info)
                StatusChip("7 jours", StatusTone.Neutral)
                StatusChip("30 jours", StatusTone.Neutral)
                StatusChip("Tout", StatusTone.Neutral)
            }
            Spacer(Modifier.height(mockupDp(24)))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    placeholder = { Text("ID, Client, Montant...") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(mockupDp(18)),
                    colors = premiumMockupTextFieldColors()
                )
                CircleAction(Icons.Default.FilterList)
            }
        }
        items(state.rows) { row ->
            OrderCard(row.orderId, row.amount, row.status, row.helper)
        }
        if (state.rows.isEmpty()) {
            item {
                PremiumStatePanel(
                    PremiumScreenState.empty<Unit>(
                        title = state.emptyTitle,
                        message = state.emptyMessage,
                        actionLabel = state.primaryActionLabel
                    )
                )
                Text(
                    state.secondaryActionLabel,
                    color = PremiumColors.Blue,
                    fontSize = mockupSp(13),
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(top = mockupDp(10), start = mockupDp(8))
                )
            }
        }
    }
}

@Composable
private fun SalesMetricCard(value: String, label: String, icon: ImageVector) {
    Surface(
        Modifier.fillMaxWidth().height(mockupDp(92)).border(mockupDp(1), PremiumColors.Line, RoundedCornerShape(mockupDp(30))),
        color = PremiumColors.Surface,
        shadowElevation = mockupDp(4),
        shape = RoundedCornerShape(mockupDp(30))
    ) {
        Row(Modifier.padding(horizontal = mockupDp(20)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(14))) {
            Box(Modifier.size(mockupDp(42)).background(PremiumColors.IconTile, RoundedCornerShape(mockupDp(16))), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Blue, modifier = Modifier.size(mockupDp(22)))
            }
            Column(Modifier.weight(1f)) {
                Text(value, color = PremiumColors.Ink, fontSize = mockupSp(22), lineHeight = mockupSp(25), fontWeight = FontWeight.Black)
                Text(label, color = PremiumColors.Muted, fontSize = mockupSp(11), lineHeight = mockupSp(15), fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun OrderCard(id: String, amount: String, status: String, helper: String) {
    Surface(
        Modifier.fillMaxWidth().height(mockupDp(112)).border(mockupDp(1), PremiumColors.Line, RoundedCornerShape(mockupDp(58))),
        color = PremiumColors.Surface,
        shape = RoundedCornerShape(mockupDp(58))
    ) {
        Row(Modifier.padding(horizontal = mockupDp(20)), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(mockupDp(54)).background(PremiumColors.IconTile, RoundedCornerShape(mockupDp(16))), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.ShoppingCart, null, tint = PremiumColors.Blue)
            }
            Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                Text(id, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = mockupSp(16))
                Text(helper, color = PremiumColors.Ink, fontSize = mockupSp(12))
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(amount, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = mockupSp(16))
                StatusChip(status, if (status == "VALIDÉ") StatusTone.Success else StatusTone.Warning)
            }
        }
    }
}

@Composable
fun PremiumSettingsScreen(
    connectedSite: PremiumScreenState<PremiumConnectedSiteUiState> = PremiumScreenState.content(PremiumConnectedSiteUiState.preview()),
    configuration: PremiumScreenState<PremiumConfigurationUiState> = PremiumScreenState.content(PremiumConfigurationUiState.preview()),
    merchantProfile: PremiumMerchantProfileUiState = PremiumMerchantProfileUiState(),
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onNavigate: (PremiumRoute) -> Unit = {}
) {
    PremiumSecurityScreen(
        onOpenReceiverHealth = { onNavigate(PremiumNavigation.openReceiverHealth()) }
    )
    return

    val copy = PremiumLocalizedCopy.forLanguage(language)
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(22)),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(mockupDp(18))
        ) {
            item {
                Spacer(Modifier.height(mockupDp(22)))
                Box(
                    Modifier
                        .size(mockupDp(108))
                        .background(PremiumMockupColors.Highlight, CircleShape)
                        .border(mockupDp(1), PremiumMockupColors.Cyan.copy(alpha = 0.35f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(merchantProfile.initials, color = PremiumMockupColors.White, fontSize = mockupSp(31), fontWeight = FontWeight.Black)
                }
                Text(copy.terminalTitle, color = PremiumMockupColors.White, fontSize = mockupSp(24), lineHeight = mockupSp(28), fontWeight = FontWeight.Black, modifier = Modifier.padding(top = mockupDp(12)))
                Text(merchantProfile.displayName, color = PremiumMockupColors.White, fontSize = mockupSp(13), fontWeight = FontWeight.Bold)
                Text(merchantProfile.statusLabel, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(mockupDp(14)))
                MockupTruthBanner(Modifier.fillMaxWidth())
                Spacer(Modifier.height(mockupDp(10)))
            }
            item { MockupSummaryCard("Integration developpeur", connectedSiteStatus(connectedSite), connectedSiteRows(connectedSite)) }
            item { MockupSummaryCard("Configuration", configurationStatus(configuration), configurationRows(configuration)) }
            item {
                SettingsGroup(copy.paymentsGroup, listOf(
                    PremiumSettingsRow(Icons.Default.AccountBalance, copy.banks) { onNavigate(PremiumNavigation.openBanks()) },
                    PremiumSettingsRow(Icons.Default.CreditCard, copy.receivingMethods) { onNavigate(PremiumNavigation.openReceivingMethods()) },
                    PremiumSettingsRow(Icons.Default.CheckCircle, copy.confirmationMode) { onNavigate(PremiumNavigation.openConfirmationMode()) }
                ))
            }
            item {
                SettingsGroup(copy.businessGroup, listOf(
                    PremiumSettingsRow(Icons.Default.Link, copy.developerIntegration) { onNavigate(PremiumNavigation.openConnectedSite()) },
                    PremiumSettingsRow(Icons.Default.ShoppingCart, copy.sales) { onNavigate(PremiumRoute.Main(PremiumMainTab.Receivers)) },
                    PremiumSettingsRow(Icons.Default.PhoneAndroid, copy.notifications) { onNavigate(PremiumNavigation.openReceiverHealth()) }
                ))
            }
            item {
                SettingsGroup(copy.applicationGroup, listOf(
                    PremiumSettingsRow(Icons.Default.Palette, copy.appearance) { onNavigate(PremiumNavigation.openAppearance()) },
                    PremiumSettingsRow(Icons.Default.Language, copy.language) { onNavigate(PremiumNavigation.openLanguage()) },
                    PremiumSettingsRow(Icons.Default.Security, copy.security) { onNavigate(PremiumNavigation.openSecurity()) }
                ))
            }
            item {
                SettingsGroup(copy.helpGroup, listOf(
                    PremiumSettingsRow(Icons.Default.Description, copy.support) { onNavigate(PremiumNavigation.openSupportContact()) },
                    PremiumSettingsRow(Icons.AutoMirrored.Filled.Help, copy.helpCenter) { onNavigate(PremiumNavigation.openHelpCenter()) }
                ))
            }
            item {
                Text("<-  ${copy.signOut}", color = PremiumMockupColors.Danger, fontSize = mockupSp(12), fontWeight = FontWeight.Black, letterSpacing = mockupSp(3), modifier = Modifier.padding(vertical = mockupDp(28)))
            }
        }
    }
}

@Composable
fun PremiumConnectedSiteSummary(state: PremiumScreenState<PremiumConnectedSiteUiState>) {
    when (state) {
        is PremiumScreenState.Content -> MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(28), border = PremiumMockupColors.Cyan.copy(alpha = 0.34f)) {
            Column(Modifier.padding(mockupDp(22))) {
                Text("Integration developpeur", color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = mockupSp(18))
                Text(state.value.statusTitle, color = if (state.value.usesLiveApi) PremiumMockupColors.Green else PremiumMockupColors.Muted, fontWeight = FontWeight.Black, fontSize = mockupSp(14), modifier = Modifier.padding(top = mockupDp(8)))
                state.value.rows.forEach { row ->
                    Text("${row.first} · ${row.second}", color = PremiumMockupColors.Muted, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = mockupDp(6)))
                }
            }
        }
        else -> PremiumStatePanel(state)
    }
}

private fun connectedSiteStatus(state: PremiumScreenState<PremiumConnectedSiteUiState>): String {
    return when (state) {
        is PremiumScreenState.Content -> state.value.statusTitle
        else -> "A configurer"
    }
}

private fun connectedSiteRows(state: PremiumScreenState<PremiumConnectedSiteUiState>): List<Pair<String, String>> {
    return when (state) {
        is PremiumScreenState.Content -> state.value.rows
        else -> emptyList()
    }
}

@Composable
fun PremiumConfigurationSummary(state: PremiumScreenState<PremiumConfigurationUiState>) {
    when (state) {
        is PremiumScreenState.Content -> MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(28), border = if (state.value.usesLiveApi) PremiumMockupColors.Green.copy(alpha = 0.34f) else PremiumMockupColors.BorderSoft) {
            Column(Modifier.padding(mockupDp(22))) {
                Text("Configuration", color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = mockupSp(18))
                Text(state.value.outcomeTitle, color = if (state.value.usesLiveApi) PremiumMockupColors.Green else PremiumMockupColors.Muted, fontWeight = FontWeight.Black, fontSize = mockupSp(14), modifier = Modifier.padding(top = mockupDp(8)))
                Text(state.value.outcomeText, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = mockupDp(6)))
            }
        }
        else -> PremiumStatePanel(state)
    }
}

private fun configurationStatus(state: PremiumScreenState<PremiumConfigurationUiState>): String {
    return when (state) {
        is PremiumScreenState.Content -> state.value.outcomeTitle
        else -> "En attente"
    }
}

private fun configurationRows(state: PremiumScreenState<PremiumConfigurationUiState>): List<Pair<String, String>> {
    return when (state) {
        is PremiumScreenState.Content -> listOf("Etat" to state.value.outcomeText)
        else -> emptyList()
    }
}

@Composable
private fun MockupSummaryCard(title: String, status: String, rows: List<Pair<String, String>>) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(22)) {
        Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(8))) {
            Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
            Text(status, color = PremiumMockupColors.Green, fontSize = mockupSp(13), fontWeight = FontWeight.Black)
            rows.take(3).forEach { row ->
                Text("${row.first} - ${row.second}", color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(17), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
fun PremiumReceivingMethodsStateScreen(
    state: PremiumScreenState<PremiumReceivingMethodsUiState>,
    clearDraftSignal: Int = 0,
    onSaveDraft: (MerchantReceivingMethodSubmission) -> Unit = {},
    onEditMethod: (String, String) -> Unit = { _, _ -> },
    onDisableMethod: (String) -> Unit = {},
    onSetDefaultMethod: (String) -> Unit = {},
    onDeleteMethod: (String) -> Unit = {}
) {
    val visualState = if (premiumDesignFixtureEnabled()) {
        PremiumScreenState.content(premiumReceivingMethodsPreviewState())
    } else {
        state
    }
    when (visualState) {
        is PremiumScreenState.Content -> {
            var draftType by remember { mutableStateOf<ReceivingMethodType?>(null) }
            val bankOptions = PremiumReceivingMethodBankCatalog.availableBanks
            var selectedBankId by remember { mutableStateOf(bankOptions.firstOrNull()?.bankProfileId.orEmpty()) }
            var identifierInput by remember { mutableStateOf("") }
            var editingMethod by remember { mutableStateOf<PremiumReceivingMethodUiItem?>(null) }
            var editLabel by remember { mutableStateOf("") }
            LaunchedEffect(clearDraftSignal) {
                if (clearDraftSignal > 0) {
                    identifierInput = ""
                    draftType = null
                    editingMethod = null
                    editLabel = ""
                }
            }
            MockupScreenBackground(Modifier.fillMaxSize()) {
                LazyColumn(
                    Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
                    contentPadding = PaddingValues(bottom = mockupDp(22)),
                    verticalArrangement = Arrangement.spacedBy(mockupDp(16))
                ) {
                    item {
                        Row(Modifier.fillMaxWidth().height(mockupDp(96)), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(34)))
                            Column(Modifier.weight(1f).padding(start = mockupDp(18))) {
                                Text("Méthodes de réception", color = PremiumMockupColors.White, fontSize = mockupSp(24), fontWeight = FontWeight.Black)
                                Text("Gérez vos méthodes par banque", color = PremiumMockupColors.Muted, fontSize = mockupSp(16))
                            }
                            Row(
                                Modifier.height(mockupDp(48)).background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(14))).border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(14))).premiumTap { draftType = ReceivingMethodType.CARD_TRANSFER }.padding(horizontal = mockupDp(16)),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(mockupDp(10))
                            ) {
                                Icon(Icons.Default.Add, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(28)))
                                Text("Ajouter", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                            }
                        }
                    }
                    item {
                        MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16), border = PremiumMockupColors.Border) {
                            Row(Modifier.padding(mockupDp(18)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(16))) {
                                Icon(Icons.Default.Security, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(mockupDp(42)))
                                Column(Modifier.weight(1f)) {
                                    Text("Vos détails restent privés", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                                    Text("Les valeurs complètes ne sont jamais exposées\ndans les payloads webhook.", color = PremiumMockupColors.Muted, fontSize = mockupSp(15), lineHeight = mockupSp(21))
                                }
                                MockupStatusChip("?")
                            }
                        }
                    }
                    item {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                            MockupFilterTab("Toutes (${visualState.value.items.size})", true, Modifier.weight(1f))
                            MockupFilterTab("Actives (${visualState.value.items.count { it.enabled }})", false, Modifier.weight(1f))
                            MockupFilterTab("Inactives (${visualState.value.items.count { !it.enabled }})", false, Modifier.weight(1f))
                        }
                    }
                    if (draftType != null) {
                        item {
                            MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(24)) {
                                Column(Modifier.padding(mockupDp(22)), verticalArrangement = Arrangement.spacedBy(mockupDp(14))) {
                                    Text("Choisir la banque", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                                    bankOptions.forEach { bank ->
                                        val selected = bank.bankProfileId == selectedBankId
                                        Row(Modifier.fillMaxWidth().premiumTap { selectedBankId = bank.bankProfileId }.padding(vertical = mockupDp(4)), verticalAlignment = Alignment.CenterVertically) {
                                            Box(Modifier.size(mockupDp(26)).background(if (selected) PremiumMockupColors.Green else Color.Transparent, CircleShape).border(mockupDp(2), if (selected) PremiumMockupColors.Green else PremiumMockupColors.Border, CircleShape))
                                            PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = mockupDp(30), modifier = Modifier.padding(start = mockupDp(12)))
                                            Text(bank.displayName, color = PremiumMockupColors.White, fontSize = mockupSp(14), fontWeight = FontWeight.Black, modifier = Modifier.padding(start = mockupDp(10)))
                                        }
                                    }
                                    OutlinedTextField(
                                        value = identifierInput,
                                        onValueChange = { identifierInput = it },
                                label = { Text("Identifiant utilisé seulement pour l'enregistrement") },
                                placeholder = { Text(if (draftType == ReceivingMethodType.CARD_TRANSFER) "Numéro de carte" else "Numéro de téléphone") },
                                        modifier = Modifier.fillMaxWidth(),
                                        singleLine = true,
                                        shape = RoundedCornerShape(mockupDp(18)),
                                        colors = premiumMockupTextFieldColors()
                                    )
                                    PremiumPrimaryButton(
                                        "Enregistrer",
                                        enabled = identifierInput.isNotBlank(),
                                        onClick = {
                                            val submission = MerchantReceivingMethodDraft(
                                                bankProfileId = selectedBankId,
                                                type = draftType ?: ReceivingMethodType.CARD_TRANSFER,
                                                rawIdentifierInput = identifierInput
                                            ).toSubmission()
                                            onSaveDraft(submission)
                                        }
                                    )
                                }
                            }
                        }
                    }
                    editingMethod?.let { method ->
                        item {
                            MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(24)) {
                                Column(Modifier.padding(mockupDp(22)), verticalArrangement = Arrangement.spacedBy(mockupDp(14))) {
                                    Text("Modifier le libelle", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                                    Text(method.subtitle, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(18), fontWeight = FontWeight.SemiBold)
                                    OutlinedTextField(
                                        value = editLabel,
                                        onValueChange = { editLabel = it },
                                        label = { Text("Nom court") },
                                        modifier = Modifier.fillMaxWidth(),
                                        singleLine = true,
                                        shape = RoundedCornerShape(mockupDp(18)),
                                        colors = premiumMockupTextFieldColors()
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(10)), modifier = Modifier.fillMaxWidth()) {
                                        PremiumOutlineButton("Annuler", modifier = Modifier.weight(1f)) {
                                            editingMethod = null
                                            editLabel = ""
                                        }
                                        PremiumPrimaryButton(
                                            "Enregistrer",
                                            modifier = Modifier.weight(1f),
                                            enabled = editLabel.isNotBlank()
                                        ) {
                                            onEditMethod(method.routeId, editLabel)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (visualState.value.items.isEmpty()) {
                        item {
                            MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(22)) {
                                Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(6))) {
                                    Text("Aucun moyen de reception", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                                    Text("Ajoutez une carte ou un telephone SBP pour commencer.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(18))
                                }
                            }
                        }
                    }
                    items(visualState.value.items) { method ->
                        PremiumReceivingMethodRow(
                            method = method,
                            onEdit = {
                                editingMethod = method
                                editLabel = method.helper?.takeUnless { it.contains("SBP", ignoreCase = true) } ?: method.title
                            },
                            onDisable = { onDisableMethod(method.routeId) },
                            onSetDefault = { onSetDefaultMethod(method.routeId) },
                            onDelete = { onDeleteMethod(method.routeId) }
                        )
                    }
                }
            }
        }
        else -> PremiumStateList(visualState)
    }
}

@Composable
private fun ReceivingMethodActionButton(
    label: String,
    icon: ImageVector? = null,
    sbpIcon: Boolean = false,
    onClick: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(mockupDp(76))
            .clip(RoundedCornerShape(mockupDp(24)))
            .background(PremiumMockupColors.Card, RoundedCornerShape(mockupDp(24)))
            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(24)))
            .premiumTap(onClick)
            .padding(horizontal = mockupDp(16)),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(mockupDp(48))
                .background(PremiumMockupColors.Green.copy(alpha = 0.14f), RoundedCornerShape(mockupDp(18)))
                .border(mockupDp(1), PremiumMockupColors.Green.copy(alpha = 0.24f), RoundedCornerShape(mockupDp(18))),
            contentAlignment = Alignment.Center
        ) {
            if (sbpIcon) {
                SbpPlaceholderMark(size = mockupDp(34))
            } else if (icon != null) {
                Icon(icon, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(mockupDp(25)))
            }
        }
        Text(
            label,
            color = PremiumMockupColors.White,
            fontSize = mockupSp(15),
            lineHeight = mockupSp(19),
            fontWeight = FontWeight.Black,
            modifier = Modifier
                .weight(1f)
                .padding(start = mockupDp(14))
        )
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = PremiumMockupColors.MutedDark,
            modifier = Modifier.size(mockupDp(22))
        )
    }
}

@Composable
private fun MockupFilterTab(label: String, selected: Boolean, modifier: Modifier = Modifier) {
    Box(
        modifier
            .height(mockupDp(52))
            .background(if (selected) PremiumMockupColors.Green.copy(alpha = 0.14f) else PremiumMockupColors.Field, RoundedCornerShape(mockupDp(14)))
            .border(mockupDp(1), if (selected) PremiumMockupColors.Green else PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(14))),
        contentAlignment = Alignment.Center
    ) {
        Text(label, color = if (selected) PremiumMockupColors.Green else PremiumMockupColors.Muted, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
    }
}

private fun bankIconResource(bankProfileId: String): Int? {
    return when (bankProfileId) {
        "sber_ru" -> R.drawable.ic_bank_sberbank
        "tbank_ru" -> R.drawable.ic_bank_tbank
        "vtb_ru" -> R.drawable.ic_bank_vtb
        "alfa_ru" -> R.drawable.ic_bank_alfa
        "gazprombank_ru" -> R.drawable.ic_bank_gazprombank
        "ozon_bank" -> R.drawable.ic_bank_ozon
        else -> null
    }
}

private fun bankProfileIdFromDisplay(value: String): String? {
    return PremiumReceivingMethodBankCatalog.availableBanks.firstOrNull { option ->
        value.contains(option.displayName, ignoreCase = true)
    }?.bankProfileId
}

@Composable
fun PremiumBankLogo(
    bankProfileId: String,
    displayName: String,
    size: Dp = mockupDp(46),
    modifier: Modifier = Modifier
) {
    Box(
        modifier
            .size(size)
            .background(PremiumMockupColors.Field, RoundedCornerShape(size / 3f))
            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(size / 3f))
            .padding(mockupDp(6)),
        contentAlignment = Alignment.Center
    ) {
        val icon = bankIconResource(bankProfileId)
        if (icon != null) {
            Image(
                painter = painterResource(icon),
                contentDescription = displayName,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Text(displayName.take(1), color = PremiumMockupColors.Cyan, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun SbpPlaceholderMark(size: Dp = 44.dp, modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(R.drawable.ic_payment_sbp_placeholder),
        contentDescription = "SBP",
        contentScale = ContentScale.Fit,
        modifier = modifier.size(size)
    )
}

@Composable
private fun PremiumReceivingMethodRow(
    method: PremiumReceivingMethodUiItem,
    onEdit: () -> Unit,
    onDisable: () -> Unit,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(24)) {
        Row(Modifier.padding(mockupDp(18)), verticalAlignment = Alignment.CenterVertically) {
            val bankProfileId = bankProfileIdFromDisplay(method.subtitle)
            val isSbp = method.helper?.contains("SBP", ignoreCase = true) == true ||
                method.subtitle.contains("SBP", ignoreCase = true) ||
                method.helper?.contains("Telephone", ignoreCase = true) == true
            if (bankProfileId != null) {
                Box {
                    PremiumBankLogo(bankProfileId = bankProfileId, displayName = method.subtitle, size = 58.dp)
                    if (isSbp) {
                        SbpPlaceholderMark(size = 26.dp, modifier = Modifier.align(Alignment.BottomEnd))
                    }
                }
            }
            Column(Modifier.weight(1f).padding(start = if (bankProfileId != null) mockupDp(14) else mockupDp(0))) {
                Text(method.title, color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = mockupSp(18))
                Text(method.subtitle, color = PremiumMockupColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = mockupSp(14), modifier = Modifier.padding(top = mockupDp(6)))
                method.helper?.let {
                    Text(it, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = mockupDp(4)))
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                MockupSignalPill(method.status, danger = !method.enabled)
                Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(8))) {
                    ReceivingMethodMutationButton("", Icons.Default.Edit, Modifier.size(48.dp), onEdit)
                    ReceivingMethodMutationButton("", Icons.Default.Delete, Modifier.size(48.dp), onDelete, destructive = true)
                }
            }
        }
    }
}

@Composable
private fun ReceivingMethodMutationButton(
    label: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    destructive: Boolean = false
) {
    val mockupForeground = if (destructive) PremiumMockupColors.Danger else PremiumMockupColors.Cyan
    Row(
        modifier
            .height(48.dp)
            .clip(RoundedCornerShape(mockupDp(16)))
            .background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(16)))
            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(16)))
            .premiumTap(onClick)
            .padding(horizontal = mockupDp(10)),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(icon, null, tint = mockupForeground, modifier = Modifier.size(mockupDp(16)))
        Text(label, color = mockupForeground, fontWeight = FontWeight.Black, fontSize = mockupSp(11), modifier = Modifier.padding(start = mockupDp(6)))
    }
}

@Composable
fun PremiumBanksStateScreen(state: PremiumScreenState<PremiumBanksUiState>) {
    when (state) {
        is PremiumScreenState.Content -> MockupScreenBackground(Modifier.fillMaxSize()) {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
                contentPadding = PaddingValues(bottom = mockupDp(34)),
                verticalArrangement = Arrangement.spacedBy(mockupDp(16))
            ) {
                item {
                    MockupSectionHeader(
                        title = "Recherche des banques compatibles",
                        body = "SwimPay vérifie uniquement les banques compatibles sur ce téléphone."
                    )
                }
                items(state.value.items) { bank ->
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(26), border = if (bank.enabled || bank.canActivate) PremiumMockupColors.Green.copy(alpha = 0.32f) else PremiumMockupColors.BorderSoft) {
                        Row(Modifier.padding(mockupDp(18)), verticalAlignment = Alignment.CenterVertically) {
                            PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = mockupDp(48))
                            Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                                Text(bank.displayName, color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = mockupSp(17))
                                Text(bank.helper, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(17), fontWeight = FontWeight.SemiBold)
                            }
                            MockupStatusChip(bank.status, tone = if (bank.enabled || bank.canActivate) PremiumMockupColors.Green else PremiumMockupColors.MutedDark)
                        }
                    }
                }
            }
        }
        else -> PremiumStateList(state)
    }
}

@Composable
fun PremiumReceiverHealthStateScreen(
    state: PremiumScreenState<PremiumReceiverHealthUiState>,
    onOpenNotificationSettings: () -> Unit = {}
) {
    val visualState = if (premiumDesignFixtureEnabled()) {
        PremiumScreenState.content(premiumReceiverHealthPreviewState())
    } else {
        state
    }
    when (visualState) {
        is PremiumScreenState.Content -> MockupScreenBackground(Modifier.fillMaxSize()) {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
                contentPadding = PaddingValues(bottom = mockupDp(34)),
                verticalArrangement = Arrangement.spacedBy(mockupDp(16))
            ) {
                item {
                    Row(Modifier.fillMaxWidth().height(mockupDp(96)), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(34)))
                        Column(Modifier.weight(1f).padding(start = mockupDp(18))) {
                            Text("Santé des récepteurs", color = PremiumMockupColors.White, fontSize = mockupSp(24), fontWeight = FontWeight.Black)
                            Text("Surveillance et paramètres", color = PremiumMockupColors.Muted, fontSize = mockupSp(16))
                        }
                        Icon(Icons.Default.MoreVert, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(mockupDp(30)))
                    }
                }
                item {
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16), border = PremiumMockupColors.Border) {
                        Row(Modifier.padding(mockupDp(20)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(18))) {
                                Box(Modifier.size(mockupDp(92)).border(mockupDp(10), PremiumMockupColors.Green.copy(alpha = 0.7f), CircleShape), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.PhoneAndroid, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(mockupDp(42)))
                                }
                                Column(Modifier.weight(1f)) {
                                    Text("Statut global", color = PremiumMockupColors.Muted, fontSize = mockupSp(15))
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                                        Text(visualState.value.statusTitle, color = PremiumMockupColors.Green, fontWeight = FontWeight.Black, fontSize = mockupSp(24))
                                        MockupStatusChip("Opérationnel")
                                    }
                                    Text(visualState.value.statusText, color = PremiumMockupColors.Muted, fontSize = mockupSp(14), lineHeight = mockupSp(20), modifier = Modifier.padding(top = mockupDp(6)))
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Activé depuis", color = PremiumMockupColors.Muted, fontSize = mockupSp(13))
                                    Text("3 j 12 h 45 min", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                                }
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                        ReceiverHealthMiniCard("Dernier heartbeat", "09:41:23", "Intervalle attendu      30 s\nTemps de réponse moyen      187 ms", Icons.Default.PhoneAndroid, PremiumMockupColors.Green, Modifier.weight(1f))
                        ReceiverHealthMiniCard("Banque(s) surveillée(s)", "Sberbank\nT-Bank\nVTB\nAlfa-Bank\nGazprombank", "Actif\nActif\nActif\nInactif\nInactif", Icons.Default.AccountBalance, PremiumMockupColors.Blue, Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                        ReceiverHealthMiniCard("Accès notifications", "Autorisé", "Permissions      OK\nL’accès aux notifications est nécessaire pour détecter les signaux de paiement.", Icons.Default.NotificationsNone, Color(0xFFA166FF), Modifier.weight(1f))
                        ReceiverHealthMiniCard("File locale", "0", "Dernier traitement      09:41:20\nStockage utilisé      12,4 Mo\nMode de persistance      SQLite", Icons.Default.Description, PremiumMockupColors.Warning, Modifier.weight(1f))
                    }
                }
                item {
                    MockupInfoBanner(
                        title = "Traitement des signaux",
                        body = "SwimPay lit les notifications bancaires et en extrait des signaux.\nLa confirmation reste opérationnelle et peut nécessiter une vérification manuelle avant toute action.",
                        icon = Icons.Default.Info,
                        tone = PremiumMockupColors.Blue
                    )
                }
                item {
                    Text("Actions et diagnostic", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black)
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                        QuickActionMock("Relancer le récepteur", "Redémarre le traitement\ndes notifications.", Icons.Default.Sync, PremiumMockupColors.Green, Modifier.weight(1f))
                        QuickActionMock("Tester la connexion", "Vérifie la connectivité\nréseau.", Icons.Default.Visibility, PremiumMockupColors.Blue, Modifier.weight(1f))
                        QuickActionMock("Voir les logs", "Consultez les journaux\nrécents.", Icons.Default.Description, Color(0xFFA166FF), Modifier.weight(1f))
                        QuickActionMock("Paramètres avancés", "Ajustez les options de\nfonctionnement.", Icons.Default.Settings, PremiumMockupColors.Warning, Modifier.weight(1f))
                    }
                }
            }
        }
        else -> PremiumStateList(visualState)
    }
}

@Composable
private fun ReceiverHealthMiniCard(
    title: String,
    value: String,
    body: String,
    icon: ImageVector,
    tone: Color,
    modifier: Modifier = Modifier
) {
    MockupGlassCard(modifier.height(mockupDp(196)), radius = mockupDp(16)) {
        Column(Modifier.padding(mockupDp(16)), verticalArrangement = Arrangement.spacedBy(mockupDp(10))) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                Icon(icon, null, tint = tone, modifier = Modifier.size(mockupDp(24)))
                Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
            }
            Text(value, color = if (value == "Autorisé" || value == "0") PremiumMockupColors.Green else PremiumMockupColors.White, fontSize = mockupSp(22), lineHeight = mockupSp(27), fontWeight = FontWeight.Black)
            Text(body, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(19))
        }
    }
}

@Composable
private fun OldReceiverHealthNotices() {
    Column {
    }
}

@Composable
fun PremiumConfirmationModeScreen() {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(34)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            item {
                MockupSectionHeader(
                    title = "Mode de confirmation",
                    body = "Choisissez le niveau d'aide pour vérifier vos paiements."
                )
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(30), border = PremiumMockupColors.Green.copy(alpha = 0.42f)) {
                    Column(Modifier.padding(mockupDp(22)), verticalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                        Text("Mode manuel V1", color = PremiumMockupColors.White, fontSize = mockupSp(20), fontWeight = FontWeight.Black)
                        Text("Chaque paiement doit être confirmé par vous.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13), fontWeight = FontWeight.SemiBold)
                        MockupStatusChip("Confirmation manuelle", tone = PremiumMockupColors.Green)
                    }
                }
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(30)) {
                    Column(Modifier.padding(mockupDp(22)), verticalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                        Text("Assistance de revue", color = PremiumMockupColors.White, fontSize = mockupSp(20), fontWeight = FontWeight.Black)
                        Text("SwimPay prépare les indices, vous décidez.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13), fontWeight = FontWeight.SemiBold)
                        MockupStatusChip("Lecture seule", tone = PremiumMockupColors.MutedDark)
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumSecurityScreen(
    appLock: PremiumAppLockSettings = PremiumAppLockSettings(),
    googleAccountLinked: Boolean = false,
    onToggleAppLock: (Boolean) -> Unit = {},
    onTimeoutSelected: (PremiumLockTimeout) -> Unit = {},
    onGoogleAccountLink: () -> Unit = {},
    onOpenReceiverHealth: () -> Unit = {}
) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(34)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            item {
                Row(Modifier.fillMaxWidth().height(mockupDp(96)), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(34)))
                    Text("Sécurité & paramètres", color = PremiumMockupColors.White, fontSize = mockupSp(24), fontWeight = FontWeight.Black, modifier = Modifier.weight(1f).padding(start = mockupDp(18)))
                    Icon(
                        Icons.Default.Security,
                        null,
                        tint = PremiumMockupColors.Green,
                        modifier = Modifier.size(mockupDp(34)).premiumTap(onOpenReceiverHealth)
                    )
                }
            }
            item { GoogleAccountLinkRow(googleAccountLinked, onGoogleAccountLink) }
            item { Text("Sécurité de l’application", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black) }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(14))) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            MockupIconTile(Icons.Default.Security, size = mockupDp(58), tint = PremiumMockupColors.Green)
                            Column(Modifier.weight(1f).padding(start = mockupDp(16))) {
                                Text("Verrouillage de l’application", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                                Text("Protégez l’accès à SwimPay Merchant\nsur cet appareil.", color = PremiumMockupColors.Muted, fontSize = mockupSp(14), lineHeight = mockupSp(19))
                            }
                            Switch(checked = appLock.enabled, onCheckedChange = onToggleAppLock)
                        }
                        Row(Modifier.fillMaxWidth().height(mockupDp(46)).background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(12))).border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(12))).padding(horizontal = mockupDp(14)), verticalAlignment = Alignment.CenterVertically) {
                            Text("Verrouillage automatique", color = PremiumMockupColors.White, fontSize = mockupSp(14), modifier = Modifier.weight(1f))
                            Text(appLock.timeout.labelFr, color = PremiumMockupColors.Green, fontSize = mockupSp(14))
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(mockupDp(22)))
                        }
                    }
                }
            }
            item { Text("Sessions & appareils", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black) }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(14))) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Sessions actives", color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
                                Text("Gérez les appareils connectés à votre compte.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13))
                            }
                            Text("2 actives", color = PremiumMockupColors.Green, fontSize = mockupSp(14))
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.Muted)
                        }
                        SecurityDeviceRow("Android • Pixel 7 Pro", "Moscow, Russie • IP 176.59.***.24", "Cet appareil", active = true)
                        SecurityDeviceRow("Windows • Chrome", "Moscow, Russie • IP 176.59.***.81", "Hier, 14:32", active = false)
                        Box(Modifier.fillMaxWidth().height(mockupDp(48)).border(mockupDp(1), PremiumMockupColors.Danger, RoundedCornerShape(mockupDp(12))), contentAlignment = Alignment.Center) {
                            Text("Se déconnecter de toutes les sessions", color = PremiumMockupColors.Danger, fontSize = mockupSp(14), fontWeight = FontWeight.Black)
                        }
                    }
                }
            }
            item { Text("Confidentialité", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black) }
            item {
                MockupSettingsList(
                    listOf(
                        Triple(Icons.Default.Visibility, "Données & confidentialité", "Gérez vos données, exportez ou supprimez votre compte."),
                        Triple(Icons.Default.NotificationsNone, "Préférences de notifications", "Choisissez les alertes que vous souhaitez recevoir.")
                    )
                )
            }
            item { Text("Assistance", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black) }
            item {
                MockupSettingsList(
                    listOf(
                        Triple(Icons.Default.HelpOutline, "Centre d’aide", "Guides, FAQ et bonnes pratiques."),
                        Triple(Icons.AutoMirrored.Filled.Help, "Contacter le support", "Ouvrez un ticket, nous vous répondrons rapidement.")
                    )
                )
            }
            item {
                MockupInfoBanner(
                    title = "Donnees protegees",
                    body = "Vos controles restent manuels et tracables.",
                    icon = Icons.Default.Info,
                    tone = PremiumMockupColors.Warning
                )
            }
        }
    }
}

@Composable
private fun SecurityDeviceRow(title: String, body: String, status: String, active: Boolean) {
    Row(Modifier.fillMaxWidth().height(mockupDp(62)), verticalAlignment = Alignment.CenterVertically) {
        MockupIconTile(if (active) Icons.Default.PhoneAndroid else Icons.Default.Public, size = mockupDp(42), tint = if (active) PremiumMockupColors.Green else PremiumMockupColors.Muted)
        Column(Modifier.weight(1f).padding(start = mockupDp(12))) {
            Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(15))
            Text(body, color = PremiumMockupColors.Muted, fontSize = mockupSp(12))
        }
        Text(status, color = if (active) PremiumMockupColors.Green else PremiumMockupColors.Muted, fontSize = mockupSp(12))
        if (!active) Icon(Icons.Default.MoreVert, null, tint = PremiumMockupColors.Muted)
    }
}

@Composable
private fun MockupSettingsList(rows: List<Triple<ImageVector, String, String>>) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
        Column {
            rows.forEachIndexed { index, row ->
                Row(Modifier.fillMaxWidth().height(mockupDp(78)).padding(horizontal = mockupDp(16)), verticalAlignment = Alignment.CenterVertically) {
                    MockupIconTile(row.first, size = mockupDp(48), tint = PremiumMockupColors.Green)
                    Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                        Text(row.second, color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                        Text(row.third, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(16))
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.White)
                }
                if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(mockupDp(1)).background(PremiumMockupColors.BorderSoft))
            }
        }
    }
}
@Composable
private fun GoogleAccountLinkRow(linked: Boolean, onClick: () -> Unit) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(22)) {
        Row(
            Modifier.fillMaxWidth().premiumTap(onClick).padding(mockupDp(18)),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(mockupDp(42)).background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(15))).border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(15))), contentAlignment = Alignment.Center) {
                PremiumGoogleIcon()
            }
            Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                Text(if (linked) "Compte Google lie" else "Lier le compte Google", color = PremiumMockupColors.White, fontSize = mockupSp(16), lineHeight = mockupSp(21), fontWeight = FontWeight.Black)
                Text("Sauvegarde ce profil marchand pour une future reconnexion avec Google.", color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(17), fontWeight = FontWeight.SemiBold)
            }
            MockupSignalPill(if (linked) "Lie" else "Reconnexion")
        }
    }
}

@Composable
fun PremiumHelpCenterScreen(language: PremiumLanguageOption = PremiumLanguageOption.FR) {
    val topics = listOf(
        "Signaux de paiement" to "SwimPay lit uniquement les notifications bancaires autorisees, les filtre, les redacte et les envoie au backend.",
        "Moyens de reception" to "Ajoutez une carte ou un telephone SBP marchand et associez-le a une banque compatible.",
        "J'ai paye" to "Cette action arme le suivi cote commande. Elle ne confirme jamais un paiement.",
        "Confirmation manuelle" to "Le marchand decide. Le webhook final part seulement apres confirmation manuelle.",
        "Webhook" to "Les webhooks publics V1 restent limites au resultat final confirme, rejete ou expire.",
        "Receiver hors ligne" to "Verifiez l'acces aux notifications, les banques activees et la connexion du telephone."
    )
    var query by remember { mutableStateOf("") }
    val filtered = topics.filter { (title, body) ->
        query.isBlank() || title.contains(query, true) || body.contains(query, true)
    }
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(34)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            item {
                MockupSectionHeader(
                    title = if (language == PremiumLanguageOption.EN) "Help center" else "Centre d'aide",
                    body = "Aide courte, sure et compatible avec la verite produit V1."
                )
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Rechercher") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().padding(top = mockupDp(12)),
                    shape = RoundedCornerShape(mockupDp(18)),
                    colors = premiumMockupTextFieldColors()
                )
            }
            items(filtered) { topic ->
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(24)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(8))) {
                        Text(topic.first, color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
                        Text(topic.second, color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(19), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            if (filtered.isEmpty()) {
                item { PremiumStatePanel(PremiumScreenState.empty<Unit>("Aucun resultat", "Essayez un autre mot-cle.")) }
            }
        }
    }
}

@Composable
fun PremiumContactSupportScreen(
    result: PremiumSupportTicketResult? = null,
    onSubmit: (PremiumSupportTicketDraft) -> Unit = {}
) {
    var category by remember { mutableStateOf(PremiumSupportCategory.RECEIVER_ISSUE) }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    val draft = PremiumSupportTicketDraft(category, subject, message)
    val validation = draft.validationError()
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(34)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            item {
                MockupSectionHeader(
                    title = "Contacter le support",
                    body = "Envoyez une demande sans notification brute, secret, numero complet, PIN, CVV ou code SMS."
                )
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(26)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                        PremiumSupportCategory.entries.forEach { item ->
                            MockupSettingsChoiceRow(Icons.Default.Description, item.labelFr, item.wireValue, item == category) {
                                category = item
                            }
                        }
                        OutlinedTextField(value = subject, onValueChange = { subject = it }, label = { Text("Sujet") }, singleLine = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(mockupDp(18)), colors = premiumMockupTextFieldColors())
                        OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Message") }, minLines = 4, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(mockupDp(18)), colors = premiumMockupTextFieldColors())
                        validation?.let { Text(it, color = PremiumMockupColors.Danger, fontSize = mockupSp(12), fontWeight = FontWeight.Bold) }
                        PremiumPrimaryButton("Envoyer", enabled = validation == null, onClick = { onSubmit(draft) })
                    }
                }
            }
            result?.let {
                item {
                    PremiumStatePanel(
                        if (it.status == "created") {
                            PremiumScreenState.empty<Unit>("Demande envoyee", it.safeMessage)
                        } else {
                            PremiumScreenState.actionRequired<Unit>("Support", it.safeMessage)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun PremiumLanguageScreen(selected: PremiumLanguageOption, onSelect: (PremiumLanguageOption) -> Unit) {
    val copy = PremiumLocalizedCopy.forLanguage(selected)
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(34)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            item {
                MockupSectionHeader(copy.language, copy.languageBody)
            }
            items(PremiumLanguageOption.entries) { language ->
                SettingsChoiceRow(Icons.Default.Language, language.displayLabel, language.tag.uppercase(), language == selected) {
                    onSelect(language)
                }
            }
        }
    }
}

@Composable
fun PremiumAppearanceScreen(selected: PremiumThemeMode, onSelect: (PremiumThemeMode) -> Unit) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(34)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            item {
                MockupSectionHeader("Apparence", "Le changement est applique immediatement a l'interface.")
            }
            items(PremiumThemeMode.entries) { mode ->
                SettingsChoiceRow(if (mode == PremiumThemeMode.DARK) Icons.Default.DarkMode else Icons.Default.Palette, mode.labelFr, mode.wireValue, mode == selected) {
                    onSelect(mode)
                }
            }
        }
    }
}

@Composable
fun PremiumUnlockRequiredScreen(
    appLock: PremiumAppLockSettings,
    onUnlock: () -> Unit
) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize().padding(mockupDp(28)), contentAlignment = Alignment.Center) {
        MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(30), border = PremiumMockupColors.Cyan.copy(alpha = 0.38f)) {
            Column(Modifier.padding(mockupDp(24)), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(mockupDp(14))) {
                MockupIconTile(Icons.Default.Security, size = mockupDp(64), tint = PremiumMockupColors.Cyan)
                Text("SwimPay verrouille", color = PremiumMockupColors.White, fontSize = mockupSp(22), fontWeight = FontWeight.Black)
                Text("Delai: ${appLock.timeout.labelFr}. Le verrouillage protege uniquement l'interface de l'app.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(19), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                PremiumPrimaryButton("Deverrouiller", onClick = onUnlock)
            }
        }
        }
    }
}

@Composable
private fun SettingsChoiceRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(22), border = if (selected) PremiumMockupColors.Green.copy(alpha = 0.42f) else PremiumMockupColors.BorderSoft) {
        Row(Modifier.fillMaxWidth().premiumTap(onClick).padding(mockupDp(18)), verticalAlignment = Alignment.CenterVertically) {
            MockupIconTile(icon, size = mockupDp(42), tint = if (selected) PremiumMockupColors.Green else PremiumMockupColors.Cyan)
            Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(16), lineHeight = mockupSp(21), fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(17), fontWeight = FontWeight.SemiBold)
            }
            MockupSignalPill(if (selected) "Actif" else "Choisir")
        }
    }
}

@Composable
private fun MockupSettingsChoiceRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(22)) {
        Row(Modifier.fillMaxWidth().premiumTap(onClick).padding(mockupDp(18)), verticalAlignment = Alignment.CenterVertically) {
            MockupIconTile(icon, size = mockupDp(42), tint = if (selected) PremiumMockupColors.Green else PremiumMockupColors.Cyan)
            Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(16), lineHeight = mockupSp(21), fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), lineHeight = mockupSp(17), fontWeight = FontWeight.SemiBold)
            }
            MockupSignalPill(if (selected) "Actif" else "Choisir")
        }
    }
}

@Composable
fun PremiumIntegrationsListStateScreen(
    state: PremiumScreenState<PremiumConnectedSiteUiState>,
    onOpenIntegration: () -> Unit = {},
    onAddSite: () -> Unit = {}
) {
    val visualState = if (premiumDesignFixtureEnabled()) {
        PremiumScreenState.content(premiumConnectedSitePreviewState())
    } else {
        state
    }
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(24)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(14))
        ) {
            item {
                Row(Modifier.fillMaxWidth().height(mockupDp(96)), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(34)))
                    Column(Modifier.weight(1f).padding(start = mockupDp(18))) {
                        Text("Sites / Intégrations", color = PremiumMockupColors.White, fontSize = mockupSp(24), lineHeight = mockupSp(29), fontWeight = FontWeight.Black)
                        Text("Gérez vos intégrations et le statut de livraison", color = PremiumMockupColors.Muted, fontSize = mockupSp(15))
                    }
                    Icon(Icons.Default.MoreVert, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(mockupDp(30)))
                }
            }
            item {
                when (visualState) {
                    is PremiumScreenState.Content -> IntegrationListPrimaryCard(visualState.value, onOpenIntegration)
                    else -> PremiumStatePanel(visualState)
                }
            }
            item {
                Text("Statut d'intégration", color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
            }
            if (visualState is PremiumScreenState.Content) {
                items(visualState.value.developerRows.ifEmpty { visualState.value.rows }) { row ->
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
                        Row(
                            Modifier.padding(mockupDp(18)).heightIn(min = mockupDp(76)),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(mockupDp(14))
                        ) {
                            MockupIconTile(Icons.Default.Link, size = mockupDp(46), tint = PremiumMockupColors.Green)
                            Column(Modifier.weight(1f)) {
                                Text(row.first, color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
                                Text(row.second, color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(18))
                            }
                            MockupStatusChip("OK")
                        }
                    }
                }
            }
            item {
                MockupInfoBanner(
                    title = "",
                    body = "Les signaux sont envoyés pour vérification manuelle.\nLa confirmation opérationnelle dépend de la vérification.",
                    icon = Icons.Default.Info,
                    tone = PremiumMockupColors.Blue
                )
            }
            item {
                Text("Ressources développeur", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black)
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
                    Row(Modifier.padding(mockupDp(18)), verticalAlignment = Alignment.CenterVertically) {
                        MockupIconTile(Icons.Default.Description, size = mockupDp(52), tint = PremiumMockupColors.Blue)
                        Column(Modifier.weight(1f).padding(start = mockupDp(14))) {
                            Text("Guide d’intégration SDK (PDF)", color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
                            Text("Instructions complètes pour intégrer l’API et gérer les webhooks.", color = PremiumMockupColors.Muted, fontSize = mockupSp(12))
                        }
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.Muted)
                    }
                }
            }
            item {
                MockupPrimaryButton("Ajouter un site / application", onClick = onAddSite)
            }
        }
    }
}

@Composable
private fun IntegrationListPrimaryCard(
    state: PremiumConnectedSiteUiState,
    onOpenIntegration: () -> Unit
) {
    MockupGlassCard(
        Modifier.fillMaxWidth().premiumTap(onOpenIntegration),
        radius = mockupDp(18),
        border = PremiumMockupColors.Border
    ) {
        Row(
            Modifier.padding(mockupDp(20)).heightIn(min = mockupDp(106)),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(mockupDp(16))
        ) {
            MockupIconTile(Icons.Default.Public, size = mockupDp(72), tint = PremiumMockupColors.Green)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(mockupDp(4))) {
                Text(
                    state.rows.firstOrNull()?.second ?: "merchant.example",
                    color = PremiumMockupColors.White,
                    fontSize = mockupSp(18),
                    fontWeight = FontWeight.Black
                )
                Text("Environnement :  Production", color = PremiumMockupColors.Muted, fontSize = mockupSp(14))
                Text("Statut :  Actif", color = PremiumMockupColors.Green, fontSize = mockupSp(14))
                Text("Créé le :  21 mai 2025", color = PremiumMockupColors.Muted, fontSize = mockupSp(14))
            }
            Chevron()
        }
    }
}

@Composable
fun PremiumConnectedSiteStateScreen(
    state: PremiumScreenState<PremiumConnectedSiteUiState>,
    onBack: () -> Unit,
    onCreateApiKey: () -> Unit = {},
    onRotateApiKey: () -> Unit = {},
    onRotateWebhookSecret: () -> Unit = {},
    onSaveWebhookUrl: (String) -> Unit = {},
    onTestWebhook: () -> Unit = {},
    onOpenDeveloperGuide: () -> Unit = {},
    onAuthorizeCopy: (onAuthorized: () -> Unit) -> Unit = { onAuthorized -> onAuthorized() },
    onCopyDeveloperExport: (PremiumConnectedSiteUiState) -> String = { value -> value.developerExportText() }
) {
    val visualState = if (premiumDesignFixtureEnabled()) {
        PremiumScreenState.content(premiumConnectedSitePreviewState())
    } else {
        state
    }
    PremiumStandaloneStateScreen(title = "Détails intégration", onBack = onBack) {
        Column(verticalArrangement = Arrangement.spacedBy(mockupDp(14))) integrationDetailColumn@ {
            if (visualState is PremiumScreenState.Content) {
                val value = visualState.value
                var webhookUrl by remember(value.webhookUrl) { mutableStateOf(value.webhookUrl) }
                val clipboardManager = LocalClipboardManager.current
                PremiumConnectedSiteMockDetail(
                    value = value,
                    webhookUrl = webhookUrl,
                    onCopy = {
                        onAuthorizeCopy {
                            clipboardManager.setText(AnnotatedString(onCopyDeveloperExport(value)))
                        }
                    },
                    onCreateApiKey = onCreateApiKey,
                    onRotateWebhookSecret = onRotateWebhookSecret,
                    onTestWebhook = onTestWebhook,
                    onOpenDeveloperGuide = onOpenDeveloperGuide
                )
                return@integrationDetailColumn

                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(24)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                        Text("Clés API et webhook", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                        value.developerRows.forEach { row ->
                            DeveloperIntegrationValueRow(row.first, row.second)
                        }
                        OutlinedTextField(
                            value = webhookUrl,
                            onValueChange = { webhookUrl = it },
                            label = { Text("Webhook URL") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(mockupDp(18)),
                            colors = premiumMockupTextFieldColors()
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(10)), modifier = Modifier.fillMaxWidth()) {
                            MockupPrimaryButton(
                                "Enregistrer URL",
                                modifier = Modifier.weight(1f),
                                enabled = value.actionButtonsEnabled && webhookUrl.isNotBlank(),
                                onClick = { onSaveWebhookUrl(webhookUrl) }
                            )
                            MockupOutlineButton(
                                "Tester",
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled) onTestWebhook() }
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(10)), modifier = Modifier.fillMaxWidth()) {
                            MockupPrimaryButton(
                                "Créer clé API",
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled) onCreateApiKey() }
                            )
                            MockupOutlineButton(
                                "Rotation clé",
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled) onRotateApiKey() }
                            )
                        }
                        MockupOutlineButton(
                            "Rotation secret webhook",
                            onClick = { if (value.actionButtonsEnabled) onRotateWebhookSecret() }
                        )
                        MockupOutlineButton(
                            "Guide SDK (PDF)",
                            onClick = onOpenDeveloperGuide
                        )
                    }
                }

                MockupInfoBanner(
                    "Test webhook backend",
                    "Le test vérifie uniquement que votre endpoint est joignable. Il ne déclenche aucune confirmation opérationnelle.",
                    Icons.Default.Link,
                    PremiumMockupColors.Blue,
                    Modifier.fillMaxWidth()
                )

                MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(24), border = PremiumMockupColors.Blue.copy(alpha = 0.45f)) {
                    Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(8))) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("Export staging", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                            Box(
                                Modifier
                                    .size(mockupDp(38))
                                    .clip(RoundedCornerShape(mockupDp(14)))
                                    .background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(14)))
                                    .border(mockupDp(1), PremiumMockupColors.Border, RoundedCornerShape(mockupDp(14)))
                                    .premiumTap {
                                        onAuthorizeCopy {
                                            clipboardManager.setText(AnnotatedString(onCopyDeveloperExport(value)))
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copier", tint = PremiumMockupColors.Blue, modifier = Modifier.size(mockupDp(18)))
                            }
                        }
                        Text(
                            "A placer dans l'environnement de l'app externe. Android et le navigateur ne recoivent pas de secret SDK.",
                            color = PremiumMockupColors.Muted,
                            fontSize = mockupSp(12),
                            lineHeight = mockupSp(17),
                            fontWeight = FontWeight.SemiBold
                        )
                        value.exportLines.forEach { line ->
                            Text(line, color = PremiumMockupColors.Cyan, fontSize = mockupSp(11), lineHeight = mockupSp(16), fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PremiumConnectedSiteMockDetail(
    value: PremiumConnectedSiteUiState,
    webhookUrl: String,
    onCopy: () -> Unit,
    onCreateApiKey: () -> Unit,
    onRotateWebhookSecret: () -> Unit,
    onTestWebhook: () -> Unit,
    onOpenDeveloperGuide: () -> Unit
) {
    val rows = value.developerRows.ifEmpty { value.rows }
    MockupSignalPill("Integration active")
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
        Column(Modifier.padding(mockupDp(16)), verticalArrangement = Arrangement.spacedBy(mockupDp(10))) {
            Text("Clés API", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
            IntegrationDetailValueRow(
                label = rows.firstOrNull { it.first.contains("publique", true) || it.first.contains("API", true) }?.first ?: "Clé API (publique)",
                value = rows.firstOrNull { it.first.contains("publique", true) || it.first.contains("API", true) }?.second ?: "sp_live_**************abcd",
                icon = Icons.Default.ContentCopy,
                onAction = onCopy
            )
            IntegrationDetailValueRow(
                label = "Clé API (secrète)",
                value = value.merchantAuthorizationHeaderMasked.ifBlank { "sp_live_**************wxyz" },
                icon = Icons.Default.Visibility,
                onAction = onCopy
            )
            MockupInfoBanner(
                title = "",
                body = value.safeMessage.ifBlank { "Conservez votre clé secrète en sécurité.\nElle ne sera plus affichée après sa création." },
                icon = Icons.Default.Info,
                tone = PremiumMockupColors.Blue
            )
        }
    }
    Text("Webhook", color = PremiumMockupColors.White, fontSize = mockupSp(19), fontWeight = FontWeight.Black)
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
        Column(Modifier.padding(mockupDp(14)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
            Text("URL du webhook", color = PremiumMockupColors.White, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
            Row(
                Modifier.fillMaxWidth()
                    .background(PremiumMockupColors.CardStrong, RoundedCornerShape(mockupDp(10)))
                    .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(10)))
                    .padding(mockupDp(12)),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(webhookUrl.ifBlank { "https://merchant.example.com/webhook/swimpay" }, color = PremiumMockupColors.White, fontSize = mockupSp(13), modifier = Modifier.weight(1f))
                Icon(Icons.Default.ContentCopy, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(18)))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                IntegrationStatCard("Environnement", "Production", PremiumMockupColors.Green, Modifier.weight(1f))
                IntegrationStatCard("Statut", if (value.usesLiveApi) "Livre (200 OK)" else "A configurer", PremiumMockupColors.Green, Modifier.weight(1f))
            }
            IntegrationDetailValueRow(
                label = "Secret du webhook",
                value = rows.firstOrNull { it.first.contains("secret", true) }?.second ?: "whsec_************************2025",
                icon = Icons.Default.Visibility,
                onAction = onRotateWebhookSecret
            )
            MockupInfoBanner(
                title = "Route publique exacte requise",
                body = "Le webhook doit être accessible depuis nos serveurs.\nToute redirection, authentification ou route incorrecte entraînera une boucle de réessais.",
                icon = Icons.Default.Info,
                tone = PremiumMockupColors.Warning
            )
        }
    }
    Text("Statistiques de livraison (7 derniers jours)", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(mockupDp(8))) {
        IntegrationStatCard("Livrés", "98.6%", PremiumMockupColors.Green, Modifier.weight(1f))
        IntegrationStatCard("Échecs", "1.2%", PremiumMockupColors.Danger, Modifier.weight(1f))
        IntegrationStatCard("En attente", "0.2%", PremiumMockupColors.Warning, Modifier.weight(1f))
        IntegrationStatCard("Réponse", "168 ms", PremiumMockupColors.Blue, Modifier.weight(1f))
    }
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(16)) {
        Column(Modifier.padding(mockupDp(12)), verticalArrangement = Arrangement.spacedBy(mockupDp(8))) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Dernières livraisons", color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                Text("Voir tout", color = PremiumMockupColors.Green, fontSize = mockupSp(13), fontWeight = FontWeight.Black)
            }
            IntegrationDeliveryRow("21 mai 2025, 09:21:44", "payment.succeeded", "200 OK", PremiumMockupColors.Green)
            IntegrationDeliveryRow("21 mai 2025, 09:18:30", "notification.detected", "200 OK", PremiumMockupColors.Green)
            IntegrationDeliveryRow("21 mai 2025, 09:16:12", "payment.succeeded", "404 Not Found", PremiumMockupColors.Danger)
            IntegrationDeliveryRow("21 mai 2025, 09:12:05", "payment.succeeded", "200 OK", PremiumMockupColors.Green)
        }
    }
    MockupGlassCard(Modifier.fillMaxWidth().premiumTap(onTestWebhook), radius = mockupDp(12), border = PremiumMockupColors.Blue.copy(alpha = 0.72f)) {
        Row(Modifier.padding(mockupDp(14)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
            Icon(Icons.Default.Link, null, tint = PremiumMockupColors.Blue, modifier = Modifier.size(mockupDp(26)))
            Column(Modifier.weight(1f)) {
                Text("Tester le webhook", color = PremiumMockupColors.Blue, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                Text("Envoie un événement de test.", color = PremiumMockupColors.Muted, fontSize = mockupSp(12))
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(20)))
        }
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
        MockupOutlineButton("Créer clé", modifier = Modifier.weight(1f), onClick = onCreateApiKey)
        MockupOutlineButton("Guide SDK", modifier = Modifier.weight(1f), onClick = onOpenDeveloperGuide)
    }
}

@Composable
private fun IntegrationDetailValueRow(
    label: String,
    value: String,
    icon: ImageVector,
    onAction: () -> Unit
) {
    Row(
        Modifier.fillMaxWidth()
            .background(PremiumMockupColors.CardStrong, RoundedCornerShape(mockupDp(10)))
            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(10)))
            .padding(mockupDp(12)),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(mockupDp(5))) {
            Text(label, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold)
            Text(value.ifBlank { "A configurer" }, color = PremiumMockupColors.White, fontSize = mockupSp(13), fontWeight = FontWeight.Bold)
        }
        Box(
            Modifier.size(mockupDp(34))
                .background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(10)))
                .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(10)))
                .premiumTap(onAction),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(17)))
        }
    }
}

@Composable
private fun IntegrationStatCard(label: String, value: String, tone: Color, modifier: Modifier = Modifier) {
    MockupGlassCard(modifier, radius = mockupDp(10)) {
        Column(Modifier.padding(mockupDp(10)), verticalArrangement = Arrangement.spacedBy(mockupDp(4))) {
            Text(label, color = PremiumMockupColors.Muted, fontSize = mockupSp(11), fontWeight = FontWeight.SemiBold)
            Text(value, color = tone, fontSize = mockupSp(18), lineHeight = mockupSp(21), fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun IntegrationDeliveryRow(date: String, event: String, status: String, tone: Color) {
    Row(Modifier.fillMaxWidth().padding(vertical = mockupDp(5)), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Default.CheckCircle, null, tint = tone, modifier = Modifier.size(mockupDp(20)))
        Column(Modifier.weight(1f).padding(start = mockupDp(10))) {
            Text(date, color = PremiumMockupColors.Muted, fontSize = mockupSp(12), fontWeight = FontWeight.SemiBold)
            Text(event, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(11))
        }
        Text(status, color = tone, fontSize = mockupSp(12), fontWeight = FontWeight.Black)
    }
}

@Composable
private fun DeveloperIntegrationValueRow(
    label: String,
    value: String,
    highlight: Boolean = false
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(if (highlight) PremiumMockupColors.CardStrong else PremiumMockupColors.Field, RoundedCornerShape(mockupDp(16)))
            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(16)))
            .padding(mockupDp(12)),
        verticalArrangement = Arrangement.spacedBy(mockupDp(4))
    ) {
        Text(label, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(11), fontWeight = FontWeight.Black)
        Text(value.ifBlank { "À configurer" }, color = PremiumMockupColors.White, fontSize = mockupSp(13), lineHeight = mockupSp(18), fontWeight = FontWeight.Bold)
    }
}

@Composable
fun PremiumConfigurationStateScreen(
    state: PremiumScreenState<PremiumConfigurationUiState>,
    onBack: () -> Unit
) {
    PremiumStandaloneStateScreen(title = "Tests", onBack = onBack) {
        PremiumConfigurationSummary(state)
    }
}

@Composable
private fun PremiumStandaloneStateScreen(
    title: String,
    onBack: () -> Unit,
    content: @Composable () -> Unit
) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier
                .fillMaxHeight()
                .statusBarsPadding()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = mockupDp(22)),
            verticalArrangement = Arrangement.spacedBy(mockupDp(18))
        ) {
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = mockupDp(112))
                        .padding(top = mockupDp(8), bottom = mockupDp(10)),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircleAction(Icons.AutoMirrored.Filled.KeyboardArrowLeft, onClick = onBack)
                    Text(
                        title,
                        color = PremiumMockupColors.White,
                        fontSize = mockupSp(23),
                        lineHeight = mockupSp(28),
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.weight(1f).padding(start = mockupDp(12))
                    )
                }
            }
            item { content() }
        }
    }
}

private data class PremiumSettingsRow(
    val icon: ImageVector,
    val label: String,
    val onClick: (() -> Unit)? = null
)

@Composable
private fun SettingsGroup(title: String, rows: List<PremiumSettingsRow>) {
    Column(Modifier.fillMaxWidth()) {
        Text(title, color = PremiumMockupColors.Muted, fontSize = mockupSp(13), fontWeight = FontWeight.Black, letterSpacing = mockupSp(2), modifier = Modifier.padding(start = mockupDp(8), bottom = mockupDp(14)))
        MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(26)) {
            Column {
                rows.forEachIndexed { index, row ->
                    val onClick = row.onClick
                    val rowModifier = if (onClick != null) {
                        Modifier.fillMaxWidth().height(mockupDp(84)).clickable { onClick() }.padding(horizontal = mockupDp(24))
                    } else {
                        Modifier.fillMaxWidth().height(mockupDp(84)).padding(horizontal = mockupDp(24))
                    }
                    Row(rowModifier, verticalAlignment = Alignment.CenterVertically) {
                        MockupIconTile(row.icon, size = mockupDp(46), tint = PremiumMockupColors.Cyan)
                        Text(row.label, modifier = Modifier.weight(1f).padding(start = mockupDp(20)), color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = mockupSp(16))
                        if (row.onClick != null) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.MutedDark)
                        }
                    }
                    if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(mockupDp(1)).background(PremiumMockupColors.BorderSoft))
                }
            }
        }
    }
}
