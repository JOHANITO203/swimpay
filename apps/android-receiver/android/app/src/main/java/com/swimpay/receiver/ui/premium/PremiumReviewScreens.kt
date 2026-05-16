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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
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
    onOpenReview: (String) -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumReviewsContent(state.value, onOpenReview, language)
        else -> PremiumReviewsState(state, language)
    }
}

@Composable
private fun PremiumReviewsContent(
    state: PremiumReviewsUiState,
    onOpenReview: (String) -> Unit,
    language: PremiumLanguageOption
) {
    var selectedFilter by remember { mutableStateOf(PremiumReviewFilter.TO_CONFIRM) }
    val filteredItems = selectedFilter.applyTo(state.items)
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(top = 16.dp, bottom = PremiumSpacing.BottomNavHeight + 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = language.ui("Paiements à confirmer"),
                    color = PremiumColors.Ink,
                    style = androidx.compose.ui.text.TextStyle(
                        fontSize = PremiumType.ScreenTitle,
                        fontWeight = FontWeight.Black,
                        lineHeight = 30.sp
                    )
                )
                Text(
                    text = language.ui("Confirmez uniquement les paiements que vous reconnaissez."),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Body,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            Spacer(Modifier.height(24.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                PremiumReviewFilter.entries.forEach { filter ->
                    FilterLabel(
                        filter.icon,
                        "${language.ui(filter.label)} ${filter.countFor(state.items)}",
                        selectedFilter == filter,
                        Modifier.weight(filter.weight)
                    ) {
                        selectedFilter = filter
                    }
                }
            }
        }
        items(filteredItems) { item -> ReviewPaymentCard(item, onOpenReview, language) }
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
private fun PremiumReviewsState(state: PremiumScreenState<PremiumReviewsUiState>, language: PremiumLanguageOption = PremiumLanguageOption.FR) {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(top = 16.dp, bottom = PremiumSpacing.BottomNavHeight + 20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = language.ui("Paiements à confirmer"),
                    color = PremiumColors.Ink,
                    style = androidx.compose.ui.text.TextStyle(
                        fontSize = PremiumType.ScreenTitle,
                        fontWeight = FontWeight.Black,
                        lineHeight = 30.sp
                    )
                )
                Text(
                    text = language.ui("Confirmez uniquement les paiements que vous reconnaissez."),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Body,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        item { PremiumStatePanel(state.localized(language)) }
    }
}

@Composable
private fun ReviewPaymentCard(item: PremiumReviewUiItem, onOpenReview: (String) -> Unit, language: PremiumLanguageOption) {
    LiquidGlassCard(
        modifier = Modifier
            .fillMaxWidth()
            .premiumTap { onOpenReview(item.reviewId) },
        radius = PremiumRadius.CardLarge
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(PremiumIconSize.Tile)
                        .background(PremiumColors.IconTile, RoundedCornerShape(PremiumRadius.Tile)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.CreditCard,
                        contentDescription = null,
                        tint = PremiumColors.Blue,
                        modifier = Modifier.size(PremiumIconSize.Default)
                    )
                }
                Column(Modifier.weight(1f).padding(start = 14.dp)) {
                    Text(
                        text = language.ui("Paiement à confirmer"),
                        color = PremiumColors.Ink,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        text = item.helper,
                        color = PremiumColors.SoftText,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                StatusChip(language.ui(item.status), if (item.valid) StatusTone.Success else StatusTone.Warning)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                PremiumBankLogo(
                    bankProfileId = reviewBankProfileId(item.bank),
                    displayName = item.bank,
                    size = 44.dp
                )
                Column(Modifier.weight(1f).padding(start = 14.dp)) {
                    Text(
                        text = item.bank,
                        color = PremiumColors.Ink,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${language.ui("Réf.")} ${item.reviewId}",
                        color = PremiumColors.SoftText,
                        fontSize = PremiumType.Micro,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
                Text(
                    text = item.amount,
                    color = PremiumColors.Ink,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        text = language.ui("ORIGINE"),
                        color = PremiumColors.SoftText,
                        fontSize = PremiumType.Micro,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = item.reasons.firstOrNull()?.let(language::ui) ?: language.ui("Détection automatique"),
                        color = PremiumColors.Ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = language.ui("Examiner"),
                        color = PremiumColors.Blue,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black
                    )
                    Chevron()
                }
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
    onRejectOrder: () -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumPaymentDetailContent(
            state = state.value,
            onBack = onBack,
            onConfirmReceived = onConfirmReceived,
            onRejectSignal = onRejectSignal,
            onRejectOrder = onRejectOrder,
            language = language
        )
        else -> PremiumPaymentDetailState(state, onBack, language)
    }
}

@Composable
private fun PremiumPaymentDetailContent(
    state: PremiumPaymentDetailUiState,
    onBack: () -> Unit,
    onConfirmReceived: () -> Unit,
    onRejectSignal: () -> Unit,
    onRejectOrder: () -> Unit,
    language: PremiumLanguageOption
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(PremiumColors.Background)
            .statusBarsPadding()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .height(PremiumComponentSize.TopChromeHeight),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircleAction(Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
            Spacer(Modifier.width(16.dp))
            Text(
                text = language.ui("Vérifier ce paiement"),
                modifier = Modifier.weight(1f),
                color = PremiumColors.Ink,
                fontSize = PremiumType.ScreenTitle,
                fontWeight = FontWeight.Black
            )
        }
        LazyColumn(
            contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                LiquidGlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    radius = PremiumRadius.CardLarge,
                    color = PremiumColors.Warning.copy(alpha = 0.05f)
                ) {
                    Row(
                        Modifier.padding(24.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(20.dp)
                    ) {
                        Box(
                            Modifier
                                .size(64.dp)
                                .background(PremiumColors.Warning.copy(alpha = 0.15f), RoundedCornerShape(PremiumRadius.Card)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.WarningAmber,
                                contentDescription = null,
                                tint = PremiumColors.Warning,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                        Column {
                            Text(
                                text = language.ui(state.statusTitle),
                                color = PremiumColors.Warning,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Black
                            )
                            Text(
                                text = language.ui(state.statusText),
                                color = PremiumColors.SoftText,
                                fontSize = PremiumType.Body,
                                lineHeight = 21.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }
            item {
                LiquidGlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    radius = PremiumRadius.Card
                ) {
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                        state.summaryRows.forEachIndexed { index, row ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = language.ui(row.first),
                                    modifier = Modifier.weight(1f),
                                    color = PremiumColors.SoftText,
                                    fontSize = PremiumType.Body,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(
                                    text = row.second,
                                    color = PremiumColors.Ink,
                                    fontSize = PremiumType.Body,
                                    fontWeight = FontWeight.Black
                                )
                            }
                            if (index < state.summaryRows.size - 1) {
                                Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
                            }
                        }
                    }
                }
            }
            item {
                    SectionLabel(language.ui("POURQUOI VÉRIFIER ?"), Modifier.padding(top = 8.dp))
                Spacer(Modifier.height(12.dp))
                LiquidGlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    radius = PremiumRadius.Card
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        state.reasons.forEach {
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Box(Modifier.padding(top = 8.dp).size(6.dp).background(PremiumColors.Warning, RoundedCornerShape(PremiumRadius.Pill)))
                                Text(
                                    text = language.ui(it),
                                    color = PremiumColors.SoftText,
                                    fontSize = PremiumType.Body,
                                    fontWeight = FontWeight.SemiBold,
                                    lineHeight = 20.sp
                                )
                            }
                        }
                    }
                }
            }
            if (state.timeline.isNotEmpty()) {
                item {
                    SectionLabel(language.ui("PARCOURS DU PAIEMENT"), Modifier.padding(top = 8.dp))
                    Spacer(Modifier.height(12.dp))
                    LiquidGlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        radius = PremiumRadius.Card
                    ) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            state.timeline.forEachIndexed { index, label ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                                ) {
                                    Box(
                                        Modifier
                                            .size(28.dp)
                                            .background(PremiumColors.IconTile, RoundedCornerShape(8.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = "${index + 1}",
                                            color = PremiumColors.Blue,
                                            fontSize = PremiumType.Micro,
                                            fontWeight = FontWeight.Black
                                        )
                                    }
                                    Text(
                                        text = language.ui(label),
                                        color = PremiumColors.Ink,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }
            }
            if (state.actionMessage.isNotBlank()) {
                item {
                    StatusChip(language.ui(state.actionMessage), StatusTone.Info, Modifier.fillMaxWidth())
                }
            }
            if (state.actionsEnabled) {
                item {
                    Spacer(Modifier.height(8.dp))
                    PremiumPrimaryButton(
                        text = language.ui("Confirmer reçu"),
                        modifier = Modifier.fillMaxWidth(),
                        onClick = onConfirmReceived
                    )
                    Spacer(Modifier.height(12.dp))
                    PremiumSecondaryButton(
                        text = language.ui("Rejeter le signal"),
                        modifier = Modifier.fillMaxWidth(),
                        onClick = onRejectSignal
                    )
                    Spacer(Modifier.height(16.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(PremiumComponentSize.TouchTarget)
                            .premiumTap(onRejectOrder),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = language.ui("Annuler la commande"),
                            color = PremiumColors.Danger,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp,
                            letterSpacing = 0.5.sp
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
    onBack: () -> Unit,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(PremiumColors.Background)
            .statusBarsPadding()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .height(PremiumComponentSize.TopChromeHeight),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircleAction(Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
            Spacer(Modifier.width(16.dp))
            Text(
                text = language.ui("Vérifier ce paiement"),
                modifier = Modifier.weight(1f),
                color = PremiumColors.Ink,
                fontSize = PremiumType.ScreenTitle,
                fontWeight = FontWeight.Black
            )
        }
        LazyColumn(
            contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
        item { PremiumStatePanel(state.localized(language)) }
        }
    }
}

@Composable
private fun FilterLabel(icon: ImageVector, text: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(
        modifier
            .height(PremiumComponentSize.TouchTarget)
            .premiumTap(onClick)
            .padding(horizontal = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (selected) PremiumColors.Cyan else PremiumColors.SoftText,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = text.uppercase(),
                    color = if (selected) PremiumColors.Cyan else PremiumColors.SoftText,
                    fontSize = PremiumType.Micro,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    maxLines = 1
                )
            }
            if (selected) {
                Spacer(Modifier.height(6.dp))
                Box(
                    Modifier
                        .width(16.dp)
                        .height(2.dp)
                        .background(PremiumColors.Cyan, RoundedCornerShape(PremiumRadius.Pill))
                )
            }
        }
    }
}
