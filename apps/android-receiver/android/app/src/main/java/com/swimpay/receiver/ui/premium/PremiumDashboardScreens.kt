package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swimpay.receiver.MerchantReceivingMethodDraft
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.R
import com.swimpay.receiver.ReceivingMethodType

@Composable
fun PremiumDashboardScreen(
    state: PremiumScreenState<PremiumDashboardUiState> = PremiumScreenState.content(PremiumDashboardUiState.preview())
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumDashboardContent(state.value)
        else -> PremiumStateList(state)
    }
}

@Composable
private fun PremiumDashboardContent(state: PremiumDashboardUiState) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            item {
                MockupSectionHeader(
                    title = "Accueil",
                    body = "Vue operationnelle des signaux, des revues et de l'etat local du Receiver."
                )
                MockupGlassCard(Modifier.fillMaxWidth().padding(top = 12.dp), radius = 28.dp) {
                    Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(state.readyTitle, color = PremiumMockupColors.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                        Text(state.readyText, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold)
                        MockupSignalPill("SwimPay Intelligence", Modifier.padding(top = 4.dp))
                    }
                }
            }
            if (state.backendNoticeTitle.isNotBlank()) {
                item {
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp, border = PremiumMockupColors.Warning.copy(alpha = 0.45f)) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(state.backendNoticeTitle, color = PremiumMockupColors.Warning, fontSize = 15.sp, fontWeight = FontWeight.Black)
                            Text(
                                state.backendNoticeText.ifBlank { "Les donnees seront synchronisees des que SwimPay sera connecte." },
                                color = PremiumMockupColors.Muted,
                                fontSize = 12.sp,
                                lineHeight = 17.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    state.localSystemCards.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            row.forEach { card ->
                                LocalSystemCard(card, Modifier.weight(1f))
                            }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            item { MonthlyActivityCard(state.mainMetricLabel, state.monthlyAmount, state.usesLiveApi) }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    state.metrics.chunked(2).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            row.forEach { metric ->
                                BentoMetricCard(metric.value, metric.label, metric.trend, metricIcon(metric.label), Modifier.weight(1f))
                            }
                            if (row.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            item {
                MockupGlassCard(Modifier.fillMaxWidth().height(260.dp), radius = 32.dp) {
                    Column(Modifier.padding(24.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("SIGNAUX RECENTS", color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = 15.sp)
                        }
                        Row(Modifier.fillMaxWidth().padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            ChartMetricPill("Montant", state.chartConfirmedAmountLabel, Modifier.weight(1f))
                            ChartMetricPill("Taux", state.chartConfirmationRateLabel, Modifier.weight(1f))
                        }
                        TrendLine(
                            modifier = Modifier.fillMaxWidth().height(126.dp).padding(top = 20.dp),
                            primaryValues = state.chartPoints.map { it.confirmedAmountMinor.toFloat() },
                            secondaryValues = state.chartPoints.map { it.confirmationRate.toFloat() }
                        )
                    }
                }
            }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("HISTORIQUE RECENT", color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = 16.sp)
                    Text("Voir tout", color = PremiumMockupColors.Cyan, fontWeight = FontWeight.Black, fontSize = 13.sp)
                }
            }
            if (state.recentPayments.isEmpty()) {
                item {
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
                        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(state.emptyPaymentsTitle, color = PremiumMockupColors.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                            Text("Les signaux reconnus par SwimPay apparaitront ici.", color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp)
                            state.emptyPaymentsAction?.let { Text(it, color = PremiumMockupColors.Cyan, fontSize = 12.sp, fontWeight = FontWeight.Black) }
                        }
                    }
                }
            } else {
                items(state.recentPayments) {
                    RecentPaymentRow(it.amount, it.detail)
                }
            }
        }
    }
}

@Composable
private fun ChartMetricPill(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier.height(52.dp).border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(18.dp)),
        color = PremiumMockupColors.Field,
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(Modifier.padding(horizontal = 14.dp), verticalArrangement = Arrangement.Center) {
            Text(label, color = PremiumMockupColors.MutedDark, fontSize = 10.sp, fontWeight = FontWeight.Black)
            Text(value, color = PremiumMockupColors.White, fontSize = 15.sp, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun LocalSystemCard(state: PremiumLocalSystemUiState, modifier: Modifier) {
    MockupGlassCard(modifier.height(96.dp), radius = 22.dp) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.Center) {
            Text(state.title, color = PremiumMockupColors.MutedDark, fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Black)
            Text(state.value, color = PremiumMockupColors.White, fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 4.dp))
            if (state.helper.isNotBlank()) {
                Text(state.helper, color = PremiumMockupColors.Muted, fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun PremiumStateList(state: PremiumScreenState<*>) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item { PremiumStatePanel(state) }
    }
}

@Composable
private fun MonthlyActivityCard(label: String, amount: String, usesLiveApi: Boolean) {
    MockupGlassCard(Modifier.fillMaxWidth().height(214.dp), radius = 30.dp, border = PremiumMockupColors.Cyan.copy(alpha = 0.38f)) {
        Column(Modifier.padding(26.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                MockupIconTile(Icons.Default.AccountBalanceWallet, size = 46.dp, tint = PremiumMockupColors.Cyan)
                Text("Aujourd'hui", color = PremiumMockupColors.Muted, fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
            Spacer(Modifier.height(24.dp))
            Text(label, color = PremiumMockupColors.Muted, fontSize = 15.sp, lineHeight = 19.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(6.dp))
            Text(amount, color = PremiumMockupColors.White, fontSize = 36.sp, lineHeight = 40.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(18.dp))
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
    MockupGlassCard(modifier.height(142.dp), radius = 24.dp) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.Center) {
            MockupIconTile(icon, size = 38.dp, tint = PremiumMockupColors.Cyan)
            Spacer(Modifier.height(8.dp))
            Text(value, color = PremiumMockupColors.White, fontSize = 32.sp, lineHeight = 34.sp, fontWeight = FontWeight.Black)
            Row {
                Text(label, color = PremiumMockupColors.Muted, fontSize = 11.sp, fontWeight = FontWeight.Black)
                if (trend.isNotBlank()) {
                    Text(" $trend", color = PremiumMockupColors.Green, fontSize = 11.sp, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun RecentPaymentRow(amount: String, detail: String) {
    MockupGlassCard(Modifier.fillMaxWidth().height(88.dp), radius = 24.dp) {
        Row(Modifier.padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            MockupIconTile(Icons.Default.Visibility, size = 48.dp, tint = PremiumMockupColors.Cyan)
            Column(Modifier.weight(1f).padding(start = 18.dp)) {
                Text(amount, color = PremiumMockupColors.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text(detail, color = PremiumMockupColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.MutedDark)
        }
    }
}

@Composable
private fun MockupSectionHeader(title: String, body: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text(title, color = PremiumMockupColors.White, fontSize = 24.sp, lineHeight = 29.sp, fontWeight = FontWeight.Black)
        body?.let {
            Text(it, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun MockupSignalPill(text: String, modifier: Modifier = Modifier, danger: Boolean = false) {
    val foreground = if (danger) PremiumMockupColors.Danger else PremiumMockupColors.Green
    Box(
        modifier
            .background(foreground.copy(alpha = 0.13f), RoundedCornerShape(PremiumMockupRadius.Pill))
            .border(1.dp, foreground.copy(alpha = 0.28f), RoundedCornerShape(PremiumMockupRadius.Pill))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(text, color = foreground, fontSize = 11.sp, fontWeight = FontWeight.Black)
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
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Ventes confirmées", color = PremiumColors.Ink, fontSize = 24.sp, lineHeight = 29.sp, fontWeight = FontWeight.Black)
            Text("Suivez les commandes reliées aux paiements confirmés.", color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(24.dp))
            SalesMetricCard(state.confirmedSalesCount, "VENTES CONFIRMÉES", Icons.Default.CheckCircle)
            Spacer(Modifier.height(12.dp))
            SalesMetricCard(state.confirmedAmount, "MONTANT CONFIRMÉ", Icons.Default.ShoppingCart)
            Spacer(Modifier.height(12.dp))
            SalesMetricCard(state.failedCount, "ÉCHECS", Icons.Default.Security)
            Spacer(Modifier.height(12.dp))
            SalesMetricCard(state.confirmationRate, "TAUX DE CONFIRMATION", Icons.Default.Visibility)
            Spacer(Modifier.height(18.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                StatusChip("Aujourd'hui", StatusTone.Info)
                StatusChip("7 jours", StatusTone.Neutral)
                StatusChip("30 jours", StatusTone.Neutral)
                StatusChip("Tout", StatusTone.Neutral)
            }
            Spacer(Modifier.height(24.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    placeholder = { Text("ID, Client, Montant...") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(18.dp)
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
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(top = 10.dp, start = 8.dp)
                )
            }
        }
    }
}

@Composable
private fun SalesMetricCard(value: String, label: String, icon: ImageVector) {
    Surface(
        Modifier.fillMaxWidth().height(92.dp).border(1.dp, PremiumColors.Line, RoundedCornerShape(30.dp)),
        color = PremiumColors.Surface,
        shadowElevation = 4.dp,
        shape = RoundedCornerShape(30.dp)
    ) {
        Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.size(42.dp).background(PremiumColors.IconTile, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Blue, modifier = Modifier.size(22.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(value, color = PremiumColors.Ink, fontSize = 22.sp, lineHeight = 25.sp, fontWeight = FontWeight.Black)
                Text(label, color = PremiumColors.Muted, fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun OrderCard(id: String, amount: String, status: String, helper: String) {
    Surface(
        Modifier.fillMaxWidth().height(112.dp).border(1.dp, PremiumColors.Line, RoundedCornerShape(58.dp)),
        color = PremiumColors.Surface,
        shape = RoundedCornerShape(58.dp)
    ) {
        Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(54.dp).background(PremiumColors.IconTile, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.ShoppingCart, null, tint = PremiumColors.Blue)
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(id, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                Text(helper, color = PremiumColors.Ink, fontSize = 12.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(amount, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
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
    val copy = PremiumLocalizedCopy.forLanguage(language)
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item {
                Spacer(Modifier.height(22.dp))
                Box(
                    Modifier
                        .size(108.dp)
                        .background(PremiumMockupColors.Highlight, CircleShape)
                        .border(1.dp, PremiumMockupColors.Cyan.copy(alpha = 0.35f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(merchantProfile.initials, color = PremiumMockupColors.White, fontSize = 31.sp, fontWeight = FontWeight.Black)
                }
                Text(copy.terminalTitle, color = PremiumMockupColors.White, fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 12.dp))
                Text(merchantProfile.displayName, color = PremiumMockupColors.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Text(merchantProfile.statusLabel, color = PremiumMockupColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(14.dp))
                MockupTruthBanner(Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
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
                Text("<-  ${copy.signOut}", color = PremiumMockupColors.Danger, fontSize = 12.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp, modifier = Modifier.padding(vertical = 28.dp))
            }
        }
    }
}

@Composable
fun PremiumConnectedSiteSummary(state: PremiumScreenState<PremiumConnectedSiteUiState>) {
    when (state) {
        is PremiumScreenState.Content -> PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(22.dp)) {
                Text("Integration developpeur", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text(state.value.statusTitle, color = if (state.value.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                state.value.rows.forEach { row ->
                    Text("${row.first} · ${row.second}", color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
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
        is PremiumScreenState.Content -> PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(22.dp)) {
                Text("Configuration", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text(state.value.outcomeTitle, color = if (state.value.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                Text(state.value.outcomeText, color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
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
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
            Text(status, color = PremiumMockupColors.Green, fontSize = 13.sp, fontWeight = FontWeight.Black)
            rows.take(3).forEach { row ->
                Text("${row.first} - ${row.second}", color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
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
    when (state) {
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
                    contentPadding = PaddingValues(bottom = 22.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item {
                        MockupSectionHeader(
                            title = "Moyens de reception",
                            body = "Ajoutez les cartes ou numeros que vos clients utiliseront pour vous payer."
                        )
                    Text(
                        "Les informations complètes ne sont jamais envoyées dans les webhooks.",
                            color = PremiumMockupColors.MutedDark,
                            fontSize = 12.sp,
                            lineHeight = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(top = 10.dp)
                        )
                    }
                    item {
                        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            ReceivingMethodActionButton(
                                label = "Ajouter une carte",
                                icon = Icons.Default.CreditCard,
                                onClick = { draftType = ReceivingMethodType.CARD_TRANSFER }
                            )
                            ReceivingMethodActionButton(
                                label = "Ajoutez telephone SBP",
                                sbpIcon = true,
                                onClick = { draftType = ReceivingMethodType.PHONE_TRANSFER }
                            )
                        }
                    }
                    if (draftType != null) {
                        item {
                            MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                    Text("Choisir la banque", color = PremiumMockupColors.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
                                    bankOptions.forEach { bank ->
                                        val selected = bank.bankProfileId == selectedBankId
                                        Row(Modifier.fillMaxWidth().premiumTap { selectedBankId = bank.bankProfileId }.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                                            Box(Modifier.size(26.dp).background(if (selected) PremiumMockupColors.Green else Color.Transparent, CircleShape).border(2.dp, if (selected) PremiumMockupColors.Green else PremiumMockupColors.Border, CircleShape))
                                            PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = 30.dp, modifier = Modifier.padding(start = 12.dp))
                                            Text(bank.displayName, color = PremiumMockupColors.White, fontSize = 14.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 10.dp))
                                        }
                                    }
                                    OutlinedTextField(
                                        value = identifierInput,
                                        onValueChange = { identifierInput = it },
                                label = { Text("Identifiant utilisé seulement pour l'enregistrement") },
                                placeholder = { Text(if (draftType == ReceivingMethodType.CARD_TRANSFER) "Numéro de carte" else "Numéro de téléphone") },
                                        modifier = Modifier.fillMaxWidth(),
                                        singleLine = true,
                                        shape = RoundedCornerShape(18.dp)
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
                            MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                    Text("Modifier le libelle", color = PremiumMockupColors.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
                                    Text(method.subtitle, color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold)
                                    OutlinedTextField(
                                        value = editLabel,
                                        onValueChange = { editLabel = it },
                                        label = { Text("Nom court") },
                                        modifier = Modifier.fillMaxWidth(),
                                        singleLine = true,
                                        shape = RoundedCornerShape(18.dp)
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
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
                    if (state.value.items.isEmpty()) {
                        item {
                            MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
                                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Aucun moyen de reception", color = PremiumMockupColors.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                                    Text("Ajoutez une carte ou un telephone SBP pour commencer.", color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp)
                                }
                            }
                        }
                    }
                    items(state.value.items) { method ->
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
        else -> PremiumStateList(state)
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
            .height(76.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(PremiumMockupColors.Card, RoundedCornerShape(24.dp))
            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(24.dp))
            .premiumTap(onClick)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(48.dp)
                .background(PremiumMockupColors.Green.copy(alpha = 0.14f), RoundedCornerShape(18.dp))
                .border(1.dp, PremiumMockupColors.Green.copy(alpha = 0.24f), RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (sbpIcon) {
                Text("SBP", color = PremiumMockupColors.Green, fontSize = 12.sp, fontWeight = FontWeight.Black)
            } else if (icon != null) {
                Icon(icon, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(25.dp))
            }
        }
        Text(
            label,
            color = PremiumMockupColors.White,
            fontSize = 15.sp,
            lineHeight = 19.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier
                .weight(1f)
                .padding(start = 14.dp)
        )
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = PremiumMockupColors.MutedDark,
            modifier = Modifier.size(22.dp)
        )
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
    size: Dp = 46.dp,
    modifier: Modifier = Modifier
) {
    Box(
        modifier
            .size(size)
            .background(PremiumColors.SurfaceAlt, RoundedCornerShape(size / 3f))
            .border(1.dp, PremiumColors.Line, RoundedCornerShape(size / 3f))
            .padding(6.dp),
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
            Text(displayName.take(1), color = PremiumColors.Blue, fontWeight = FontWeight.Black)
        }
    }
}

@Composable
private fun PremiumReceivingMethodRow(
    method: PremiumReceivingMethodUiItem,
    onEdit: () -> Unit,
    onDisable: () -> Unit,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp) {
        Row(Modifier.padding(22.dp), verticalAlignment = Alignment.Top) {
            val bankProfileId = bankProfileIdFromDisplay(method.subtitle)
            if (bankProfileId != null) {
                PremiumBankLogo(bankProfileId = bankProfileId, displayName = method.subtitle, size = 44.dp)
            }
            Column(Modifier.weight(1f).padding(start = if (bankProfileId != null) 14.dp else 0.dp)) {
                Text(method.title, color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text(method.subtitle, color = PremiumMockupColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
                method.helper?.let {
                    Text(it, color = PremiumMockupColors.MutedDark, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                }
                MockupSignalPill(method.status, Modifier.padding(top = 10.dp), danger = !method.enabled)
                Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        ReceivingMethodMutationButton("Modifier", Icons.Default.Edit, Modifier.weight(1f), onEdit)
                        if (method.enabled) {
                            ReceivingMethodMutationButton("Désactiver", Icons.Default.Block, Modifier.weight(1f), onDisable)
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        if (!method.recommended) {
                            ReceivingMethodMutationButton("Défaut", Icons.Default.Star, Modifier.weight(1f), onSetDefault)
                        }
                        ReceivingMethodMutationButton("Supprimer", Icons.Default.Delete, Modifier.weight(1f), onDelete, destructive = true)
                    }
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
            .height(42.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(PremiumMockupColors.Field, RoundedCornerShape(16.dp))
            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(16.dp))
            .premiumTap(onClick)
            .padding(horizontal = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(icon, null, tint = mockupForeground, modifier = Modifier.size(16.dp))
        Text(label, color = mockupForeground, fontWeight = FontWeight.Black, fontSize = 11.sp, modifier = Modifier.padding(start = 6.dp))
    }
}

@Composable
fun PremiumBanksStateScreen(state: PremiumScreenState<PremiumBanksUiState>) {
    when (state) {
        is PremiumScreenState.Content -> LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 34.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Recherche des banques compatibles", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text("SwimPay vérifie uniquement les banques compatibles sur ce téléphone.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
            }
            items(state.value.items) { bank ->
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName)
                            Column(Modifier.weight(1f).padding(start = 16.dp)) {
                                Text(bank.displayName, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
                                Text(bank.helper, color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
                            }
                            StatusChip(bank.status, if (bank.enabled) StatusTone.Success else if (bank.canActivate) StatusTone.Info else StatusTone.Neutral)
                        }
                        if (bank.canActivate && !bank.enabled) {
                            Text("Activer cette banque", color = PremiumColors.Blue, fontSize = 12.sp, fontWeight = FontWeight.Black)
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
    when (state) {
        is PremiumScreenState.Content -> MockupScreenBackground(Modifier.fillMaxSize()) {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
                contentPadding = PaddingValues(bottom = 34.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    MockupSectionHeader(
                        title = "Telephone Receiver",
                        body = "Ce telephone capture, filtre, redacte et envoie les signaux autorises. Le backend decide."
                    )
                }
                item {
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = 26.dp, border = PremiumMockupColors.Cyan.copy(alpha = 0.35f)) {
                        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                MockupIconTile(Icons.Default.PhoneAndroid, size = 52.dp, tint = PremiumMockupColors.Cyan)
                                Column(Modifier.weight(1f)) {
                                    Text(state.value.statusTitle, color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = 20.sp)
                                    Text(state.value.statusText, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp))
                                }
                            }
                            if (state.value.rows.any { it.first == "Accès notifications" && it.second == "Action requise" }) {
                                MockupOutlineButton("Reactiver l'acces", onClick = onOpenNotificationSettings)
                            }
                        }
                    }
                }
                items(state.value.rows) { row ->
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = 20.dp) {
                        Row(Modifier.padding(18.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(row.first, modifier = Modifier.weight(1f), color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold)
                            Text(row.second, color = PremiumMockupColors.White, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }
                items(state.value.notices) {
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = 18.dp, border = PremiumMockupColors.BorderSoft) {
                        Text(it, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(16.dp))
                    }
                }
            }
        }
        else -> PremiumStateList(state)
    }
}

@Composable
fun PremiumConfirmationModeScreen() {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Mode de confirmation", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Choisissez le niveau d'aide pour vérifier vos paiements.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = PremiumColors.PanelTint) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Mode manuel V1", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("Chaque paiement doit être confirmé par vous.", color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip("Confirmation manuelle", StatusTone.Success)
                }
            }
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Assistance de revue", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("SwimPay prépare les indices, vous décidez.", color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip("Lecture seule", StatusTone.Neutral)
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
    onGoogleAccountLink: () -> Unit = {}
) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 34.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                MockupSectionHeader(
                    title = "Securite",
                    body = "Liez Google pour retrouver le compte, puis protegez l'acces a l'app."
                )
            }
            item { GoogleAccountLinkRow(googleAccountLinked, onGoogleAccountLink) }
            item {
                MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
                    Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                        MockupIconTile(Icons.Default.Security, size = 42.dp, tint = PremiumMockupColors.Cyan)
                        Column(Modifier.weight(1f).padding(start = 14.dp)) {
                            Text("Verrouillage de l'app", color = PremiumMockupColors.White, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Black)
                            Text("La securite du telephone protege uniquement l'interface. Le Receiver continue en arriere-plan.", color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
                        }
                        Switch(checked = appLock.enabled, onCheckedChange = onToggleAppLock)
                    }
                }
            }
            if (appLock.enabled) {
                items(PremiumLockTimeout.entries) { timeout ->
                    MockupSettingsChoiceRow(Icons.Default.Security, timeout.labelFr, if (timeout == appLock.timeout) "Delai actif" else "Utiliser ce delai", timeout == appLock.timeout) {
                        onTimeoutSelected(timeout)
                    }
                }
            }
        }
    }
}
@Composable
private fun GoogleAccountLinkRow(linked: Boolean, onClick: () -> Unit) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
        Row(
            Modifier.fillMaxWidth().premiumTap(onClick).padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(42.dp).background(PremiumMockupColors.Field, RoundedCornerShape(15.dp)).border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                PremiumGoogleIcon()
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(if (linked) "Compte Google lie" else "Lier le compte Google", color = PremiumMockupColors.White, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Black)
                Text("Sauvegarde ce profil marchand pour une future reconnexion avec Google.", color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
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
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(if (language == PremiumLanguageOption.EN) "Help center" else "Centre d'aide", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Aide courte, sure et compatible avec la verite produit V1.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text("Rechercher") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
            )
        }
        items(filtered) { topic ->
            PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(topic.first, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Black)
                    Text(topic.second, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        if (filtered.isEmpty()) {
            item { PremiumStatePanel(PremiumScreenState.empty<Unit>("Aucun resultat", "Essayez un autre mot-cle.")) }
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
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Contacter le support", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Envoyez une demande sans notification brute, secret, numero complet, PIN, CVV ou code SMS.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumSupportCategory.entries.forEach { item ->
                        SettingsChoiceRow(Icons.Default.Description, item.labelFr, item.wireValue, item == category) {
                            category = item
                        }
                    }
                    OutlinedTextField(value = subject, onValueChange = { subject = it }, label = { Text("Sujet") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text("Message") }, minLines = 4, modifier = Modifier.fillMaxWidth())
                    validation?.let { Text(it, color = PremiumColors.Danger, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
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

@Composable
fun PremiumLanguageScreen(selected: PremiumLanguageOption, onSelect: (PremiumLanguageOption) -> Unit) {
    val copy = PremiumLocalizedCopy.forLanguage(selected)
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(copy.language, color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text(copy.languageBody, color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        items(PremiumLanguageOption.entries) { language ->
            SettingsChoiceRow(Icons.Default.Language, language.displayLabel, language.tag.uppercase(), language == selected) {
                onSelect(language)
            }
        }
    }
}

@Composable
fun PremiumAppearanceScreen(selected: PremiumThemeMode, onSelect: (PremiumThemeMode) -> Unit) {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Apparence", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Le changement est applique immediatement a l'interface.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        items(PremiumThemeMode.entries) { mode ->
            SettingsChoiceRow(if (mode == PremiumThemeMode.DARK) Icons.Default.DarkMode else Icons.Default.Palette, mode.labelFr, mode.wireValue, mode == selected) {
                onSelect(mode)
            }
        }
    }
}

@Composable
fun PremiumUnlockRequiredScreen(
    appLock: PremiumAppLockSettings,
    onUnlock: () -> Unit
) {
    Box(Modifier.fillMaxSize().background(PremiumColors.Background).padding(28.dp), contentAlignment = Alignment.Center) {
        PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Icon(Icons.Default.Security, null, tint = PremiumColors.Blue, modifier = Modifier.size(36.dp))
                Text("SwimPay verrouille", color = PremiumColors.Ink, fontSize = 22.sp, fontWeight = FontWeight.Black)
                Text("Delai: ${appLock.timeout.labelFr}. Le verrouillage protege uniquement l'interface de l'app.", color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                PremiumPrimaryButton("Deverrouiller", onClick = onUnlock)
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
    PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
        Row(Modifier.fillMaxWidth().premiumTap(onClick).padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Blue)
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(title, color = PremiumColors.Ink, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
            }
            StatusChip(if (selected) "Actif" else "Choisir", if (selected) StatusTone.Success else StatusTone.Neutral)
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
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
        Row(Modifier.fillMaxWidth().premiumTap(onClick).padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            MockupIconTile(icon, size = 42.dp, tint = if (selected) PremiumMockupColors.Green else PremiumMockupColors.Cyan)
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(title, color = PremiumMockupColors.White, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Sites / Intégrations",
                        color = PremiumMockupColors.White,
                        fontSize = 26.sp,
                        lineHeight = 31.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.weight(1f)
                    )
                    CircleAction(Icons.Default.Link, onClick = onAddSite)
                }
                Text(
                    "Gérez vos intégrations et le statut de livraison",
                    color = PremiumMockupColors.Muted,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
            item {
                when (state) {
                    is PremiumScreenState.Content -> IntegrationListPrimaryCard(state.value, onOpenIntegration)
                    else -> PremiumStatePanel(state)
                }
            }
            item {
                Text("Statut d'intégration", color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
            }
            if (state is PremiumScreenState.Content) {
                items(state.value.developerRows.ifEmpty { state.value.rows }) { row ->
                    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp) {
                        Row(
                            Modifier.padding(18.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            MockupIconTile(Icons.Default.Link, size = 46.dp, tint = PremiumMockupColors.Green)
                            Column(Modifier.weight(1f)) {
                                Text(row.first, color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
                                Text(row.second, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp)
                            }
                            MockupStatusChip("OK")
                        }
                    }
                }
            }
            item {
                MockupInfoBanner(
                    title = "Ressources développeur",
                    body = "Guide d'intégration SDK et paramètres webhook.",
                    icon = Icons.Default.Description,
                    tone = PremiumMockupColors.Blue
                )
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
        radius = 24.dp,
        border = PremiumMockupColors.Border
    ) {
        Row(
            Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            MockupIconTile(Icons.Default.Link, size = 58.dp, tint = PremiumMockupColors.Green)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    state.rows.firstOrNull()?.second ?: "merchant.example",
                    color = PremiumMockupColors.White,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
                MockupStatusChip(if (state.usesLiveApi) "Actif" else "À configurer")
                Text(state.statusText, color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 17.sp)
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
    PremiumStandaloneStateScreen(title = "Sites / Intégrations", onBack = onBack) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            PremiumConnectedSiteSummary(state)
            if (state is PremiumScreenState.Content) {
                val value = state.value
                var webhookUrl by remember(value.webhookUrl) { mutableStateOf(value.webhookUrl) }
                val clipboardManager = LocalClipboardManager.current

                MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Clés API et webhook", color = PremiumMockupColors.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        value.developerRows.forEach { row ->
                            DeveloperIntegrationValueRow(row.first, row.second)
                        }
                        OutlinedTextField(
                            value = webhookUrl,
                            onValueChange = { webhookUrl = it },
                            label = { Text("Webhook URL") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
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
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
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

                MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp, border = PremiumMockupColors.Blue.copy(alpha = 0.45f)) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text("Export staging", color = PremiumMockupColors.White, fontSize = 16.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                            Box(
                                Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(PremiumMockupColors.Field, RoundedCornerShape(14.dp))
                                    .border(1.dp, PremiumMockupColors.Border, RoundedCornerShape(14.dp))
                                    .premiumTap {
                                        onAuthorizeCopy {
                                            clipboardManager.setText(AnnotatedString(onCopyDeveloperExport(value)))
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copier", tint = PremiumMockupColors.Blue, modifier = Modifier.size(18.dp))
                            }
                        }
                        Text(
                            "A placer dans l'environnement de l'app externe. Android et le navigateur ne recoivent pas de secret SDK.",
                            color = PremiumMockupColors.Muted,
                            fontSize = 12.sp,
                            lineHeight = 17.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        value.exportLines.forEach { line ->
                            Text(line, color = PremiumMockupColors.Cyan, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
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
            .background(if (highlight) PremiumMockupColors.CardStrong else PremiumMockupColors.Field, RoundedCornerShape(16.dp))
            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(16.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(label, color = PremiumMockupColors.MutedDark, fontSize = 11.sp, fontWeight = FontWeight.Black)
        Text(value.ifBlank { "À configurer" }, color = PremiumMockupColors.White, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold)
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
            contentPadding = PaddingValues(bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 96.dp)
                        .padding(top = 8.dp, bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircleAction(Icons.AutoMirrored.Filled.KeyboardArrowLeft, onClick = onBack)
                    Text(
                        title,
                        color = PremiumMockupColors.White,
                        fontSize = 23.sp,
                        lineHeight = 28.sp,
                        fontWeight = FontWeight.Black,
                        modifier = Modifier.weight(1f).padding(start = 12.dp)
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
        Text(title, color = PremiumMockupColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp, modifier = Modifier.padding(start = 8.dp, bottom = 14.dp))
        MockupGlassCard(Modifier.fillMaxWidth(), radius = 26.dp) {
            Column {
                rows.forEachIndexed { index, row ->
                    val onClick = row.onClick
                    val rowModifier = if (onClick != null) {
                        Modifier.fillMaxWidth().height(84.dp).clickable { onClick() }.padding(horizontal = 24.dp)
                    } else {
                        Modifier.fillMaxWidth().height(84.dp).padding(horizontal = 24.dp)
                    }
                    Row(rowModifier, verticalAlignment = Alignment.CenterVertically) {
                        MockupIconTile(row.icon, size = 46.dp, tint = PremiumMockupColors.Cyan)
                        Text(row.label, modifier = Modifier.weight(1f).padding(start = 20.dp), color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = 16.sp)
                        if (row.onClick != null) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumMockupColors.MutedDark)
                        }
                    }
                    if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumMockupColors.BorderSoft))
                }
            }
        }
    }
}
