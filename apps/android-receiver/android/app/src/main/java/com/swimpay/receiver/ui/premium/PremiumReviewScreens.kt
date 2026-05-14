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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
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
import com.swimpay.receiver.BuildConfig

@Composable
fun PremiumReviewsScreen(
    state: PremiumScreenState<PremiumReviewsUiState> = PremiumScreenState.content(PremiumReviewsUiState.preview()),
    onOpenReview: (String) -> Unit = {}
) {
    val designFixtureEnabled = BuildConfig.BUILD_TYPE == "debug" || BuildConfig.BUILD_TYPE == "staging"
    val visualState = if (designFixtureEnabled) {
        PremiumScreenState.content(PremiumReviewsUiState.preview())
    } else {
        state
    }
    when (visualState) {
        is PremiumScreenState.Content -> PremiumReviewsContent(visualState.value, onOpenReview)
        else -> PremiumReviewsState(visualState)
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
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(top = 10.dp, bottom = PremiumSpacing.ScreenBottomWithNav),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item {
                Row(Modifier.fillMaxWidth().height(mockupDp(64)), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ArrowBack, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(24)))
                    Text("File d’examen", color = PremiumMockupColors.White, fontSize = mockupSp(25), fontWeight = FontWeight.Black, modifier = Modifier.weight(1f).padding(start = mockupDp(22)))
                    Box {
                        Icon(Icons.Default.FilterAlt, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(24)))
                        Box(Modifier.align(Alignment.TopEnd).size(mockupDp(6)).background(PremiumMockupColors.Green, androidx.compose.foundation.shape.CircleShape))
                    }
                }
            }
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
                    horizontalArrangement = Arrangement.spacedBy(mockupDp(6)),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    listOf(PremiumReviewFilter.ALL, PremiumReviewFilter.TO_CONFIRM, PremiumReviewFilter.TODAY).forEach { filter ->
                        ReviewFilterPill(filter = filter, count = filter.countFor(state.items), selected = selectedFilter == filter, modifier = Modifier.weight(filter.weight)) { selectedFilter = filter }
                    }
                    Row(
                        Modifier
                            .weight(0.92f)
                            .height(44.dp)
                            .background(PremiumMockupColors.Field, RoundedCornerShape(13.dp))
                            .border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(13.dp))
                            .padding(horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Text("Filtrer", color = PremiumMockupColors.White, fontSize = 12.sp, fontWeight = FontWeight.Black, maxLines = 1)
                        Icon(Icons.Default.FilterAlt, null, tint = PremiumMockupColors.White, modifier = Modifier.padding(start = 4.dp).size(16.dp))
                    }
                }
            }
            item {
                Row(
                    Modifier.fillMaxWidth().height(52.dp).background(PremiumMockupColors.Field, RoundedCornerShape(14.dp)).border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(14.dp)).padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Search, null, tint = PremiumMockupColors.MutedDark, modifier = Modifier.size(mockupDp(19)))
                    Text("Rechercher par référence, montant ou banque...", color = PremiumMockupColors.MutedDark, fontSize = mockupSp(15), modifier = Modifier.padding(start = mockupDp(8)))
                }
            }
            items(filteredItems) { item -> ReviewPaymentCard(item, onOpenReview) }
            item {
                MockupInfoBanner(
                    title = "Signal à examiner",
                    body = "Décision manuelle avant validation.",
                    icon = Icons.Default.WarningAmber,
                    tone = PremiumMockupColors.Warning
                )
            }
        }
    }
}

private enum class PremiumReviewFilter(
    val label: String,
    val icon: ImageVector,
    val weight: Float
) {
    ALL("Tous", Icons.Default.GridView, 0.82f),
    TO_CONFIRM("À vérifier", Icons.Default.Sync, 1.18f),
    TODAY("Aujourd’hui", Icons.Default.FilterAlt, 1.18f),
    CONFIRMED("Confirmés", Icons.Default.CheckCircle, 1f),
    REJECTED("Rejetés", Icons.Default.WarningAmber, 1f);

    fun applyTo(items: List<PremiumReviewUiItem>): List<PremiumReviewUiItem> {
        return when (this) {
            ALL -> items
            TO_CONFIRM -> items.filter { it.reviewStatus == ReviewUiStatus.TO_CONFIRM }
            TODAY -> items
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
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(top = mockupDp(14), bottom = PremiumSpacing.ScreenBottomWithNav),
            verticalArrangement = Arrangement.spacedBy(mockupDp(18))
        ) {
            item {
                Text("Revue des paiements", color = PremiumMockupColors.White, fontSize = mockupSp(25), lineHeight = mockupSp(30), fontWeight = FontWeight.Black)
                Text("Les signaux restent en validation manuelle.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(20))
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
            .height(166.dp)
            .premiumTap { onOpenReview(item.reviewId) },
        radius = mockupDp(16),
        border = tone.border
    ) {
        Column(Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                PremiumBankLogo(
                    bankProfileId = reviewBankProfileId(item.bank),
                    displayName = item.bank,
                    size = 48.dp
                )
                Text(item.bank, color = PremiumMockupColors.White, fontSize = mockupSp(17), fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(start = 12.dp))
                MockupStatusPill("À vérifier", tone.color)
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(item.amount, color = PremiumMockupColors.White, fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black, maxLines = 2, modifier = Modifier.weight(1f))
                Row(
                    Modifier
                        .height(46.dp)
                        .background(PremiumMockupColors.Green.copy(alpha = 0.10f), RoundedCornerShape(13.dp))
                        .border(1.dp, PremiumMockupColors.Green, RoundedCornerShape(13.dp))
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(mockupDp(8))
                ) {
                    Text("Examiner", color = PremiumMockupColors.Green, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(mockupDp(18)))
                }
            }
            Text(item.helper, color = PremiumMockupColors.MutedDark, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
    val designFixtureEnabled = BuildConfig.BUILD_TYPE == "debug" || BuildConfig.BUILD_TYPE == "staging"
    val visualState = if (designFixtureEnabled) {
        PremiumScreenState.content(PremiumPaymentDetailUiState.preview())
    } else {
        state
    }
    when (visualState) {
        is PremiumScreenState.Content -> PremiumPaymentDetailContent(
            state = visualState.value,
            onBack = onBack,
            onConfirmReceived = onConfirmReceived,
            onRejectSignal = onRejectSignal,
            onRejectOrder = onRejectOrder
        )
        else -> PremiumPaymentDetailState(visualState, onBack)
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
            Row(Modifier.fillMaxWidth().height(mockupDp(96)), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.ArrowBack, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(34)).premiumTap(onBack))
                Text("Détail à examiner", modifier = Modifier.weight(1f).padding(start = mockupDp(28)), color = PremiumMockupColors.White, fontSize = mockupSp(24), fontWeight = FontWeight.Black)
                Icon(Icons.Default.Security, null, tint = PremiumMockupColors.White, modifier = Modifier.size(mockupDp(28)))
            }
            LazyColumn(
                contentPadding = PaddingValues(bottom = PremiumSpacing.ScreenBottomWithNav),
                verticalArrangement = Arrangement.spacedBy(mockupDp(12))
            ) {
                item {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        MockupStatusPill("Priorité moyenne", PremiumMockupColors.Warning)
                    }
                }
                item { ReviewDetailMockCard(state, onConfirmReceived, onRejectSignal) }
                /*
                item {
                    Text("Pourquoi vérifier ?", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                    ReasonsGlass(state.reasons, Modifier.padding(top = mockupDp(10)))
                }
                if (state.timeline.isNotEmpty()) {
                    item {
                        Text("Parcours", color = PremiumMockupColors.White, fontSize = mockupSp(18), fontWeight = FontWeight.Black)
                        TimelineGlass(state.timeline, Modifier.padding(top = mockupDp(10)))
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
                */
            }
        }
    }
}

@Composable
private fun ReviewDetailMockCard(
    state: PremiumPaymentDetailUiState,
    onConfirmReceived: () -> Unit,
    onRejectSignal: () -> Unit
) {
    val amount = state.summaryRows.firstOrNull { it.first.contains("Montant", ignoreCase = true) }?.second ?: "9 450,00 RUB"
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(11), border = PremiumMockupColors.Border) {
        Column(Modifier.padding(mockupDp(12)), verticalArrangement = Arrangement.spacedBy(mockupDp(8))) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                PremiumBankLogo("sber_ru", "Sberbank", size = mockupDp(42))
                Column(Modifier.weight(1f).padding(start = mockupDp(10))) {
                    Text(amount, color = PremiumMockupColors.White, fontSize = mockupSp(34), lineHeight = mockupSp(38), fontWeight = FontWeight.Black)
                    Text("Sberbank  -  Carte **** 5421", color = PremiumMockupColors.Muted, fontSize = mockupSp(16))
                    Text("Signal détecté il y a 2 min", color = PremiumMockupColors.Muted, fontSize = mockupSp(14))
                }
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(mockupDp(6))) {
                    MockupStatusPill("#SPM-2025-05-0912", PremiumMockupColors.MutedDark)
                    MockupStatusPill("signal détecté", PremiumMockupColors.Warning)
                }
            }
            ReviewSummaryGlass(state.summaryRows.take(6).ifEmpty {
                listOf("Banque" to "Sberbank", "Méthode" to "Carte bancaire", "Référence" to "#SPM-2025-05-0912", "Montant" to "9 450,00 RUB", "Confiance" to "78%")
            })
            MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(11), border = PremiumMockupColors.Green.copy(alpha = 0.42f)) {
                Column(Modifier.padding(mockupDp(10)), verticalArrangement = Arrangement.spacedBy(mockupDp(6))) {
                    Text("Indices correspondants", color = PremiumMockupColors.Green, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                    state.reasons.ifEmpty { listOf("Montant exact", "Carte se terminant par 5421", "Référence dans la notification", "Heure proche") }.forEach {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                            Icon(Icons.Default.CheckCircle, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(mockupDp(15)))
                            Text(it, color = PremiumMockupColors.Muted, fontSize = mockupSp(14), modifier = Modifier.weight(1f))
                            Text("Correspondance", color = PremiumMockupColors.Muted, fontSize = mockupSp(13))
                        }
                    }
                }
            }
            MockupInfoBanner("Décision manuelle", "Signal à examiner avant validation.", Icons.Default.WarningAmber, PremiumMockupColors.Warning)
            Row(horizontalArrangement = Arrangement.spacedBy(mockupDp(12)), modifier = Modifier.fillMaxWidth()) {
                Box(Modifier.weight(1f).height(52.dp).background(PremiumMockupColors.Danger, RoundedCornerShape(14.dp)).premiumTap(onRejectSignal), contentAlignment = Alignment.Center) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                        Icon(Icons.Default.Close, null, tint = PremiumMockupColors.White)
                        Text("Rejeter", color = PremiumMockupColors.White, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
                    }
                }
                Box(Modifier.weight(1.25f).height(52.dp).background(PremiumMockupColors.Green, RoundedCornerShape(14.dp)).premiumTap(onConfirmReceived), contentAlignment = Alignment.Center) {
                    Text("Confirmer manuellement", color = PremiumMockupColors.Black, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
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
            Row(Modifier.fillMaxWidth().height(mockupDp(72)), verticalAlignment = Alignment.CenterVertically) {
                CircleAction(Icons.Default.ArrowBack, onClick = onBack)
                Text("Verifier ce paiement", modifier = Modifier.weight(1f), color = PremiumMockupColors.White, fontSize = mockupSp(22), fontWeight = FontWeight.Black)
            }
            LazyColumn(
                contentPadding = PaddingValues(bottom = PremiumSpacing.ScreenBottomWithNav),
                verticalArrangement = Arrangement.spacedBy(mockupDp(18))
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
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(11), border = PremiumMockupColors.Border) {
        Column(verticalArrangement = Arrangement.spacedBy(mockupDp(0))) {
            Row(Modifier.fillMaxWidth().padding(mockupDp(14)), verticalAlignment = Alignment.CenterVertically) {
                MockupIconTile(Icons.Default.Description, tint = PremiumMockupColors.Warning, size = mockupDp(42))
                Column(Modifier.weight(1f).padding(start = mockupDp(12))) {
                    Text("Éléments en attente", color = PremiumMockupColors.White, fontSize = mockupSp(20), fontWeight = FontWeight.Black)
                    Text("Nécessitent une vérification manuelle", color = PremiumMockupColors.Muted, fontSize = mockupSp(14), modifier = Modifier.padding(top = mockupDp(8)))
                }
                Text("${state.items.size}", color = PremiumMockupColors.White, fontSize = mockupSp(42), fontWeight = FontWeight.Black)
            }
            Box(Modifier.fillMaxWidth().height(mockupDp(1)).background(PremiumMockupColors.BorderSoft))
            Row(Modifier.fillMaxWidth().padding(horizontal = mockupDp(14), vertical = mockupDp(10)), horizontalArrangement = Arrangement.SpaceBetween) {
                ReviewHeaderMetric("Priorité haute", "${state.items.count { it.reviewStatus == ReviewUiStatus.TO_CONFIRM }}", PremiumMockupColors.Warning, Modifier.weight(1f))
                ReviewHeaderMetric("Aujourd’hui", "$visibleCount", PremiumMockupColors.Blue, Modifier.weight(1f))
                ReviewHeaderMetric("Qualité moyenne", "78%", PremiumMockupColors.Warning, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun ReviewHeaderMetric(label: String, value: String, tone: Color, modifier: Modifier = Modifier) {
    Column(modifier.padding(end = mockupDp(10))) {
        Text(label, color = PremiumMockupColors.Muted, fontSize = 12.sp, lineHeight = 15.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        Text(value, color = tone, fontSize = mockupSp(20), fontWeight = FontWeight.Black, modifier = Modifier.padding(top = mockupDp(6)))
    }
}

@Composable
private fun LegacyReviewQueueHeader(
    state: PremiumReviewsUiState,
    selectedFilter: PremiumReviewFilter,
    visibleCount: Int
) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(28), border = PremiumMockupColors.Border) {
        Column(Modifier.padding(mockupDp(20)), verticalArrangement = Arrangement.spacedBy(mockupDp(16))) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(16))) {
                MockupIconTile(Icons.Default.WarningAmber, tint = PremiumMockupColors.Warning, size = mockupDp(58))
                Column(Modifier.weight(1f)) {
                    Text("Revue des paiements", color = PremiumMockupColors.White, fontSize = mockupSp(24), lineHeight = mockupSp(29), fontWeight = FontWeight.Black)
                    Text("Validation manuelle a partir de signaux operationnels.", color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(18), fontWeight = FontWeight.Medium)
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                LegacyReviewHeaderMetric(selectedFilter.label, "$visibleCount visibles", Modifier.weight(1f))
                LegacyReviewHeaderMetric("File", "${state.items.size} signaux", Modifier.weight(1f))
                LegacyReviewHeaderMetric("Mode", if (state.usesLiveApi) "Live" else "Mockup", Modifier.weight(1f))
            }
            if (state.safeMessage.isNotBlank()) {
                Text(state.safeMessage, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(12), lineHeight = mockupSp(16), fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun LegacyReviewHeaderMetric(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier
            .background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(16)))
            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(16)))
            .padding(horizontal = mockupDp(12), vertical = mockupDp(10))
    ) {
        Text(label, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(11), fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(value, color = PremiumMockupColors.White, fontSize = mockupSp(13), fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
            .background(if (selected) PremiumMockupColors.Green.copy(alpha = 0.13f) else PremiumMockupColors.Field, RoundedCornerShape(13.dp))
            .border(1.dp, border, RoundedCornerShape(13.dp))
            .premiumTap(onClick)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Text(filter.label, color = tint, fontSize = 12.sp, fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (filter != PremiumReviewFilter.TODAY) {
            Spacer(Modifier.width(5.dp))
            Text("$count", color = PremiumMockupColors.White, fontSize = 12.sp, fontWeight = FontWeight.Black, maxLines = 1)
        }
    }
}

@Composable
private fun ReviewDetailHero(state: PremiumPaymentDetailUiState) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(30), border = PremiumMockupColors.Warning.copy(alpha = 0.55f)) {
        Column(Modifier.padding(mockupDp(20)), verticalArrangement = Arrangement.spacedBy(mockupDp(16))) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(16))) {
                MockupIconTile(Icons.Default.WarningAmber, tint = PremiumMockupColors.Warning, size = mockupDp(60))
                Column(Modifier.weight(1f)) {
                    Text(state.statusTitle, color = PremiumMockupColors.Warning, fontSize = mockupSp(25), lineHeight = mockupSp(29), fontWeight = FontWeight.Black)
                    Text(state.statusText, color = PremiumMockupColors.Muted, fontSize = mockupSp(14), lineHeight = mockupSp(20), fontWeight = FontWeight.SemiBold)
                }
            }
            Box(
                Modifier
                    .fillMaxWidth()
                    .background(PremiumMockupColors.Field, RoundedCornerShape(mockupDp(16)))
                    .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(16)))
                    .padding(horizontal = mockupDp(14), vertical = mockupDp(11))
            ) {
                Text(
                    "Aucune validation automatique : le commercant decide apres revue.",
                    color = PremiumMockupColors.Muted,
                    fontSize = mockupSp(13),
                    lineHeight = mockupSp(18),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
private fun ReviewSummaryGlass(rows: List<Pair<String, String>>) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(11)) {
        Column(Modifier.padding(horizontal = mockupDp(10), vertical = mockupDp(4))) {
            rows.forEachIndexed { index, row ->
                Row(Modifier.fillMaxWidth().padding(vertical = mockupDp(6)), verticalAlignment = Alignment.CenterVertically) {
                    Text(row.first, modifier = Modifier.weight(1f), color = PremiumMockupColors.MutedDark, fontSize = mockupSp(13), fontWeight = FontWeight.SemiBold)
                    Text(row.second, color = PremiumMockupColors.White, fontSize = mockupSp(14), fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                if (index != rows.lastIndex) {
                    Box(Modifier.fillMaxWidth().height(mockupDp(1)).background(PremiumMockupColors.BorderSoft))
                }
            }
        }
    }
}

@Composable
private fun ReasonsGlass(reasons: List<String>, modifier: Modifier = Modifier) {
    MockupGlassCard(modifier.fillMaxWidth(), radius = mockupDp(24)) {
        Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
            reasons.forEach {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(10))) {
                    Box(Modifier.size(mockupDp(8)).background(PremiumMockupColors.Warning, RoundedCornerShape(mockupDp(99))))
                    Text(it, color = PremiumMockupColors.Muted, fontSize = mockupSp(14), lineHeight = mockupSp(19), fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun TimelineGlass(timeline: List<String>, modifier: Modifier = Modifier) {
    MockupGlassCard(modifier.fillMaxWidth(), radius = mockupDp(24)) {
        Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
            timeline.forEachIndexed { index, label ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(mockupDp(12))) {
                    Box(
                        Modifier
                            .size(mockupDp(28))
                            .background(PremiumMockupColors.Highlight, RoundedCornerShape(mockupDp(11)))
                            .border(mockupDp(1), PremiumMockupColors.BorderSoft, RoundedCornerShape(mockupDp(11))),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("${index + 1}", color = PremiumMockupColors.Green, fontSize = mockupSp(11), fontWeight = FontWeight.Black)
                    }
                    Text(label, color = PremiumMockupColors.White, fontSize = mockupSp(13), lineHeight = mockupSp(18), fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
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
    MockupGlassCard(Modifier.fillMaxWidth(), radius = mockupDp(26), border = PremiumMockupColors.Border) {
        Column(Modifier.padding(mockupDp(18)), verticalArrangement = Arrangement.spacedBy(mockupDp(12))) {
            MockupPrimaryButton("Confirmer recu", onClick = onConfirmReceived)
            MockupOutlineButton("Rejeter le signal", onClick = onRejectSignal)
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(mockupDp(46))
                    .border(mockupDp(1), PremiumMockupColors.Danger, RoundedCornerShape(PremiumMockupRadius.Button))
                    .premiumTap(onRejectOrder),
                contentAlignment = Alignment.Center
            ) {
                Text("Rejeter la commande", color = PremiumMockupColors.Danger, fontWeight = FontWeight.Black, fontSize = mockupSp(16))
            }
        }
    }
}

@Composable
private fun MockupStatusPill(text: String, color: Color) {
    Box(
        Modifier
            .background(color.copy(alpha = 0.15f), RoundedCornerShape(mockupDp(999)))
            .border(mockupDp(1), color.copy(alpha = 0.4f), RoundedCornerShape(mockupDp(999)))
            .padding(horizontal = mockupDp(10), vertical = mockupDp(6)),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = color, fontSize = mockupSp(11), lineHeight = mockupSp(13), fontWeight = FontWeight.Black, maxLines = 1, overflow = TextOverflow.Ellipsis)
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
