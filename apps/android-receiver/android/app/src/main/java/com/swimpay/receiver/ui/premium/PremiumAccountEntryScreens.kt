package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumAccountEntryScreen(
    state: PremiumAccountEntryUiState = PremiumAccountEntryUiState(),
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onLanguageSelected: (PremiumLanguageOption) -> Unit = {},
    onCreateAccount: () -> Unit,
    onSignIn: () -> Unit
) {
    val copy = PremiumLocalizedCopy.forLanguage(language)
    PremiumAccountEntryFrame(language = language, onLanguageSelected = onLanguageSelected) {
        Spacer(Modifier.height(122.dp))
        SwimPayLauncherBadge(size = 82.dp)
        Spacer(Modifier.height(30.dp))
        PremiumTitle(
            title = copy.welcomeTitle,
            body = copy.welcomeBody,
            centered = true
        )
        LiquidGlassCard(Modifier.fillMaxWidth(), radius = PremiumRadius.CardLarge) {
            Column(
                Modifier.padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                PremiumPrimaryButton(copy.createAccount, onClick = onCreateAccount)
                PremiumOutlineButton(copy.signIn, onClick = onSignIn)
            }
        }
    }
}

@Composable
fun PremiumAccountProfileChoiceScreen(
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onLanguageSelected: (PremiumLanguageOption) -> Unit = {},
    onSelectProfile: (PremiumMerchantProfileType) -> Unit,
    onBack: () -> Unit
) {
    val copy = PremiumLocalizedCopy.forLanguage(language)
    PremiumAccountEntryFrame(language = language, onLanguageSelected = onLanguageSelected) {
        AccountEntryBackButton(onBack)
        Spacer(Modifier.height(18.dp))
        PremiumTitle(
            title = copy.chooseProfileTitle,
            body = copy.sameRights
        )
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            PremiumMerchantProfileType.entries.forEach { profile ->
                PremiumAccountChoiceRow(
                    icon = when (profile) {
                        PremiumMerchantProfileType.PERSONAL -> Icons.Default.Person
                        PremiumMerchantProfileType.COMMERCE -> Icons.Default.Storefront
                    },
                    title = copy.profileLabel(profile),
                    description = copy.profileBody(profile),
                    onClick = { onSelectProfile(profile) }
                )
            }
        }
    }
}

@Composable
fun PremiumAccountLoginProviderScreen(
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onLanguageSelected: (PremiumLanguageOption) -> Unit = {},
    onGoogleRecovery: () -> Unit,
    onBack: () -> Unit
) {
    val copy = PremiumLocalizedCopy.forLanguage(language)
    PremiumAccountEntryFrame(language = language, onLanguageSelected = onLanguageSelected) {
        AccountEntryBackButton(onBack)
        Spacer(Modifier.height(18.dp))
        PremiumTitle(
            title = copy.recoverTitle,
            body = copy.recoverBody
        )
        LiquidGlassCard(Modifier.fillMaxWidth(), radius = PremiumRadius.CardLarge) {
            Column(Modifier.padding(18.dp)) {
                PremiumLoginRecoveryProvider.entries.forEach { _ ->
                    PremiumAccountChoiceRowBase(
                        title = copy.googleRecovery,
                        description = copy.googleRecoveryBody,
                        onClick = onGoogleRecovery,
                        elevated = false
                    ) {
                        PremiumGoogleIcon(Modifier.size(26.dp))
                    }
                }
            }
        }
    }
}

@Composable
fun PremiumAccountRecoveryScreen(
    state: PremiumAccountRecoveryUiState,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onLanguageSelected: (PremiumLanguageOption) -> Unit = {},
    onBack: () -> Unit
) {
    PremiumAccountEntryFrame(language = language, onLanguageSelected = onLanguageSelected) {
        AccountEntryBackButton(onBack)
        Spacer(Modifier.height(18.dp))
        PremiumStatePanel(
            state = when (state.status) {
                PremiumAccountRecoveryStatus.PENDING -> PremiumScreenState.actionRequired<Unit>(
                    title = state.title,
                    message = state.message,
                    actionLabel = null
                )
                PremiumAccountRecoveryStatus.ERROR -> PremiumScreenState.error<Unit>(
                    title = state.title,
                    message = state.message,
                    actionLabel = state.actionLabel
                )
                PremiumAccountRecoveryStatus.SUCCESS -> PremiumScreenState.empty<Unit>(
                    title = state.title,
                    message = state.message
                )
            }
        )
    }
}

@Composable
fun PremiumGoogleAccountLinkScreen(
    state: PremiumGoogleAccountLinkUiState,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    onLanguageSelected: (PremiumLanguageOption) -> Unit = {},
    onBack: () -> Unit
) {
    PremiumAccountEntryFrame(language = language, onLanguageSelected = onLanguageSelected) {
        AccountEntryBackButton(onBack)
        Spacer(Modifier.height(18.dp))
        PremiumStatePanel(
            state = when (state.status) {
                PremiumGoogleAccountLinkStatus.PENDING -> PremiumScreenState.actionRequired<Unit>(
                    title = state.title,
                    message = state.message,
                    actionLabel = null
                )
                PremiumGoogleAccountLinkStatus.ERROR -> PremiumScreenState.error<Unit>(
                    title = state.title,
                    message = state.message,
                    actionLabel = state.actionLabel
                )
                PremiumGoogleAccountLinkStatus.SUCCESS -> PremiumScreenState.empty<Unit>(
                    title = state.title,
                    message = state.message
                )
            }
        )
    }
}

@Composable
private fun PremiumAccountEntryFrame(
    language: PremiumLanguageOption,
    onLanguageSelected: (PremiumLanguageOption) -> Unit,
    content: @Composable () -> Unit
) {
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.matchParentSize())
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide, vertical = 34.dp)
                .padding(bottom = 42.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            content = { content() }
        )
        PremiumLanguageSwitch(
            language = language,
            onLanguageSelected = onLanguageSelected,
            modifier = Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(top = 10.dp, end = 16.dp)
        )
    }
}

@Composable
fun PremiumLanguageSwitch(
    language: PremiumLanguageOption,
    onLanguageSelected: (PremiumLanguageOption) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .height(PremiumComponentSize.TopAction)
            .background(PremiumColors.Surface, CircleShape)
            .border(1.dp, PremiumColors.Line, CircleShape)
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            Icons.Default.Language,
            contentDescription = "Langue",
            tint = PremiumColors.Ink,
            modifier = Modifier.size(16.dp)
        )
        PremiumLanguageOption.entries.forEach { option ->
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .semantics { role = Role.Button }
                    .premiumTap { onLanguageSelected(option) }
                    .padding(horizontal = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    option.shortLabel,
                    color = if (option == language) PremiumColors.Blue else PremiumColors.Muted,
                    fontSize = PremiumType.Caption,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
private fun AccountEntryBackButton(onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
        CircleAction(
            icon = Icons.AutoMirrored.Filled.ArrowBack,
            onClick = onBack
        )
    }
}

@Composable
private fun PremiumAccountChoiceRow(
    icon: ImageVector,
    title: String,
    description: String,
    onClick: () -> Unit,
    elevated: Boolean = true
) {
    PremiumAccountChoiceRowBase(
        title = title,
        description = description,
        onClick = onClick,
        elevated = elevated
    ) {
        Icon(icon, null, tint = PremiumColors.Teal, modifier = Modifier.size(25.dp))
    }
}

@Composable
private fun PremiumAccountChoiceRowBase(
    title: String,
    description: String,
    onClick: () -> Unit,
    elevated: Boolean,
    iconContent: @Composable () -> Unit
) {
    val modifier = Modifier
        .fillMaxWidth()
        .semantics {
            role = Role.Button
            contentDescription = "$title. $description"
        }
        .premiumTap(onClick)

    if (elevated) {
        LiquidGlassCard(modifier, radius = PremiumRadius.CardLarge) {
            PremiumAccountChoiceRowContent(title, description, iconContent)
        }
    } else {
        Box(modifier) {
            PremiumAccountChoiceRowContent(title, description, iconContent)
        }
    }
}

@Composable
private fun PremiumAccountChoiceRowContent(
    title: String,
    description: String,
    iconContent: @Composable () -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 82.dp)
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            Modifier
                .size(PremiumComponentSize.TouchTarget)
                .background(PremiumColors.IconTile, RoundedCornerShape(PremiumRadius.Tile))
                .border(1.dp, PremiumColors.Teal.copy(alpha = 0.28f), RoundedCornerShape(PremiumRadius.Tile)),
            contentAlignment = Alignment.Center
        ) {
            iconContent()
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text(
                description,
                color = PremiumColors.Muted,
                fontSize = PremiumType.Body,
                lineHeight = 19.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        Icon(Icons.Default.Security, null, tint = PremiumColors.SoftText, modifier = Modifier.size(22.dp))
    }
}
