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
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Security
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
import androidx.compose.ui.tooling.preview.Preview
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
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                    Modifier
                        .size(52.dp)
                        .background(PremiumColors.IconTile, RoundedCornerShape(PremiumRadius.Tile)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                        contentDescription = null,
                        tint = PremiumColors.Blue,
                        modifier = Modifier.size(PremiumIconSize.Default)
                    )
                }
                Spacer(Modifier.weight(1f))
                StatusChip(language.ui(item.status), reviewTone(item.reviewStatus, item.valid))
            }
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = language.ui("Signal de paiement"),
                    color = PremiumColors.Ink,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 22.sp
                )
                Text(
                    text = item.helper,
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Caption,
                    fontWeight = FontWeight.SemiBold,
                    lineHeight = 17.sp
                )
            }
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(PremiumColors.PanelTint, RoundedCornerShape(PremiumRadius.Card))
            ) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    PremiumBankLogo(
                        bankProfileId = reviewBankProfileId(item.bank),
                        displayName = item.bank,
                        size = 42.dp
                    )
                    Column(Modifier.weight(1f).padding(start = 14.dp)) {
                        Text(
                            text = language.ui("Montant detecte"),
                            color = PremiumColors.SoftText,
                            fontSize = PremiumType.Micro,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.8.sp
                        )
                        Text(
                            text = item.amount,
                            color = PremiumColors.Ink,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                    Text(
                        text = item.bank,
                        color = PremiumColors.Muted,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.Black
                    )
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
            ReviewCardLine(
                label = language.ui("Review"),
                value = item.reviewId,
                icon = Icons.Default.Security
            )
            ReviewCardLine(
                label = language.ui("Raison"),
                value = item.reasons.firstOrNull()?.let(language::ui) ?: language.ui("Signal reconnu"),
                icon = Icons.Default.Sync
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = language.ui("Ouvrir la review"),
                    modifier = Modifier.weight(1f),
                    color = PremiumColors.Blue,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black
                )
                Chevron()
            }
        }
    }
}

@Composable
private fun ReviewCardLine(label: String, value: String, icon: ImageVector) {
    Row(
        Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Box(
            Modifier
                .size(30.dp)
                .background(PremiumColors.IconTile, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = PremiumColors.Blue, modifier = Modifier.size(16.dp))
        }
        Text(
            text = label.uppercase(),
            modifier = Modifier.width(76.dp),
            color = PremiumColors.SoftText,
            fontSize = PremiumType.Micro,
            fontWeight = FontWeight.Black,
            letterSpacing = 0.8.sp
        )
        Text(
            text = value,
            modifier = Modifier.weight(1f),
            color = PremiumColors.Ink,
            fontSize = PremiumType.Caption,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun reviewTone(status: ReviewUiStatus, valid: Boolean): PremiumTone {
    return when (status) {
        ReviewUiStatus.CONFIRMED -> StatusTone.Success
        ReviewUiStatus.REJECTED -> StatusTone.Danger
        ReviewUiStatus.TO_CONFIRM -> if (valid) StatusTone.Info else StatusTone.Warning
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
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.fillMaxSize())
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
                PaymentReviewCheckoutCard(
                    state = state,
                    language = language,
                    onConfirmReceived = onConfirmReceived,
                    onRejectSignal = onRejectSignal,
                    onRejectOrder = onRejectOrder
                )
            }
        }
    }
}

@Composable
private fun PaymentReviewCheckoutCard(
    state: PremiumPaymentDetailUiState,
    language: PremiumLanguageOption,
    onConfirmReceived: () -> Unit,
    onRejectSignal: () -> Unit,
    onRejectOrder: () -> Unit
) {
    val detectedAmount = state.summaryValue("Montant détecté", "Montant detecte", "Montant affiché", "Montant affiche")
    val expectedAmount = state.summaryValue("Montant exact attendu", "Montant attendu")
    val bank = state.summaryValue("Banque")
    val receivingMethod = state.summaryValue("Moyen de réception", "Moyen de reception")
    val reference = state.summaryValue("Référence", "Reference")
    val signalTime = state.summaryValue("Signal reçu", "Signal recu")
    val risk = state.summaryValue("Risque")

    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                    Modifier
                        .size(56.dp)
                        .background(PremiumColors.Warning.copy(alpha = 0.14f), RoundedCornerShape(PremiumRadius.Tile)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.WarningAmber,
                        contentDescription = null,
                        tint = PremiumColors.Warning,
                        modifier = Modifier.size(28.dp)
                    )
                }
                Spacer(Modifier.weight(1f))
                StatusChip(language.ui("Review"), StatusTone.Warning)
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = language.ui(state.statusTitle),
                    color = PremiumColors.Ink,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 28.sp
                )
                Text(
                    text = language.ui(state.statusText),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Body,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Column(
                Modifier
                    .fillMaxWidth()
                    .background(PremiumColors.PanelTint, RoundedCornerShape(PremiumRadius.CardLarge))
                    .padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Text(
                    text = language.ui("Montant a verifier"),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Micro,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
                Text(
                    text = detectedAmount.ifBlank { expectedAmount.ifBlank { "—" } },
                    color = PremiumColors.Ink,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 38.sp
                )
                if (expectedAmount.isNotBlank() && expectedAmount != detectedAmount) {
                    Text(
                        text = "${language.ui("Attendu")} $expectedAmount",
                        color = PremiumColors.Muted,
                        fontSize = PremiumType.Body,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            PaymentReviewRow(
                icon = Icons.Default.AccountBalanceWallet,
                label = language.ui("Reception"),
                primary = bank.ifBlank { language.ui("Banque non renseignee") },
                secondary = receivingMethod
            )
            PaymentReviewRow(
                icon = Icons.AutoMirrored.Filled.ReceiptLong,
                label = language.ui("Signal"),
                primary = signalTime.ifBlank { language.ui("Signal operationnel") },
                secondary = reference.ifBlank { state.reviewId }
            )
            PaymentReviewRow(
                icon = Icons.Default.Security,
                label = language.ui("Controle"),
                primary = risk.ifBlank { language.ui("Decision manuelle marchand") },
                secondary = state.reasons.joinToString(separator = " · ") { language.ui(it) }
            )

            if (state.timeline.isNotEmpty()) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SectionLabel(language.ui("Parcours"))
                    state.timeline.forEachIndexed { index, label ->
                        PaymentReviewTimelineItem(index + 1, language.ui(label))
                    }
                }
            }

            PaymentReviewContractPanel(language)

            if (state.actionMessage.isNotBlank()) {
                StatusChip(language.ui(state.actionMessage), StatusTone.Info, Modifier.fillMaxWidth())
            }

            if (state.actionsEnabled) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumPrimaryButton(
                        text = language.ui("Confirmer reçu"),
                        modifier = Modifier.fillMaxWidth(),
                        onClick = onConfirmReceived
                    )
                    PremiumSecondaryButton(
                        text = language.ui("Rejeter le signal"),
                        modifier = Modifier.fillMaxWidth(),
                        onClick = onRejectSignal
                    )
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
private fun PaymentReviewRow(
    icon: ImageVector,
    label: String,
    primary: String,
    secondary: String
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            Modifier
                .size(40.dp)
                .background(PremiumColors.IconTile, RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = PremiumColors.Blue, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = label.uppercase(),
                color = PremiumColors.SoftText,
                fontSize = PremiumType.Micro,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.8.sp
            )
            Text(
                text = primary,
                color = PremiumColors.Ink,
                fontSize = PremiumType.Body,
                fontWeight = FontWeight.Black
            )
            if (secondary.isNotBlank()) {
                Text(
                    text = secondary,
                    color = PremiumColors.Muted,
                    fontSize = PremiumType.Caption,
                    fontWeight = FontWeight.SemiBold,
                    lineHeight = 17.sp
                )
            }
        }
    }
}

@Composable
private fun PaymentReviewTimelineItem(index: Int, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            Modifier
                .size(26.dp)
                .background(PremiumColors.NeutralChip, RoundedCornerShape(9.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = index.toString(),
                color = PremiumColors.Blue,
                fontSize = PremiumType.Micro,
                fontWeight = FontWeight.Black
            )
        }
        Text(
            text = label,
            color = PremiumColors.Ink,
            fontSize = PremiumType.Caption,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun PaymentReviewContractPanel(language: PremiumLanguageOption) {
    Row(
        Modifier
            .fillMaxWidth()
            .background(PremiumColors.NeutralChip, RoundedCornerShape(PremiumRadius.Card))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = PremiumColors.Success,
            modifier = Modifier.size(22.dp)
        )
        Text(
            text = language.ui("Validation manuelle uniquement. Android capture le signal, le backend decide, le marchand confirme."),
            color = PremiumColors.Muted,
            fontSize = PremiumType.Caption,
            fontWeight = FontWeight.Bold,
            lineHeight = 17.sp
        )
    }
}

private fun PremiumPaymentDetailUiState.summaryValue(vararg labels: String): String {
    return summaryRows.firstOrNull { row ->
        val normalized = row.first.lowercase()
        labels.any { label -> normalized.contains(label.lowercase()) }
    }?.second.orEmpty()
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

@Preview(name = "Review list checkout style", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 720)
@Composable
private fun PremiumReviewsCheckoutStylePreview() {
    PremiumColors.useDarkTheme(false)
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.fillMaxSize())
        PremiumReviewsScreen()
    }
}

@Preview(name = "Review detail checkout style", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 820)
@Composable
private fun PremiumPaymentDetailCheckoutStylePreview() {
    PremiumColors.useDarkTheme(false)
    PremiumPaymentDetailScreen()
}

@Preview(name = "Review detail checkout style dark", showBackground = true, backgroundColor = 0xFF050406, widthDp = 390, heightDp = 820)
@Composable
private fun PremiumPaymentDetailCheckoutStyleDarkPreview() {
    PremiumColors.useDarkTheme(true)
    PremiumPaymentDetailScreen()
}
