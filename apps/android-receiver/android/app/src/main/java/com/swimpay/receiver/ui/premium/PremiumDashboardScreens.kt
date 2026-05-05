package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
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
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            Text("Accueil", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            PremiumCard(Modifier.fillMaxWidth().padding(top = 12.dp), radius = 32.dp, color = Color(0xFFF7FDFF)) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(state.readyTitle, color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text(state.readyText, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip("SwimPay Intelligence", StatusTone.Info, Modifier.padding(top = 4.dp))
                    Text("Téléphone connecté · Notifications activées", color = PremiumColors.Ink, fontSize = 12.sp, fontWeight = FontWeight.Black)
                    Text("Dernière activité : il y a 12 s", color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
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
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                BentoMetricCard("0", "REJETÉS", "", Icons.Default.Security, Modifier.weight(1f))
                BentoMetricCard("5", "BANQUES ACTIVES", "", Icons.Default.AccountBalance, Modifier.weight(1f))
            }
        }
        item {
            PremiumCard(Modifier.fillMaxWidth().height(260.dp), radius = 70.dp) {
                Column(Modifier.padding(30.dp)) {
                    Text("PAIEMENTS CONFIRMÉS", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 15.sp)
                    TrendLine(Modifier.fillMaxWidth().height(170.dp).padding(top = 24.dp))
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("HISTORIQUE RÉCENT", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                Text("Voir tout", color = PremiumColors.Blue, fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
        }
        items(state.recentPayments) {
            RecentPaymentRow(it.amount, it.detail)
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
private fun MonthlyActivityCard(amount: String, usesLiveApi: Boolean) {
    PremiumGradientPanel(Modifier.fillMaxWidth().height(214.dp), radius = 42.dp) {
        Column(Modifier.padding(26.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                StatusChip("Paiements suivis", StatusTone.Neutral)
                Text("Aujourd'hui", color = Color.White.copy(alpha = 0.72f), fontWeight = FontWeight.Black, fontSize = 13.sp)
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
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Ventes confirmées", color = PremiumColors.Ink, fontSize = 24.sp, lineHeight = 29.sp, fontWeight = FontWeight.Black)
            Text("Suivez les commandes reliées aux paiements confirmés.", color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                BentoMetricCard("24", "CONFIRMÉES", "", Icons.Default.CheckCircle, Modifier.weight(1f))
                BentoMetricCard("1 482 000 ₽", "MONTANT CONFIRMÉ", "", Icons.Default.ShoppingCart, Modifier.weight(1f))
            }
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                BentoMetricCard("0", "ÉCHECS", "", Icons.Default.Security, Modifier.weight(1f))
                BentoMetricCard("98%", "TAUX DE CONFIRMATION", "", Icons.Default.Visibility, Modifier.weight(1f))
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
            Box(Modifier.size(54.dp).background(Color(0xFFF3F6FF), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
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
    onNavigate: (PremiumRoute) -> Unit = {}
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
            SettingsGroup("PAIEMENTS", listOf(
                PremiumSettingsRow(Icons.Default.AccountBalance, "Banques") { onNavigate(PremiumNavigation.openBanks()) },
                PremiumSettingsRow(Icons.Default.CreditCard, "Moyens de réception") { onNavigate(PremiumNavigation.openReceivingMethods()) },
                PremiumSettingsRow(Icons.Default.CheckCircle, "Mode de confirmation") { onNavigate(PremiumNavigation.openConfirmationMode()) }
            ))
        }
        item {
            SettingsGroup("BUSINESS", listOf(
                PremiumSettingsRow(Icons.Default.Link, "Site ou application") { onNavigate(PremiumNavigation.openConnectedSite()) },
                PremiumSettingsRow(Icons.Default.ShoppingCart, "Ventes") { onNavigate(PremiumRoute.Main(PremiumMainTab.Orders)) },
                PremiumSettingsRow(Icons.Default.PhoneAndroid, "Notifications") { onNavigate(PremiumNavigation.openReceiverHealth()) }
            ))
        }
        item {
            SettingsGroup("APPLICATION", listOf(
                PremiumSettingsRow(Icons.Default.Visibility, "Apparence"),
                PremiumSettingsRow(Icons.Default.Description, "Langue"),
                PremiumSettingsRow(Icons.Default.Security, "Sécurité") { onNavigate(PremiumNavigation.openSecurity()) }
            ))
        }
        item {
            SettingsGroup("AIDE", listOf(
                PremiumSettingsRow(Icons.AutoMirrored.Filled.Help, "Centre d’aide"),
                PremiumSettingsRow(Icons.Default.Description, "Contacter le support")
            ))
        }
        item {
            Text("↪  SE DÉCONNECTER", color = Color(0xFFE38A83), fontSize = 12.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp, modifier = Modifier.padding(vertical = 28.dp))
        }
    }
}

@Composable
fun PremiumConnectedSiteSummary(state: PremiumScreenState<PremiumConnectedSiteUiState>) {
    when (state) {
        is PremiumScreenState.Content -> PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(22.dp)) {
                Text("Site ou application connecté", color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
                Text(state.value.statusTitle, color = if (state.value.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Black, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                state.value.rows.forEach { row ->
                    Text("${row.first} · ${row.second}", color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
        else -> PremiumStatePanel(state)
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

@Composable
fun PremiumReceivingMethodsStateScreen(state: PremiumScreenState<PremiumReceivingMethodsUiState>) {
    when (state) {
        is PremiumScreenState.Content -> LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Moyens de réception", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text("Ajoutez les cartes ou numéros que vos clients utiliseront pour vous payer.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
            }
            items(state.value.items) { method ->
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                    Column(Modifier.padding(22.dp)) {
                        Text(method.title, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
                        Text(method.subtitle, color = PremiumColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
                        method.helper?.let {
                            Text(it, color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                        }
                        StatusChip(method.status, if (method.enabled) StatusTone.Success else StatusTone.Neutral, Modifier.padding(top = 10.dp))
                        Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            method.actions.forEach {
                                Text(it, color = PremiumColors.Blue, fontWeight = FontWeight.Black, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
        else -> PremiumStateList(state)
    }
}

@Composable
fun PremiumBanksStateScreen(state: PremiumScreenState<PremiumBanksUiState>) {
    when (state) {
        is PremiumScreenState.Content -> LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Recherche des banques compatibles", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text("SwimPay recherche uniquement les banques compatibles.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
            }
            items(state.value.items) { bank ->
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                    Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(46.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                            Text(bank.displayName.take(1), color = PremiumColors.Blue, fontWeight = FontWeight.Black)
                        }
                        Column(Modifier.weight(1f).padding(start = 16.dp)) {
                            Text(bank.displayName, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 18.sp)
                            Text("${bank.displayName} ${bank.status.lowercase()}", color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            if (bank.canActivate && !bank.enabled) {
                                Text("Activer", color = PremiumColors.Blue, fontSize = 12.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 6.dp))
                            }
                        }
                        StatusChip(bank.status, if (bank.enabled) StatusTone.Success else StatusTone.Warning)
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
        is PremiumScreenState.Content -> LazyColumn(
            Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text("Téléphone Receiver", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
                Text("Ce téléphone permet à SwimPay de détecter les paiements reçus.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
            }
            item {
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                    Column(Modifier.padding(22.dp)) {
                        Text(state.value.statusTitle, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 20.sp)
                        Text(state.value.statusText, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp))
                        if (state.value.rows.any { it.first == "Accès notifications" && it.second == "Action requise" }) {
                            Text("RÉACTIVER L'ACCÈS", color = PremiumColors.Blue, fontWeight = FontWeight.Black, fontSize = 12.sp, modifier = Modifier.padding(top = 14.dp).clickable { onOpenNotificationSettings() })
                        }
                    }
                }
            }
            items(state.value.rows) { row ->
                PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                    Row(Modifier.padding(18.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(row.first, color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Text(row.second, color = PremiumColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.Black)
                    }
                }
            }
            items(state.value.notices) {
                Text(it, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 18.sp)
            }
        }
        else -> PremiumStateList(state)
    }
}

@Composable
fun PremiumConfirmationModeScreen() {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Mode de confirmation", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Choisissez le niveau d'aide pour vérifier vos paiements.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = Color(0xFFF7FDFF)) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Manuel — Activé", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("Chaque paiement doit être confirmé par vous.", color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip("Validation manuelle", StatusTone.Success)
                }
            }
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Assisté — Disponible", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("SwimPay prépare les indices, vous décidez.", color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip("Disponible", StatusTone.Info)
                }
            }
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("IA — Verrouillé", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                    Text("IA en apprentissage", color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text("7 / 10 paiements confirmés", color = PremiumColors.Ink, fontSize = 14.sp, fontWeight = FontWeight.Black)
                    StatusChip("Activer la confirmation IA", StatusTone.Neutral)
                }
            }
        }
    }
}

@Composable
fun PremiumSecurityScreen() {
    val rows = listOf(
        "Code d’accès",
        "Mot de passe",
        "Code PIN",
        "Biométrie",
        "Empreinte",
        "Reconnaissance faciale",
        "Verrouillage automatique",
        "Sessions connectées"
    )
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text("Sécurité", color = PremiumColors.Ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
            Text("Protégez l’accès à votre terminal marchand.", color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        items(rows) { label ->
            PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Security, null, tint = PremiumColors.Blue)
                    }
                    Text(label, modifier = Modifier.weight(1f).padding(start = 14.dp), color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Black)
                    StatusChip("À configurer", StatusTone.Neutral)
                }
            }
        }
    }
}

@Composable
fun PremiumConnectedSiteStateScreen(
    state: PremiumScreenState<PremiumConnectedSiteUiState>,
    onBack: () -> Unit
) {
    PremiumStandaloneStateScreen(title = "Site ou application connecté", onBack = onBack) {
        PremiumConnectedSiteSummary(state)
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

private data class PremiumSettingsRow(
    val icon: ImageVector,
    val label: String,
    val onClick: (() -> Unit)? = null
)

@Composable
private fun SettingsGroup(title: String, rows: List<PremiumSettingsRow>) {
    Column(Modifier.fillMaxWidth()) {
        Text(title, color = PremiumColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp, modifier = Modifier.padding(start = 8.dp, bottom = 14.dp))
        Surface(Modifier.fillMaxWidth().border(1.dp, PremiumColors.Line, RoundedCornerShape(58.dp)), color = PremiumColors.Surface, shape = RoundedCornerShape(58.dp)) {
            Column {
                rows.forEachIndexed { index, row ->
                    val onClick = row.onClick
                    val rowModifier = if (onClick != null) {
                        Modifier.fillMaxWidth().height(84.dp).clickable { onClick() }.padding(horizontal = 24.dp)
                    } else {
                        Modifier.fillMaxWidth().height(84.dp).padding(horizontal = 24.dp)
                    }
                    Row(rowModifier, verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(46.dp).background(Color(0xFFF3F4F6), RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                            Icon(row.icon, null, tint = Color(0xFF555555))
                        }
                        Text(row.label, modifier = Modifier.weight(1f).padding(start = 28.dp), color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                        if (row.onClick != null) {
                            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Color(0xFFD0D0D0))
                        }
                    }
                    if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
                }
            }
        }
    }
}
