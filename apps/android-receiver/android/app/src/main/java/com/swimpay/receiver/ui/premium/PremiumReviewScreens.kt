package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumReviewsScreen(
    state: PremiumScreenState<PremiumReviewsUiState> = PremiumScreenState.content(PremiumReviewsUiState.preview()),
    onOpenReview: (String) -> Unit = {}
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumReviewsContent(state.value, onOpenReview)
        else -> PremiumReviewsState(state)
    }
}

@Composable
private fun PremiumReviewsContent(
    state: PremiumReviewsUiState,
    onOpenReview: (String) -> Unit
) {
    var selectedFilter by remember { mutableStateOf(PremiumReviewFilter.TO_CONFIRM) }
    val filteredItems = selectedFilter.applyTo(state.items)
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Paiements à confirmer", color = PremiumColors.Ink, fontSize = 23.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black)
            Text("Confirmez uniquement les paiements que vous reconnaissez.", color = PremiumColors.Ink, fontSize = 13.sp, lineHeight = 20.sp)
            Spacer(Modifier.height(28.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PremiumReviewFilter.entries.forEach { filter ->
                    FilterLabel(
                        filter.icon,
                        "${filter.label} ${filter.countFor(state.items)}",
                        selectedFilter == filter,
                        Modifier.weight(filter.weight)
                    ) {
                        selectedFilter = filter
                    }
                }
            }
        }
        items(filteredItems) { item -> ReviewPaymentCard(item, onOpenReview) }
    }
}

private enum class PremiumReviewFilter(
    val label: String,
    val icon: ImageVector,
    val weight: Float
) {
    ALL("Tout", Icons.Default.GridView, 1f),
    TO_CONFIRM("À confirmer", Icons.Default.Sync, 1.35f),
    CONFIRMED("Confirmés", Icons.Default.CheckCircle, 1f),
    REJECTED("Rejetés", Icons.Default.WarningAmber, 1f);

    fun applyTo(items: List<PremiumReviewUiItem>): List<PremiumReviewUiItem> {
        return when (this) {
            ALL -> items
            TO_CONFIRM -> items.filter { it.reviewStatus == ReviewUiStatus.TO_CONFIRM }
            CONFIRMED -> items.filter { it.reviewStatus == ReviewUiStatus.CONFIRMED }
            REJECTED -> items.filter { it.reviewStatus == ReviewUiStatus.REJECTED }
        }
    }

    fun countFor(items: List<PremiumReviewUiItem>): Int = applyTo(items).size
}

@Composable
private fun PremiumReviewsState(state: PremiumScreenState<PremiumReviewsUiState>) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Paiements à confirmer", color = PremiumColors.Ink, fontSize = 23.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black)
            Text("Confirmez uniquement les paiements que vous reconnaissez.", color = PremiumColors.Ink, fontSize = 13.sp, lineHeight = 20.sp)
        }
        item { PremiumStatePanel(state) }
    }
}

@Composable
private fun ReviewPaymentCard(item: PremiumReviewUiItem, onOpenReview: (String) -> Unit) {
    Surface(
        Modifier
            .fillMaxWidth()
            .height(128.dp)
            .border(1.dp, PremiumColors.Line, RoundedCornerShape(34.dp))
            .premiumTap { onOpenReview(item.reviewId) },
        color = if (item.valid) Color(0xFFF3F7FC) else PremiumColors.Surface,
        shadowElevation = 4.dp,
        shape = RoundedCornerShape(34.dp)
    ) {
        Column(Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                PremiumBankLogo(
                    bankProfileId = reviewBankProfileId(item.bank),
                    displayName = item.bank,
                    size = 46.dp
                )
                Column(Modifier.weight(1f).padding(start = 18.dp)) {
                    Text(item.amount, color = PremiumColors.Ink, fontSize = 21.sp, lineHeight = 25.sp, fontWeight = FontWeight.Black)
                    Text(item.bank, color = PremiumColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                StatusChip(item.status, if (item.valid) StatusTone.Success else StatusTone.Warning)
            }
            Spacer(Modifier.height(12.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
            Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                StatusChip(item.helper, StatusTone.Neutral)
                Spacer(Modifier.width(10.dp))
                Text(item.reasons.firstOrNull() ?: "Validation requise", color = PremiumColors.Ink, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

private fun reviewBankProfileId(value: String): String {
    return when {
        value.contains("sber", ignoreCase = true) -> "sber_ru"
        value.contains("t-bank", ignoreCase = true) || value.contains("tinkoff", ignoreCase = true) -> "tbank_ru"
        value.contains("vtb", ignoreCase = true) -> "vtb_ru"
        value.contains("alfa", ignoreCase = true) -> "alfa_ru"
        value.contains("gazprom", ignoreCase = true) -> "gazprombank_ru"
        value.contains("ozon", ignoreCase = true) -> "ozon_bank"
        else -> "unknown"
    }
}

@Composable
fun PremiumPaymentDetailScreen(
    state: PremiumScreenState<PremiumPaymentDetailUiState> = PremiumScreenState.content(PremiumPaymentDetailUiState.preview()),
    onBack: () -> Unit = {},
    onConfirmReceived: () -> Unit = {},
    onRejectSignal: () -> Unit = {},
    onRejectOrder: () -> Unit = {}
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumPaymentDetailContent(
            state = state.value,
            onBack = onBack,
            onConfirmReceived = onConfirmReceived,
            onRejectSignal = onRejectSignal,
            onRejectOrder = onRejectOrder
        )
        else -> PremiumPaymentDetailState(state, onBack)
    }
}

@Composable
private fun PremiumPaymentDetailContent(
    state: PremiumPaymentDetailUiState,
    onBack: () -> Unit,
    onConfirmReceived: () -> Unit,
    onRejectSignal: () -> Unit,
    onRejectOrder: () -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(PremiumColors.Background)
            .statusBarsPadding()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
    ) {
        Row(Modifier.fillMaxWidth().height(72.dp), verticalAlignment = Alignment.CenterVertically) {
            CircleAction(Icons.Default.ArrowBack, onClick = onBack)
            Text("Vérifier ce paiement", modifier = Modifier.weight(1f), color = PremiumColors.Ink, fontSize = 22.sp, fontWeight = FontWeight.Black)
        }
        LazyColumn(
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item {
                PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = Color(0xFFFFFBF4)) {
                    Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
                        Box(Modifier.size(62.dp).background(Color(0xFFFFF2DD), RoundedCornerShape(24.dp)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.WarningAmber, null, tint = PremiumColors.Warning)
                        }
                        Column {
                            Text(state.statusTitle, color = PremiumColors.Warning, fontSize = 23.sp, fontWeight = FontWeight.Black)
                            Text(state.statusText, color = PremiumColors.Muted, fontSize = 15.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
            item {
                PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                    Column(Modifier.padding(horizontal = 22.dp, vertical = 12.dp)) {
                        state.summaryRows.forEach { row ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text(row.first, modifier = Modifier.weight(1f), color = PremiumColors.Muted, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                Text(row.second, color = PremiumColors.Ink, fontSize = 15.sp, fontWeight = FontWeight.Black)
                            }
                        }
                    }
                }
            }
            item {
                Text("Pourquoi ce paiement est à vérifier ?", color = PremiumColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.Black)
                PremiumCard(Modifier.fillMaxWidth().padding(top = 12.dp), radius = 24.dp) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        state.reasons.forEach {
                            Text(it, color = PremiumColors.Muted, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
            if (state.timeline.isNotEmpty()) {
                item {
                    Text("Parcours", color = PremiumColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.Black)
                    PremiumCard(Modifier.fillMaxWidth().padding(top = 12.dp), radius = 24.dp) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            state.timeline.forEachIndexed { index, label ->
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Box(Modifier.size(24.dp).background(PremiumColors.IconTile, RoundedCornerShape(9.dp)), contentAlignment = Alignment.Center) {
                                        Text("${index + 1}", color = PremiumColors.Blue, fontSize = 11.sp, fontWeight = FontWeight.Black)
                                    }
                                    Text(label, color = PremiumColors.Ink, fontSize = 13.sp, fontWeight = FontWeight.Black)
                                }
                            }
                        }
                    }
                }
            }
            if (state.actionMessage.isNotBlank()) {
                item {
                    StatusChip(state.actionMessage, StatusTone.Info)
                }
            }
            if (state.actionsEnabled) {
                item {
                    PremiumPrimaryButton("Confirmer reçu", onClick = onConfirmReceived)
                    Spacer(Modifier.height(12.dp))
                    PremiumPrimaryButton("Rejeter le signal", onClick = onRejectSignal)
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Rejeter la commande",
                        color = PremiumColors.Danger,
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .premiumTap(onRejectOrder)
                            .padding(vertical = 12.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun PremiumPaymentDetailState(
    state: PremiumScreenState<PremiumPaymentDetailUiState>,
    onBack: () -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(PremiumColors.Background)
            .statusBarsPadding()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
    ) {
        Row(Modifier.fillMaxWidth().height(72.dp), verticalAlignment = Alignment.CenterVertically) {
            CircleAction(Icons.Default.ArrowBack, onClick = onBack)
            Text("Vérifier ce paiement", modifier = Modifier.weight(1f), color = PremiumColors.Ink, fontSize = 22.sp, fontWeight = FontWeight.Black)
        }
        LazyColumn(
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item { PremiumStatePanel(state) }
        }
    }
}

@Composable
private fun FilterLabel(icon: ImageVector, text: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Column(modifier.premiumTap(onClick), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Icon(icon, null, tint = if (selected) PremiumColors.Blue else Color(0xFF555555), modifier = Modifier.size(17.dp))
            Text(text, color = if (selected) PremiumColors.Blue else Color(0xFF444444), fontSize = 12.sp, fontWeight = FontWeight.Black, maxLines = 1)
        }
        if (selected) {
            Box(Modifier.padding(top = 20.dp).fillMaxWidth().height(2.dp).background(PremiumColors.Blue))
        }
    }
}
