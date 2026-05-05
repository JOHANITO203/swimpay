package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumDashboardScreen(state: PremiumDashboardUiState = PremiumDashboardUiState.preview()) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item { MonthlyActivityCard(state.monthlyAmount, state.usesLiveApi) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                val first = state.metrics.getOrElse(0) { PremiumMetricUiState("0", "À VÉRIFIER") }
                val second = state.metrics.getOrElse(1) { PremiumMetricUiState("0", "VALIDÉS") }
                BentoMetricCard(first.value, first.label, first.trend, Icons.Default.Visibility, Modifier.weight(1f))
                BentoMetricCard(second.value, second.label, second.trend, Icons.Default.CheckCircle, Modifier.weight(1f))
            }
        }
        item {
            PremiumCard(Modifier.fillMaxWidth().height(260.dp), radius = 70.dp) {
                Column(Modifier.padding(30.dp)) {
                    Text("TENDANCES DES PAIEMENTS", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 15.sp)
                    TrendLine(Modifier.fillMaxWidth().height(170.dp).padding(top = 24.dp))
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("PAIEMENTS RÉCENTS", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                Text("Voir tout", color = PremiumColors.Blue, fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
        }
        items(state.recentPayments) {
            RecentPaymentRow(it.amount, it.detail)
        }
    }
}

@Composable
private fun MonthlyActivityCard(amount: String, usesLiveApi: Boolean) {
    PremiumGradientPanel(
        Modifier.fillMaxWidth().height(214.dp),
        radius = 42.dp
    ) {
        Column(Modifier.padding(26.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                StatusChip("↗ Activité Mensuelle", StatusTone.Neutral)
                Text(if (usesLiveApi) "LIVE FEED" else "DEV FEED", color = Color.White.copy(alpha = 0.72f), fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
            Spacer(Modifier.height(30.dp))
            Text(amount, color = Color.White, fontSize = 36.sp, lineHeight = 40.sp, fontWeight = FontWeight.Black)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("+12.5%", color = Color(0xFF48FF9B), fontWeight = FontWeight.Black, fontSize = 13.sp)
                Text("  vs mois précédent", color = Color.White.copy(alpha = 0.72f), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
            Spacer(Modifier.height(20.dp))
            Box(Modifier.fillMaxWidth().height(6.dp).background(Color.White.copy(alpha = 0.22f), CircleShape)) {
                Box(Modifier.fillMaxWidth(0.68f).fillMaxHeight().background(Color.White.copy(alpha = 0.82f), CircleShape))
            }
        }
    }
}

@Composable
private fun BentoMetricCard(value: String, label: String, trend: String, icon: ImageVector, modifier: Modifier) {
    Surface(
        modifier.height(142.dp).border(1.dp, PremiumColors.Line, RoundedCornerShape(34.dp)),
        color = PremiumColors.Surface,
        shadowElevation = 6.dp,
        shape = RoundedCornerShape(34.dp)
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.Center) {
            Box(Modifier.size(38.dp).background(Color(0xFFEAF3FF), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Blue, modifier = Modifier.size(21.dp))
            }
            Spacer(Modifier.height(8.dp))
            Text(value, color = PremiumColors.Ink, fontSize = 32.sp, lineHeight = 34.sp, fontWeight = FontWeight.Black)
            Row {
                Text(label, color = PremiumColors.Ink, fontSize = 11.sp, fontWeight = FontWeight.Black)
                if (trend.isNotBlank()) {
                    Text(" $trend", color = PremiumColors.Success, fontSize = 11.sp, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun RecentPaymentRow(amount: String, detail: String) {
    Surface(
        Modifier.fillMaxWidth().height(88.dp).border(1.dp, PremiumColors.Line, RoundedCornerShape(32.dp)),
        color = PremiumColors.Surface,
        shadowElevation = 3.dp,
        shape = RoundedCornerShape(32.dp)
    ) {
        Row(Modifier.padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(18.dp)).border(1.dp, PremiumColors.Line, RoundedCornerShape(18.dp)))
            Column(Modifier.weight(1f).padding(start = 18.dp)) {
                Text(amount, color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text(detail, color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
            Chevron()
        }
    }
}

@Composable
fun PremiumOrdersScreen() {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Historique des transactions e-commerce synchronisées.", color = PremiumColors.Ink, fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black)
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
        items(listOf("ord_123" to "58,41 ₽" to "VALIDÉ", "ord_124" to "129,00 ₽" to "EN ATTENTE")) { row ->
            OrderCard(row.first.first, row.first.second, row.second)
        }
    }
}

@Composable
private fun OrderCard(id: String, amount: String, status: String) {
    Surface(
        Modifier.fillMaxWidth().height(112.dp).border(1.dp, PremiumColors.Line, RoundedCornerShape(58.dp)),
        color = PremiumColors.Surface,
        shape = RoundedCornerShape(58.dp)
    ) {
        Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(54.dp).background(Color(0xFFF3F6FF), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.ShoppingCart, null, tint = PremiumColors.Blue)
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(id, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                Text("Client #12 · Aujourd'hui, 14:20", color = PremiumColors.Ink, fontSize = 12.sp)
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
    connectedSite: PremiumConnectedSiteUiState = PremiumConnectedSiteUiState.preview(),
    configuration: PremiumConfigurationUiState = PremiumConfigurationUiState.preview()
) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Spacer(Modifier.height(22.dp))
            Box(Modifier.size(108.dp).background(PremiumColors.Blue, CircleShape), contentAlignment = Alignment.Center) {
                Text("JD", color = PremiumColors.Surface, fontSize = 31.sp, fontWeight = FontWeight.Black)
            }
            Text("Terminal Marchand", color = PremiumColors.Ink, fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 12.dp))
            Text("UID: #7114-4466-8301", color = PremiumColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(24.dp))
        }
        item { PremiumConnectedSiteSummary(connectedSite) }
        item { PremiumConfigurationSummary(configuration) }
        item {
            SettingsGroup("INFRASTRUCTURE", listOf(
                Icons.Default.PhoneAndroid to "Paramètres Android",
                Icons.Default.CreditCard to "Canaux de Paiement",
                Icons.Default.AccountBalance to "Comptes Bancaires",
                Icons.Default.Link to "Développeur & API"
            ))
        }
        item {
            SettingsGroup("SUPPORT & SÉCURITÉ", listOf(
                Icons.Default.Security to "Centre de Sécurité",
                Icons.AutoMirrored.Filled.Help to "Aide & Assistance",
                Icons.Default.Description to "Conditions Générales"
            ))
        }
        item {
            Text("↪  SE DÉCONNECTER", color = Color(0xFFE38A83), fontSize = 12.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp, modifier = Modifier.padding(vertical = 28.dp))
        }
    }
}

@Composable
fun PremiumConnectedSiteSummary(state: PremiumConnectedSiteUiState) {
    PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
        Column(Modifier.padding(22.dp)) {
            Text("Site ou application connecté", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
            Text(state.statusTitle, color = if (state.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            state.rows.forEach { row ->
                Text("${row.first} · ${row.second}", color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
            }
        }
    }
}

@Composable
fun PremiumConfigurationSummary(state: PremiumConfigurationUiState) {
    PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
        Column(Modifier.padding(22.dp)) {
            Text("Configuration", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
            Text(state.outcomeTitle, color = if (state.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
            Text(state.outcomeText, color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
        }
    }
}

@Composable
fun PremiumConnectedSiteStateScreen(
    state: PremiumConnectedSiteUiState,
    onBack: () -> Unit
) {
    PremiumStandaloneStateScreen(
        title = "Site ou application connecté",
        onBack = onBack
    ) {
        PremiumConnectedSiteSummary(state)
    }
}

@Composable
fun PremiumConfigurationStateScreen(
    state: PremiumConfigurationUiState,
    onBack: () -> Unit
) {
    PremiumStandaloneStateScreen(
        title = "Tests",
        onBack = onBack
    ) {
        PremiumConfigurationSummary(state)
    }
}

@Composable
private fun PremiumStandaloneStateScreen(
    title: String,
    onBack: () -> Unit,
    content: @Composable () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth().height(64.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleAction(Icons.AutoMirrored.Filled.KeyboardArrowLeft, onClick = onBack)
                Text(title, color = PremiumColors.Ink, fontSize = 23.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(start = 12.dp))
            }
        }
        item { content() }
    }
}

@Composable
private fun SettingsGroup(title: String, rows: List<Pair<ImageVector, String>>) {
    Column(Modifier.fillMaxWidth()) {
        Text(title, color = PremiumColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp, modifier = Modifier.padding(start = 8.dp, bottom = 14.dp))
        Surface(Modifier.fillMaxWidth().border(1.dp, PremiumColors.Line, RoundedCornerShape(58.dp)), color = PremiumColors.Surface, shape = RoundedCornerShape(58.dp)) {
            Column {
                rows.forEachIndexed { index, row ->
                    Row(Modifier.fillMaxWidth().height(84.dp).padding(horizontal = 24.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(46.dp).background(Color(0xFFF3F4F6), RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                            Icon(row.first, null, tint = Color(0xFF555555))
                        }
                        Text(row.second, modifier = Modifier.weight(1f).padding(start = 28.dp), color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Color(0xFFD0D0D0))
                    }
                    if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
                }
            }
        }
    }
}
