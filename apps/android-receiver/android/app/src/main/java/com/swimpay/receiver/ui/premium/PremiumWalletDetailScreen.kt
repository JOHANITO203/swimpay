package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Wallet / receiving-method detail screen ("Détail portefeuille").
 *
 * Mirrors [PremiumPaymentDetailScreen] (same scaffold + PremiumScreenState
 * loading/empty handling). The method IDENTITY (official logo, name, masked
 * identifier, rail chip, active status, "INFOS DU RAIL") is REAL — resolved by
 * [PremiumMerchantRuntime.loadWalletDetail] from the loaded receiving methods.
 *
 * The "Reçu sur ce portefeuille" aggregate, the provenance verification rate
 * and the received-payments list are PREVIEW (see
 * [PremiumWalletDetailUiState.preview]); they are illustrative until the runtime
 * exposes a real per-wallet received aggregate.
 */
@Composable
fun PremiumWalletDetailScreen(
    state: PremiumScreenState<PremiumWalletDetailUiState> =
        PremiumScreenState.content(PremiumWalletDetailUiState.preview()),
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onBack: () -> Unit = {}
) {
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.fillMaxSize())
        when (state) {
            is PremiumScreenState.Content -> PremiumWalletDetailContent(state.value, language, onBack)
            else -> PremiumWalletDetailState(state, language, onBack)
        }
    }
}

@Composable
private fun PremiumWalletDetailContent(
    state: PremiumWalletDetailUiState,
    language: PremiumLanguageOption,
    onBack: () -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
    ) {
        WalletDetailTopBar(state.displayName, onBack)
        LazyColumn(
            contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { WalletIdentityCard(state, language) }
            item { WalletProvenanceCard(state, language) }
            item { WalletActivityCard(state, language) }
            item { WalletRailInfoCard(state, language) }
        }
    }
}

@Composable
private fun WalletDetailTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(PremiumComponentSize.TopChromeHeight),
        verticalAlignment = Alignment.CenterVertically
    ) {
        CircleAction(Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
        Spacer(Modifier.width(16.dp))
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            color = PremiumColors.PageInk,
            fontSize = PremiumType.ScreenTitle,
            fontWeight = FontWeight.Black
        )
    }
}

// REAL identity: official logo + name + masked identifier + rail chip + status,
// plus the PREVIEW "Reçu sur ce portefeuille" aggregate (green) and stat tiles.
@Composable
private fun WalletIdentityCard(state: PremiumWalletDetailUiState, language: PremiumLanguageOption) {
    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            SectionLabel(language.ui(state.railLabel))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                PremiumBankLogo(
                    bankProfileId = state.bankProfileId,
                    displayName = state.displayName,
                    size = 52.dp
                )
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = state.displayName,
                        color = PremiumColors.Ink,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        lineHeight = 24.sp
                    )
                    Text(
                        text = state.maskedIdentifier,
                        color = PremiumColors.SoftText,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.SemiBold,
                        lineHeight = 16.sp
                    )
                }
                StatusChip(
                    language.ui(state.statusLabel),
                    if (state.active) StatusTone.Success else StatusTone.Neutral
                )
            }

            // PREVIEW aggregate.
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = language.ui("Reçu sur ce portefeuille").uppercase(),
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Micro,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp
                )
                Text(
                    text = state.totalReceivedLabel,
                    color = PremiumColors.Success,
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Black,
                    lineHeight = 38.sp
                )
                Text(
                    text = "${state.paymentCount} ${language.ui("paiements")} · ${language.ui("aperçu")}",
                    color = PremiumColors.Muted,
                    fontSize = PremiumType.Caption,
                    fontWeight = FontWeight.Bold
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                state.statTiles.forEach { tile ->
                    WalletStatTile(tile, language, Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun WalletStatTile(
    tile: PremiumMetricUiState,
    language: PremiumLanguageOption,
    modifier: Modifier = Modifier
) {
    Column(
        modifier
            .background(PremiumColors.PanelTint, RoundedCornerShape(PremiumRadius.Card))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = language.ui(tile.label),
            color = PremiumColors.SoftText,
            fontSize = PremiumType.Micro,
            fontWeight = FontWeight.Black,
            letterSpacing = 0.6.sp
        )
        Text(
            text = tile.value,
            color = PremiumColors.Success,
            fontSize = 15.sp,
            fontWeight = FontWeight.Black
        )
        if (tile.trend.isNotBlank()) {
            Text(
                text = tile.trend,
                color = PremiumColors.Muted,
                fontSize = PremiumType.Micro,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

// PREVIEW provenance verification rate.
@Composable
private fun WalletProvenanceCard(state: PremiumWalletDetailUiState, language: PremiumLanguageOption) {
    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = language.ui("Vérification de provenance"),
                    modifier = Modifier.weight(1f),
                    color = PremiumColors.Ink,
                    fontSize = PremiumType.Body,
                    fontWeight = FontWeight.Black
                )
                Text(
                    text = "${state.verifiedRate} % ${language.ui("vérifié")}",
                    color = PremiumColors.Success,
                    fontSize = PremiumType.Body,
                    fontWeight = FontWeight.Black
                )
            }
            WalletProgressBar(state.verifiedRate / 100f)
            Text(
                text = language.ui(state.verifiedCountLabel),
                color = PremiumColors.Muted,
                fontSize = PremiumType.Caption,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun WalletProgressBar(fraction: Float) {
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

// PREVIEW received-payments list (provenance). Green amounts; emerald/amber chips.
@Composable
private fun WalletActivityCard(state: PremiumWalletDetailUiState, language: PremiumLanguageOption) {
    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionLabel(language.ui("Activité · provenance"))
            state.receivedPayments.forEach { payment ->
                WalletReceivedPaymentRow(payment, language)
            }
        }
    }
}

@Composable
private fun WalletReceivedPaymentRow(
    payment: PremiumWalletReceivedPaymentUiItem,
    language: PremiumLanguageOption
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            Modifier
                .background(PremiumColors.IconTile, RoundedCornerShape(12.dp))
                .padding(8.dp),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (payment.provenanceVerified) Icons.Default.CheckCircle else Icons.Default.WarningAmber,
                contentDescription = null,
                tint = if (payment.provenanceVerified) PremiumColors.Success else PremiumColors.Warning,
                modifier = Modifier.width(20.dp).height(20.dp)
            )
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                text = payment.sender,
                color = PremiumColors.Ink,
                fontSize = PremiumType.Body,
                fontWeight = FontWeight.Black,
                lineHeight = 18.sp
            )
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusChip(
                    language.ui(payment.provenanceStatus),
                    if (payment.provenanceVerified) StatusTone.Success else StatusTone.Warning
                )
                Text(
                    text = payment.timestamp,
                    color = PremiumColors.SoftText,
                    fontSize = PremiumType.Micro,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        Text(
            text = payment.amountLabel,
            color = PremiumColors.Success,
            fontSize = PremiumType.Body,
            fontWeight = FontWeight.Black
        )
    }
}

// "INFOS DU RAIL": identity-bearing rows are real; preview-only rows are static.
@Composable
private fun WalletRailInfoCard(state: PremiumWalletDetailUiState, language: PremiumLanguageOption) {
    LiquidGlassCard(
        modifier = Modifier.fillMaxWidth(),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionLabel(language.ui("Infos du rail"))
            state.railRows.forEach { (label, value) ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = language.ui(label),
                        modifier = Modifier.weight(1f),
                        color = PremiumColors.SoftText,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = language.ui(value),
                        color = PremiumColors.Ink,
                        fontSize = PremiumType.Caption,
                        fontWeight = FontWeight.Black
                    )
                }
            }
        }
    }
}

@Composable
private fun PremiumWalletDetailState(
    state: PremiumScreenState<PremiumWalletDetailUiState>,
    language: PremiumLanguageOption,
    onBack: () -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
    ) {
        WalletDetailTopBar(language.ui("Détail portefeuille"), onBack)
        LazyColumn(
            contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            item { PremiumStatePanel(state.localized(language)) }
        }
    }
}

@Preview(name = "Wallet detail", showBackground = true, backgroundColor = 0xFF000A1F, widthDp = 390, heightDp = 844)
@Composable
private fun PremiumWalletDetailPreview() {
    PremiumColors.useDarkTheme(false)
    PremiumWalletDetailScreen()
}

@Preview(name = "Wallet detail dark", showBackground = true, backgroundColor = 0xFF050406, widthDp = 390, heightDp = 844)
@Composable
private fun PremiumWalletDetailDarkPreview() {
    PremiumColors.useDarkTheme(true)
    PremiumWalletDetailScreen()
}
