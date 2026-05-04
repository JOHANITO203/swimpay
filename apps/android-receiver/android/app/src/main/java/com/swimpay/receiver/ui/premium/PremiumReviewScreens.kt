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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumReviewsScreen(
    state: PremiumReviewsUiState = PremiumReviewsUiState.preview(),
    onOpenReview: (String) -> Unit = {}
) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Signalements Reçus", color = PremiumColors.Ink, fontSize = 23.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black)
            Text("Confirmez les paiements détectés par votre terminal Android.", color = PremiumColors.Ink, fontSize = 13.sp, lineHeight = 20.sp)
            Spacer(Modifier.height(28.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterLabel(Icons.Default.GridView, "Tout", false, Modifier.weight(1f))
                FilterLabel(Icons.Default.Sync, "Vérification", true, Modifier.weight(1.35f))
                FilterLabel(Icons.Default.CheckCircle, "Validés", false, Modifier.weight(1f))
            }
        }
        items(state.items) { item -> ReviewPaymentCard(item, onOpenReview) }
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
                Box(Modifier.size(46.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(18.dp)).border(1.dp, PremiumColors.Line, RoundedCornerShape(18.dp)))
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

@Composable
fun PremiumPaymentDetailScreen(
    state: PremiumPaymentDetailUiState = PremiumPaymentDetailUiState.preview(),
    onBack: () -> Unit = {},
    onConfirm: () -> Unit = {},
    onRejectSignal: () -> Unit = {},
    onRejectOrder: () -> Unit = {}
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
            if (state.actionMessage.isNotBlank()) {
                item {
                    StatusChip(state.actionMessage, StatusTone.Info)
                }
            }
            item {
                PremiumBlueButton("Confirmer le paiement", onClick = onConfirm)
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

@Composable
private fun FilterLabel(icon: ImageVector, text: String, selected: Boolean, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Icon(icon, null, tint = if (selected) PremiumColors.Blue else Color(0xFF555555), modifier = Modifier.size(17.dp))
            Text(text, color = if (selected) PremiumColors.Blue else Color(0xFF444444), fontSize = 12.sp, fontWeight = FontWeight.Black, maxLines = 1)
        }
        if (selected) {
            Box(Modifier.padding(top = 20.dp).fillMaxWidth().height(2.dp).background(PremiumColors.Blue))
        }
    }
}
