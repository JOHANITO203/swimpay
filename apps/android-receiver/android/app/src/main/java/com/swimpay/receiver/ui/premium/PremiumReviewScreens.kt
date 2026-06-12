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
                    color = PremiumColors.PageInk,
                    style = androidx.compose.ui.text.TextStyle(
                        fontSize = PremiumType.ScreenTitle,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 30.sp
                    )
                )
                Text(
                    text = language.ui("Confirmez uniquement les paiements que vous reconnaissez."),
                    color = PremiumColors.PageMuted,
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
                    color = PremiumColors.PageInk,
                    style = androidx.compose.ui.text.TextStyle(
                        fontSize = PremiumType.ScreenTitle,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 30.sp
                    )
                )
                Text(
                    text = language.ui("Confirmez uniquement les paiements que vous reconnaissez."),
                    color = PremiumColors.PageMuted,
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
                    fontWeight = FontWeight.Bold,
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
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp
                        )
                        Text(
                            text = item.amount,
                            color = PremiumColors.Ink,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = item.bank,
                        color = PremiumColors.Muted,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.Bold
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
                    fontWeight = FontWeight.Bold
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
            fontWeight = FontWeight.Bold,
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
                color = PremiumColors.PageInk,
                fontSize = PremiumType.ScreenTitle,
                fontWeight = FontWeight.Bold
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
    val score = state.summaryValue("Score")

    val verdict = paymentReviewVerdict(state, expectedAmount, detectedAmount)
    val heroAmount = detectedAmount.ifBlank { expectedAmount.ifBlank { "—" } }
    val displayBank = bank.ifBlank { language.ui("Décision manuelle marchand") }
    val payerLine = listOf(displayBank, signalTime)
        .filter { it.isNotBlank() }
        .joinToString(separator = " · ")

    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            // Verdict banner: rail/bank logo + verdict headline + decision chip.
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                PremiumBankLogo(
                    bankProfileId = reviewBankProfileId(bank),
                    displayName = bank.ifBlank { "Bank" },
                    size = 52.dp
                )
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = language.ui(state.statusTitle),
                        color = PremiumColors.Ink,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 22.sp
                    )
                    if (payerLine.isNotBlank()) {
                        Text(
                            text = payerLine,
                            color = PremiumColors.SoftText,
                            fontSize = PremiumType.Caption,
                            fontWeight = FontWeight.SemiBold,
                            lineHeight = 16.sp
                        )
                    }
                }
                StatusChip(language.ui(verdict.chipLabel), verdict.tone)
            }

            // Hero: received amount in success green + verdict explanation.
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = language.ui("Montant à vérifier").uppercase(),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Micro,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
                Text(
                    text = heroAmount,
                    color = PremiumColors.Success,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 38.sp
                )
                Text(
                    text = language.ui(state.statusText),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Body,
                    lineHeight = 20.sp,
                    fontWeight = FontWeight.SemiBold
                )
                if (expectedAmount.isNotBlank() && expectedAmount != detectedAmount) {
                    Text(
                        text = "${language.ui("Montant exact")} · $expectedAmount",
                        color = PremiumColors.Muted,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Captured notification panel.
            Column(
                Modifier
                    .fillMaxWidth()
                    .background(PremiumColors.PanelTint, RoundedCornerShape(PremiumRadius.CardLarge))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                SectionLabel(language.ui("NOTIFICATION CAPTÉE"))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        Modifier
                            .size(40.dp)
                            .background(PremiumColors.IconTile, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ReceiptLong,
                            contentDescription = null,
                            tint = PremiumColors.Blue,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = displayBank,
                            color = PremiumColors.Ink,
                            fontSize = PremiumType.Body,
                            fontWeight = FontWeight.Bold,
                            lineHeight = 18.sp
                        )
                        Text(
                            text = receivingMethod.ifBlank { reference.ifBlank { state.reviewId } },
                            color = PremiumColors.Muted,
                            fontSize = PremiumType.Caption,
                            fontWeight = FontWeight.SemiBold,
                            lineHeight = 16.sp
                        )
                    }
                    if (signalTime.isNotBlank()) {
                        Text(
                            text = signalTime,
                            color = PremiumColors.SoftText,
                            fontSize = PremiumType.Caption,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Provenance verification signals.
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SectionLabel(language.ui("SIGNAUX DE PROVENANCE"))
                ProvenanceCheckRow(language.ui("Application source"), displayBank, verified = bank.isNotBlank())
                ProvenanceCheckRow(
                    language.ui("Canal de notification"),
                    risk.ifBlank { language.ui("Reconnu") },
                    verified = true
                )
                ProvenanceCheckRow(
                    language.ui("Montant exact"),
                    expectedAmount.ifBlank { detectedAmount },
                    verified = expectedAmount.isBlank() || expectedAmount == detectedAmount
                )
                if (reference.isNotBlank()) {
                    ProvenanceCheckRow(language.ui("Référence"), reference, verified = true)
                }
                // Confidence reasons (gate verdict rationale) preserved verbatim.
                state.reasons.forEach { reason ->
                    ProvenanceCheckRow(
                        language.ui("Rapprochement commande"),
                        language.ui(reason),
                        verified = verdict.tone == StatusTone.Success
                    )
                }
            }

            // Confidence bar derived from the backend score when present.
            paymentReviewConfidence(score)?.let { fraction ->
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = language.ui("Confiance"),
                            modifier = Modifier.weight(1f),
                            color = PremiumColors.Ink,
                            fontSize = PremiumType.Body,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${(fraction * 100).toInt()} %",
                            color = PremiumColors.Success,
                            fontSize = PremiumType.Body,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    ConfidenceBar(fraction)
                }
            }

            // Payment timeline (parcours).
            if (state.timeline.isNotEmpty()) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line))
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    SectionLabel(language.ui("PARCOURS DU PAIEMENT"))
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
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            letterSpacing = 0.5.sp
                        )
                    }
                }
            }
        }
    }
}

private data class PaymentReviewVerdict(val chipLabel: String, val tone: PremiumTone)

private fun paymentReviewVerdict(
    state: PremiumPaymentDetailUiState,
    expectedAmount: String,
    detectedAmount: String
): PaymentReviewVerdict {
    val signal = (state.statusTitle + " " + state.actionMessage).lowercase()
    return when {
        signal.contains("rejet") || signal.contains("annul") || signal.contains("refus") ->
            PaymentReviewVerdict("Rejeter le signal", StatusTone.Danger)
        signal.contains("confirm") || signal.contains("validé") || signal.contains("traité") ->
            PaymentReviewVerdict("Confirmer reçu", StatusTone.Success)
        else -> PaymentReviewVerdict("En cours", StatusTone.Warning)
    }
}

private fun paymentReviewConfidence(scoreValue: String): Float? {
    val digits = scoreValue.filter { it.isDigit() }
    if (digits.isBlank()) return null
    val percent = digits.toIntOrNull() ?: return null
    return (percent.coerceIn(0, 100)) / 100f
}

@Composable
private fun ProvenanceCheckRow(label: String, value: String, verified: Boolean) {
    val tint = if (verified) PremiumColors.Success else PremiumColors.Warning
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(
            imageVector = if (verified) Icons.Default.CheckCircle else Icons.Default.WarningAmber,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(20.dp)
        )
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(1.dp)) {
            Text(
                text = label.uppercase(),
                color = PremiumColors.SoftText,
                fontSize = PremiumType.Micro,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.8.sp
            )
            if (value.isNotBlank()) {
                Text(
                    text = value,
                    color = PremiumColors.Ink,
                    fontSize = PremiumType.Caption,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 16.sp
                )
            }
        }
    }
}

@Composable
private fun ConfidenceBar(fraction: Float) {
    Box(
        Modifier
            .fillMaxWidth()
            .height(8.dp)
            .background(PremiumColors.NeutralChip, RoundedCornerShape(PremiumRadius.Pill))
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .fillMaxHeight()
                .background(PremiumColors.Success, RoundedCornerShape(PremiumRadius.Pill))
        )
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
                fontWeight = FontWeight.Bold
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
                color = PremiumColors.PageInk,
                fontSize = PremiumType.ScreenTitle,
                fontWeight = FontWeight.Bold
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
                    tint = if (selected) PremiumColors.Teal else PremiumColors.PageMuted,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = text.uppercase(),
                    color = if (selected) PremiumColors.Teal else PremiumColors.PageMuted,
                    fontSize = PremiumType.Micro,
                    fontWeight = FontWeight.Bold,
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
                        .background(PremiumColors.Teal, RoundedCornerShape(PremiumRadius.Pill))
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
