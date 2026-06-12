package com.swimpay.receiver.ui.premium

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
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
 * loading/empty handling). Everything rendered is REAL — resolved by
 * [PremiumMerchantRuntime.loadWalletDetail] from the loaded receiving methods:
 * the method IDENTITY (official logo, name, masked identifier, rail chip, active
 * status) and the "INFOS DU RAIL" rows (account, type, status).
 *
 * The runtime exposes no per-wallet received aggregate, so there is no totals
 * card, no provenance verification rate and no received-payments history here —
 * those widgets were removed rather than fed preview values.
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

// REAL identity: official logo + name + masked identifier + rail chip + status.
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
        }
    }
}

// "INFOS DU RAIL": real rows resolved from the receiving method (account, type, status).
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
