package com.swimpay.receiver.ui.premium

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.PersistableBundle
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CurrencyExchange
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.swimpay.receiver.BuildConfig
import com.swimpay.receiver.MerchantReceivingMethodDraft
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.R
import com.swimpay.receiver.ReceivingMethodType

@Composable
fun PremiumDashboardScreen(
    state: PremiumScreenState<PremiumDashboardUiState> = PremiumScreenState.content(PremiumDashboardUiState.preview()),
    onOpenReviews: () -> Unit = {},
    onOpenBusiness: () -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumDashboardContent(
            state.value,
            onOpenReviews = onOpenReviews,
            onOpenBusiness = onOpenBusiness,
            language = language
        )
        else -> PremiumStateList(state, language)
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// Accueil « noir vivant » (port prototype, Compose P1) — écrin noir chaud qui
// respire la couleur du wallet actif (Caméléon). Toutes les valeurs rendues sont
// RÉELLES (UiState/runtime) ; là où le prototype montre une donnée que le backend
// n'a pas (montant par wallet, expéditeur, projection, badge de cloche, delta), on
// dégrade sans inventer. DM Sans partout, montants en ink1, vert uniquement sur la
// pastille « confirmé », profondeur par luminosité + filets (pas d'ombre portée).
// ─────────────────────────────────────────────────────────────────────────────
private data class NoirWalletCard(
    val skin: WalletSkin,
    val label: String,
    val maskedIdentifier: String,
    val bankProfileId: String?,
    val aggregateAmount: String?,
    val aggregateCaption: String?
)

@Composable
private fun PremiumDashboardContent(
    state: PremiumDashboardUiState,
    onOpenReviews: () -> Unit,
    onOpenBusiness: () -> Unit,
    language: PremiumLanguageOption
) {
    // Page 0 = agrégat réel « Reçu ce mois » (monthlyAmount). Les pages suivantes
    // sont les moyens de réception réels (identité seule, sans montant inventé).
    val multiSkin = WalletSkins.byId("multi") ?: WalletSkins.all.first()
    val aggregateCard = NoirWalletCard(
        skin = multiSkin,
        label = language.ui("Reçu ce mois"),
        maskedIdentifier = "",
        bankProfileId = null,
        aggregateAmount = state.monthlyAmount,
        aggregateCaption = language.ui("Tous moyens de réception")
    )
    val walletCards = state.receivingWallets.map { wallet ->
        NoirWalletCard(
            skin = WalletSkins.byId(wallet.skinId) ?: multiSkin,
            label = wallet.label,
            maskedIdentifier = wallet.maskedIdentifier,
            bankProfileId = wallet.bankProfileId.takeIf { it.isNotBlank() },
            aggregateAmount = null,
            aggregateCaption = if (wallet.active) language.ui("Actif") else language.ui("Inactif")
        )
    }
    val cards = listOf(aggregateCard) + walletCards

    val pagerState = rememberPagerState(pageCount = { cards.size })
    // Caméléon : l'accent de la carte centrée contamine l'écran (interpolation douce).
    val targetAccent = cards.getOrNull(pagerState.currentPage)?.skin?.accent ?: NoirColors.wave
    val animatedAccent by animateColorAsState(
        targetValue = targetAccent,
        animationSpec = tween(durationMillis = 450),
        label = "noirAccent"
    )

    CompositionLocalProvider(LocalNoirAccent provides animatedAccent) {
        Box(
            Modifier
                .fillMaxSize()
                .background(NoirColors.bg)
                .drawBehind {
                    // Halo d'accent en bas-droite + haut-gauche (prototype .device).
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(animatedAccent.copy(alpha = 0.07f), Color.Transparent),
                            center = Offset(size.width * 0.85f, size.height * 1.02f),
                            radius = size.maxDimension * 0.55f
                        )
                    )
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(animatedAccent.copy(alpha = 0.05f), Color.Transparent),
                            center = Offset(size.width * 0.08f, -size.height * 0.05f),
                            radius = size.maxDimension * 0.5f
                        )
                    )
                }
        ) {
            LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(NoirSpacing.Item)
            ) {
                item {
                    NoirHomeHeader(
                        language = language,
                        modifier = Modifier.padding(horizontal = NoirSpacing.Screen).padding(top = 8.dp)
                    )
                }
                item {
                    NoirWalletSwitcher(
                        cards = cards,
                        pagerState = pagerState,
                        language = language
                    )
                }
                item {
                    NoirCashFlowCard(
                        state = state,
                        language = language,
                        modifier = Modifier.padding(horizontal = NoirSpacing.Screen)
                    )
                }
                item {
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = NoirSpacing.Screen)
                            .padding(top = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            language.ui("Transactions"),
                            color = NoirColors.ink1,
                            style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        )
                        Text(
                            language.ui("Voir tout"),
                            color = NoirColors.ink2,
                            style = NoirTextStyle.Micro.copy(fontSize = 13.sp),
                            modifier = Modifier.premiumTap(onOpenBusiness).padding(vertical = 4.dp)
                        )
                    }
                }
                if (state.recentPayments.isEmpty()) {
                    item {
                        NoirEmptyTransactions(
                            title = language.ui(state.emptyPaymentsTitle),
                            message = language.ui("Les paiements reconnus par SwimPay apparaîtront ici."),
                            modifier = Modifier.padding(horizontal = NoirSpacing.Screen).padding(top = 6.dp)
                        )
                    }
                } else {
                    itemsIndexed(state.recentPayments) { index, payment ->
                        NoirTransactionRow(
                            payment = payment,
                            showDivider = index < state.recentPayments.lastIndex,
                            language = language,
                            // Tapping a payment opens the review queue (where the merchant acts).
                            onClick = onOpenReviews,
                            modifier = Modifier.padding(horizontal = NoirSpacing.Screen)
                        )
                    }
                }
            }
        }
    }
}

// En-tête neutre : la marque + la cloche. L'état Accueil ne porte ni identité
// marchand ni compteur de notifications, donc pas d'initiales ni de badge inventés.
@Composable
private fun NoirHomeHeader(language: PremiumLanguageOption, modifier: Modifier = Modifier) {
    val accent = LocalNoirAccent.current
    Row(modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Row(Modifier.weight(1f)) {
            Text(
                "Swim",
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.02).em)
            )
            Text(
                "Pay",
                color = accent,
                style = NoirTextStyle.Label.copy(fontSize = 20.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.02).em)
            )
        }
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .border(1.dp, NoirColors.hair2, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                Icons.Default.Notifications,
                contentDescription = language.ui("Notifications"),
                tint = NoirColors.ink1,
                modifier = Modifier.size(19.dp)
            )
        }
    }
}

@Composable
private fun NoirWalletSwitcher(
    cards: List<NoirWalletCard>,
    pagerState: androidx.compose.foundation.pager.PagerState,
    language: PremiumLanguageOption
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 32.dp),
            pageSpacing = 14.dp,
            modifier = Modifier.fillMaxWidth()
        ) { page ->
            NoirWalletCardView(cards[page], language)
        }
        if (cards.size > 1) {
            NoirPagerDots(
                count = cards.size,
                current = pagerState.currentPage,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun NoirWalletCardView(card: NoirWalletCard, language: PremiumLanguageOption) {
    val shape = RoundedCornerShape(NoirRadius.Card)
    Box(
        Modifier
            .fillMaxWidth()
            .height(202.dp)
            .clip(shape)
            .background(
                Brush.linearGradient(
                    listOf(card.skin.gradientTop, card.skin.gradientBottom)
                )
            )
            .border(1.dp, card.skin.accent.copy(alpha = 0.25f), shape)
            .padding(horizontal = 20.dp, vertical = 18.dp)
    ) {
        Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    card.label,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.Label.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (card.bankProfileId != null) {
                    PremiumBankLogo(bankProfileId = card.bankProfileId, displayName = card.label, size = 40.dp)
                } else {
                    Box(
                        Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.16f))
                            .border(1.dp, Color.White.copy(alpha = 0.22f), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.AccountBalanceWallet,
                            null,
                            tint = NoirColors.ink1,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
            Column {
                if (card.aggregateAmount != null) {
                    // Carte agrégat : le montant RÉEL « Reçu ce mois ».
                    Text(
                        card.aggregateAmount,
                        color = NoirColors.ink1,
                        style = NoirTextStyle.Amount.copy(fontSize = 36.sp),
                        maxLines = 1
                    )
                } else {
                    // Carte moyen de réception : identité masquée réelle, jamais de montant inventé.
                    Text(
                        card.maskedIdentifier.ifBlank { language.ui("Identifiant masqué") },
                        color = NoirColors.ink1,
                        style = NoirTextStyle.AmountMedium.copy(fontSize = 24.sp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                card.aggregateCaption?.let { caption ->
                    Text(
                        caption,
                        color = NoirColors.ink1.copy(alpha = 0.78f),
                        style = NoirTextStyle.Micro.copy(fontSize = 12.5.sp),
                        modifier = Modifier.padding(top = 8.dp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
private fun NoirPagerDots(count: Int, current: Int, modifier: Modifier = Modifier) {
    val accent = LocalNoirAccent.current
    Row(
        modifier,
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(count) { index ->
            val active = index == current
            Box(
                Modifier
                    .height(6.dp)
                    .width(if (active) 18.dp else 6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(if (active) accent else NoirColors.hair2)
            )
        }
    }
}

@Composable
private fun NoirCashFlowCard(
    state: PremiumDashboardUiState,
    language: PremiumLanguageOption,
    modifier: Modifier = Modifier
) {
    val accent = LocalNoirAccent.current
    val shape = RoundedCornerShape(NoirRadius.Spark)
    Column(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                language.ui("Cash Flow"),
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            )
            // Pastilles montant / taux réels (chartConfirmedAmountLabel / chartConfirmationRateLabel).
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NoirMetricPill(language.ui("Montant"), state.chartConfirmedAmountLabel)
                NoirMetricPill(language.ui("Taux"), state.chartConfirmationRateLabel)
            }
        }
        if (state.chartPoints.isEmpty()) {
            Text(
                language.ui("Aucune donnée d'évolution pour le moment."),
                color = NoirColors.ink2,
                style = NoirTextStyle.Micro,
                modifier = Modifier.padding(vertical = 12.dp)
            )
        } else {
            NoirSparkline(
                values = state.chartPoints.map { it.confirmedAmountMinor.toFloat() },
                accent = accent,
                modifier = Modifier.fillMaxWidth().height(66.dp).padding(top = 2.dp)
            )
        }
    }
}

@Composable
private fun NoirMetricPill(label: String, value: String) {
    Column(
        Modifier
            .clip(RoundedCornerShape(NoirRadius.ButtonTight))
            .background(NoirColors.activeSurface)
            .border(1.dp, NoirColors.hair, RoundedCornerShape(NoirRadius.ButtonTight))
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(label, color = NoirColors.ink2, style = NoirTextStyle.Micro.copy(fontSize = 10.sp, fontWeight = FontWeight.Bold))
        Text(value, color = NoirColors.ink1, style = NoirTextStyle.TxAmount.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold))
    }
}

// Sparkline réelle (ligne pleine uniquement — le runtime n'a pas de projection).
@Composable
private fun NoirSparkline(values: List<Float>, accent: Color, modifier: Modifier = Modifier) {
    androidx.compose.foundation.Canvas(modifier) {
        if (values.isEmpty()) return@Canvas
        val maxV = values.maxOrNull() ?: 1f
        val minV = values.minOrNull() ?: 0f
        val range = (maxV - minV).coerceAtLeast(1f)
        val left = 2.dp.toPx()
        val right = size.width - 2.dp.toPx()
        val top = 6.dp.toPx()
        val bottom = size.height - 6.dp.toPx()
        val w = (right - left).coerceAtLeast(1f)
        val h = (bottom - top).coerceAtLeast(1f)
        fun pt(i: Int, v: Float): Offset {
            val x = if (values.size == 1) left + w / 2f else left + w * (i.toFloat() / values.lastIndex)
            val y = bottom - ((v - minV) / range) * h
            return Offset(x, y)
        }
        val line = androidx.compose.ui.graphics.Path()
        values.forEachIndexed { i, v ->
            val p = pt(i, v)
            if (i == 0) line.moveTo(p.x, p.y) else line.lineTo(p.x, p.y)
        }
        val area = androidx.compose.ui.graphics.Path().apply {
            val first = pt(0, values.first())
            moveTo(first.x, bottom)
            lineTo(first.x, first.y)
            values.drop(1).forEachIndexed { i, v -> val p = pt(i + 1, v); lineTo(p.x, p.y) }
            lineTo(pt(values.lastIndex, values.last()).x, bottom)
            close()
        }
        drawPath(
            path = area,
            brush = Brush.verticalGradient(
                listOf(accent.copy(alpha = 0.18f), accent.copy(alpha = 0f)),
                startY = top,
                endY = bottom
            )
        )
        drawPath(
            path = line,
            color = accent,
            style = Stroke(width = 2.4.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round)
        )
        val last = pt(values.lastIndex, values.last())
        drawCircle(color = NoirColors.bg, radius = 4.dp.toPx(), center = last)
        drawCircle(color = accent, radius = 2.75.dp.toPx(), center = last)
    }
}

@Composable
private fun NoirTransactionRow(
    payment: PremiumRecentPaymentUiState,
    showDivider: Boolean,
    language: PremiumLanguageOption,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val confirmed = isConfirmedStatus(payment.status)
    Column(modifier.fillMaxWidth().premiumTap(onClick)) {
        Row(
            Modifier.fillMaxWidth().padding(vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Cercle fournisseur : couleur de skin réelle (provenance du detail), pastille de statut.
            Box(contentAlignment = Alignment.BottomEnd) {
                val skin = walletSkinForDetail(payment.detail)
                Box(
                    Modifier
                        .size(42.dp)
                        .clip(CircleShape)
                        .background(skin?.accent ?: NoirColors.multi),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        (skin?.label ?: payment.detail).take(1).uppercase(),
                        color = Color.White,
                        style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    )
                }
                Box(
                    Modifier
                        .size(15.dp)
                        .clip(CircleShape)
                        .background(NoirColors.bg)
                        .padding(2.dp)
                        .clip(CircleShape)
                        .background(if (confirmed) NoirColors.success else NoirColors.warn),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (confirmed) Icons.Default.CheckCircle else Icons.Default.Info,
                        null,
                        tint = NoirColors.bg,
                        modifier = Modifier.size(8.dp)
                    )
                }
            }
            Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                // Pas d'expéditeur dans le runtime → on affiche le detail réel (banque · provenance).
                Text(
                    payment.detail,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.Label.copy(fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    language.ui(payment.status),
                    color = NoirColors.ink3,
                    style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp),
                    modifier = Modifier.padding(top = 2.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                // Montant en ink1 (règle verrouillée) — le vert reste réservé à la pastille de statut.
                Text(
                    payment.amount,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.TxAmount,
                    maxLines = 1
                )
                Text(
                    language.ui(payment.status),
                    color = if (confirmed) NoirColors.success else NoirColors.warn,
                    style = NoirTextStyle.Micro.copy(fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.padding(top = 2.dp),
                    maxLines = 1
                )
            }
        }
        if (showDivider) {
            Box(Modifier.fillMaxWidth().height(1.dp).background(NoirColors.hair))
        }
    }
}

@Composable
private fun NoirEmptyTransactions(title: String, message: String, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(NoirRadius.Card)
    Column(
        modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(title, color = NoirColors.ink1, style = NoirTextStyle.Label.copy(fontWeight = FontWeight.SemiBold))
        Text(message, color = NoirColors.ink2, style = NoirTextStyle.Micro)
    }
}

// Statut réel → confirmé ? (mêmes libellés que le reste du runtime, insensible à la casse).
private fun isConfirmedStatus(status: String): Boolean {
    val s = status.trim().lowercase()
    return s == "confirmé" || s == "confirme" || s == "validé" || s == "valide" ||
        s == "success" || s == "confirmed"
}

// Détail réel (« Banque · … ») → skin de marque pour la pastille fournisseur.
// Aucune marque inventée : null si le detail ne correspond à aucun moyen connu.
private fun walletSkinForDetail(detail: String): WalletSkin? {
    val bankProfileId = ReceivingCatalog.allMethods.firstOrNull { entry ->
        detail.contains(entry.displayName, ignoreCase = true)
    }?.bankProfileId ?: return null
    val skinId = when (bankProfileId) {
        "wave_ci" -> "wave"
        "orange_money_ci" -> "orange"
        "sber_ru" -> "sber"
        else -> "multi"
    }
    return WalletSkins.byId(skinId)
}

@Composable
private fun LocalSystemCard(state: PremiumLocalSystemUiState, modifier: Modifier) {
    Surface(
        modifier.height(96.dp).border(1.dp, PremiumColors.Line, RoundedCornerShape(28.dp)),
        color = PremiumColors.Surface,
        shadowElevation = PremiumElevation.Card,
        shape = RoundedCornerShape(28.dp)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.Center) {
            Text(state.title, color = PremiumColors.Muted, fontSize = 11.sp, lineHeight = 15.sp, fontWeight = FontWeight.Bold)
            Text(state.value, color = PremiumColors.Ink, fontSize = 16.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
            if (state.helper.isNotBlank()) {
                Text(state.helper, color = PremiumColors.Muted, fontSize = 10.sp, lineHeight = 13.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun PremiumStateList(state: PremiumScreenState<*>, language: PremiumLanguageOption = PremiumLanguageOption.FR) {
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item { PremiumStatePanel(state.localized(language)) }
    }
}

@Composable
private fun MonthlyActivityCard(
    label: String,
    amount: String,
    usesLiveApi: Boolean,
    language: PremiumLanguageOption
) {
    // T6 : hero calme dans les deux modes — les themes dragon/oni restent en preview QA.
    val cardTheme = CardVisualDefaults.HomeDashboardPaper

    CardVisual(
        // TODO: migrate card container from fixed height to bank-card aspectRatio(1.586f) after visual parity validation.
        modifier = Modifier.fillMaxWidth().height(214.dp),
        theme = cardTheme
    ) {
        MonthlyActivityCardDetails(label, amount, usesLiveApi, language)
    }
}

@Preview(name = "Home card dark oni yatagarasu", showBackground = true, backgroundColor = 0xFF000613, widthDp = 390, heightDp = 250)
@Composable
private fun MonthlyActivityCardDarkOniYatagarasuPreview() {
    PremiumColors.useDarkTheme(true)
    MonthlyActivityCard(
        label = "Paiements reçus",
        amount = "12 450 RUB",
        usesLiveApi = true,
        language = PremiumLanguageOption.FR
    )
}

@Composable
internal fun MonthlyActivityCardDetails(
    label: String,
    amount: String,
    usesLiveApi: Boolean,
    language: PremiumLanguageOption
) {
    Column(Modifier.padding(26.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Box(Modifier.size(46.dp).background(Color.White.copy(alpha = 0.18f), RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.AccountBalanceWallet, null, tint = Color.White, modifier = Modifier.size(25.dp))
            }
            Text(language.ui("Aujourd'hui"), color = Color.White.copy(alpha = 0.72f), fontWeight = FontWeight.Bold, fontSize = PremiumType.Caption)
        }
        Spacer(Modifier.height(24.dp))
        Text(label, color = PremiumColors.Paper.copy(alpha = 0.78f), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Text(
            amount,
            color = PremiumColors.Paper,
            style = PremiumTextStyle.AmountMedium.copy(fontSize = PremiumType.Hero)
        )
        Spacer(Modifier.height(18.dp))
        // Chip on-dark : la carte hero reste encre dans les deux modes, les tons themes n'y suffisent pas.
        Box(
            Modifier.background(Color.White.copy(alpha = PremiumOpacity.Medium), RoundedCornerShape(PremiumRadius.Pill)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                language.ui(if (usesLiveApi) "Live" else "En attente"),
                color = PremiumColors.Paper.copy(alpha = 0.92f),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
            )
        }
    }
}

@Preview(name = "Home card legacy blue fallback", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 250)
@Composable
private fun MonthlyActivityCardLegacyBluePreview() {
    PremiumColors.useDarkTheme(false)
    MonthlyActivityCard(
        label = "Paiements reçus",
        amount = "12 450 RUB",
        usesLiveApi = true,
        language = PremiumLanguageOption.FR
    )
}

@Preview(name = "Home card dragon gold", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 250)
@Composable
private fun MonthlyActivityCardDragonGoldPreview() {
    PremiumColors.useDarkTheme(false)
    MonthlyActivityCard(
        label = "Paiements reçus",
        amount = "12 450 RUB",
        usesLiveApi = true,
        language = PremiumLanguageOption.FR
    )
}

@Preview(name = "Home card dragon gold material", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 250)
@Composable
private fun MonthlyActivityCardDragonGoldMaterialPreview() {
    PremiumColors.useDarkTheme(false)
    CardVisual(
        modifier = Modifier.fillMaxWidth().height(214.dp),
        theme = CardVisualDefaults.HomeDashboardDragonGoldMaterial
    ) {
        MonthlyActivityCardDetails("Paiements reçus", "12 450 RUB", true, PremiumLanguageOption.FR)
    }
}

@Preview(name = "Home dashboard default dragon gold", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 250)
@Composable
private fun MonthlyActivityCardDragonGoldDefaultPreview() {
    PremiumColors.useDarkTheme(false)
    MonthlyActivityCard(
        label = "Paiements reçus",
        amount = "12 450 RUB",
        usesLiveApi = true,
        language = PremiumLanguageOption.FR
    )
}

@Composable
private fun RecentPaymentRow(amount: String, detail: String) {
    LiquidGlassCard(
        Modifier.fillMaxWidth().height(88.dp),
        radius = PremiumRadius.CardLarge
    ) {
        Row(Modifier.padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .size(48.dp)
                    .background(PremiumColors.IconTile, RoundedCornerShape(18.dp))
                    .border(1.dp, PremiumColors.Line.copy(alpha = 0.72f), RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.AccountBalanceWallet, null, tint = PremiumColors.Teal, modifier = Modifier.size(24.dp))
            }
            Column(Modifier.weight(1f).padding(start = 18.dp)) {
                Text(amount, color = PremiumColors.Success, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(detail, color = PremiumColors.Muted, fontSize = PremiumType.Caption, fontWeight = FontWeight.SemiBold)
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
    ),
    onOpenReviews: () -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumOrdersContent(state.value, onOpenReviews, language)
        else -> PremiumStateList(state, language)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activité « noir vivant » (port prototype, Compose P4) — écran agrégat (tous
// providers), accent violet Multi (#8264D2). HONNÊTETÉ STRICTE : chaque valeur
// rendue vient du UiState réel. Le prototype montre une sparkline, un delta « 18% »
// et un regroupement par jour (Aujourd'hui/Hier + totaux) — PremiumOrdersUiState ne
// porte NI série temporelle NI date par ligne, donc on les OMET (jamais inventés).
// Montants en ink1, vert/ambre réservés aux pastilles de statut, profondeur par
// luminosité + filets, pas d'ombre portée.
// ─────────────────────────────────────────────────────────────────────────────
@Composable
private fun PremiumOrdersContent(
    state: PremiumOrdersUiState,
    onOpenReviews: () -> Unit,
    language: PremiumLanguageOption
) {
    val displayRows = activityDisplayRows(state)
    val toTreatCount = displayRows.count { !it.verified }
    var selectedFilter by remember { mutableStateOf(0) }
    val visibleRows = when (selectedFilter) {
        1 -> displayRows.filter { it.verified }
        2 -> displayRows.filter { !it.verified }
        else -> displayRows
    }
    // Activité agrège tous les moyens de réception → accent violet « Multi ».
    CompositionLocalProvider(LocalNoirAccent provides NoirColors.multi) {
        Box(
            Modifier
                .fillMaxSize()
                .background(NoirColors.bg)
                .drawBehind {
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(NoirColors.multi.copy(alpha = 0.07f), Color.Transparent),
                            center = Offset(size.width * 0.85f, size.height * 1.02f),
                            radius = size.maxDimension * 0.55f
                        )
                    )
                    drawRect(
                        brush = Brush.radialGradient(
                            colors = listOf(NoirColors.multi.copy(alpha = 0.05f), Color.Transparent),
                            center = Offset(size.width * 0.08f, -size.height * 0.05f),
                            radius = size.maxDimension * 0.5f
                        )
                    )
                }
        ) {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = NoirSpacing.Screen),
                contentPadding = PaddingValues(top = 6.dp, bottom = 34.dp),
                verticalArrangement = Arrangement.spacedBy(NoirSpacing.Item)
            ) {
                item { ActivityNoirHeader(language) }
                item { ActivityNoirSummary(state, displayRows, language) }
                item {
                    ActivityNoirFilterPills(selectedFilter, displayRows, language) { selectedFilter = it }
                }
                if (toTreatCount > 0) {
                    item { ActivityNoirToTreatBanner(toTreatCount, language, onOpenReviews) }
                }
                if (visibleRows.isEmpty()) {
                    item {
                        ActivityNoirEmpty(
                            title = language.ui(state.emptyTitle),
                            message = language.ui(state.emptyMessage),
                            actionLabel = language.ui(state.secondaryActionLabel),
                            onAction = onOpenReviews
                        )
                    }
                } else {
                    // Liste plate : aucune date par ligne dans le runtime → pas de
                    // regroupement par jour ni d'en-têtes « Aujourd'hui/Hier » inventés.
                    itemsIndexed(visibleRows, key = { _, row -> row.id }) { index, row ->
                        ActivityNoirRow(
                            row = row,
                            showDivider = index < visibleRows.lastIndex,
                            // Toucher une ligne ouvre la file de revue (où le marchand agit).
                            onClick = onOpenReviews,
                            language = language
                        )
                    }
                }
            }
        }
    }
}

// En-tête : titre d'écran + cloche neutre (pas de compteur de notifications inventé).
@Composable
private fun ActivityNoirHeader(language: PremiumLanguageOption) {
    Row(
        Modifier.fillMaxWidth().padding(top = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            language.ui("Activité"),
            color = NoirColors.ink1,
            style = NoirTextStyle.H1.copy(fontSize = 22.sp),
            modifier = Modifier.weight(1f)
        )
        ActivityNoirHeaderAction(Icons.Default.Search, language.ui("Rechercher"))
        Spacer(Modifier.width(9.dp))
        ActivityNoirHeaderAction(Icons.Default.FilterList, language.ui("Filtrer"))
    }
}

@Composable
private fun ActivityNoirHeaderAction(icon: ImageVector, contentDescription: String) {
    Box(
        Modifier
            .size(40.dp)
            .clip(CircleShape)
            .border(1.dp, NoirColors.hair2, CircleShape),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, contentDescription, tint = NoirColors.ink1, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun ActivityNoirSummary(
    state: PremiumOrdersUiState,
    rows: List<ActivityDisplayRow>,
    language: PremiumLanguageOption
) {
    // Champs réels uniquement : « Reçu ce mois » ← confirmedAmount ; compteur et taux
    // vérifié dérivés des lignes réelles. Pas de sparkline ni de delta (le runtime n'a
    // ni série temporelle ni comparatif).
    val accent = LocalNoirAccent.current
    val amount = state.confirmedAmount.takeIf { it.isNotBlank() && it != "—" }
    val shape = RoundedCornerShape(NoirRadius.Card)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .drawBehind {
                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(accent.copy(alpha = 0.12f), Color.Transparent),
                        center = Offset(size.width, size.height * 0.5f),
                        radius = size.width * 0.6f
                    )
                )
            }
            .padding(horizontal = 20.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Text(
            language.ui("Reçu ce mois"),
            color = NoirColors.ink2,
            style = NoirTextStyle.Micro.copy(fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
        )
        Text(
            amount ?: language.ui("—"),
            color = NoirColors.ink1,
            style = NoirTextStyle.Amount.copy(fontSize = 30.sp),
            maxLines = 1
        )
        if (rows.isNotEmpty()) {
            val verifiedPct = (rows.count { it.verified } * 100) / rows.size
            Text(
                "${rows.size} ${language.ui("paiements")} · $verifiedPct% ${language.ui("vérifiés")}",
                color = NoirColors.ink2,
                style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp, fontWeight = FontWeight.Medium)
            )
        }
    }
}

@Composable
private fun ActivityNoirFilterPills(
    selected: Int,
    rows: List<ActivityDisplayRow>,
    language: PremiumLanguageOption,
    onSelect: (Int) -> Unit
) {
    // Pills dérivées du statut réel (Tous/Vérifiés/En revue), avec compteurs réels.
    // Les pills par-fournisseur du prototype (Wave/Orange/Devises) sont omises : le
    // filtrage est ici purement statut-dérivé, pas de filtre marque inventé.
    val accent = LocalNoirAccent.current
    val total = rows.size
    val verified = rows.count { it.verified }
    val inReview = total - verified
    val pills = listOf(
        language.ui("Tous") to total,
        language.ui("Vérifiés") to verified,
        language.ui("En revue") to inReview
    )
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(pills.size) { index ->
            val (label, count) = pills[index]
            val active = index == selected
            val shape = RoundedCornerShape(50)
            Row(
                Modifier
                    .clip(shape)
                    .background(if (active) accent else NoirColors.surface)
                    .border(
                        1.dp,
                        if (active) Color.Transparent else NoirColors.hair,
                        shape
                    )
                    .premiumTap { onSelect(index) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    label,
                    color = if (active) NoirColors.bg else NoirColors.ink2,
                    style = NoirTextStyle.Label.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                )
                Text(
                    count.toString(),
                    color = if (active) NoirColors.bg.copy(alpha = 0.7f) else NoirColors.ink3,
                    style = NoirTextStyle.Micro.copy(fontSize = 11.sp, fontWeight = FontWeight.Bold)
                )
            }
        }
    }
}

@Composable
private fun ActivityNoirToTreatBanner(
    count: Int,
    language: PremiumLanguageOption,
    onOpenReviews: () -> Unit
) {
    // Bannière ambre réelle : nombre de paiements en revue (lignes non vérifiées) +
    // onOpenReviews. Pas de motif inventé, seul le compte réel est affiché.
    val shape = RoundedCornerShape(NoirRadius.Button)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.warn.copy(alpha = 0.09f))
            .border(1.dp, NoirColors.warn.copy(alpha = 0.22f), shape)
            .premiumTap(onOpenReviews)
            .padding(horizontal = 15.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(13.dp)
    ) {
        Box(
            Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(NoirColors.warn.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Info, null, tint = NoirColors.warn, modifier = Modifier.size(19.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(
                "$count ${language.ui("paiements en revue")}",
                color = NoirColors.ink1,
                style = NoirTextStyle.Label.copy(fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                language.ui("Référence partielle à confirmer"),
                color = NoirColors.ink2,
                style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp),
                modifier = Modifier.padding(top = 1.dp),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
        Text(
            language.ui("Examiner"),
            color = NoirColors.warn,
            style = NoirTextStyle.Label.copy(fontSize = 12.5.sp, fontWeight = FontWeight.Bold)
        )
    }
}

@Composable
private fun ActivityNoirRow(
    row: ActivityDisplayRow,
    showDivider: Boolean,
    onClick: () -> Unit,
    language: PremiumLanguageOption
) {
    Column(Modifier.fillMaxWidth().premiumTap(onClick)) {
        Row(
            Modifier.fillMaxWidth().padding(vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(13.dp)
        ) {
            // Cercle fournisseur : couleur de skin réelle dérivée du moyen (helper).
            // Pastille de statut superposée (vert confirmé / ambre en revue).
            Box(contentAlignment = Alignment.BottomEnd) {
                val skin = row.bankProfileId?.let { walletSkinForBankProfile(it) }
                if (row.bankProfileId != null) {
                    PremiumBankLogo(bankProfileId = row.bankProfileId, displayName = row.railLabel, size = 42.dp)
                } else {
                    Box(
                        Modifier
                            .size(42.dp)
                            .clip(CircleShape)
                            .background(skin?.accent ?: NoirColors.multi),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            (skin?.label ?: row.railLabel).take(1).uppercase(),
                            color = Color.White,
                            style = NoirTextStyle.Label.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        )
                    }
                }
                Box(
                    Modifier
                        .size(15.dp)
                        .clip(CircleShape)
                        .background(NoirColors.bg)
                        .padding(2.dp)
                        .clip(CircleShape)
                        .background(if (row.verified) NoirColors.success else NoirColors.warn),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        if (row.verified) Icons.Default.CheckCircle else Icons.Default.Info,
                        null,
                        tint = NoirColors.bg,
                        modifier = Modifier.size(8.dp)
                    )
                }
            }
            Column(Modifier.weight(1f)) {
                // Référence réelle (orderId). Pas d'expéditeur dans le runtime → non rendu.
                Text(
                    row.reference,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.Label.copy(fontSize = 14.5.sp, fontWeight = FontWeight.SemiBold),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    "${row.railLabel} · ${language.ui(row.provenance)}",
                    color = NoirColors.ink3,
                    style = NoirTextStyle.Micro.copy(fontSize = 11.5.sp),
                    modifier = Modifier.padding(top = 2.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                // Montant en ink1 (règle verrouillée) — le vert reste sur la pastille.
                Text(
                    row.amount,
                    color = NoirColors.ink1,
                    style = NoirTextStyle.TxAmount.copy(fontSize = 16.sp),
                    maxLines = 1
                )
                Text(
                    if (row.verified) language.ui("Confirmé") else language.ui("En revue"),
                    color = if (row.verified) NoirColors.success else NoirColors.warn,
                    style = NoirTextStyle.Micro.copy(fontSize = 10.5.sp, fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.padding(top = 2.dp),
                    maxLines = 1
                )
            }
        }
        if (showDivider) {
            Box(Modifier.fillMaxWidth().height(1.dp).background(NoirColors.hair))
        }
    }
}

@Composable
private fun ActivityNoirEmpty(
    title: String,
    message: String,
    actionLabel: String,
    onAction: () -> Unit
) {
    val accent = LocalNoirAccent.current
    val shape = RoundedCornerShape(NoirRadius.Card)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, shape)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(title, color = NoirColors.ink1, style = NoirTextStyle.Label.copy(fontWeight = FontWeight.SemiBold))
        Text(message, color = NoirColors.ink2, style = NoirTextStyle.Micro)
        Text(
            actionLabel,
            color = accent,
            style = NoirTextStyle.Label.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold),
            modifier = Modifier.padding(top = 4.dp).premiumTap(onAction).padding(vertical = 4.dp)
        )
    }
}

// bankProfileId réel → skin de marque pour la pastille fournisseur (couleur/initiale
// de repli quand l'app n'a pas de logo embarqué). Aucune marque inventée.
private fun walletSkinForBankProfile(bankProfileId: String): WalletSkin? {
    val skinId = when (bankProfileId) {
        "wave_ci" -> "wave"
        "orange_money_ci" -> "orange"
        "sber_ru" -> "sber"
        else -> "multi"
    }
    return WalletSkins.byId(skinId)
}

// Real fields only, mapped from PremiumOrderUiItem: orderId (reference), helper-derived
// rail label + bank logo, amount, and the verified/provenance chip derived from the real
// status. PremiumOrdersUiState carries no sender name, timestamp or per-day grouping, so
// those are not rendered.
private data class ActivityDisplayRow(
    val id: String,
    val reference: String,
    val railLabel: String,
    val bankProfileId: String?,
    val provenance: String,
    val amount: String,
    val verified: Boolean
)

private fun activityDisplayRows(state: PremiumOrdersUiState): List<ActivityDisplayRow> {
    return state.rows.mapIndexed { index, item ->
        val verified = item.status.equals("validé", ignoreCase = true) ||
            item.status.equals("success", ignoreCase = true) ||
            item.status.equals("confirmé", ignoreCase = true)
        ActivityDisplayRow(
            id = item.orderId.ifBlank { "row_$index" },
            reference = item.orderId,
            railLabel = item.helper.substringBefore('·').trim().ifBlank { item.helper },
            bankProfileId = bankProfileIdFromDisplay(item.helper),
            provenance = if (verified) "vérifié" else "en revue",
            amount = item.amount,
            verified = verified
        )
    }
}

@Composable
fun PremiumSettingsScreen(
    connectedSite: PremiumScreenState<PremiumConnectedSiteUiState> = PremiumScreenState.content(PremiumConnectedSiteUiState.preview()),
    configuration: PremiumScreenState<PremiumConfigurationUiState> = PremiumScreenState.content(PremiumConfigurationUiState.preview()),
    merchantProfile: PremiumMerchantProfileUiState = PremiumMerchantProfileUiState(),
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onNavigate: (PremiumRoute) -> Unit = {}
) {
    val copy = PremiumLocalizedCopy.forLanguage(language)
    val shopName = settingsShopName(connectedSite, merchantProfile)
    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Spacer(Modifier.height(6.dp))
            Text(
                language.ui("Réglages"),
                color = PremiumColors.PageInk,
                fontSize = PremiumType.ScreenTitle,
                fontWeight = FontWeight.Bold
            )
        }
        item {
            SettingsProfileCard(language, merchantProfile, shopName) { onNavigate(PremiumNavigation.openSecurity()) }
        }
        // COMPTE
        item {
            SettingsGroup(language.ui("Compte"), rows = listOf(
                SettingsRowSpec.Nav(Icons.Default.AccountBalanceWallet, language.ui("Profil marchand")) { onNavigate(PremiumNavigation.openSecurity()) },
                SettingsRowSpec.Nav(Icons.Default.AccountBalance, language.ui("Entreprise & vérification (KYC)")) { onNavigate(PremiumNavigation.openSecurity()) },
                SettingsRowSpec.Nav(Icons.Default.CurrencyExchange, language.ui("Devises & taux")) { onNavigate(PremiumNavigation.openBanks()) }
            ))
        }
        // RÉCEPTION (group title key kept as "Paiements" for routing/localization contracts)
        item {
            SettingsGroup(language.ui("Paiements"), displayLabel = language.ui("Réception"), rows = listOf(
                SettingsRowSpec.Value(Icons.Default.CreditCard, language.ui("Portefeuilles de réception"), "11") { onNavigate(PremiumNavigation.openReceivingMethods()) },
                SettingsRowSpec.Toggle(Icons.Default.CheckCircle, language.ui("Confirmation automatique"), checked = false),
                SettingsRowSpec.Value(Icons.Default.MyLocation, language.ui("Provenance & sécurité"), language.ui("Sites")) { onNavigate(PremiumNavigation.openConnectedSite()) }
            ))
        }
        // APPAREIL
        item {
            SettingsGroup(language.ui("Appareil"), rows = listOf(
                SettingsRowSpec.Pill(Icons.Default.Notifications, language.ui("Accès aux notifications"), language.ui("Actif"), SettingsPillTone.Success) { onNavigate(PremiumNavigation.openReceiverHealth()) },
                SettingsRowSpec.Toggle(Icons.Default.PhoneAndroid, language.ui("Capture de signaux"), checked = true),
                SettingsRowSpec.Value(Icons.Default.Link, language.ui("Appareils liés"), "2") { onNavigate(PremiumNavigation.openReceiverHealth()) }
            ))
        }
        // PRÉFÉRENCES
        item {
            SettingsGroup(language.ui("Préférences"), rows = listOf(
                SettingsRowSpec.Value(Icons.Default.Language, copy.language, language.ui("Français")) { onNavigate(PremiumNavigation.openLanguage()) },
                SettingsRowSpec.Value(Icons.Default.Palette, language.ui("Thème"), language.ui("Clair")) { onNavigate(PremiumNavigation.openAppearance()) },
                SettingsRowSpec.Nav(Icons.Default.Notifications, copy.notifications) { onNavigate(PremiumNavigation.openReceiverHealth()) }
            ))
        }
        // ABONNEMENT
        item {
            SettingsGroup(language.ui("Abonnement"), rows = listOf(
                SettingsRowSpec.Pill(Icons.Default.Star, language.ui("Forfait"), language.ui("Premium"), SettingsPillTone.Ink),
                SettingsRowSpec.Nav(Icons.Default.Description, language.ui("Facturation"))
            ))
        }
        // AIDE
        item {
            SettingsGroup(language.ui("Aide"), rows = listOf(
                SettingsRowSpec.Nav(Icons.AutoMirrored.Filled.Help, copy.helpCenter) { onNavigate(PremiumNavigation.openHelpCenter()) },
                SettingsRowSpec.Nav(Icons.Default.Security, language.ui("Confidentialité")) { onNavigate(PremiumNavigation.openSupportContact()) },
                SettingsRowSpec.Nav(Icons.Default.Description, language.ui("Conditions")) { onNavigate(PremiumNavigation.openSupportContact()) }
            ))
        }
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .height(PremiumComponentSize.ButtonHeight)
                    .clip(RoundedCornerShape(PremiumRadius.Pill))
                    .border(
                        1.dp,
                        PremiumColors.Danger.copy(alpha = 0.30f),
                        RoundedCornerShape(PremiumRadius.Pill)
                    )
                    .premiumTap { onNavigate(PremiumNavigation.signOut()) },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ExitToApp,
                    null,
                    tint = PremiumColors.Danger,
                    modifier = Modifier.size(20.dp)
                )
                Text(
                    copy.signOut,
                    color = PremiumColors.Danger,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp,
                    modifier = Modifier.padding(start = 10.dp)
                )
            }
        }
        item {
            Text(
                "SwimPay Receiver · v${BuildConfig.VERSION_NAME}",
                color = PremiumColors.SoftText,
                fontSize = PremiumType.Micro,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.5.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp, bottom = 8.dp)
            )
        }
    }
}

private fun settingsShopName(
    connectedSite: PremiumScreenState<PremiumConnectedSiteUiState>,
    merchantProfile: PremiumMerchantProfileUiState
): String {
    val fromSite = (connectedSite as? PremiumScreenState.Content)
        ?.value
        ?.rows
        ?.firstOrNull { it.first.contains("site", ignoreCase = true) }
        ?.second
        ?.takeIf { it.isNotBlank() && !it.startsWith("http") }
    return fromSite ?: merchantProfile.displayName.takeIf { it.isNotBlank() && it != "Marchand" } ?: "Dakar"
}

@Composable
private fun SettingsProfileCard(
    language: PremiumLanguageOption,
    merchantProfile: PremiumMerchantProfileUiState,
    shopName: String,
    onClick: () -> Unit
) {
    LiquidGlassCard(
        Modifier.fillMaxWidth().premiumTap(onClick),
        radius = PremiumRadius.CardXL
    ) {
        Row(
            Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                Modifier
                    .size(58.dp)
                    .background(Brush.linearGradient(PremiumBrandGradient.Primary), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(merchantProfile.initials, color = PremiumColors.OnInk, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(merchantProfile.displayName, color = PremiumColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(
                    "${language.ui("Boutique")} $shopName · ${language.ui("Marchand")}",
                    color = PremiumColors.Muted,
                    fontSize = PremiumType.Caption,
                    fontWeight = FontWeight.SemiBold
                )
                SettingsPill(language.ui("Compte vérifié"), SettingsPillTone.Success, icon = Icons.Default.CheckCircle)
            }
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                null,
                tint = PremiumColors.SoftText,
                modifier = Modifier.size(22.dp)
            )
        }
    }
}

@Composable
fun PremiumConnectedSiteSummary(
    state: PremiumScreenState<PremiumConnectedSiteUiState>,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(22.dp)) {
                Text(language.ui("Intégration développeur"), color = PremiumColors.Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(language.ui(state.value.statusTitle), color = if (state.value.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                state.value.rows.forEach { row ->
                    Text("${language.ui(row.first)} · ${language.ui(row.second)}", color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
        else -> PremiumStatePanel(state.localized(language))
    }
}

@Composable
fun PremiumConfigurationSummary(state: PremiumScreenState<PremiumConfigurationUiState>) {
    when (state) {
        is PremiumScreenState.Content -> PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(22.dp)) {
                Text("Configuration", color = PremiumColors.Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(state.value.outcomeTitle, color = if (state.value.usesLiveApi) PremiumColors.Success else PremiumColors.Muted, fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.padding(top = 8.dp))
                Text(state.value.outcomeText, color = PremiumColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
            }
        }
        else -> PremiumStatePanel(state)
    }
}

@Composable
fun PremiumReceivingMethodsStateScreen(
    state: PremiumScreenState<PremiumReceivingMethodsUiState>,
    clearDraftSignal: Int = 0,
    actionMessage: String? = null,
    onOpenWalletDetail: (String) -> Unit = {},
    onSaveDraft: (MerchantReceivingMethodSubmission) -> Unit = {},
    onEditMethod: (String, String) -> Unit = { _, _ -> },
    onReplaceMethod: (String, MerchantReceivingMethodSubmission) -> Unit = { _, _ -> },
    onDisableMethod: (String) -> Unit = {},
    onSetDefaultMethod: (String) -> Unit = {},
    onDeleteMethod: (String) -> Unit = {},
    onBack: (() -> Unit)? = null,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> {
            var draftType by remember { mutableStateOf<ReceivingMethodType?>(null) }
            // Unified catalog (single source of truth, all regions incl. WA mobile money)
            // — same source onboarding uses (T2), so the main add flow can declare ANY
            // region's method. Each option carries its methodType so the draft input and
            // submission adapt (WA wallets → MOBILE_MONEY/phone, RU/INT → card-rail).
            val catalog = ReceivingCatalog.allMethods
            val bankOptions = catalog.map { entry ->
                PremiumReceivingMethodBankOption(
                    bankProfileId = entry.bankProfileId,
                    displayName = entry.displayName,
                    methodType = entry.methodType
                )
            }
            fun methodTypeForBank(bankProfileId: String, toggleType: ReceivingMethodType): ReceivingMethodType =
                catalog.firstOrNull { it.bankProfileId == bankProfileId }?.methodType
                    ?.takeIf { it == ReceivingMethodType.MOBILE_MONEY }
                    ?: toggleType
            var selectedBankId by remember { mutableStateOf(bankOptions.firstOrNull()?.bankProfileId.orEmpty()) }
            var identifierInput by remember { mutableStateOf("") }
            var editingMethod by remember { mutableStateOf<PremiumReceivingMethodUiItem?>(null) }
            var editLabel by remember { mutableStateOf("") }
            var editIdentifierInput by remember { mutableStateOf("") }
            var editBankId by remember { mutableStateOf(bankOptions.firstOrNull()?.bankProfileId.orEmpty()) }
            LaunchedEffect(clearDraftSignal) {
                if (clearDraftSignal > 0) {
                    identifierInput = ""
                    draftType = null
                    editingMethod = null
                    editLabel = ""
                    editIdentifierInput = ""
                }
            }
            val listState = rememberLazyListState()
            LaunchedEffect(draftType) {
                if (draftType != null) {
                    listState.animateScrollToItem(1)
                }
            }
            LazyColumn(
                Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
                state = listState,
                contentPadding = PaddingValues(bottom = 22.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                onBack?.let { back ->
                    item { ReceivingMethodBreadcrumb(language.ui("Banques russes"), back) }
                }
                item {
                    Text(language.ui("Moyens de réception"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(language.ui("Ajoutez les cartes ou numéros que vos clients utiliseront pour vous payer."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
                    Text(language.ui("Les informations complètes ne sont jamais envoyées dans les webhooks."), color = PremiumColors.PageMuted, fontSize = 12.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 10.dp))
                }
                actionMessage?.takeIf { it.isNotBlank() }?.let { message ->
                    item { ReceivingMethodFeedbackBanner(message) }
                }
                if (draftType != null) {
                    item {
                        val toggleType = draftType ?: ReceivingMethodType.CARD_TRANSFER
                        // WA wallets are phone-addressed mobile money: their methodType
                        // overrides the card/phone toggle so input + submission stay MOBILE_MONEY.
                        val effectiveDraftType = methodTypeForBank(selectedBankId, toggleType)
                        ReceivingMethodDraftPanel(
                            draftType = effectiveDraftType,
                            selectedBankId = selectedBankId,
                            identifierInput = identifierInput,
                            bankOptions = bankOptions,
                            language = language,
                            onBankSelected = { selectedBankId = it },
                            onIdentifierChange = { identifierInput = it },
                            onCancel = {
                                draftType = null
                                identifierInput = ""
                            },
                            onSave = {
                                val submission = MerchantReceivingMethodDraft(
                                    bankProfileId = selectedBankId,
                                    type = effectiveDraftType,
                                    rawIdentifierInput = identifierInput
                                ).toSubmission()
                                onSaveDraft(submission)
                            }
                        )
                    }
                }
                item {
                    MerchantReceivingVerificationCard(
                        method = state.value.items.firstOrNull { item ->
                            item.title.contains("carte", ignoreCase = true) ||
                                item.subtitle.contains("carte", ignoreCase = true)
                        },
                        language = language
                    )
                }
                item {
                    MerchantSbpReceivingCard(
                        method = state.value.items.firstOrNull { item ->
                            item.title.contains("sbp", ignoreCase = true) ||
                                item.subtitle.contains("sbp", ignoreCase = true) ||
                                item.helper?.contains("sbp", ignoreCase = true) == true ||
                                item.title.contains("téléphone", ignoreCase = true) ||
                                item.title.contains("telephone", ignoreCase = true)
                        },
                        language = language
                    )
                }
                item {
                    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        ReceivingMethodActionButton(
                            label = language.ui("Ajouter une carte"),
                            helper = language.ui("Carte bancaire associée à votre banque"),
                            icon = Icons.Default.CreditCard,
                            onClick = { draftType = ReceivingMethodType.CARD_TRANSFER }
                        )
                        ReceivingMethodActionButton(
                            label = language.ui("Ajouter téléphone SBP"),
                            helper = language.ui("Numéro de téléphone associé à une banque"),
                            sbpIcon = true,
                            onClick = { draftType = ReceivingMethodType.PHONE_TRANSFER }
                        )
                    }
                }
                editingMethod?.let { method ->
                    item {
                        PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = PremiumColors.Surface) {
                            Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                val editType = if (method.title.contains("téléphone", ignoreCase = true) || method.helper?.contains("SBP", ignoreCase = true) == true) {
                                    ReceivingMethodType.PHONE_TRANSFER
                                } else {
                                    ReceivingMethodType.CARD_TRANSFER
                                }
                                Text(language.ui("Modifier la destination"), color = PremiumColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    language.ui(if (editType == ReceivingMethodType.CARD_TRANSFER) "Entrez la nouvelle carte. L'ancienne sera remplacée après enregistrement." else "Entrez la nouvelle destination SBP. L'ancienne sera remplacée après enregistrement."),
                                    color = PremiumColors.Muted,
                                    fontSize = 12.sp,
                                    lineHeight = 18.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                CompactReceivingBankSelector(
                                    selectedBankId = editBankId,
                                    bankOptions = bankOptions,
                                    language = language,
                                    onBankSelected = { editBankId = it }
                                )
                                OutlinedTextField(
                                    value = editLabel,
                                    onValueChange = { editLabel = it },
                                    label = { Text(language.ui("Libellé affiché")) },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    shape = RoundedCornerShape(18.dp)
                                )
                                OutlinedTextField(
                                    value = editIdentifierInput,
                                    onValueChange = { editIdentifierInput = it },
                                    label = { Text(language.ui(if (editType == ReceivingMethodType.CARD_TRANSFER) "Nouveau numéro de carte" else "Nouveau numéro de téléphone")) },
                                    placeholder = { Text(if (editType == ReceivingMethodType.CARD_TRANSFER) "Ex. 4276 **** 5421" else "Ex. +7 *** *** ** 21") },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    shape = RoundedCornerShape(18.dp)
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                                    PremiumOutlineButton(language.ui("Annuler"), modifier = Modifier.weight(1f)) {
                                        editingMethod = null
                                        editLabel = ""
                                        editIdentifierInput = ""
                                    }
                                    PremiumPrimaryButton(
                                        language.ui("Enregistrer"),
                                        modifier = Modifier.weight(1f),
                                        enabled = editLabel.isNotBlank() && editIdentifierInput.isNotBlank()
                                    ) {
                                        // If the merchant retargets the edit to a WA wallet,
                                        // submit MOBILE_MONEY (phone-addressed), else keep the
                                        // card/phone type inferred from the existing method.
                                        val submission = MerchantReceivingMethodDraft(
                                            bankProfileId = editBankId,
                                            type = methodTypeForBank(editBankId, editType),
                                            rawIdentifierInput = editIdentifierInput
                                        ).toSubmission().copy(displayLabel = editLabel.trim())
                                        onReplaceMethod(method.routeId, submission)
                                    }
                                }
                            }
                        }
                    }
                }
                if (state.value.items.isEmpty()) {
                    item {
                        PremiumStatePanel(PremiumScreenState.empty<Unit>(language.ui("Aucun moyen de réception"), language.ui("Ajoutez une carte ou un téléphone SBP pour commencer.")))
                    }
                }
                items(state.value.items) { method ->
                    PremiumReceivingMethodRow(
                        method = method,
                        onOpen = { onOpenWalletDetail(method.routeId) },
                        onEdit = {
                            editingMethod = method
                            editLabel = method.helper?.takeUnless { it.contains("SBP", ignoreCase = true) } ?: method.title
                            editIdentifierInput = ""
                            editBankId = bankProfileIdFromDisplay(method.subtitle) ?: bankOptions.firstOrNull()?.bankProfileId.orEmpty()
                        },
                        onDisable = { onDisableMethod(method.routeId) },
                        onSetDefault = { onSetDefaultMethod(method.routeId) },
                        onDelete = { onDeleteMethod(method.routeId) },
                        language = language
                    )
                }
            }
        }
        else -> PremiumStateList(state, language)
    }
}

private enum class ReceivingMethodFamily { RUSSIAN, WEST_AFRICA, INTERNATIONAL, ALL }

/**
 * Receiving-methods hub: a family chooser (Russian banking / West Africa mobile
 * money). The current Russian screen becomes a sub-screen; the West Africa
 * sub-screen is new. Both render sites (Payment tab + standalone route) use this.
 */
@Composable
fun PremiumReceivingMethodsHub(
    state: PremiumScreenState<PremiumReceivingMethodsUiState>,
    clearDraftSignal: Int = 0,
    actionMessage: String? = null,
    onOpenWalletDetail: (String) -> Unit = {},
    onSaveDraft: (MerchantReceivingMethodSubmission) -> Unit = {},
    onEditMethod: (String, String) -> Unit = { _, _ -> },
    onReplaceMethod: (String, MerchantReceivingMethodSubmission) -> Unit = { _, _ -> },
    onDisableMethod: (String) -> Unit = {},
    onSetDefaultMethod: (String) -> Unit = {},
    onDeleteMethod: (String) -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    var family by remember { mutableStateOf<ReceivingMethodFamily?>(null) }
    when (family) {
        null -> PremiumReceivingMethodFamilyChooser(state, language) { family = it }
        // RUSSIAN and INTERNATIONAL both land on the same unified add flow
        // (PremiumReceivingMethodsStateScreen) — its draft panel offers the FULL
        // ReceivingCatalog.allMethods (RU banks + INT neobanks + WA wallets), so a
        // merchant can pick Wise / Revolut / Payoneer from the International tile.
        ReceivingMethodFamily.RUSSIAN,
        ReceivingMethodFamily.INTERNATIONAL -> PremiumReceivingMethodsStateScreen(
            state = state,
            clearDraftSignal = clearDraftSignal,
            actionMessage = actionMessage,
            onOpenWalletDetail = onOpenWalletDetail,
            onSaveDraft = onSaveDraft,
            onEditMethod = onEditMethod,
            onReplaceMethod = onReplaceMethod,
            onDisableMethod = onDisableMethod,
            onSetDefaultMethod = onSetDefaultMethod,
            onDeleteMethod = onDeleteMethod,
            onBack = { family = null },
            language = language
        )
        // The prominent "+ Ajouter" pill lands here: ONE add flow listing every
        // provider (WA mobile money + INT neobanks + RU banks) grouped by region.
        ReceivingMethodFamily.ALL -> PremiumUnifiedAddMethodScreen(
            clearDraftSignal = clearDraftSignal,
            actionMessage = actionMessage,
            onSaveDraft = onSaveDraft,
            onBack = { family = null },
            language = language
        )
        ReceivingMethodFamily.WEST_AFRICA -> PremiumWestAfricaReceivingScreen(
            state = state,
            clearDraftSignal = clearDraftSignal,
            actionMessage = actionMessage,
            onSaveDraft = onSaveDraft,
            onDisableMethod = onDisableMethod,
            onSetDefaultMethod = onSetDefaultMethod,
            onDeleteMethod = onDeleteMethod,
            onBack = { family = null },
            language = language
        )
    }
}

/**
 * Unified "add a receiving method" flow — the destination of the prominent
 * "+ Ajouter" pill. Lists EVERY provider from the single-source
 * [ReceivingCatalog.allMethods], grouped by region (West-Africa mobile money,
 * International neobanks, Russian banks), so a merchant adds ANY method from one
 * place instead of being forced into a single region. Picking a provider reveals an
 * input that adapts to that provider's [ReceivingMethodType] (phone for mobile
 * money, card for the card-rail banks) and submits with that exact type. No data is
 * invented: rows are the real addable catalog, with official logos via bankProfileId.
 */
@Composable
fun PremiumUnifiedAddMethodScreen(
    clearDraftSignal: Int = 0,
    actionMessage: String? = null,
    onSaveDraft: (MerchantReceivingMethodSubmission) -> Unit = {},
    onBack: (() -> Unit)? = null,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    val catalog = ReceivingCatalog.allMethods
    val sections: List<Pair<ReceivingRegion, String>> = listOf(
        ReceivingRegion.WEST_AFRICA to "Mobile Money (Afrique de l'Ouest)",
        ReceivingRegion.INTERNATIONAL to "International",
        ReceivingRegion.RU to "Russie"
    )
    var selectedId by remember { mutableStateOf("") }
    var identifierInput by remember { mutableStateOf("") }
    LaunchedEffect(clearDraftSignal) {
        if (clearDraftSignal > 0) {
            selectedId = ""
            identifierInput = ""
        }
    }
    val selected = catalog.firstOrNull { it.bankProfileId == selectedId }
    val isMobileMoney = selected?.methodType == ReceivingMethodType.MOBILE_MONEY
    val isValid = selected != null && identifierInput.isNotBlank()
    val accent = if (isValid) PremiumColors.Success else PremiumColors.Teal

    LazyColumn(
        Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        onBack?.let { back ->
            item { ReceivingMethodBreadcrumb(language.ui("Portefeuilles de réception"), back) }
        }
        item {
            Text(language.ui("Ajouter un moyen de réception"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(
                language.ui("Choisissez le fournisseur sur lequel vos clients vous paient — mobile money, néobanque ou banque — puis saisissez la destination."),
                color = PremiumColors.PageMuted,
                fontSize = 14.sp,
                lineHeight = 20.sp
            )
        }
        actionMessage?.takeIf { it.isNotBlank() }?.let { message ->
            item { ReceivingMethodFeedbackBanner(message) }
        }
        sections.forEach { (region, label) ->
            val entries = catalog.filter { it.region == region }
            if (entries.isNotEmpty()) {
                item(key = "section_$region") {
                    Text(
                        language.ui(label).uppercase(),
                        color = PremiumColors.SoftText,
                        fontSize = 11.sp,
                        letterSpacing = 0.8.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }
                items(entries, key = { it.bankProfileId }) { entry ->
                    UnifiedAddProviderRow(
                        entry = entry,
                        selected = entry.bankProfileId == selectedId,
                        onClick = {
                            selectedId = entry.bankProfileId
                            identifierInput = ""
                        }
                    )
                }
            }
        }
        selected?.let { entry ->
            item(key = "draft_${entry.bankProfileId}") {
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp, color = PremiumColors.Surface) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            PremiumBankLogo(bankProfileId = entry.bankProfileId, displayName = entry.displayName, size = 40.dp)
                            Column(Modifier.weight(1f)) {
                                Text(entry.displayName, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    language.ui(if (isMobileMoney) "Numéro mobile money marchand" else "Carte ou compte marchand"),
                                    color = PremiumColors.Muted,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                        OutlinedTextField(
                            value = identifierInput,
                            onValueChange = { identifierInput = it },
                            label = { Text(language.ui(if (isMobileMoney) "Numéro de téléphone" else "Numéro de carte")) },
                            placeholder = { Text(if (isMobileMoney) "Ex. +225 07 ** ** ** 00" else "Ex. 4276 **** 5421") },
                            leadingIcon = {
                                Icon(if (isMobileMoney) Icons.Default.PhoneAndroid else Icons.Default.CreditCard, null, tint = accent)
                            },
                            supportingText = {
                                Text(
                                    language.ui("Seule la version masquée sera affichée dans l'app."),
                                    color = PremiumColors.Muted,
                                    fontSize = 11.sp,
                                    lineHeight = 14.sp
                                )
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = accent,
                                unfocusedBorderColor = PremiumColors.Line,
                                focusedLabelColor = accent,
                                cursorColor = accent
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(18.dp)
                        )
                        PremiumPrimaryButton(
                            language.ui("Enregistrer le moyen de réception"),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = isValid
                        ) {
                            val submission = MerchantReceivingMethodDraft(
                                bankProfileId = entry.bankProfileId,
                                type = entry.methodType,
                                rawIdentifierInput = identifierInput
                            ).toSubmission()
                            onSaveDraft(submission)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun UnifiedAddProviderRow(
    entry: ReceivingMethodCatalogEntry,
    selected: Boolean,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(22.dp)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) PremiumColors.IconTile else PremiumColors.Surface, shape)
            .border(1.dp, if (selected) PremiumColors.Teal.copy(alpha = 0.62f) else PremiumColors.Line.copy(alpha = 0.72f), shape)
            .premiumTap(onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        PremiumBankLogo(bankProfileId = entry.bankProfileId, displayName = entry.displayName, size = 40.dp)
        Text(
            entry.displayName,
            color = PremiumColors.Ink,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        Box(
            Modifier
                .size(20.dp)
                .background(if (selected) PremiumColors.Teal else Color.Transparent, CircleShape)
                .border(1.5.dp, if (selected) PremiumColors.Teal else PremiumColors.Line, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (selected) Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(14.dp))
        }
    }
}

/**
 * Receiving methods overview ("Portefeuilles de réception"). Single scroll that
 * presents the three receiving regions (West Africa / International / Russia) as
 * distinct accented grouped cards. This surface is a CHOOSER: tapping a region
 * navigates into that region's management sub-screen to add / configure methods.
 *
 * Everything rendered is real: region rows and per-region COUNTS come from the
 * unified [ReceivingCatalog] (the methods a merchant CAN add, with their official
 * logos); the "configurées" count is the merchant's real configured-method count
 * from runtime state. No masked account numbers, received amounts or detection
 * "tones" are shown — a chooser lists what is addable, not fabricated balances.
 */
@Composable
private fun PremiumReceivingMethodFamilyChooser(
    state: PremiumScreenState<PremiumReceivingMethodsUiState>,
    language: PremiumLanguageOption,
    onPick: (ReceivingMethodFamily) -> Unit
) {
    val configuredCount = (state as? PremiumScreenState.Content)?.value?.items?.size ?: 0
    val regions = receivingRegionGroupsCatalog()
    val totalMethods = regions.sumOf { it.count }
    var selectedRegion by remember { mutableStateOf<ReceivingRegionKind?>(null) }
    val visibleRegions = regions.filter { selectedRegion == null || it.kind == selectedRegion }

    LazyColumn(
        Modifier
            .fillMaxHeight()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    language.ui("Portefeuilles de réception"),
                    color = PremiumColors.PageInk,
                    fontSize = 26.sp,
                    lineHeight = 30.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f).padding(end = 12.dp)
                )
                ReceivingAddPill(language) { onPick(ReceivingMethodFamily.ALL) }
            }
        }
        item {
            Text(
                "$totalMethods ${language.ui("disponibles")} · $configuredCount ${language.ui("configurées")}",
                color = PremiumColors.SoftText,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        item {
            ReceivingRegionSegmentedRow(
                selected = selectedRegion,
                language = language,
                onSelect = { selectedRegion = it }
            )
        }
        items(visibleRegions, key = { it.kind }) { region ->
            ReceivingRegionGroupCard(
                region = region,
                language = language,
                onClick = { region.family?.let(onPick) }
            )
        }
    }
}

@Composable
private fun ReceivingAddPill(language: PremiumLanguageOption, onClick: () -> Unit) {
    Row(
        Modifier
            .clip(RoundedCornerShape(PremiumRadius.Pill))
            .background(PremiumColors.Ink, RoundedCornerShape(PremiumRadius.Pill))
            .premiumTap(onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Add, null, tint = PremiumColors.Surface, modifier = Modifier.size(16.dp))
        Text(
            language.ui("Ajouter"),
            color = PremiumColors.Surface,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 5.dp)
        )
    }
}

@Composable
private fun ReceivingRegionSegmentedRow(
    selected: ReceivingRegionKind?,
    language: PremiumLanguageOption,
    onSelect: (ReceivingRegionKind?) -> Unit
) {
    val segments: List<Pair<ReceivingRegionKind?, String>> = listOf(
        null to "Toutes",
        ReceivingRegionKind.WEST_AFRICA to "Afrique de l'Ouest",
        ReceivingRegionKind.INTERNATIONAL to "International",
        ReceivingRegionKind.RUSSIA to "Russie"
    )
    LazyRow(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(segments) { (kind, label) ->
            val active = kind == selected
            Box(
                Modifier
                    .clip(RoundedCornerShape(PremiumRadius.Pill))
                    .background(
                        if (active) PremiumColors.Ink else PremiumColors.Surface,
                        RoundedCornerShape(PremiumRadius.Pill)
                    )
                    .border(
                        1.dp,
                        if (active) Color.Transparent else PremiumColors.Line.copy(alpha = 0.7f),
                        RoundedCornerShape(PremiumRadius.Pill)
                    )
                    .premiumTap { onSelect(kind) }
                    .padding(horizontal = 16.dp, vertical = 9.dp)
            ) {
                Text(
                    language.ui(label),
                    color = if (active) PremiumColors.Surface else PremiumColors.Muted,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun ReceivingRegionGroupCard(
    region: ReceivingRegionGroup,
    language: PremiumLanguageOption,
    onClick: () -> Unit
) {
    PremiumCard(
        Modifier.fillMaxWidth(),
        radius = 28.dp,
        color = PremiumColors.Surface
    ) {
        Row(Modifier.fillMaxWidth()) {
            Box(
                Modifier
                    .width(5.dp)
                    .fillMaxHeight()
                    .background(region.accent)
            )
            Column(
                Modifier
                    .weight(1f)
                    .let { if (region.family != null) it.premiumTap(onClick) else it }
                    .padding(start = 18.dp, end = 18.dp, top = 18.dp, bottom = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        language.ui(region.title).uppercase(),
                        color = PremiumColors.Ink,
                        fontSize = 13.sp,
                        letterSpacing = 0.8.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(end = 8.dp)
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "${region.count}",
                        color = PremiumColors.SoftText,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(PremiumRadius.Pill))
                            .background(region.accent.copy(alpha = 0.14f), RoundedCornerShape(PremiumRadius.Pill))
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text(
                            language.ui(region.familyChip),
                            color = region.accent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.3.sp
                        )
                    }
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    region.rows.forEach { row ->
                        ReceivingRegionMethodRow(row = row, language = language)
                    }
                }
                region.overflowLabel?.let { label ->
                    Text(
                        "$label →",
                        color = region.accent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .let { if (region.family != null) it.premiumTap(onClick) else it }
                            .padding(top = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun ReceivingRegionMethodRow(
    row: ReceivingRegionMethodEntry,
    language: PremiumLanguageOption
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        PremiumBankLogo(bankProfileId = row.bankProfileId, displayName = row.name, size = 40.dp)
        Text(
            row.name,
            color = PremiumColors.Ink,
            fontSize = 15.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f).padding(start = 12.dp, end = 8.dp)
        )
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = PremiumColors.SoftText,
            modifier = Modifier.size(20.dp)
        )
    }
}

private enum class ReceivingRegionKind { WEST_AFRICA, INTERNATIONAL, RUSSIA }

/** One addable method in a region card: official logo (via id) + display name. */
private data class ReceivingRegionMethodEntry(
    val bankProfileId: String,
    val name: String
)

private data class ReceivingRegionGroup(
    val kind: ReceivingRegionKind,
    val family: ReceivingMethodFamily?,
    val accent: Color,
    val title: String,
    val familyChip: String,
    val count: Int,
    val rows: List<ReceivingRegionMethodEntry>,
    val overflowLabel: String?
)

/** Max method rows shown inside a region card before collapsing into "Voir les N". */
private const val RECEIVING_REGION_PREVIEW_ROWS = 3

/**
 * Builds the three region groups for the overview from the unified [ReceivingCatalog]
 * (single source of truth). Region rows = the real methods a merchant can add in that
 * region (official logo via bankProfileId + display name); region [count] = the real
 * catalog size for the region. No masked accounts, amounts or detection state are
 * derived or invented — this is a chooser of what is addable. The INTERNATIONAL group
 * routes to the unified add flow (PremiumReceivingMethodsStateScreen, same as RUSSIAN),
 * whose draft panel offers the full catalog incl. the international neobanks.
 */
private fun receivingRegionGroupsCatalog(): List<ReceivingRegionGroup> {
    fun entries(region: ReceivingRegion): List<ReceivingRegionMethodEntry> =
        ReceivingCatalog.byRegion(region).map { ReceivingRegionMethodEntry(it.bankProfileId, it.displayName) }

    fun group(
        kind: ReceivingRegionKind,
        region: ReceivingRegion,
        family: ReceivingMethodFamily?,
        accent: Color,
        title: String,
        familyChip: String
    ): ReceivingRegionGroup {
        val all = entries(region)
        val shown = all.take(RECEIVING_REGION_PREVIEW_ROWS)
        return ReceivingRegionGroup(
            kind = kind,
            family = family,
            accent = accent,
            title = title,
            familyChip = familyChip,
            count = all.size,
            rows = shown,
            overflowLabel = if (all.size > shown.size) "Voir les ${all.size} méthodes" else null
        )
    }

    return listOf(
        group(
            kind = ReceivingRegionKind.WEST_AFRICA,
            region = ReceivingRegion.WEST_AFRICA,
            family = ReceivingMethodFamily.WEST_AFRICA,
            accent = PremiumColors.Teal,
            title = "Afrique de l'Ouest",
            familyChip = "Mobile money"
        ),
        group(
            kind = ReceivingRegionKind.INTERNATIONAL,
            region = ReceivingRegion.INTERNATIONAL,
            family = ReceivingMethodFamily.INTERNATIONAL,
            accent = PremiumColors.Success,
            title = "International",
            familyChip = "Néobanques"
        ),
        group(
            kind = ReceivingRegionKind.RUSSIA,
            region = ReceivingRegion.RU,
            family = ReceivingMethodFamily.RUSSIAN,
            accent = PremiumColors.Danger,
            title = "Russie",
            familyChip = "Banques"
        )
    )
}

@Composable
fun WestAfricaWalletBadge(option: WestAfricaReceivingOption, size: Dp) {
    val brand = Color(option.brandArgb)
    Box(
        Modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.32f))
            .background(brand)
            .border(1.dp, Color.Black.copy(alpha = 0.06f), RoundedCornerShape(size * 0.32f)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            option.monogram,
            color = if (option.darkInk) PremiumColors.Ink else Color.White,
            fontSize = (size.value * 0.32f).sp,
            lineHeight = (size.value * 0.32f).sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1
        )
    }
}

@Composable
private fun WestAfricaWalletSelectCard(
    option: WestAfricaReceivingOption,
    selected: Boolean,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(20.dp)
    val brand = Color(option.brandArgb)
    Row(
        Modifier
            .fillMaxWidth()
            .height(72.dp)
            .clip(shape)
            .background(if (selected) brand.copy(alpha = 0.10f) else PremiumColors.SurfaceAlt.copy(alpha = 0.5f))
            .border(1.5.dp, if (selected) brand else PremiumColors.Line.copy(alpha = 0.7f), shape)
            .premiumTap(onClick)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        WestAfricaWalletBadge(option, 44.dp)
        Column(Modifier.weight(1f)) {
            Text(option.displayName, color = PremiumColors.Ink, fontSize = 14.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(option.country, color = PremiumColors.Muted, fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Box(
            Modifier
                .size(20.dp)
                .background(if (selected) brand else Color.Transparent, CircleShape)
                .border(1.5.dp, if (selected) brand else PremiumColors.Line, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (selected) Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(14.dp))
        }
    }
}

@Composable
private fun WestAfricaWalletGrid(
    wallets: List<WestAfricaReceivingOption>,
    selectedId: String,
    language: PremiumLanguageOption,
    onSelect: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(language.ui("Choisissez votre wallet"), color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold)
        wallets.chunked(2).forEach { rowWallets ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                rowWallets.forEach { wallet ->
                    Box(Modifier.weight(1f)) {
                        WestAfricaWalletSelectCard(
                            option = wallet,
                            selected = wallet.bankProfileId == selectedId,
                            onClick = { onSelect(wallet.bankProfileId) }
                        )
                    }
                }
                if (rowWallets.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ReceivingMethodBreadcrumb(label: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().premiumTap(onBack).padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, null, tint = PremiumColors.Teal, modifier = Modifier.size(22.dp))
        Text(label, color = PremiumColors.Teal, fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 2.dp))
    }
}

@Composable
fun PremiumWestAfricaReceivingScreen(
    state: PremiumScreenState<PremiumReceivingMethodsUiState>,
    clearDraftSignal: Int = 0,
    actionMessage: String? = null,
    onSaveDraft: (MerchantReceivingMethodSubmission) -> Unit = {},
    onDisableMethod: (String) -> Unit = {},
    onSetDefaultMethod: (String) -> Unit = {},
    onDeleteMethod: (String) -> Unit = {},
    onBack: (() -> Unit)? = null,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> {
            val wallets = WestAfricaReceivingCatalog.wallets
            var selectedWalletId by remember { mutableStateOf(wallets.firstOrNull()?.bankProfileId.orEmpty()) }
            var phoneInput by remember { mutableStateOf("") }
            LaunchedEffect(clearDraftSignal) {
                if (clearDraftSignal > 0) {
                    phoneInput = ""
                }
            }
            val waItems = state.value.items.filter { it.title.contains("mobile money", ignoreCase = true) }
            LazyColumn(
                Modifier.fillMaxHeight().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
                contentPadding = PaddingValues(bottom = 22.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                onBack?.let { back ->
                    item { ReceivingMethodBreadcrumb(language.ui("Mobile money"), back) }
                }
                item {
                    Text(language.ui("Mobile money (Afrique de l'Ouest)"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(
                        language.ui("Ajoutez le wallet sur lequel vos clients vous paient en franc CFA (XOF)."),
                        color = PremiumColors.PageMuted,
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    )
                }
                actionMessage?.takeIf { it.isNotBlank() }?.let { message ->
                    item { ReceivingMethodFeedbackBanner(message) }
                }
                item {
                    PremiumCard(Modifier.fillMaxWidth(), radius = 32.dp, color = PremiumColors.Surface) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                                Box(
                                    Modifier.size(54.dp).background(PremiumColors.IconTile, RoundedCornerShape(20.dp))
                                        .border(1.dp, PremiumColors.Teal.copy(alpha = 0.18f), RoundedCornerShape(20.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.AccountBalanceWallet, null, tint = PremiumColors.Teal, modifier = Modifier.size(27.dp))
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(language.ui("Ajouter un wallet"), color = PremiumColors.Ink, fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.Bold)
                                    Text(
                                        language.ui("Choisissez votre wallet, puis saisissez le numéro qui reçoit l'argent."),
                                        color = PremiumColors.Muted,
                                        fontSize = 12.sp,
                                        lineHeight = 17.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                }
                            }
                            WestAfricaWalletGrid(
                                wallets = wallets,
                                selectedId = selectedWalletId,
                                language = language,
                                onSelect = { selectedWalletId = it }
                            )
                            OutlinedTextField(
                                value = phoneInput,
                                onValueChange = { phoneInput = it },
                                label = { Text(language.ui("Numéro mobile money")) },
                                placeholder = { Text("Ex. +221 77 123 45 67") },
                                leadingIcon = { Icon(Icons.Default.PhoneAndroid, null, tint = PremiumColors.Blue) },
                                supportingText = {
                                    Text(
                                        language.ui("Format international. Seule la version masquée sera affichée."),
                                        color = PremiumColors.Muted,
                                        fontSize = 11.sp,
                                        lineHeight = 14.sp
                                    )
                                },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                shape = RoundedCornerShape(20.dp)
                            )
                            PremiumPrimaryButton(
                                language.ui("Enregistrer le wallet"),
                                modifier = Modifier.fillMaxWidth(),
                                enabled = selectedWalletId.isNotBlank() && phoneInput.isNotBlank()
                            ) {
                                val submission = MerchantReceivingMethodDraft(
                                    bankProfileId = selectedWalletId,
                                    type = ReceivingMethodType.MOBILE_MONEY,
                                    rawIdentifierInput = phoneInput
                                ).toSubmission()
                                onSaveDraft(submission)
                            }
                        }
                    }
                }
                if (waItems.isEmpty()) {
                    item {
                        PremiumStatePanel(
                            PremiumScreenState.empty<Unit>(
                                language.ui("Aucun wallet mobile money"),
                                language.ui("Ajoutez un wallet Orange Money, Wave ou MTN pour encaisser en XOF.")
                            )
                        )
                    }
                }
                items(waItems) { method ->
                    PremiumReceivingMethodRow(
                        method = method,
                        onEdit = {},
                        onDisable = { onDisableMethod(method.routeId) },
                        onSetDefault = { onSetDefaultMethod(method.routeId) },
                        onDelete = { onDeleteMethod(method.routeId) },
                        language = language
                    )
                }
            }
        }
        else -> PremiumStateList(state, language)
    }
}

@Composable
private fun ReceivingMethodActionButton(
    label: String,
    helper: String,
    icon: ImageVector? = null,
    sbpIcon: Boolean = false,
    onClick: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(88.dp)
            .clip(RoundedCornerShape(28.dp))
            .background(PremiumColors.Surface, RoundedCornerShape(28.dp))
            .border(1.dp, PremiumColors.Line.copy(alpha = 0.86f), RoundedCornerShape(28.dp))
            .premiumTap(onClick)
            .padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(54.dp)
                .background(PremiumColors.IconTile, RoundedCornerShape(20.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (sbpIcon) {
                Text("SBP", color = PremiumColors.Teal, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            } else if (icon != null) {
                Icon(icon, null, tint = PremiumColors.Teal, modifier = Modifier.size(26.dp))
            }
        }
        Column(Modifier.weight(1f).padding(start = 16.dp)) {
            Text(label, color = PremiumColors.Ink, fontSize = 17.sp, lineHeight = 21.sp, fontWeight = FontWeight.Bold)
            Text(helper, color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 3.dp))
        }
        Icon(
            Icons.AutoMirrored.Filled.KeyboardArrowRight,
            null,
            tint = PremiumColors.SoftText,
            modifier = Modifier.size(22.dp)
        )
    }
}

@Composable
private fun ReceivingMethodDraftPanel(
    draftType: ReceivingMethodType,
    selectedBankId: String,
    identifierInput: String,
    bankOptions: List<PremiumReceivingMethodBankOption>,
    language: PremiumLanguageOption,
    onBankSelected: (String) -> Unit,
    onIdentifierChange: (String) -> Unit,
    onCancel: () -> Unit,
    onSave: () -> Unit
) {
    val isCardDraft = draftType == ReceivingMethodType.CARD_TRANSFER
    val isMobileMoney = draftType == ReceivingMethodType.MOBILE_MONEY
    val title = when {
        isCardDraft -> "Ajouter une carte"
        isMobileMoney -> "Ajouter un wallet mobile money"
        else -> "Ajouter téléphone SBP"
    }
    val helper = when {
        isCardDraft -> "Choisissez la banque, puis saisissez le numéro de carte marchand."
        isMobileMoney -> "Choisissez le wallet, puis saisissez le numéro mobile money marchand."
        else -> "Choisissez la banque, puis saisissez le numéro de téléphone marchand."
    }
    val isValid = identifierInput.isNotBlank()
    val accent = if (isValid) PremiumColors.Success else PremiumColors.Teal
    PremiumCard(Modifier.fillMaxWidth(), radius = 32.dp, color = PremiumColors.Surface) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(
                    Modifier
                        .size(56.dp)
                        .background(PremiumColors.IconTile, RoundedCornerShape(22.dp))
                        .border(1.dp, accent.copy(alpha = 0.24f), RoundedCornerShape(22.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    if (isCardDraft) {
                        Icon(Icons.Default.CreditCard, null, tint = accent, modifier = Modifier.size(27.dp))
                    } else if (isMobileMoney) {
                        Icon(Icons.Default.PhoneAndroid, null, tint = accent, modifier = Modifier.size(27.dp))
                    } else {
                        Text("SBP", color = accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text(language.ui(title), color = PremiumColors.Ink, fontSize = 20.sp, lineHeight = 24.sp, fontWeight = FontWeight.Bold)
                    Text(language.ui(helper), color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                }
            }
            CompactReceivingBankSelector(
                selectedBankId = selectedBankId,
                bankOptions = bankOptions,
                language = language,
                onBankSelected = onBankSelected
            )
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(PremiumColors.SurfaceAlt.copy(alpha = 0.55f))
                    .border(1.dp, PremiumColors.Line.copy(alpha = 0.7f), RoundedCornerShape(24.dp))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        language.ui("Destination de réception").uppercase(),
                        color = PremiumColors.Muted,
                        fontSize = 11.sp,
                        lineHeight = 14.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp
                    )
                    if (isValid) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Success, modifier = Modifier.size(15.dp))
                            Text(language.ui("Prêt"), color = PremiumColors.Success, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                OutlinedTextField(
                    value = identifierInput,
                    onValueChange = onIdentifierChange,
                    label = { Text(language.ui(if (isCardDraft) "Numéro de carte" else "Numéro de téléphone")) },
                    placeholder = {
                        Text(
                            when {
                                isCardDraft -> "Ex. 4276 **** 5421"
                                isMobileMoney -> "Ex. +225 07 ** ** ** 00"
                                else -> "Ex. +7 *** *** ** 21"
                            }
                        )
                    },
                    leadingIcon = {
                        if (isCardDraft) {
                            Icon(Icons.Default.CreditCard, null, tint = accent)
                        } else {
                            Icon(Icons.Default.PhoneAndroid, null, tint = accent)
                        }
                    },
                    trailingIcon = if (isValid) {
                        { Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Success) }
                    } else {
                        null
                    },
                    supportingText = {
                        Text(
                            language.ui("Seule la version masquée sera affichée dans l'app."),
                            color = PremiumColors.Muted,
                            fontSize = 11.sp,
                            lineHeight = 14.sp
                        )
                    },
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = accent,
                        unfocusedBorderColor = PremiumColors.Line,
                        focusedLabelColor = accent,
                        cursorColor = accent,
                        focusedContainerColor = PremiumColors.Surface.copy(alpha = 0.6f),
                        unfocusedContainerColor = PremiumColors.Surface.copy(alpha = 0.4f),
                        focusedTextColor = PremiumColors.Ink,
                        unfocusedTextColor = PremiumColors.Ink
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(18.dp)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                PremiumOutlineButton(language.ui("Annuler"), modifier = Modifier.weight(1f), onClick = onCancel)
                PremiumPrimaryButton(
                    language.ui(if (isCardDraft) "Enregistrer la carte" else "Enregistrer"),
                    modifier = Modifier.weight(1f),
                    enabled = isValid,
                    onClick = onSave
                )
            }
        }
    }
}

@Composable
fun CompactReceivingBankSelector(
    selectedBankId: String,
    bankOptions: List<PremiumReceivingMethodBankOption>,
    language: PremiumLanguageOption,
    onBankSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            language.ui("Banque compatible"),
            color = PremiumColors.Muted,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Bold
        )
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 1.dp)
        ) {
            items(bankOptions, key = { it.bankProfileId }) { bank ->
                CompactReceivingBankChip(
                    bank = bank,
                    selected = bank.bankProfileId == selectedBankId,
                    onClick = { onBankSelected(bank.bankProfileId) }
                )
            }
        }
    }
}

@Composable
private fun CompactReceivingBankChip(
    bank: PremiumReceivingMethodBankOption,
    selected: Boolean,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(18.dp)
    Row(
        Modifier
            .height(52.dp)
            .clip(shape)
            .background(if (selected) PremiumColors.IconTile else PremiumColors.SurfaceAlt.copy(alpha = 0.58f))
            .border(1.dp, if (selected) PremiumColors.Teal.copy(alpha = 0.62f) else PremiumColors.Line.copy(alpha = 0.72f), shape)
            .premiumTap(onClick)
            .padding(horizontal = 10.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = 32.dp)
        Text(
            bank.displayName,
            color = PremiumColors.Ink,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.width(76.dp)
        )
        Box(
            Modifier
                .size(18.dp)
                .background(if (selected) PremiumColors.Teal else Color.Transparent, CircleShape)
                .border(1.5.dp, if (selected) PremiumColors.Teal else PremiumColors.Line, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (selected) Icon(Icons.Default.CheckCircle, null, tint = Color.White, modifier = Modifier.size(13.dp))
        }
    }
}

@Composable
private fun ReceivingMethodFeedbackBanner(message: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(PremiumColors.Success.copy(alpha = 0.12f))
            .border(1.dp, PremiumColors.Success.copy(alpha = 0.24f), RoundedCornerShape(22.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Success, modifier = Modifier.size(20.dp))
        Text(message, color = PremiumColors.Ink, fontSize = 13.sp, lineHeight = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 10.dp))
    }
}

private fun bankIconResource(bankProfileId: String): Int? {
    return when (bankProfileId) {
        "sber_ru" -> R.drawable.ic_bank_sberbank
        "tbank_ru" -> R.drawable.ic_bank_tbank
        "vtb_ru" -> R.drawable.ic_bank_vtb
        "alfa_ru" -> R.drawable.ic_bank_alfa
        "gazprombank_ru" -> R.drawable.ic_bank_gazprombank
        "ozon_bank" -> R.drawable.ic_bank_ozon
        // West Africa + International — official launcher icons harvested from each app's APK.
        "wave_ci" -> R.drawable.ic_bank_wave
        "orange_money_ci" -> R.drawable.ic_bank_orange_money
        "mtn_momo_ci" -> R.drawable.ic_bank_mtn_momo
        "wise_int" -> R.drawable.ic_bank_wise
        "payoneer_int" -> R.drawable.ic_bank_payoneer
        "revolut_int" -> R.drawable.ic_bank_revolut
        else -> null
    }
}

private fun bankProfileIdFromDisplay(value: String): String? {
    // Unified catalog (all regions incl. WA) so editing any added method — including a
    // West-Africa mobile money wallet — resolves back to its bankProfileId.
    return ReceivingCatalog.allMethods.firstOrNull { entry ->
        value.contains(entry.displayName, ignoreCase = true)
    }?.bankProfileId
}

@Composable
private fun MerchantReceivingVerificationCard(
    method: PremiumReceivingMethodUiItem?,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    val bankProfileId = method?.let { bankProfileIdFromDisplay(it.subtitle) }
    Box(
        Modifier
            .fillMaxWidth()
            .height(190.dp)
            .clip(RoundedCornerShape(34.dp))
        .background(Brush.linearGradient(PremiumBrandGradient.PaymentCard))
            .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(34.dp))
    ) {
        Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column {
                    Text("SwimPay", color = Color.White, fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold)
                    Text(
                        language.ui(if (method != null) "Carte marchand" else "Carte à ajouter"),
                        color = Color.White.copy(alpha = 0.68f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                if (bankProfileId != null) {
                    PremiumBankLogo(bankProfileId = bankProfileId, displayName = method.subtitle, size = 42.dp)
                } else {
                    Box(Modifier.size(42.dp).background(Color.White.copy(alpha = 0.12f), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.CreditCard, null, tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                }
            }
            Column {
                Text(
                    language.ui(method?.subtitle ?: "Aucune carte enregistrée"),
                    color = Color.White,
                    fontSize = 19.sp,
                    lineHeight = 23.sp,
                    fontWeight = FontWeight.Bold
                )
                Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(language.ui(method?.status ?: "À configurer"), color = Color.White.copy(alpha = 0.68f), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text(language.ui(method?.title ?: "Ajouter une carte"), color = Color.White.copy(alpha = 0.88f), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun MerchantSbpReceivingCard(
    method: PremiumReceivingMethodUiItem?,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    val bankName = method?.subtitle?.takeIf { it.isNotBlank() } ?: language.ui("Non configuré")
    val status = language.ui(method?.status ?: "À configurer")
    val destination = language.ui(method?.title?.takeIf { it.isNotBlank() } ?: "Téléphone à ajouter")
    val helper = language.ui(method?.helper?.takeIf { it.isNotBlank() } ?: "Ajoutez un numéro SBP pour l’afficher ici.")
    Box(
        Modifier
            .fillMaxWidth()
            .height(184.dp)
            .clip(RoundedCornerShape(34.dp))
            .background(Brush.linearGradient(PremiumBrandGradient.SbpCard))
            .border(1.dp, Color.White.copy(alpha = 0.10f), RoundedCornerShape(34.dp))
    ) {
        Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Column {
                    Text("SwimPay", color = Color.White, fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold)
                    Text("SBP", color = Color.White.copy(alpha = 0.72f), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Image(
                    painter = painterResource(R.drawable.ic_payment_sbp_mark),
                    contentDescription = "SBP",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.White.copy(alpha = 0.94f))
                        .padding(8.dp)
                )
            }
            Column {
                Text(destination, color = Color.White, fontSize = 22.sp, lineHeight = 26.sp, fontWeight = FontWeight.Bold)
                Text(helper, color = Color.White.copy(alpha = 0.62f), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                Row(
                    Modifier.fillMaxWidth().padding(top = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(PremiumRadius.Pill))
                            .background(Color.White.copy(alpha = 0.12f))
                            .padding(horizontal = 10.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.PhoneAndroid, null, tint = Color.White, modifier = Modifier.size(15.dp))
                        Text(status, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 6.dp))
                    }
                    Text(bankName, color = Color.White.copy(alpha = 0.78f), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun PremiumBankLogo(
    bankProfileId: String,
    displayName: String,
    size: Dp = 46.dp,
    modifier: Modifier = Modifier
) {
    Box(
        modifier
            .size(size)
            .shadow(12.dp, RoundedCornerShape(size / 3f), clip = false)
            .background(Color.White.copy(alpha = 0.98f), RoundedCornerShape(size / 3f))
            .border(1.dp, PremiumColors.Line.copy(alpha = 0.32f), RoundedCornerShape(size / 3f))
            .padding(size / 4.6f),
        contentAlignment = Alignment.Center
    ) {
        val icon = bankIconResource(bankProfileId)
        if (icon != null) {
            Image(
                painter = painterResource(icon),
                contentDescription = displayName,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Text(displayName.take(1), color = PremiumColors.Blue, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun PremiumReceivingMethodRow(
    method: PremiumReceivingMethodUiItem,
    onEdit: () -> Unit,
    onDisable: () -> Unit,
    onSetDefault: () -> Unit,
    onDelete: () -> Unit,
    onOpen: () -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    var pendingConfirmation by remember(method.routeId) { mutableStateOf<String?>(null) }
    PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = PremiumColors.Surface) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val bankProfileId = bankProfileIdFromDisplay(method.subtitle)
            // Tapping the identity header opens the wallet/receiving-method detail.
            Row(Modifier.fillMaxWidth().premiumTap(onOpen), verticalAlignment = Alignment.Top) {
                if (bankProfileId != null) {
                    PremiumBankLogo(bankProfileId = bankProfileId, displayName = method.subtitle, size = 48.dp)
                }
                Column(Modifier.weight(1f).padding(start = if (bankProfileId != null) 14.dp else 0.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(method.title, color = PremiumColors.Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 22.sp, modifier = Modifier.weight(1f))
                        StatusChip(language.ui(method.status), if (method.enabled) StatusTone.Success else StatusTone.Neutral)
                    }
                    Text(method.subtitle, color = PremiumColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 6.dp))
                    method.helper?.let {
                        Text(it, color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    ReceivingMethodMutationButton(language.ui("Modifier"), Icons.Default.Edit, Modifier.weight(1f), onEdit)
                    if (!method.recommended) {
                        ReceivingMethodMutationButton(language.ui("Définir"), Icons.Default.Star, Modifier.weight(1f), onSetDefault)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    if (method.enabled) {
                        ReceivingMethodMutationButton(language.ui("Désactiver"), Icons.Default.Block, Modifier.weight(1f), onClick = {
                            pendingConfirmation = "disable"
                        })
                    }
                    ReceivingMethodMutationButton(language.ui("Supprimer"), Icons.Default.Delete, Modifier.weight(1f), onClick = {
                        pendingConfirmation = "delete"
                    }, destructive = true)
                }
            }
            when (pendingConfirmation) {
                "disable" -> ReceivingMethodConfirmPanel(
                    title = language.ui("Désactiver ce moyen ?"),
                    body = language.ui("Il ne sera plus proposé pour les nouveaux paiements."),
                    confirmLabel = language.ui("Désactiver"),
                    cancelLabel = language.ui("Annuler"),
                    onCancel = { pendingConfirmation = null },
                    onConfirm = {
                        pendingConfirmation = null
                        onDisable()
                    }
                )
                "delete" -> ReceivingMethodDeleteDialog(
                    language = language,
                    onCancel = { pendingConfirmation = null },
                    onConfirm = {
                        pendingConfirmation = null
                        onDelete()
                    }
                )
            }
        }
    }
}

@Composable
private fun ReceivingMethodDeleteDialog(
    language: PremiumLanguageOption,
    onCancel: () -> Unit,
    onConfirm: () -> Unit
) {
    Dialog(onDismissRequest = onCancel) {
        PremiumCard(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp),
            radius = 28.dp,
            color = PremiumColors.Surface
        ) {
            Column(
                Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(PremiumColors.Danger.copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Delete, null, tint = PremiumColors.Danger, modifier = Modifier.size(22.dp))
                    }
                    Column(Modifier.padding(start = 12.dp).weight(1f)) {
                        Text(
                            language.ui("Supprimer ce moyen ?"),
                            color = PremiumColors.Ink,
                            fontSize = 18.sp,
                            lineHeight = 22.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            language.ui("Action définitive"),
                            color = PremiumColors.Muted,
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Text(
                    language.ui("La destination masquée disparaîtra de cette liste."),
                    color = PremiumColors.Muted,
                    fontSize = 13.sp,
                    lineHeight = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    ReceivingMethodMutationButton(
                        label = language.ui("Annuler"),
                        icon = Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        modifier = Modifier.weight(1f),
                        onClick = onCancel
                    )
                    ReceivingMethodMutationButton(
                        label = language.ui("Confirmer"),
                        icon = Icons.Default.Delete,
                        modifier = Modifier.weight(1f),
                        onClick = onConfirm,
                        destructive = true
                    )
                }
            }
        }
    }
}

@Composable
private fun ReceivingMethodConfirmPanel(
    title: String,
    body: String,
    confirmLabel: String,
    cancelLabel: String = "Annuler",
    destructive: Boolean = false,
    onCancel: () -> Unit,
    onConfirm: () -> Unit
) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(22.dp))
            .background(if (destructive) PremiumColors.Danger.copy(alpha = 0.10f) else PremiumColors.Warning.copy(alpha = 0.12f))
            .border(1.dp, if (destructive) PremiumColors.Danger.copy(alpha = 0.24f) else PremiumColors.Warning.copy(alpha = 0.24f), RoundedCornerShape(22.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(title, color = PremiumColors.Ink, fontSize = 15.sp, lineHeight = 19.sp, fontWeight = FontWeight.Bold)
        Text(body, color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            ReceivingMethodMutationButton(cancelLabel, Icons.AutoMirrored.Filled.KeyboardArrowLeft, Modifier.weight(1f), onCancel)
            ReceivingMethodMutationButton(confirmLabel, if (destructive) Icons.Default.Delete else Icons.Default.Block, Modifier.weight(1f), onConfirm, destructive = destructive)
        }
    }
}

@Composable
private fun ReceivingMethodMutationButton(
    label: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    destructive: Boolean = false
) {
    val foreground = if (destructive) PremiumColors.Danger else PremiumColors.Blue
    Row(
        modifier
            .height(PremiumComponentSize.TouchTarget)
            .clip(RoundedCornerShape(PremiumRadius.Card))
            .background(PremiumColors.SurfaceAlt, RoundedCornerShape(PremiumRadius.Card))
            .border(1.dp, PremiumColors.Line, RoundedCornerShape(PremiumRadius.Card))
            .premiumTap(onClick)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(icon, null, tint = foreground, modifier = Modifier.size(18.dp))
        Text(
            label,
            color = foreground,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .padding(start = 8.dp)
                .weight(1f, fill = false)
        )
    }
}

@Composable
fun PremiumBanksStateScreen(
    state: PremiumScreenState<PremiumBanksUiState>,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 34.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(language.ui("Recherche des banques compatibles"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text(language.ui("SwimPay vérifie uniquement les banques compatibles sur ce téléphone."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
            }
            items(state.value.items) { bank ->
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName)
                            Column(Modifier.weight(1f).padding(start = 16.dp)) {
                                Text(bank.displayName, color = PremiumColors.Ink, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                Text(language.ui(bank.helper), color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
                            }
                            StatusChip(language.ui(bank.status), if (bank.enabled) StatusTone.Success else if (bank.canActivate) StatusTone.Info else StatusTone.Neutral)
                        }
                        if (bank.canActivate && !bank.enabled) {
                            Text(language.ui("Activer cette banque"), color = PremiumColors.Blue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        else -> PremiumStateList(state.localized(language))
    }
}

@Composable
fun PremiumReceiverHealthStateScreen(
    state: PremiumScreenState<PremiumReceiverHealthUiState>,
    onOpenNotificationSettings: () -> Unit = {},
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    when (state) {
        is PremiumScreenState.Content -> LazyColumn(
            Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 34.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(language.ui("Téléphone Receiver"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                Text(language.ui("Ce téléphone permet à SwimPay de détecter les paiements reçus."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
            }
            item {
                PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                    Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Box(
                            Modifier
                                .size(52.dp)
                                .background(PremiumColors.IconTile, RoundedCornerShape(18.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.PhoneAndroid, null, tint = PremiumColors.Teal, modifier = Modifier.size(26.dp))
                        }
                        Column(Modifier.weight(1f)) {
                            Text(language.ui(state.value.statusTitle), color = PremiumColors.Ink, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text(language.ui(state.value.statusText), color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp))
                            if (state.value.rows.any { it.first == "Accès notifications" && it.second == "Action requise" }) {
                                Text(language.ui("RÉACTIVER L'ACCÈS"), color = PremiumColors.Blue, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(top = 14.dp).clickable { onOpenNotificationSettings() })
                            }
                        }
                    }
                }
            }
            items(state.value.rows) { row ->
                PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                    Row(Modifier.padding(18.dp), horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(language.ui(row.first), modifier = Modifier.weight(1f), color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold)
                        StatusChip(language.ui(row.second), receiverHealthTone(row.second))
                    }
                }
            }
            items(state.value.notices) {
                Text(language.ui(it), color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 18.sp)
            }
        }
        else -> PremiumStateList(state.localized(language))
    }
}

@Composable
fun PremiumConfirmationModeScreen(language: PremiumLanguageOption = PremiumLanguageOption.FR) {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(language.ui("Mode de confirmation"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(language.ui("Choisissez le niveau d'aide pour vérifier vos paiements."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = PremiumColors.PanelTint) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(language.ui("Mode manuel V1"), color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(language.ui("Chaque paiement doit être confirmé par vous."), color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip(language.ui("Confirmation manuelle"), StatusTone.Success)
                }
            }
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
                Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(language.ui("Assistance de revue"), color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    Text(language.ui("SwimPay prépare les indices, vous décidez."), color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    StatusChip(language.ui("Lecture seule"), StatusTone.Neutral)
                }
            }
        }
    }
}

private fun receiverHealthTone(value: String): PremiumTone {
    val normalized = value.lowercase()
    return when {
        normalized.contains("ok") ||
            normalized.contains("actif") ||
            normalized.contains("autorisé") ||
            normalized.contains("active") ||
            normalized.contains("authorized") ||
            normalized.contains("актив") ||
            normalized.contains("разреш") -> StatusTone.Success
        normalized.contains("action") ||
            normalized.contains("requise") ||
            normalized.contains("required") ||
            normalized.contains("треб") -> StatusTone.Warning
        normalized.contains("hors") ||
            normalized.contains("offline") ||
            normalized.contains("ошиб") -> StatusTone.Danger
        else -> StatusTone.Neutral
    }
}

@Composable
fun PremiumSecurityScreen(
    appLock: PremiumAppLockSettings = PremiumAppLockSettings(),
    googleAccountLinked: Boolean = false,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onToggleAppLock: (Boolean) -> Unit = {},
    onTimeoutSelected: (PremiumLockTimeout) -> Unit = {},
    onGoogleAccountLink: () -> Unit = {}
) {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(language.ui("Sécurité"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(language.ui("Liez Google pour retrouver le compte, puis protégez l'accès à l'app."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item { GoogleAccountLinkRow(googleAccountLinked, language, onGoogleAccountLink) }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(42.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Security, null, tint = PremiumColors.Blue)
                    }
                    Column(Modifier.weight(1f).padding(start = 14.dp)) {
                        Text(language.ui("Verrouillage de l'app"), color = PremiumColors.Ink, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Bold)
                        Text(language.ui("La sécurité du téléphone protège uniquement l'interface. Le Receiver continue en arrière-plan."), color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Switch(checked = appLock.enabled, onCheckedChange = onToggleAppLock)
                }
            }
        }
        if (appLock.enabled) {
            items(PremiumLockTimeout.entries) { timeout ->
                SettingsChoiceRow(Icons.Default.Security, timeout.localizedLabel(language), if (timeout == appLock.timeout) language.ui("Délai actif") else language.ui("Utiliser ce délai"), timeout == appLock.timeout, language = language) {
                    onTimeoutSelected(timeout)
                }
            }
        }
    }
}
@Composable
private fun GoogleAccountLinkRow(linked: Boolean, language: PremiumLanguageOption, onClick: () -> Unit) {
    PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
        Row(
            Modifier.fillMaxWidth().premiumTap(onClick).padding(18.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(Modifier.size(42.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                PremiumGoogleIcon()
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(if (linked) language.ui("Compte Google lié") else language.ui("Lier le compte Google"), color = PremiumColors.Ink, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Bold)
                Text(language.ui("Sauvegarde ce profil marchand pour une future reconnexion avec Google."), color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
            }
            StatusChip(if (linked) language.ui("Lié") else language.ui("Reconnexion"), if (linked) StatusTone.Success else StatusTone.Info)
        }
    }
}

@Composable
fun PremiumHelpCenterScreen(language: PremiumLanguageOption = PremiumLanguageOption.FR) {
    val topics = listOf(
        language.ui("Signaux de paiement") to language.ui("SwimPay lit uniquement les notifications bancaires autorisées, les filtre, les rédacte et les envoie au backend."),
        language.ui("Moyens de réception") to language.ui("Ajoutez une carte ou un téléphone SBP marchand et associez-le à une banque compatible."),
        language.ui("J'ai payé") to language.ui("Cette action arme le suivi côté commande. Elle ne confirme jamais un paiement."),
        language.ui("Confirmation manuelle") to language.ui("Le marchand décide. Le webhook final part seulement après confirmation manuelle."),
        language.ui("Webhook") to language.ui("Les webhooks publics V1 restent limités au résultat final confirmé, rejeté ou expiré."),
        language.ui("Receiver hors ligne") to language.ui("Vérifiez l'accès aux notifications, les banques activées et la connexion du téléphone.")
    )
    var query by remember { mutableStateOf("") }
    val filtered = topics.filter { (title, body) ->
        query.isBlank() || title.contains(query, true) || body.contains(query, true)
    }
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(language.ui("Centre d'aide"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(language.ui("Aide courte, sûre et compatible avec la vérité produit V1."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text(language.ui("Rechercher")) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp)
            )
        }
        items(filtered) { topic ->
            PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(topic.first, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                    Text(topic.second, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        if (filtered.isEmpty()) {
            item { PremiumStatePanel(PremiumScreenState.empty<Unit>(language.ui("Aucun résultat"), language.ui("Essayez un autre mot-clé."))) }
        }
    }
}

@Composable
fun PremiumContactSupportScreen(
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    result: PremiumSupportTicketResult? = null,
    onSubmit: (PremiumSupportTicketDraft) -> Unit = {}
) {
    var category by remember { mutableStateOf(PremiumSupportCategory.RECEIVER_ISSUE) }
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    val draft = PremiumSupportTicketDraft(category, subject, message)
    val validation = draft.validationError()
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(language.ui("Contacter le support"), color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(language.ui("Envoyez une demande sans notification brute, secret, numéro complet, PIN, CVV ou code SMS."), color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item {
            PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PremiumSupportCategory.entries.forEach { item ->
                        SettingsChoiceRow(Icons.Default.Description, language.ui(item.labelFr), item.wireValue, item == category, language = language) {
                            category = item
                        }
                    }
                    OutlinedTextField(value = subject, onValueChange = { subject = it }, label = { Text(language.ui("Sujet")) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = message, onValueChange = { message = it }, label = { Text(language.ui("Message")) }, minLines = 4, modifier = Modifier.fillMaxWidth())
                    validation?.let { Text(it, color = PremiumColors.Danger, fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    PremiumPrimaryButton(language.ui("Envoyer"), enabled = validation == null, onClick = { onSubmit(draft) })
                }
            }
        }
        result?.let {
            item {
                PremiumStatePanel(
                    if (it.status == "created") {
                        PremiumScreenState.empty<Unit>(language.ui("Demande envoyée"), it.safeMessage)
                    } else {
                        PremiumScreenState.actionRequired<Unit>("Support", it.safeMessage)
                    }
                )
            }
        }
    }
}

@Composable
fun PremiumLanguageScreen(selected: PremiumLanguageOption, onSelect: (PremiumLanguageOption) -> Unit) {
    val copy = PremiumLocalizedCopy.forLanguage(selected)
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(copy.language, color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(copy.languageBody, color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        items(PremiumLanguageOption.entries) { language ->
            SettingsChoiceRow(Icons.Default.Language, language.displayLabel, language.tag.uppercase(), language == selected, language = selected) {
                onSelect(language)
            }
        }
    }
}

@Composable
fun PremiumAppearanceScreen(
    selected: PremiumThemeMode,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onSelect: (PremiumThemeMode) -> Unit
) {
    val copy = PremiumLocalizedCopy.forLanguage(language)
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
        contentPadding = PaddingValues(bottom = 34.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Text(copy.appearance, color = PremiumColors.PageInk, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text(copy.appearanceBody, color = PremiumColors.PageMuted, fontSize = 14.sp, lineHeight = 20.sp)
        }
        item {
            PremiumThemeSwitcher(selected = selected, copy = copy, onSelect = onSelect)
        }
    }
}

@Composable
private fun PremiumThemeSwitcher(
    selected: PremiumThemeMode,
    copy: PremiumLocalizedCopy,
    onSelect: (PremiumThemeMode) -> Unit
) {
    PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text(copy.theme, color = PremiumColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                PremiumThemeMode.entries.forEach { mode ->
                    ThemeModeChoice(mode = mode, active = mode == selected, copy = copy) { onSelect(mode) }
                }
            }
        }
    }
}

@Composable
private fun ThemeModeChoice(
    mode: PremiumThemeMode,
    active: Boolean,
    copy: PremiumLocalizedCopy,
    onClick: () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(58.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(if (active) PremiumColors.Teal.copy(alpha = 0.13f) else PremiumColors.SurfaceAlt)
            .border(1.dp, if (active) PremiumColors.Teal.copy(alpha = 0.45f) else PremiumColors.Line, RoundedCornerShape(22.dp))
            .premiumTap(onClick)
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(38.dp)
                .background(if (active) PremiumColors.Teal else PremiumColors.Surface, RoundedCornerShape(14.dp))
                .border(1.dp, if (active) Color.Transparent else PremiumColors.Line, RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(themeModeIcon(mode), null, tint = if (active) Color.White else PremiumColors.Teal, modifier = Modifier.size(20.dp))
        }
        Text(copy.themeModeLabel(mode), color = PremiumColors.Ink, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f).padding(start = 14.dp))
        StatusChip(if (active) copy.active else copy.choose, if (active) StatusTone.Success else StatusTone.Neutral)
    }
}

private fun themeModeIcon(mode: PremiumThemeMode): ImageVector = when (mode) {
    PremiumThemeMode.SYSTEM -> Icons.Default.Palette
    PremiumThemeMode.LIGHT -> Icons.Default.WbSunny
    PremiumThemeMode.DARK -> Icons.Default.DarkMode
}

@Composable
fun PremiumUnlockRequiredScreen(
    appLock: PremiumAppLockSettings,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onUnlock: () -> Unit
) {
    Box(Modifier.fillMaxSize().background(PremiumColors.Background).padding(28.dp), contentAlignment = Alignment.Center) {
        PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Icon(Icons.Default.Security, null, tint = PremiumColors.Blue, modifier = Modifier.size(36.dp))
                Text(language.ui("SwimPay verrouille"), color = PremiumColors.Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(
                    when (language) {
                        PremiumLanguageOption.EN -> "Timeout: ${appLock.timeout.localizedLabel(language)}. The lock only protects the app interface."
                        PremiumLanguageOption.RU -> "Тайм-аут: ${appLock.timeout.localizedLabel(language)}. Блокировка защищает только интерфейс приложения."
                        PremiumLanguageOption.FR -> "Délai: ${appLock.timeout.labelFr}. Le verrouillage protège uniquement l'interface de l'app."
                    },
                    color = PremiumColors.Muted,
                    fontSize = 13.sp,
                    lineHeight = 19.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                PremiumPrimaryButton(language.ui("Déverrouiller"), onClick = onUnlock)
            }
        }
    }
}

private fun PremiumLockTimeout.localizedLabel(language: PremiumLanguageOption): String {
    return when (language) {
        PremiumLanguageOption.FR -> labelFr
        PremiumLanguageOption.EN -> when (this) {
            PremiumLockTimeout.IMMEDIATE -> "Immediately"
            PremiumLockTimeout.ONE_MINUTE -> "After 1 min"
            PremiumLockTimeout.FIVE_MINUTES -> "After 5 min"
            PremiumLockTimeout.FIFTEEN_MINUTES -> "After 15 min"
        }
        PremiumLanguageOption.RU -> when (this) {
            PremiumLockTimeout.IMMEDIATE -> "Сразу"
            PremiumLockTimeout.ONE_MINUTE -> "Через 1 мин"
            PremiumLockTimeout.FIVE_MINUTES -> "Через 5 мин"
            PremiumLockTimeout.FIFTEEN_MINUTES -> "Через 15 мин"
        }
    }
}

@Composable
private fun SettingsChoiceRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    selected: Boolean,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onClick: () -> Unit
) {
    PremiumCard(Modifier.fillMaxWidth(), radius = 24.dp) {
        Row(Modifier.fillMaxWidth().premiumTap(onClick).padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(42.dp).background(PremiumColors.SurfaceAlt, RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Blue)
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(title, color = PremiumColors.Ink, fontSize = 16.sp, lineHeight = 21.sp, fontWeight = FontWeight.Bold)
                Text(subtitle, color = PremiumColors.Muted, fontSize = 12.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
            }
            StatusChip(language.ui(if (selected) "Actif" else "Choisir"), if (selected) StatusTone.Success else StatusTone.Neutral)
        }
    }
}

@Composable
fun PremiumConnectedSiteStateScreen(
    state: PremiumScreenState<PremiumConnectedSiteUiState>,
    onBack: () -> Unit,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onCreateApiKey: () -> Unit = {},
    onRotateApiKey: () -> Unit = {},
    onRotateWebhookSecret: () -> Unit = {},
    onSaveWebhookUrl: (String) -> Unit = {},
    onProvisionIntegration: (String) -> Unit = {},
    onRevealSecrets: () -> Unit = {},
    onCopyAllForDeveloper: () -> Unit = {},
    onTestWebhook: () -> Unit = {},
    onOpenDeveloperGuide: () -> Unit = {},
    onAuthorizeCopy: (onAuthorized: () -> Unit) -> Unit = { onAuthorized -> onAuthorized() },
    onCopyDeveloperExport: (PremiumConnectedSiteUiState) -> String = { value -> value.developerExportText() }
) {
    PremiumStandaloneStateScreen(title = language.ui("Intégration développeur"), onBack = onBack) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            PremiumConnectedSiteSummary(state, language)
            if (state is PremiumScreenState.Content) {
                val value = state.value
                var webhookUrl by remember(value.webhookUrl) { mutableStateOf(value.webhookUrl) }
                val context = LocalContext.current

                PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(language.ui("Connexion"), color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        OutlinedTextField(
                            value = webhookUrl,
                            onValueChange = { webhookUrl = it },
                            label = { Text("Webhook URL") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        PremiumPrimaryButton(
                            language.ui("Tout connecter (clé + webhook)"),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = value.actionButtonsEnabled && webhookUrl.isNotBlank(),
                            onClick = { onProvisionIntegration(webhookUrl) }
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            PremiumOutlineButton(
                                language.ui("Enregistrer URL"),
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled && webhookUrl.isNotBlank()) onSaveWebhookUrl(webhookUrl) }
                            )
                            PremiumOutlineButton(
                                language.ui("Tester"),
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled) onTestWebhook() }
                            )
                        }
                    }
                }

                PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(language.ui("Identifiants"), color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        value.developerRows.forEach { row ->
                            DeveloperIntegrationValueRow(row.first, row.second, language = language)
                        }
                    }
                }

                PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(language.ui("Partage développeur"), color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Text(
                            language.ui("Copie en un geste toutes les valeurs révélées (clé API, secret webhook, URL) à transmettre à votre développeur. Sécurité de l'appareil exigée."),
                            color = PremiumColors.Muted,
                            fontSize = 12.sp,
                            lineHeight = 17.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        PremiumPrimaryButton(
                            language.ui("Copier tout pour mon développeur"),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = value.actionButtonsEnabled,
                            onClick = { onCopyAllForDeveloper() }
                        )
                        PremiumOutlineButton(
                            language.ui("Révéler les secrets"),
                            onClick = { if (value.actionButtonsEnabled) onRevealSecrets() }
                        )
                    }
                }

                PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(language.ui("Maintenance"), color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            PremiumBlueButton(
                                language.ui("Créer clé API"),
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled) onCreateApiKey() }
                            )
                            PremiumOutlineButton(
                                language.ui("Rotation clé"),
                                modifier = Modifier.weight(1f),
                                onClick = { if (value.actionButtonsEnabled) onRotateApiKey() }
                            )
                        }
                        PremiumOutlineButton(
                            language.ui("Rotation secret webhook"),
                            onClick = { if (value.actionButtonsEnabled) onRotateWebhookSecret() }
                        )
                        PremiumOutlineButton(
                            language.ui("Guide SDK (PDF)"),
                            onClick = onOpenDeveloperGuide
                        )
                    }
                }

                PremiumCard(Modifier.fillMaxWidth(), radius = 26.dp, color = PremiumColors.PanelTint) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(language.ui("Export staging"), color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Box(
                                Modifier
                                    .size(38.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(PremiumColors.Surface, RoundedCornerShape(14.dp))
                                    .border(1.dp, PremiumColors.Line, RoundedCornerShape(14.dp))
                                    .premiumTap {
                                        onAuthorizeCopy {
                                            context.copyDeveloperExportToClipboard(onCopyDeveloperExport(value))
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.ContentCopy, contentDescription = "Copier", tint = PremiumColors.Blue, modifier = Modifier.size(18.dp))
                            }
                        }
                        Text(
                            language.ui("À placer dans l'environnement de l'app externe. Android et le navigateur ne reçoivent pas de secret SDK."),
                            color = PremiumColors.Muted,
                            fontSize = 12.sp,
                            lineHeight = 17.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        value.exportLines.forEach { line ->
                            Text(line, color = PremiumColors.Navy, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

internal fun Context.copyDeveloperExportToClipboard(exportText: String) {
    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    val clip = ClipData.newPlainText("SwimPay developer export", exportText)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        // Mask the clipboard preview: this export can contain live SDK secrets.
        clip.description.extras = PersistableBundle().apply {
            putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
        }
    }
    clipboard.setPrimaryClip(clip)
}

@Composable
private fun DeveloperIntegrationValueRow(
    label: String,
    value: String,
    highlight: Boolean = false,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(if (highlight) PremiumColors.Surface else PremiumColors.SurfaceAlt, RoundedCornerShape(16.dp))
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(language.ui(label), color = PremiumColors.Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Text(language.ui(value.ifBlank { "À configurer" }), color = PremiumColors.Ink, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Bold)
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
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.matchParentSize())
        LazyColumn(
            Modifier
                .fillMaxHeight()
                .statusBarsPadding()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide),
            contentPadding = PaddingValues(bottom = 22.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 96.dp)
                        .padding(top = 8.dp, bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircleAction(Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
                    Text(
                        title,
                        color = PremiumColors.PageInk,
                        fontSize = 23.sp,
                        lineHeight = 28.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f).padding(start = 12.dp)
                    )
                }
            }
            item { content() }
        }
    }
}

private enum class SettingsPillTone { Success, Ink }

private sealed interface SettingsRowSpec {
    val icon: ImageVector
    val label: String

    data class Nav(
        override val icon: ImageVector,
        override val label: String,
        val onClick: (() -> Unit)? = null
    ) : SettingsRowSpec

    data class Value(
        override val icon: ImageVector,
        override val label: String,
        val value: String,
        val onClick: (() -> Unit)? = null
    ) : SettingsRowSpec

    data class Toggle(
        override val icon: ImageVector,
        override val label: String,
        val checked: Boolean
    ) : SettingsRowSpec

    data class Pill(
        override val icon: ImageVector,
        override val label: String,
        val pill: String,
        val tone: SettingsPillTone,
        val onClick: (() -> Unit)? = null
    ) : SettingsRowSpec
}

@Composable
private fun SettingsPill(text: String, tone: SettingsPillTone, icon: ImageVector? = null) {
    val foreground = when (tone) {
        SettingsPillTone.Success -> PremiumColors.Success
        SettingsPillTone.Ink -> PremiumColors.Ink
    }
    Surface(
        color = foreground.copy(alpha = 0.12f),
        shape = RoundedCornerShape(PremiumRadius.Pill)
    ) {
        Row(
            Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            if (icon != null) {
                Icon(icon, null, tint = foreground, modifier = Modifier.size(13.dp))
            }
            Text(
                text,
                color = foreground,
                fontSize = PremiumType.Micro,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.4.sp
            )
        }
    }
}

@Composable
private fun SettingsToggle(checked: Boolean) {
    Switch(
        checked = checked,
        onCheckedChange = null,
        colors = SwitchDefaults.colors(
            checkedThumbColor = Color.White,
            checkedTrackColor = PremiumColors.Success,
            checkedBorderColor = PremiumColors.Success,
            uncheckedThumbColor = Color.White,
            uncheckedTrackColor = PremiumColors.NeutralChip,
            uncheckedBorderColor = PremiumColors.Line
        )
    )
}

@Composable
private fun SettingsGroup(
    title: String,
    rows: List<SettingsRowSpec>,
    displayLabel: String = title
) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            displayLabel.uppercase(),
            color = PremiumColors.PageMuted,
            fontSize = PremiumType.Micro,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp,
            modifier = Modifier.padding(start = 8.dp, bottom = 10.dp)
        )
        LiquidGlassCard(
            Modifier.fillMaxWidth(),
            radius = PremiumRadius.CardLarge
        ) {
            Column {
                rows.forEachIndexed { index, row ->
                    val onClick: (() -> Unit)? = when (row) {
                        is SettingsRowSpec.Nav -> row.onClick
                        is SettingsRowSpec.Value -> row.onClick
                        is SettingsRowSpec.Pill -> row.onClick
                        is SettingsRowSpec.Toggle -> null
                    }
                    val rowModifier = Modifier
                        .fillMaxWidth()
                        .height(PremiumComponentSize.RowHeight)
                        .let { if (onClick != null) it.clickable { onClick() } else it }
                        .padding(horizontal = 18.dp)
                    Row(rowModifier, verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(44.dp).background(PremiumColors.IconTile, RoundedCornerShape(14.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(row.icon, null, tint = PremiumColors.Teal, modifier = Modifier.size(22.dp))
                        }
                        Text(
                            row.label,
                            modifier = Modifier.weight(1f).padding(start = 16.dp, end = 12.dp),
                            color = PremiumColors.Ink,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                        when (row) {
                            is SettingsRowSpec.Nav -> {
                                if (row.onClick != null) {
                                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumColors.SoftText, modifier = Modifier.size(20.dp))
                                }
                            }
                            is SettingsRowSpec.Value -> {
                                Text(row.value, color = PremiumColors.Muted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.width(8.dp))
                                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumColors.SoftText, modifier = Modifier.size(20.dp))
                            }
                            is SettingsRowSpec.Toggle -> SettingsToggle(row.checked)
                            is SettingsRowSpec.Pill -> {
                                SettingsPill(row.pill, row.tone)
                                if (row.onClick != null) {
                                    Spacer(Modifier.width(8.dp))
                                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumColors.SoftText, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                    if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumColors.Line.copy(alpha = 0.5f)))
                }
            }
        }
    }
}
