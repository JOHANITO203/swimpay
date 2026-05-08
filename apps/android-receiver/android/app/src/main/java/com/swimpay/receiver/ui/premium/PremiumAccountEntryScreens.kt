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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Storefront
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
    onCreateAccount: () -> Unit,
    onSignIn: () -> Unit
) {
    PremiumAccountEntryFrame {
        SwimPayLogo(markSize = 56.dp)
        Spacer(Modifier.height(26.dp))
        PremiumTitle(
            title = state.title,
            body = state.message,
            centered = true
        )
        PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
            Column(
                Modifier.padding(22.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PremiumPrimaryButton(state.createAccountLabel, onClick = onCreateAccount)
                PremiumOutlineButton(state.signInLabel, onClick = onSignIn)
            }
        }
    }
}

@Composable
fun PremiumAccountProfileChoiceScreen(
    onSelectProfile: (PremiumMerchantProfileType) -> Unit,
    onBack: () -> Unit
) {
    PremiumAccountEntryFrame {
        AccountEntryBackButton(onBack)
        Spacer(Modifier.height(18.dp))
        PremiumTitle(
            title = "Choisissez votre profil",
            body = PremiumAccountEntryCopy.sameAppRights
        )
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            PremiumMerchantProfileType.entries.forEach { profile ->
                PremiumAccountChoiceRow(
                    icon = when (profile) {
                        PremiumMerchantProfileType.PERSONAL -> Icons.Default.Person
                        PremiumMerchantProfileType.COMMERCE -> Icons.Default.Storefront
                    },
                    title = profile.label,
                    description = profile.description,
                    onClick = { onSelectProfile(profile) }
                )
            }
        }
    }
}

@Composable
fun PremiumAccountLoginProviderScreen(
    onGoogleRecovery: () -> Unit,
    onBack: () -> Unit
) {
    PremiumAccountEntryFrame {
        AccountEntryBackButton(onBack)
        Spacer(Modifier.height(18.dp))
        PremiumTitle(
            title = "Retrouver un compte",
            body = "Choisissez un moyen de récupération pour une session déjà créée."
        )
        PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp) {
            Column(Modifier.padding(18.dp)) {
                PremiumLoginRecoveryProvider.entries.forEach { provider ->
                    PremiumAccountChoiceRowBase(
                        title = provider.label,
                        description = provider.description,
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
    onBack: () -> Unit
) {
    PremiumAccountEntryFrame {
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
private fun PremiumAccountEntryFrame(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize().background(PremiumColors.Background)) {
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
    }
}

@Composable
private fun AccountEntryBackButton(onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
        Box(
            Modifier
                .size(48.dp)
                .background(PremiumColors.Surface, CircleShape)
                .border(1.dp, PremiumColors.Line, CircleShape)
                .premiumTap(onBack),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Retour", tint = PremiumColors.Navy, modifier = Modifier.size(22.dp))
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
        Icon(icon, null, tint = PremiumColors.Blue, modifier = Modifier.size(25.dp))
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
            Modifier.size(48.dp).background(PremiumColors.Mint, RoundedCornerShape(18.dp)),
            contentAlignment = Alignment.Center
        ) {
            iconContent()
        }
        Column(Modifier.weight(1f)) {
            Text(title, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Black)
            Text(
                description,
                color = PremiumColors.Muted,
                fontSize = 13.sp,
                lineHeight = 19.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
        Icon(Icons.Default.Security, null, tint = Color(0xFFB7C6D6), modifier = Modifier.size(22.dp))
    }
}
