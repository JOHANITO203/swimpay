package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MailOutline
import androidx.compose.material.icons.filled.NotificationsNone
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = PremiumMockupSpacing.ScreenHorizontal)
                .padding(top = 50.dp, bottom = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            MockupLogo()
            Spacer(Modifier.height(14.dp))
            Text(
                "Bienvenue !",
                color = PremiumMockupColors.White,
                fontSize = 29.sp,
                lineHeight = 34.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Gérez vos récepteurs et suivez\nvos paiements en temps réel.",
                color = PremiumMockupColors.Muted,
                fontSize = 16.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(24.dp))

            MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp) {
                Row(
                    Modifier.padding(horizontal = 18.dp, vertical = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    MockupIconTile(PremiumIcons.Security, size = 58.dp)
                    Column(Modifier.weight(1f)) {
                        Text(
                            "Accès marchand sécurisé",
                            color = PremiumMockupColors.White,
                            fontSize = 17.sp,
                            lineHeight = 21.sp,
                            fontWeight = FontWeight.Black
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Vos données sont chiffrées et protégées.\nAccédez à vos opérations en toute sécurité.",
                            color = PremiumMockupColors.Muted,
                            fontSize = 13.sp,
                            lineHeight = 18.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            MockupGlassCard(Modifier.fillMaxWidth(), radius = 28.dp) {
                Column(
                    Modifier.padding(horizontal = 18.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(7.dp)
                ) {
                    Text("Email", color = PremiumMockupColors.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    MockupInputRow(icon = Icons.Default.MailOutline, placeholder = "email@merchant.example")
                    Text("Mot de passe", color = PremiumMockupColors.White, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    MockupInputRow(icon = Icons.Default.Lock, placeholder = "Votre mot de passe", trailing = Icons.Default.Visibility)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                        Text("Mot de passe oublié ?", color = PremiumMockupColors.Green, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    }
                    Spacer(Modifier.height(2.dp))
                    MockupPrimaryButton("Se connecter", onClick = onSignIn)
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(18.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Box(Modifier.weight(1f).height(1.dp).background(PremiumMockupColors.Border))
                        Text("ou", color = PremiumMockupColors.MutedDark, fontSize = 17.sp, fontWeight = FontWeight.Medium)
                        Box(Modifier.weight(1f).height(1.dp).background(PremiumMockupColors.Border))
                    }
                    MockupOutlineButton("Créer un compte", onClick = onCreateAccount)
                }
            }

            Spacer(Modifier.height(12.dp))
            MockupTruthBanner(Modifier.fillMaxWidth())
            Spacer(Modifier.height(14.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                MockupFeature(
                    label = "Sécurisé",
                    body = "Données chiffrées\nde bout en bout",
                    icon = PremiumIcons.Security,
                    modifier = Modifier.weight(1f)
                )
                Box(Modifier.width(1.dp).height(112.dp).background(PremiumMockupColors.Border))
                MockupFeature(
                    label = "Temps réel",
                    body = "Suivi instantane\ndes paiements",
                    icon = PremiumIcons.FastDetection,
                    modifier = Modifier.weight(1f)
                )
                Box(Modifier.width(1.dp).height(112.dp).background(PremiumMockupColors.Border))
                MockupFeature(
                    label = "Fiable",
                    body = "Signaux détectés\nmulti-banques",
                    icon = Icons.Default.NotificationsNone,
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(Modifier.height(14.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(PremiumMockupColors.BorderSoft))
            Spacer(Modifier.height(14.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Lock, null, tint = PremiumMockupColors.MutedDark, modifier = Modifier.size(20.dp))
                Text(
                    "Conçu pour la fiabilité opérationnelle",
                    color = PremiumMockupColors.MutedDark,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium
                )
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
        PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(18.dp)) {
                PremiumLoginRecoveryProvider.entries.forEach { provider ->
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize()) {
            Column(
                Modifier
                    .fillMaxSize()
                    .statusBarsPadding()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 22.dp, vertical = 34.dp)
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
}

@Composable
fun PremiumLanguageSwitch(
    language: PremiumLanguageOption,
    onLanguageSelected: (PremiumLanguageOption) -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .background(PremiumMockupColors.CardStrong, CircleShape)
            .border(1.dp, PremiumMockupColors.BorderSoft, CircleShape)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(Icons.Default.Language, "Langue", tint = PremiumMockupColors.Green, modifier = Modifier.size(16.dp))
        PremiumLanguageOption.entries.forEach { option ->
            Text(
                option.shortLabel,
                color = if (option == language) PremiumMockupColors.White else PremiumMockupColors.MutedDark,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier
                    .semantics { role = Role.Button }
                    .premiumTap { onLanguageSelected(option) }
                    .padding(horizontal = 3.dp)
            )
        }
    }
}

@Composable
private fun AccountEntryBackButton(onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
        Box(
            Modifier
                .size(48.dp)
                .background(PremiumMockupColors.CardStrong, CircleShape)
                .border(1.dp, PremiumMockupColors.BorderSoft, CircleShape)
                .premiumTap(onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour", tint = PremiumMockupColors.White, modifier = Modifier.size(22.dp))
        }
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
        Icon(icon, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(25.dp))
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
        PremiumCard(modifier, radius = 28.dp) {
            PremiumAccountChoiceRowContent(title, description, iconContent)
        }
    } else {
        PremiumAccountChoiceRowContent(title, description, iconContent)
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
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            Modifier
                .size(48.dp)
                .background(PremiumMockupColors.Green.copy(alpha = 0.14f), RoundedCornerShape(18.dp))
                .border(1.dp, PremiumMockupColors.Green.copy(alpha = 0.24f), RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center
        ) {
            iconContent()
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
            Text(
                description,
                color = PremiumMockupColors.Muted,
                fontSize = 13.sp,
                lineHeight = 19.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        Icon(Icons.Default.Security, null, tint = PremiumMockupColors.Cyan, modifier = Modifier.size(22.dp))
    }
}
