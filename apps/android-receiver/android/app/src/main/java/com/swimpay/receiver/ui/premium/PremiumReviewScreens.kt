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
import androidx.compose.ui.text.style.TextOverflow
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

    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier
                .fillMaxHeight()
                .statusBarsPadding()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(top = 14.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                ReviewQueueHeader(
                    state = state,
                    selectedFilter = selectedFilter,
                    visibleCount = filteredItems.size
                )
            }
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PremiumReviewFilter.entries.forEach { filter ->
                        ReviewFilterPill(
                            filter = filter,
                            count = filter.countFor(state.items),
                            selected = selectedFilter == filter,
                            modifier = Modifier.weight(filter.weight)
                        ) {
                            selectedFilter = filter
                        }
                    }
                }
            }
            items(filteredItems) { item -> ReviewPaymentCard(item, onOpenReview) }
        }
    }
}

private enum class PremiumReviewFilter(
    val label: String,
    val icon: ImageVector,
    val weight: Float
) {
    ALL("Tout", Icons.Default.GridView, 1f),
    TO_CONFIRM("A verifier", Icons.Default.Sync, 1.35f),
    CONFIRMED("Confirmes", Icons.Default.CheckCircle, 1f),
    REJECTED("Rejetes", Icons.Default.WarningAmber, 1f);

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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier
                .fillMaxHeight()
                .statusBarsPadding()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(top = 14.dp, bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item {
                Text("Revue des paiements", color = PremiumMockupColors.White, fontSize = 25.sp, lineHeight = 30.sp, fontWeight = FontWeight.Black)
                Text("Les signaux restent en validation manuelle.", color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 20.sp)
            }
            item { PremiumStatePanel(state) }
        }
    }
}

@Composable
private fun ReviewPaymentCard(item: PremiumReviewUiItem, onOpenReview: (String) -> Unit) {
    val tone = reviewTone(item.reviewStatus)
    MockupGlassCard(
        Modifier
            .fillMaxWidth()
            .height(154.dp)
            .premiumTap { onOpenReview(item.reviewId) },
        radius = 26.dp,
        border = tone.border
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                PremiumBankLogo(
                    bankProfileId = reviewBankProfileId(item.bank),
                    displayName = item.bank,
                    size = 46.dp
                )
                Column(Modifier.weight(1f).padding(start = 18.dp)) {
                    Text(item.amount, color = PremiumMockupColors.White, fontSize = 22.sp, lineHeight = 26.sp, fontWeight = FontWeight.Black)
                    Text(item.bank, color = PremiumMockupColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                MockupStatusPill(item.status, tone.color)
            }
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumMockupColors.BorderSoft))
            Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                MockupStatusPill(item.helper, PremiumMockupColors.MutedDark)
                Spacer(Modifier.width(10.dp))
                Text(
                    item.reasons.firstOrNull() ?: "Validation manuelle requise",
                    color = PremiumMockupColors.Muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
        ) {
            Row(Modifier.fillMaxWidth().height(72.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleAction(Icons.Default.ArrowBack, onClick = onBack)
                Text("Verifier ce paiement", modifier = Modifier.weight(1f), color = PremiumMockupColors.White, fontSize = 22.sp, fontWeight = FontWeight.Black)
            }
            LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { ReviewDetailHero(state) }
                item { ReviewSummaryGlass(state.summaryRows) }
                item {
                    Text("Pourquoi verifier ?", color = PremiumMockupColors.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
                    ReasonsGlass(state.reasons, Modifier.padding(top = 10.dp))
                }
                if (state.timeline.isNotEmpty()) {
                    item {
                        Text("Parcours", color = PremiumMockupColors.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
                        TimelineGlass(state.timeline, Modifier.padding(top = 10.dp))
                    }
                }
                if (state.actionMessage.isNotBlank()) {
                    item { MockupStatusPill(state.actionMessage, PremiumMockupColors.Cyan) }
                }
                if (state.actionsEnabled) {
                    item {
                        ReviewActionPanel(
                            onConfirmReceived = onConfirmReceived,
                            onRejectSignal = onRejectSignal,
                            onRejectOrder = onRejectOrder
                        )
                    }
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
        ) {
            Row(Modifier.fillMaxWidth().height(72.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleAction(Icons.Default.ArrowBack, onClick = onBack)
                Text("Verifier ce paiement", modifier = Modifier.weight(1f), color = PremiumMockupColors.White, fontSize = 22.sp, fontWeight = FontWeight.Black)
            }
            LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                item { PremiumStatePanel(state) }
            }
        }
    }
}

@Composable
private fun ReviewQueueHeader(
    state: PremiumReviewsUiState,
    selectedFilter: PremiumReviewFilter,
    visibleCount: Int
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 28.dp, border = PremiumMockupColors.Border) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                MockupIconTile(Icons.Default.WarningAmber, tint = PremiumMockupColors.Warning, size = 58.dp)
                Column(Modifier.weight(1f)) {
                    Text("Revue des paiements", color = PremiumMockupColors.White, fontSize = 24.sp, lineHeight = 29.sp, fontWeight = FontWeight.Black)
                    Text("Validation manuelle a partir de signaux operationnels.", color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium)
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ReviewHeaderMetric(selectedFilter.label, "$visibleCount visibles", Modifier.weight(1f))
                ReviewHeaderMetric("File", "${state.items.size} signaux", Modifier.weight(1f))
                ReviewHeaderMetric("Mode", if (state.usesLiveApi) "Live" else "Mockup", Modifier.weight(1f))
            }
            if (state.safeMessage.isNotBlank()) {
                Text(state.safeMessage, color = PremiumMockupColors.MutedDark, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun ReviewHeaderMetric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(PremiumMockupColors.Field, RoundedCornerShape(16.dp))
            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(16.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Text(label, color = PremiumMockupColors.MutedDark, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(value, color = PremiumMockupColors.White, fontSize = 13.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun ReviewFilterPill(
    filter: PremiumReviewFilter,
    count: Int,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    val border = if (selected) PremiumMockupColors.Green else PremiumMockupColors.BorderSoft
    val tint = if (selected) PremiumMockupColors.Green else PremiumMockupColors.MutedDark
    Row(
        modifier
            .height(44.dp)
            .background(if (selected) PremiumMockupColors.Highlight else PremiumMockupColors.Field, RoundedCornerShape(18.dp))
            .border(1.dp, border, RoundedCornerShape(18.dp))
            .premiumTap(onClick)
            .padding(horizontal = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(filter.icon, null, tint = tint, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(5.dp))
        Text("$count", color = PremiumMockupColors.White, fontSize = 12.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun ReviewDetailHero(state: PremiumPaymentDetailUiState) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 30.dp, border = PremiumMockupColors.Warning.copy(alpha = 0.55f)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                MockupIconTile(Icons.Default.WarningAmber, tint = PremiumMockupColors.Warning, size = 60.dp)
                Column(Modifier.weight(1f)) {
                    Text(state.statusTitle, color = PremiumMockupColors.Warning, fontSize = 25.sp, lineHeight = 29.sp, fontWeight = FontWeight.Black)
                    Text(state.statusText, color = PremiumMockupColors.Muted, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(PremiumMockupColors.Field, RoundedCornerShape(16.dp))
                    .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(16.dp))
                    .padding(horizontal = 14.dp, vertical = 11.dp)
            ) {
                Text(
                    "Aucune validation automatique : le commercant decide apres revue.",
                    color = PremiumMockupColors.Muted,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun ReviewSummaryGlass(rows: List<Pair<String, String>>) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 26.dp) {
        Column(Modifier.padding(horizontal = 20.dp, vertical = 10.dp)) {
            rows.forEachIndexed { index, row ->
                Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(row.first, modifier = Modifier.weight(1f), color = PremiumMockupColors.MutedDark, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    Text(row.second, color = PremiumMockupColors.White, fontSize = 14.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                if (index != rows.lastIndex) {
                    Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumMockupColors.BorderSoft))
                }
            }
        }
    }
}

@Composable
private fun ReasonsGlass(reasons: List<String>, modifier: Modifier = Modifier) {
    MockupGlassCard(modifier.fillMaxWidth(), radius = 24.dp) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            reasons.forEach {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.size(8.dp).background(PremiumMockupColors.Warning, RoundedCornerShape(99.dp)))
                    Text(it, color = PremiumMockupColors.Muted, fontSize = 14.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun TimelineGlass(timeline: List<String>, modifier: Modifier = Modifier) {
    MockupGlassCard(modifier.fillMaxWidth(), radius = 24.dp) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            timeline.forEachIndexed { index, label ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        Modifier
                            .size(28.dp)
                            .background(PremiumMockupColors.Highlight, RoundedCornerShape(11.dp))
                            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(11.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("${index + 1}", color = PremiumMockupColors.Green, fontSize = 11.sp, fontWeight = FontWeight.Black)
                    }
                    Text(label, color = PremiumMockupColors.White, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ReviewActionPanel(
    onConfirmReceived: () -> Unit,
    onRejectSignal: () -> Unit,
    onRejectOrder: () -> Unit
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 26.dp, border = PremiumMockupColors.Border) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            MockupPrimaryButton("Confirmer recu", onClick = onConfirmReceived)
            MockupOutlineButton("Rejeter le signal", onClick = onRejectSignal)
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .border(1.5.dp, PremiumMockupColors.Danger, RoundedCornerShape(PremiumMockupRadius.Button))
                    .premiumTap(onRejectOrder),
                contentAlignment = Alignment.Center
            ) {
                Text("Rejeter la commande", color = PremiumMockupColors.Danger, fontWeight = FontWeight.Black, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun MockupStatusPill(text: String, color: Color) {
    Box(
        Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(999.dp))
            .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = color, fontSize = 11.sp, lineHeight = 13.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

private data class ReviewTone(
    val color: Color,
    val border: Color
)

private fun reviewTone(status: ReviewUiStatus): ReviewTone {
    return when (status) {
        ReviewUiStatus.CONFIRMED -> ReviewTone(PremiumMockupColors.Green, PremiumMockupColors.Green.copy(alpha = 0.5f))
        ReviewUiStatus.REJECTED -> ReviewTone(PremiumMockupColors.Danger, PremiumMockupColors.Danger.copy(alpha = 0.45f))
        ReviewUiStatus.TO_CONFIRM -> ReviewTone(PremiumMockupColors.Warning, PremiumMockupColors.Warning.copy(alpha = 0.45f))
    }
}
