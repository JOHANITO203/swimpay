package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

@Composable
fun PremiumReviewsScreen(
    state: PremiumScreenState<PremiumReviewsUiState> = PremiumScreenState.content(PremiumReviewsUiState.preview()),
    onOpenReview: (String) -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    // Contexte « à traiter » : accent ambre (attention/décision). Chaque carte garde
    // ensuite la couleur de son provider réel. Halos d'accent comme le prototype .device.
    CompositionLocalProvider(LocalNoirAccent provides NoirColors.warn) {
        Box(
            Modifier
                .fillMaxSize()
                .background(NoirColors.bg)
                .drawBehind {
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(NoirColors.warn.copy(alpha = 0.09f), Color.Transparent),
                            center = Offset(size.width * 0.5f, -size.height * 0.06f),
                            radius = size.maxDimension * 0.5f
                        )
                    )
                }
        ) {
            when (state) {
                is PremiumScreenState.Content -> PremiumReviewsContent(state.value, onOpenReview, language)
                else -> PremiumReviewsState(state, language)
            }
        }
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
    // Compteur réel d'éléments à confirmer (pas de total monétaire fabriqué : les
    // montants sont des libellés déjà formatés, devises potentiellement mixtes —
    // on n'invente pas de somme).
    val toConfirmCount = PremiumReviewFilter.TO_CONFIRM.countFor(state.items)
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = NoirSpacing.Screen),
        contentPadding = PaddingValues(top = 16.dp, bottom = PremiumSpacing.BottomNavHeight + 20.dp),
        verticalArrangement = Arrangement.spacedBy(NoirSpacing.Item)
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = language.ui("À traiter"),
                    modifier = Modifier.weight(1f),
                    color = NoirColors.ink1,
                    style = NoirTextStyle.H1.copy(fontSize = 24.sp)
                )
                if (toConfirmCount > 0) {
                    Box(
                        Modifier
                            .clip(CircleShape)
                            .background(NoirColors.warn)
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = toConfirmCount.toString(),
                            color = NoirColors.bg,
                            style = NoirTextStyle.Micro.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold, fontFeatureSettings = PremiumTabularNumbers)
                        )
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            ReviewIntroCard(toConfirmCount, language)
            Spacer(Modifier.height(20.dp))
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
            Spacer(Modifier.height(4.dp))
            NoirSectionLabel(language.ui("En attente de validation"))
        }
        if (filteredItems.isEmpty()) {
            item { ReviewEmptyRow(selectedFilter, language) }
        } else {
            items(filteredItems) { item -> ReviewPaymentCard(item, onOpenReview, language) }
        }
    }
}

// Bandeau d'intro ambre (prototype .intro) : compteur réel + cadrage honnête du modèle.
@Composable
private fun ReviewIntroCard(toConfirmCount: Int, language: PremiumLanguageOption) {
    val shape = RoundedCornerShape(NoirRadius.Spark)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.warn.copy(alpha = 0.08f))
            .border(1.dp, NoirColors.warn.copy(alpha = 0.20f), shape)
            .padding(horizontal = 18.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        val title = if (toConfirmCount > 0) {
            "$toConfirmCount ${language.ui("paiement(s) à valider")}"
        } else {
            language.ui("Aucun paiement à valider")
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            Icon(
                imageVector = Icons.Default.WarningAmber,
                contentDescription = null,
                tint = NoirColors.warn,
                modifier = Modifier.size(18.dp)
            )
            Text(
                text = title,
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            )
        }
        Text(
            text = language.ui("Android capture le signal, le backend décide, le marchand confirme. Une dernière confirmation humaine est requise sur chacun."),
            color = NoirColors.ink2,
            style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp, lineHeight = 18.sp)
        )
    }
}

// Ligne « rien à afficher » pour le filtre courant (état vide honnête, sans carte vide).
@Composable
private fun ReviewEmptyRow(filter: PremiumReviewFilter, language: PremiumLanguageOption) {
    Text(
        text = language.ui(filter.emptyLabel),
        modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
        color = NoirColors.ink3,
        style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp),
        textAlign = androidx.compose.ui.text.style.TextAlign.Center
    )
}

private enum class PremiumReviewFilter(
    val label: String,
    val icon: ImageVector,
    val weight: Float,
    val emptyLabel: String
) {
    ALL("Tout", Icons.Default.GridView, 1f, "Aucun paiement pour le moment."),
    TO_CONFIRM("À confirmer", Icons.Default.Sync, 1.35f, "Aucun paiement à confirmer pour le moment."),
    CONFIRMED("Confirmés", Icons.Default.CheckCircle, 1f, "Aucun paiement confirmé pour le moment."),
    REJECTED("Rejetés", Icons.Default.WarningAmber, 1f, "Aucun paiement rejeté pour le moment.");

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
        Modifier.fillMaxSize().padding(horizontal = NoirSpacing.Screen),
        contentPadding = PaddingValues(top = 16.dp, bottom = PremiumSpacing.BottomNavHeight + 20.dp),
        verticalArrangement = Arrangement.spacedBy(NoirSpacing.Item)
    ) {
        item {
            Text(
                text = language.ui("À traiter"),
                color = NoirColors.ink1,
                style = NoirTextStyle.H1.copy(fontSize = 24.sp)
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = language.ui("Confirmez uniquement les paiements que vous reconnaissez."),
                color = NoirColors.ink2,
                style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp, lineHeight = 18.sp)
            )
        }
        item { PremiumStatePanel(state.localized(language)) }
    }
}

// Carte de décision « noir vivant » (prototype .rcard). Données 100% réelles :
// cercle provider coloré (couleur du provider réel), banque + statut + horodatage
// helper réels, montant réel (ink1, tabulaire), verdict HONNÊTE (aucune note /100
// fabriquée — le score n'existe qu'au niveau du détail), motif réel (la raison du
// review), et l'action réelle : ouvrir le détail pour décider (le modèle queue n'a
// pas d'action inline ; la décision se prend sur l'écran détail).
@Composable
private fun ReviewPaymentCard(item: PremiumReviewUiItem, onOpenReview: (String) -> Unit, language: PremiumLanguageOption) {
    val verdict = reviewQueueVerdict(item.reviewStatus, item.valid)
    val providerColor = reviewProviderAccent(item.bank)
    val shape = RoundedCornerShape(NoirRadius.Card)
    val reason = item.reasons.firstOrNull()?.let(language::ui).orEmpty()
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .premiumTap { onOpenReview(item.reviewId) }
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            // Cercle provider : couleur du provider réel + initiale réelle de la banque.
            Box(
                Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(providerColor),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = item.bank.trim().take(1).uppercase().ifBlank { "?" },
                    color = Color.White,
                    style = NoirTextStyle.Label.copy(fontSize = 16.sp, fontWeight = FontWeight.Bold)
                )
            }
            Column(Modifier.weight(1f)) {
                Text(
                    text = item.bank.ifBlank { language.ui("Provider inconnu") },
                    color = NoirColors.ink1,
                    style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
                    maxLines = 1
                )
                if (item.helper.isNotBlank()) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = item.helper,
                        color = NoirColors.ink3,
                        style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp),
                        maxLines = 1
                    )
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = item.amount,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.TxAmount.copy(fontSize = 18.sp, fontWeight = FontWeight.Bold)
                )
                Spacer(Modifier.height(3.dp))
                // Verdict honnête (pas de score fabriqué) : libellé + pastille de tonalité.
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Icon(
                        imageVector = verdict.icon,
                        contentDescription = null,
                        tint = verdict.color,
                        modifier = Modifier.size(13.dp)
                    )
                    Text(
                        text = language.ui(verdict.label),
                        color = verdict.color,
                        style = NoirTextStyle.Micro.copy(fontSize = 10.5.sp, fontWeight = FontWeight.Bold)
                    )
                }
            }
        }
        // Motif réel : la raison spécifique pour laquelle ce paiement est en review.
        if (reason.isNotBlank()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(NoirRadius.ButtonTight))
                    .background(NoirColors.warn.copy(alpha = 0.09f))
                    .border(1.dp, NoirColors.warn.copy(alpha = 0.18f), RoundedCornerShape(NoirRadius.ButtonTight))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(9.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.WarningAmber,
                    contentDescription = null,
                    tint = NoirColors.warn,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = reason,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.Micro.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold, lineHeight = 16.sp)
                )
            }
        }
        // Action réelle : ouvrir le détail pour décider (Confirmer/Rejeter y sont branchés).
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(NoirRadius.Button))
                .border(1.dp, NoirColors.hair2, RoundedCornerShape(NoirRadius.Button))
                .premiumTap { onOpenReview(item.reviewId) }
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = language.ui("Examiner"),
                modifier = Modifier.weight(1f),
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold)
            )
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                contentDescription = null,
                tint = NoirColors.ink2,
                modifier = Modifier.size(16.dp)
            )
        }
    }
}

private data class ReviewQueueVerdict(val label: String, val color: Color, val icon: ImageVector)

// Verdict honnête dérivé du statut réel + drapeau `valid` réel. Aucun /100 inventé :
// le score chiffré n'existe qu'au niveau du détail (paymentScoreLabel), pas en queue.
private fun reviewQueueVerdict(status: ReviewUiStatus, valid: Boolean): ReviewQueueVerdict {
    return when (status) {
        ReviewUiStatus.CONFIRMED -> ReviewQueueVerdict("Confirmé", NoirColors.success, Icons.Default.CheckCircle)
        ReviewUiStatus.REJECTED -> ReviewQueueVerdict("Rejeté", NoirColors.danger, Icons.Default.WarningAmber)
        ReviewUiStatus.TO_CONFIRM ->
            if (valid) ReviewQueueVerdict("À confirmer", NoirColors.success, Icons.Default.CheckCircle)
            else ReviewQueueVerdict("À vérifier", NoirColors.warn, Icons.Default.WarningAmber)
    }
}

// Couleur provider par carte (Caméléon) : dérivée de la banque réelle via WalletSkins
// quand un skin existe, sinon une teinte de marque connue, sinon accent neutre.
private fun reviewProviderAccent(bank: String): Color {
    val skinId = when (reviewBankProfileId(bank)) {
        "sber_ru" -> "sber"
        else -> null
    }
    skinId?.let { id -> WalletSkins.byId(id)?.let { return it.accent } }
    return when {
        bank.contains("wave", ignoreCase = true) -> NoirColors.wave
        bank.contains("orange", ignoreCase = true) -> NoirColors.orange
        bank.contains("usdt", ignoreCase = true) || bank.contains("tether", ignoreCase = true) -> NoirColors.usdt
        bank.contains("free", ignoreCase = true) -> NoirColors.free
        bank.contains("sber", ignoreCase = true) -> NoirColors.sber
        else -> NoirColors.amber
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
    // Caméléon : l'accent provient du fournisseur réel de ce paiement (banque/rail),
    // donc la jauge et les liens prennent la teinte du provider. Pas d'accent inventé :
    // un détail inconnu retombe sur l'accent neutre du langage.
    val bankName = (state as? PremiumScreenState.Content)?.value?.summaryValue("Banque").orEmpty()
    val accent = paymentDetailAccent(bankName)
    CompositionLocalProvider(LocalNoirAccent provides accent) {
        Box(
            Modifier
                .fillMaxSize()
                .background(NoirColors.bg)
                .drawBehind {
                    // Halos d'accent (prototype .device) : profondeur par luminosité, sans ombre.
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(accent.copy(alpha = 0.09f), Color.Transparent),
                            center = Offset(size.width * 0.5f, -size.height * 0.06f),
                            radius = size.maxDimension * 0.5f
                        )
                    )
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(accent.copy(alpha = 0.05f), Color.Transparent),
                            center = Offset(size.width * 0.8f, size.height * 1.04f),
                            radius = size.maxDimension * 0.5f
                        )
                    )
                }
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
    val detectedAmount = state.summaryValue("Montant détecté", "Montant detecte", "Montant affiché", "Montant affiche")
    val expectedAmount = state.summaryValue("Montant exact attendu", "Montant attendu")
    val bank = state.summaryValue("Banque")
    val receivingMethod = state.summaryValue("Moyen de réception", "Moyen de reception", "Route", "Canal")
    val reference = state.summaryValue("Référence", "Reference")
    val signalTime = state.summaryValue("Signal reçu", "Signal recu")
    val risk = state.summaryValue("Risque")
    val score = state.summaryValue("Score")

    val verdict = paymentReviewVerdict(state, expectedAmount, detectedAmount)
    val heroAmount = detectedAmount.ifBlank { expectedAmount.ifBlank { "—" } }
    val displayBank = bank.ifBlank { language.ui("Décision manuelle marchand") }
    val fromLine = listOf(displayBank, receivingMethod)
        .filter { it.isNotBlank() }
        .joinToString(separator = " · ")

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier
                .fillMaxSize()
                .statusBarsPadding(),
            contentPadding = PaddingValues(
                start = NoirSpacing.Screen,
                end = NoirSpacing.Screen,
                top = 6.dp,
                // Réserve sous le bandeau d'actions ancré en bas.
                bottom = 168.dp
            ),
            verticalArrangement = Arrangement.spacedBy(NoirSpacing.Item)
        ) {
            // Top bar : retour + titre + « plus » (cohérent prototype .topbar).
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 4.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    NoirCircleButton(Icons.AutoMirrored.Filled.ArrowBack, language.ui("Retour"), onClick = onBack)
                    Text(
                        text = language.ui("Transaction"),
                        modifier = Modifier.weight(1f),
                        color = NoirColors.ink1,
                        style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    NoirCircleButton(Icons.Default.MoreHoriz, language.ui("Plus"))
                }
            }

            // Identité fournisseur + montant focal + verdict.
            item {
                NoirIdentityFocal(
                    bank = bank,
                    displayBank = displayBank,
                    fromLine = fromLine,
                    heroAmount = heroAmount,
                    statusTitle = language.ui(state.statusTitle),
                    statusText = language.ui(state.statusText),
                    expectedAmount = expectedAmount,
                    detectedAmount = detectedAmount,
                    verdict = verdict,
                    signalTime = signalTime,
                    language = language
                )
            }

            // Jauge de confiance : score réel si présent, sinon bande honnête du verdict.
            item {
                NoirConfidenceGauge(
                    score = score,
                    verdict = verdict,
                    statusText = language.ui(state.statusText),
                    language = language
                )
            }

            // Provenance : preuves réelles (signaux dérivés + raisons du gate, verbatim).
            item {
                NoirSectionLabel(language.ui("Provenance"))
            }
            item {
                NoirProvenanceCard(
                    bank = bank,
                    displayBank = displayBank,
                    risk = risk,
                    expectedAmount = expectedAmount,
                    detectedAmount = detectedAmount,
                    reference = reference,
                    reasons = state.reasons,
                    verdict = verdict,
                    language = language
                )
            }

            // Parcours : timeline réelle.
            if (state.timeline.isNotEmpty()) {
                item { NoirSectionLabel(language.ui("Parcours")) }
                item { NoirJourney(state.timeline.map(language::ui)) }
            }

            // Détails : lignes meta réelles (référence / canal / identifiant).
            val metaRows = state.summaryRows.filter { it.second.isNotBlank() }
            if (metaRows.isNotEmpty()) {
                item { NoirSectionLabel(language.ui("Détails")) }
                item { NoirMetaCard(metaRows.map { it.first to it.second }) }
            }

            item { NoirContractNote(language) }

            if (state.actionMessage.isNotBlank()) {
                item {
                    Text(
                        text = language.ui(state.actionMessage),
                        color = NoirColors.ink2,
                        style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp),
                        modifier = Modifier.fillMaxWidth().padding(top = 2.dp)
                    )
                }
            }
        }

        // Bandeau d'actions ancré (prototype .actions) — décisions argent réel.
        if (state.actionsEnabled) {
            NoirActionBar(
                language = language,
                onConfirmReceived = onConfirmReceived,
                onRejectSignal = onRejectSignal,
                onRejectOrder = onRejectOrder,
                modifier = Modifier.align(Alignment.BottomCenter)
            )
        }
    }
}

// Identité + montant focal + chip verdict (prototype .idblock + .focal + .recv).
@Composable
private fun NoirIdentityFocal(
    bank: String,
    displayBank: String,
    fromLine: String,
    heroAmount: String,
    statusTitle: String,
    statusText: String,
    expectedAmount: String,
    detectedAmount: String,
    verdict: PaymentReviewVerdict,
    signalTime: String,
    language: PremiumLanguageOption
) {
    Column(
        Modifier.fillMaxWidth().padding(top = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        PremiumBankLogo(
            bankProfileId = reviewBankProfileId(bank),
            displayName = bank.ifBlank { "Bank" },
            size = 60.dp
        )
        Spacer(Modifier.height(14.dp))
        Text(
            text = statusTitle,
            color = NoirColors.ink1,
            style = NoirTextStyle.Label.copy(fontSize = 17.sp, fontWeight = FontWeight.SemiBold),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        if (fromLine.isNotBlank()) {
            Spacer(Modifier.height(3.dp))
            Text(
                text = fromLine,
                color = NoirColors.ink2,
                style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
        Spacer(Modifier.height(16.dp))
        Text(
            text = heroAmount,
            color = NoirColors.ink1,
            style = NoirTextStyle.Amount.copy(fontSize = 40.sp),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        if (expectedAmount.isNotBlank() && expectedAmount != detectedAmount) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = "${language.ui("Montant exact")} · $expectedAmount",
                color = NoirColors.ink3,
                style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp, fontFeatureSettings = PremiumTabularNumbers)
            )
        }
        Spacer(Modifier.height(12.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NoirVerdictChip(verdict)
            if (signalTime.isNotBlank()) {
                Text(
                    text = signalTime,
                    color = NoirColors.ink2,
                    style = NoirTextStyle.Micro.copy(fontSize = 12.sp, fontFeatureSettings = PremiumTabularNumbers)
                )
            }
        }
    }
}

// Chip verdict : succès (vert) / à vérifier (warn) / rejet (danger). Tonalité honnête.
@Composable
private fun NoirVerdictChip(verdict: PaymentReviewVerdict) {
    val color = verdict.color
    Row(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.14f))
            .padding(horizontal = 11.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp)
    ) {
        Icon(
            imageVector = verdict.icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(13.dp)
        )
        Text(
            text = verdict.bandLabel,
            color = color,
            style = NoirTextStyle.Micro.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold)
        )
    }
}

// Jauge de confiance : arc Caméléon. Si un score réel existe (ligne « Score »), il est
// affiché en /100 ; SINON aucune valeur n'est fabriquée — on rend la bande honnête du
// verdict (« Confiance élevée » / « À vérifier » / « Signal rejeté ») avec un arc dont la
// proportion suit la tonalité, sans inventer de /100.
@Composable
private fun NoirConfidenceGauge(
    score: String,
    verdict: PaymentReviewVerdict,
    statusText: String,
    language: PremiumLanguageOption
) {
    val accent = LocalNoirAccent.current
    val realScore = paymentReviewConfidence(score)
    // Proportion d'arc honnête : score réel s'il existe, sinon ancrage par tonalité de
    // verdict (succès plein, à-vérifier partiel, rejet faible) — repère visuel, pas une note.
    val fraction = realScore ?: when (verdict.tone) {
        StatusTone.Success -> 1f
        StatusTone.Danger -> 0.28f
        else -> 0.62f
    }
    val shape = RoundedCornerShape(NoirRadius.Card)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        Box(Modifier.size(84.dp), contentAlignment = Alignment.Center) {
            Canvas(Modifier.size(84.dp)) {
                val stroke = 7.dp.toPx()
                val arcSize = Size(size.width - stroke, size.height - stroke)
                val topLeft = Offset(stroke / 2f, stroke / 2f)
                drawArc(
                    color = NoirColors.ink1.copy(alpha = 0.07f),
                    startAngle = -90f,
                    sweepAngle = 360f,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )
                drawArc(
                    color = accent,
                    startAngle = -90f,
                    sweepAngle = 360f * fraction.coerceIn(0f, 1f),
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (realScore != null) {
                    Text(
                        text = (realScore * 100).toInt().toString(),
                        color = NoirColors.ink1,
                        style = NoirTextStyle.AmountMedium.copy(fontSize = 26.sp, letterSpacing = (-0.02).em)
                    )
                    Text(
                        text = "/ 100",
                        color = NoirColors.ink2,
                        style = NoirTextStyle.Micro.copy(fontSize = 8.5.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.08.em)
                    )
                } else {
                    // Aucune note fabriquée : pictogramme de tonalité dans l'arc.
                    Icon(
                        imageVector = verdict.icon,
                        contentDescription = null,
                        tint = verdict.color,
                        modifier = Modifier.size(26.dp)
                    )
                }
            }
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = if (realScore != null) language.ui("Score de confiance") else language.ui("Niveau de confiance"),
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            )
            Text(
                text = buildConfidenceCopy(realScore != null, verdict, statusText, language),
                color = NoirColors.ink2,
                style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp, lineHeight = 18.sp)
            )
        }
    }
}

private fun buildConfidenceCopy(
    hasRealScore: Boolean,
    verdict: PaymentReviewVerdict,
    statusText: String,
    language: PremiumLanguageOption
): String {
    val lead = language.ui(verdict.bandLabel) + "."
    // Si pas de score réel, on n'affirme rien de chiffré : on relie la bande au texte de verdict réel.
    return if (statusText.isNotBlank()) "$lead $statusText" else lead
}

// Carte provenance : signaux dérivés (réels) + raisons du gate (verbatim).
@Composable
private fun NoirProvenanceCard(
    bank: String,
    displayBank: String,
    risk: String,
    expectedAmount: String,
    detectedAmount: String,
    reference: String,
    reasons: List<String>,
    verdict: PaymentReviewVerdict,
    language: PremiumLanguageOption
) {
    val shape = RoundedCornerShape(NoirRadius.Spark)
    val rows = buildList {
        add(NoirProofRow(language.ui("Application source"), displayBank, ok = bank.isNotBlank()))
        add(NoirProofRow(language.ui("Canal de notification"), risk.ifBlank { language.ui("Reconnu") }, ok = true))
        val amountOk = expectedAmount.isBlank() || expectedAmount == detectedAmount
        add(
            NoirProofRow(
                language.ui("Montant exact"),
                expectedAmount.ifBlank { detectedAmount },
                ok = amountOk
            )
        )
        if (reference.isNotBlank()) {
            add(NoirProofRow(language.ui("Référence"), reference, ok = true))
        }
        // Raisons du gate (décision backend) : texte réel préservé verbatim.
        reasons.forEach { reason ->
            add(NoirProofRow(language.ui("Rapprochement commande"), language.ui(reason), ok = verdict.tone == StatusTone.Success))
        }
    }
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
    ) {
        rows.forEachIndexed { index, row ->
            NoirProofRowView(row)
            if (index < rows.lastIndex) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(NoirColors.hair))
            }
        }
    }
}

private data class NoirProofRow(val title: String, val value: String, val ok: Boolean)

@Composable
private fun NoirProofRowView(row: NoirProofRow) {
    val tint = if (row.ok) NoirColors.success else NoirColors.warn
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        Box(
            Modifier
                .size(26.dp)
                .clip(CircleShape)
                .background(tint.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (row.ok) Icons.Default.CheckCircle else Icons.Default.WarningAmber,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(15.dp)
            )
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = row.title,
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            )
            if (row.value.isNotBlank()) {
                Text(
                    text = row.value,
                    color = NoirColors.ink3,
                    style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp)
                )
            }
        }
    }
}

// Timeline (prototype .journey) : trail de pas réels.
@Composable
private fun NoirJourney(steps: List<String>) {
    val accent = LocalNoirAccent.current
    val shape = RoundedCornerShape(NoirRadius.Spark)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        steps.forEachIndexed { index, label ->
            val isLast = index == steps.lastIndex
            // Le dernier pas est « en attente » (non rempli) — cohérent prototype.
            val done = !isLast
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        Modifier
                            .size(14.dp)
                            .clip(CircleShape)
                            .background(if (done) accent else NoirColors.surface)
                            .border(if (done) 0.dp else 2.dp, if (done) Color.Transparent else NoirColors.ink3, CircleShape)
                    )
                    if (!isLast) {
                        Box(
                            Modifier
                                .width(2.dp)
                                .height(20.dp)
                                .background(accent.copy(alpha = 0.5f))
                        )
                    }
                }
                Text(
                    text = label,
                    color = if (done) NoirColors.ink1 else NoirColors.ink2,
                    style = NoirTextStyle.Label.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.padding(bottom = if (isLast) 0.dp else 12.dp)
                )
            }
        }
    }
}

// Détails meta (prototype .meta) : lignes clé/valeur réelles.
@Composable
private fun NoirMetaCard(rows: List<Pair<String, String>>) {
    val shape = RoundedCornerShape(NoirRadius.Spark)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
    ) {
        rows.forEachIndexed { index, (key, value) ->
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 13.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = key,
                    modifier = Modifier.weight(1f),
                    color = NoirColors.ink2,
                    style = NoirTextStyle.Label.copy(fontSize = 13.sp, fontWeight = FontWeight.Medium)
                )
                Text(
                    text = value,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.Label.copy(
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        fontFeatureSettings = PremiumTabularNumbers
                    ),
                    textAlign = androidx.compose.ui.text.style.TextAlign.End
                )
            }
            if (index < rows.lastIndex) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(NoirColors.hair))
            }
        }
    }
}

// Note de contrat : rappel honnête du modèle (capture / décision backend / confirmation marchand).
@Composable
private fun NoirContractNote(language: PremiumLanguageOption) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(NoirRadius.Tile))
            .background(NoirColors.activeSurface)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = NoirColors.success,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = language.ui("Validation manuelle uniquement. Android capture le signal, le backend decide, le marchand confirme."),
            color = NoirColors.ink2,
            style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp, lineHeight = 16.sp)
        )
    }
}

// Bandeau d'actions ancré : décisions argent réel — TOUS les callbacks préservés.
@Composable
private fun NoirActionBar(
    language: PremiumLanguageOption,
    onConfirmReceived: () -> Unit,
    onRejectSignal: () -> Unit,
    onRejectOrder: () -> Unit,
    modifier: Modifier = Modifier
) {
    val accent = LocalNoirAccent.current
    Column(
        modifier
            .fillMaxWidth()
            .drawBehind {
                // Fondu vers le fond (prototype .actions) — lisibilité au-dessus du scroll.
                drawRect(
                    brush = Brush.verticalGradient(
                        colors = listOf(Color.Transparent, NoirColors.bg),
                        startY = 0f,
                        endY = size.height * 0.26f
                    )
                )
                drawRect(color = NoirColors.bg, topLeft = Offset(0f, size.height * 0.26f), size = Size(size.width, size.height * 0.74f))
            }
            .padding(horizontal = NoirSpacing.Screen)
            .padding(top = 14.dp, bottom = 26.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp)
    ) {
        // Primaire : Confirmer reçu → onConfirmReceived (libellé sûr, garde l'invariant test).
        Box(
            Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(NoirRadius.Button))
                .background(accent)
                .premiumTap(onConfirmReceived),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = language.ui("Confirmer reçu"),
                color = NoirColors.bg,
                style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold)
            )
        }
        // Secondaire : Rejeter le signal → onRejectSignal.
        Box(
            Modifier
                .fillMaxWidth()
                .height(46.dp)
                .clip(RoundedCornerShape(NoirRadius.Button))
                .border(1.dp, NoirColors.hair2, RoundedCornerShape(NoirRadius.Button))
                .premiumTap(onRejectSignal),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = language.ui("Rejeter le signal"),
                color = NoirColors.ink2,
                style = NoirTextStyle.Label.copy(fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            )
        }
        // Tertiaire (tap-text) : Annuler la commande → onRejectOrder.
        Box(
            Modifier
                .fillMaxWidth()
                .height(PremiumComponentSize.TouchTarget)
                .premiumTap(onRejectOrder),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = language.ui("Annuler la commande"),
                color = NoirColors.danger,
                style = NoirTextStyle.Micro.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold)
            )
        }
    }
}

@Composable
private fun NoirCircleButton(icon: ImageVector, contentDescription: String, onClick: (() -> Unit)? = null) {
    Box(
        Modifier
            .size(40.dp)
            .clip(CircleShape)
            .border(1.dp, NoirColors.hair2, CircleShape)
            .then(if (onClick != null) Modifier.premiumTap(onClick) else Modifier),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = NoirColors.ink1,
            modifier = Modifier.size(19.dp)
        )
    }
}

@Composable
private fun NoirSectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        color = NoirColors.ink2,
        style = NoirTextStyle.SectionLabel,
        modifier = Modifier.padding(start = 2.dp, top = 8.dp)
    )
}

private data class PaymentReviewVerdict(
    val chipLabel: String,
    val tone: PremiumTone,
    val bandLabel: String,
    val color: Color,
    val icon: ImageVector
)

private fun paymentReviewVerdict(
    state: PremiumPaymentDetailUiState,
    expectedAmount: String,
    detectedAmount: String
): PaymentReviewVerdict {
    val signal = (state.statusTitle + " " + state.actionMessage).lowercase()
    return when {
        signal.contains("rejet") || signal.contains("annul") || signal.contains("refus") ->
            PaymentReviewVerdict(
                chipLabel = "Rejeter le signal",
                tone = StatusTone.Danger,
                bandLabel = "Signal rejeté",
                color = NoirColors.danger,
                icon = Icons.Default.WarningAmber
            )
        signal.contains("confirm") || signal.contains("validé") || signal.contains("traité") ->
            PaymentReviewVerdict(
                chipLabel = "Confirmer reçu",
                tone = StatusTone.Success,
                bandLabel = "Confiance élevée",
                color = NoirColors.success,
                icon = Icons.Default.CheckCircle
            )
        else ->
            PaymentReviewVerdict(
                chipLabel = "En cours",
                tone = StatusTone.Warning,
                bandLabel = "À vérifier",
                color = NoirColors.warn,
                icon = Icons.Default.WarningAmber
            )
    }
}

private fun paymentReviewConfidence(scoreValue: String): Float? {
    val digits = scoreValue.filter { it.isDigit() }
    if (digits.isBlank()) return null
    val percent = digits.toIntOrNull() ?: return null
    return (percent.coerceIn(0, 100)) / 100f
}

// Accent Caméléon dérivé de la banque réelle. Détail inconnu → accent neutre du langage.
private fun paymentDetailAccent(bankName: String): Color {
    val skinId = when (reviewBankProfileId(bankName)) {
        "sber_ru" -> "sber"
        else -> null
    }
    return skinId?.let { WalletSkins.byId(it)?.accent } ?: NoirColors.wave
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
            .padding(horizontal = NoirSpacing.Screen)
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            NoirCircleButton(Icons.AutoMirrored.Filled.ArrowBack, language.ui("Retour"), onClick = onBack)
            Text(
                text = language.ui("Transaction"),
                modifier = Modifier.weight(1f),
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            Spacer(Modifier.size(40.dp))
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
                    tint = if (selected) NoirColors.warn else NoirColors.ink2,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = text.uppercase(),
                    color = if (selected) NoirColors.ink1 else NoirColors.ink2,
                    style = NoirTextStyle.Micro.copy(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.08.em
                    ),
                    maxLines = 1
                )
            }
            if (selected) {
                Spacer(Modifier.height(6.dp))
                Box(
                    Modifier
                        .width(16.dp)
                        .height(2.dp)
                        .background(NoirColors.warn, RoundedCornerShape(PremiumRadius.Pill))
                )
            }
        }
    }
}

@Preview(name = "Review list noir vivant", showBackground = true, backgroundColor = 0xFF08080C, widthDp = 390, heightDp = 720)
@Composable
private fun PremiumReviewsCheckoutStylePreview() {
    PremiumColors.useDarkTheme(false)
    PremiumReviewsScreen()
}

@Preview(name = "Review detail noir vivant", showBackground = true, backgroundColor = 0xFF08080C, widthDp = 390, heightDp = 820)
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
