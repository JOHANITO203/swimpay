package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Water
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumLandingScreen(onStart: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(PremiumColors.Background)
            .statusBarsPadding()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        SwimPayLogo(markSize = 56.dp)
        Spacer(Modifier.height(22.dp))
        Text(
            "Terminal marchand",
            color = PremiumColors.SoftText,
            fontWeight = FontWeight.Black,
            fontSize = 12.sp,
            letterSpacing = 4.sp
        )
        Text(
            "Configurez SwimPay sur ce téléphone pour suivre les paiements reçus.",
            color = PremiumColors.Muted,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp)
        )
        Spacer(Modifier.height(44.dp))
        PremiumCard(
            Modifier
                .fillMaxWidth()
                .height(220.dp)
                .premiumTap(onStart),
            radius = 30.dp
        ) {
            Column(
                Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                PremiumIconTile(Icons.Default.Water, 78.dp)
                Spacer(Modifier.height(26.dp))
                Text("Configuration initiale", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("Commencer", color = PremiumColors.SoftText, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            }
        }
    }
}

@Composable
fun PremiumOnboardingFlow(
    notificationAccessEnabled: Boolean,
    bankTargetsState: PremiumScreenState<PremiumBanksUiState> = PremiumScreenState.loading(),
    openNotificationSettings: () -> Unit,
    onDone: () -> Unit
) {
    var state by remember {
        mutableStateOf(PremiumOnboardingSessionState(notificationAccessEnabled = notificationAccessEnabled))
    }

    LaunchedEffect(notificationAccessEnabled) {
        state = state.withNotificationAccess(notificationAccessEnabled)
    }
    LaunchedEffect(bankTargetsState) {
        val detectedIds = when (bankTargetsState) {
            is PremiumScreenState.Content -> bankTargetsState.value.items
                .filter { it.canActivate || it.enabled }
                .map { it.bankProfileId }
                .toSet()
            else -> emptySet()
        }
        state = state.withDetectedBanks(detectedIds).withDefaultDetectedBanksSelected()
    }

    fun moveNext(nextState: PremiumOnboardingSessionState = state) {
        val moved = when (nextState.currentStep) {
            PremiumOnboardingStep.COMPATIBLE_BANK_SELECTION -> nextState
                .withDefaultDetectedBanksSelected()
                .completeAndMoveNext()
            else -> nextState.completeAndMoveNext()
        }
        state = moved
        if (moved.onboardingCompleted) {
            onDone()
        }
    }

    when (state.currentStep) {
        PremiumOnboardingStep.WELCOME -> WelcomeStep { moveNext() }
        PremiumOnboardingStep.NOTIFICATION_ACCESS -> NotificationAccessStep(
            notificationAccessEnabled = state.notificationAccessEnabled,
            openNotificationSettings = openNotificationSettings,
            onBack = { state = state.goBack() },
            onNext = { if (state.canContinueFrom()) moveNext() }
        )
        PremiumOnboardingStep.COMPATIBLE_BANK_SELECTION -> CompatibleBankSelectionStep(
            bankTargetsState = bankTargetsState,
            selectedBankIds = state.selectedBankIds,
            onToggleBank = { state = state.toggleBank(it) },
            onBack = { state = state.goBack() },
            onNext = { if (state.canContinueFrom()) moveNext() }
        )
        PremiumOnboardingStep.RECEIVING_METHOD -> ReceivingMethodStep(
            selectedMethod = state.receivingMethodDraft,
            onSelect = { state = state.withReceivingMethod(it) },
            onBack = { state = state.goBack() },
            onNext = {
                val next = if (state.receivingMethodConfigured) {
                    state
                } else {
                    state.withReceivingMethod(PremiumReceivingMethodDraft.CARD_TRANSFER)
                }
                moveNext(next)
            }
        )
        PremiumOnboardingStep.CONNECTED_SITE -> ConnectedSiteStep(
            skipped = state.skippedConnectedSite,
            onBack = { state = state.goBack() },
            onConnectNow = { moveNext(state.connectSite()) },
            onSkip = { moveNext(state.skipConnectedSite()) }
        )
        PremiumOnboardingStep.CONFIGURATION_TEST -> ConfigurationTestStep(
            state = state,
            onBack = { state = state.goBack() },
            onConnectSite = { state = state.goTo(PremiumOnboardingStep.CONNECTED_SITE).connectSite() },
            onRunTest = { moveNext(state.withConfigurationTestRan()) }
        )
    }
}

@Composable
private fun WelcomeStep(onNext: () -> Unit) {
    Box(Modifier.fillMaxSize().background(PremiumColors.Background).statusBarsPadding()) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp, vertical = 28.dp)
                .padding(bottom = 92.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SwimPayLogo(markSize = 54.dp)
            Spacer(Modifier.height(26.dp))
            Text(
                "Recevez vos paiements plus facilement",
                color = PremiumColors.Ink,
                fontSize = 30.sp,
                lineHeight = 34.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Text(
                "SwimPay détecte les paiements reçus, vous aide à les confirmer et prévient votre site ou votre application.",
                color = PremiumColors.Muted,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 23.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 14.dp)
            )
            Spacer(Modifier.height(28.dp))
            BenefitRow(Icons.Default.Bolt, "Détection rapide", "Repérez plus vite les paiements reçus.")
            BenefitRow(Icons.Default.CheckCircle, "Confirmation simple", "Confirmez ou rejetez en quelques secondes.")
            BenefitRow(Icons.Default.Link, "Business connecté", "Votre site ou application reçoit la mise à jour.")
        }
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(PremiumColors.Background)
                .padding(horizontal = 22.dp, vertical = 18.dp)
        ) {
            PremiumPrimaryButton("Commencer", onClick = onNext)
        }
    }
}

@Composable
private fun NotificationAccessStep(
    notificationAccessEnabled: Boolean,
    openNotificationSettings: () -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    OnboardingShell("Accès notifications", PremiumOnboardingStep.NOTIFICATION_ACCESS, onBack) {
        PremiumTitle(
            "Connectez votre téléphone",
            "SwimPay a besoin d’accéder aux notifications de cet appareil pour fonctionner."
        )
        PremiumCard(Modifier.fillMaxWidth(), radius = 32.dp) {
            Row(
                Modifier.padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Box(
                    Modifier.size(64.dp).background(Color(0xFFFFF2DD), RoundedCornerShape(22.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Fingerprint, null, tint = PremiumColors.Warning, modifier = Modifier.size(32.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        if (notificationAccessEnabled) "Activé" else "Accès nécessaire",
                        color = if (notificationAccessEnabled) PremiumColors.Success else PremiumColors.Ink,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        if (notificationAccessEnabled) {
                            "L’accès notifications est activé."
                        } else {
                            "Activez l’accès aux notifications pour détecter les paiements reçus."
                        },
                        color = PremiumColors.Muted,
                        fontSize = 14.sp,
                        lineHeight = 21.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        Spacer(Modifier.height(22.dp))
        NoticeRow(Icons.Default.Security, "SwimPay ne lit pas vos SMS et ne contrôle pas votre banque.")
        Spacer(Modifier.height(22.dp))
        PremiumPrimaryButton(
            if (notificationAccessEnabled) "Continuer" else "Activer l’accès",
            onClick = if (notificationAccessEnabled) onNext else openNotificationSettings
        )
    }
}

@Composable
private fun CompatibleBankSelectionStep(
    bankTargetsState: PremiumScreenState<PremiumBanksUiState>,
    selectedBankIds: Set<String>,
    onToggleBank: (String) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    OnboardingShell("Banques", PremiumOnboardingStep.COMPATIBLE_BANK_SELECTION, onBack) {
        PremiumTitle(
            "Choisissez vos banques",
            "SwimPay recherche uniquement les banques compatibles."
        )
        BankSearchStatusCard(
            bankTargetsState = bankTargetsState,
            selectedCount = selectedBankIds.size
        )
        Spacer(Modifier.height(16.dp))
        BankRows(
            bankTargetsState = bankTargetsState,
            selectable = true,
            selectedBankIds = selectedBankIds,
            onToggleBank = onToggleBank
        )
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton("Activer ces banques", onClick = onNext, enabled = selectedBankIds.isNotEmpty())
    }
}

@Composable
private fun ReceivingMethodStep(
    selectedMethod: PremiumReceivingMethodDraft?,
    onSelect: (PremiumReceivingMethodDraft) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    OnboardingShell("Moyen de réception", PremiumOnboardingStep.RECEIVING_METHOD, onBack) {
        PremiumTitle(
            "Ajoutez votre moyen de réception",
            "Vos clients utiliseront ces informations pour vous payer."
        )
        ReceivingMethodOption(
            icon = Icons.Default.ShoppingCart,
            title = "Carte bancaire",
            subtitle = "Recevez les paiements sur votre carte.",
            selected = selectedMethod == PremiumReceivingMethodDraft.CARD_TRANSFER || selectedMethod == null,
            onClick = { onSelect(PremiumReceivingMethodDraft.CARD_TRANSFER) }
        )
        ReceivingMethodOption(
            icon = Icons.Default.PhoneAndroid,
            title = "Numéro de téléphone",
            subtitle = "Pratique pour les virements via SBP.",
            selected = selectedMethod == PremiumReceivingMethodDraft.PHONE_TRANSFER,
            onClick = { onSelect(PremiumReceivingMethodDraft.PHONE_TRANSFER) }
        )
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton("Ajouter", onClick = onNext)
    }
}

@Composable
private fun ConnectedSiteStep(
    skipped: Boolean,
    onBack: () -> Unit,
    onConnectNow: () -> Unit,
    onSkip: () -> Unit
) {
    OnboardingShell("Site ou application", PremiumOnboardingStep.CONNECTED_SITE, onBack) {
        PremiumTitle(
            "Connectez votre site ou application",
            "Recevez une mise à jour quand un paiement est confirmé."
        )
        PremiumCard(Modifier.fillMaxWidth(), radius = 32.dp) {
            Row(
                Modifier.padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Box(Modifier.size(58.dp).background(PremiumColors.Mint, RoundedCornerShape(20.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Link, null, tint = PremiumColors.Teal, modifier = Modifier.size(30.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        if (skipped) "À configurer plus tard" else "Site ou application connecté",
                        color = PremiumColors.Ink,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        if (skipped) {
                            "Votre site ou application ne recevra pas encore les mises à jour automatiques."
                        } else {
                            "Ajoutez la connexion maintenant ou continuez plus tard."
                        },
                        color = PremiumColors.Muted,
                        fontSize = 13.sp,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        Spacer(Modifier.height(22.dp))
        PremiumPrimaryButton("Ajouter maintenant", onClick = onConnectNow)
        Spacer(Modifier.height(12.dp))
        PremiumOutlineButton("Configurer plus tard", onClick = onSkip)
    }
}

@Composable
private fun ConfigurationTestStep(
    state: PremiumOnboardingSessionState,
    onBack: () -> Unit,
    onConnectSite: () -> Unit,
    onRunTest: () -> Unit
) {
    OnboardingShell("Test", PremiumOnboardingStep.CONFIGURATION_TEST, onBack) {
        PremiumTitle("Vérifiez que tout fonctionne")
        ChecklistCard(state)
        Spacer(Modifier.height(22.dp))
        ResultCard(state)
        Spacer(Modifier.height(18.dp))
        if (state.connectedSiteConfigured) {
            PremiumPrimaryButton("Lancer un test complet", onClick = onRunTest)
        } else {
            PremiumPrimaryButton("Tester sans site connecté", onClick = onRunTest)
            Spacer(Modifier.height(12.dp))
            PremiumOutlineButton("Connecter mon site", onClick = onConnectSite)
        }
    }
}

@Composable
private fun OnboardingShell(
    title: String,
    step: PremiumOnboardingStep,
    onBack: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(Modifier.fillMaxSize().background(PremiumColors.Background).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(76.dp).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            CircleAction(Icons.Default.ArrowBack, onClick = onBack)
            Text(
                title,
                modifier = Modifier.weight(1f),
                textAlign = TextAlign.Center,
                color = PremiumColors.SoftText,
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 3.sp
            )
            Box(Modifier.size(34.dp).background(PremiumColors.Surface, CircleShape), contentAlignment = Alignment.Center) {
                Text("MP", color = PremiumColors.Cyan, fontSize = 9.sp, fontWeight = FontWeight.Black)
            }
        }
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
        ) {
            ProgressLine(step)
            Spacer(Modifier.height(36.dp))
            content()
        }
    }
}

@Composable
private fun ProgressLine(step: PremiumOnboardingStep) {
    val activeIndex = PremiumOnboardingStep.requiredSequence.indexOf(step)
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        PremiumOnboardingStep.requiredSequence.forEachIndexed { index, _ ->
            Box(
                Modifier
                    .weight(1f)
                    .height(4.dp)
                    .background(if (index <= activeIndex) PremiumColors.Navy else Color.White.copy(alpha = 0.75f), CircleShape)
            )
        }
    }
}

@Composable
private fun BenefitRow(icon: ImageVector, title: String, body: String) {
    PremiumCard(Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap {}, radius = 28.dp) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Box(Modifier.size(54.dp).background(PremiumColors.Mint, RoundedCornerShape(20.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Teal, modifier = Modifier.size(28.dp))
            }
            Column {
                Text(title, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 17.sp)
                Text(body, color = PremiumColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 20.sp)
            }
        }
    }
}

@Composable
private fun NoticeRow(icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        Icon(icon, null, tint = PremiumColors.SoftText, modifier = Modifier.size(28.dp))
        Text(text, color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun BankSearchStatusCard(
    bankTargetsState: PremiumScreenState<PremiumBanksUiState>,
    selectedCount: Int
) {
    val (title, body, icon, toneColor) = when (bankTargetsState) {
        is PremiumScreenState.Loading -> Quadruple(
            "Recherche en cours",
            "Les banques compatibles apparaissent ici sans parcourir toutes les applications.",
            Icons.Default.Bolt,
            PremiumColors.Cyan
        )
        is PremiumScreenState.Content -> {
            val detected = bankTargetsState.value.items.count { it.canActivate || it.enabled }
            Quadruple(
                if (detected > 0) "Recherche terminée" else "Aucune banque détectée",
                if (selectedCount > 0) {
                    "$selectedCount banque(s) activée(s)."
                } else if (detected > 0) {
                    "Sélectionnez les banques détectées que vous utilisez."
                } else {
                    "Vous pourrez configurer une banque compatible plus tard."
                },
                Icons.Default.AccountBalance,
                if (detected > 0) PremiumColors.Teal else PremiumColors.SoftText
            )
        }
        is PremiumScreenState.Empty -> Quadruple(
            "Aucune banque détectée",
            "Vous pourrez configurer une banque compatible plus tard.",
            Icons.Default.AccountBalance,
            PremiumColors.SoftText
        )
        is PremiumScreenState.ActionRequired -> Quadruple(
            bankTargetsState.title,
            bankTargetsState.message,
            Icons.Default.AccountBalance,
            PremiumColors.Warning
        )
        is PremiumScreenState.Error,
        is PremiumScreenState.Offline -> Quadruple(
            "Recherche à relancer",
            "Réessayez dans quelques instants.",
            Icons.Default.AccountBalance,
            PremiumColors.Warning
        )
    }

    PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp, color = Color(0xFFF7FEFE)) {
        Row(
            Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(Modifier.size(54.dp).background(PremiumColors.Mint, RoundedCornerShape(20.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = toneColor, modifier = Modifier.size(28.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Black)
                Text(body, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

private data class Quadruple<A, B, C, D>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D
)

@Composable
private fun BankRows(
    bankTargetsState: PremiumScreenState<PremiumBanksUiState>,
    selectable: Boolean,
    selectedBankIds: Set<String>,
    onToggleBank: (String) -> Unit
) {
    when (bankTargetsState) {
        is PremiumScreenState.Content -> {
            bankTargetsState.value.items.forEach { bank ->
                BankRow(
                    bank = bank,
                    selectable = selectable,
                    selected = bank.bankProfileId in selectedBankIds,
                    onToggleBank = onToggleBank
                )
            }
        }
        is PremiumScreenState.Loading -> OnboardingInfoCard("Recherche en cours", "Les banques compatibles apparaîtront ici.")
        is PremiumScreenState.Empty -> OnboardingInfoCard("Aucune banque détectée", "Vous pourrez continuer et configurer une banque plus tard.")
        is PremiumScreenState.ActionRequired -> OnboardingInfoCard(bankTargetsState.title, bankTargetsState.message)
        is PremiumScreenState.Error,
        is PremiumScreenState.Offline -> OnboardingInfoCard("Recherche à relancer", "Réessayez dans quelques instants.")
    }
}

@Composable
private fun BankRow(
    bank: PremiumBankUiItem,
    selectable: Boolean,
    selected: Boolean,
    onToggleBank: (String) -> Unit
) {
    val detected = bank.canActivate || bank.enabled
    val label = when {
        selectable && selected -> "Activée"
        detected -> "Détectée"
        else -> "Non détectée"
    }
    PremiumCard(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp)
            .premiumTap {
                if (selectable && detected) onToggleBank(bank.bankProfileId)
            },
        radius = 28.dp,
        color = if (selected) Color(0xFFF7FEFE) else PremiumColors.Surface
    ) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(50.dp).background(PremiumColors.Mint, RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
                Text(bank.displayName.take(2), color = PremiumColors.Teal, fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
            Column(Modifier.weight(1f).padding(start = 16.dp)) {
                Text(bank.displayName, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Black)
                Text(label, color = if (detected) PremiumColors.Teal else PremiumColors.SoftText, fontSize = 12.sp, fontWeight = FontWeight.Black)
            }
            Box(
                Modifier
                    .size(30.dp)
                    .background(if (selected) PremiumColors.Teal else Color.Transparent, RoundedCornerShape(11.dp))
                    .border(2.dp, if (selected) PremiumColors.Teal else PremiumColors.Line, RoundedCornerShape(11.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (selected) Icon(Icons.Default.VerifiedUser, null, tint = PremiumColors.Surface, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun ReceivingMethodOption(
    icon: ImageVector,
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit
) {
    PremiumCard(
        Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap(onClick),
        radius = 30.dp,
        color = if (selected) Color(0xFFF7FEFE) else PremiumColors.Surface
    ) {
        Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Box(Modifier.size(62.dp).background(PremiumColors.Mint, RoundedCornerShape(22.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Teal, modifier = Modifier.size(30.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumColors.Ink, fontSize = 18.sp, fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold)
            }
            Box(
                Modifier
                    .size(30.dp)
                    .background(if (selected) PremiumColors.Teal else Color.Transparent, CircleShape)
                    .border(2.dp, if (selected) PremiumColors.Teal else PremiumColors.Line, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (selected) Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Surface, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun ChecklistCard(state: PremiumOnboardingSessionState) {
    PremiumCard(Modifier.fillMaxWidth(), radius = 30.dp) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            state.configurationChecklistLabels().forEach { label ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Box(Modifier.size(32.dp).background(PremiumColors.Mint, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Teal, modifier = Modifier.size(20.dp))
                    }
                    Text(label, color = PremiumColors.Ink, fontSize = 15.sp, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun ResultCard(state: PremiumOnboardingSessionState) {
    val ready = state.configurationTestReady
    PremiumCard(
        Modifier.fillMaxWidth(),
        radius = 28.dp,
        color = if (ready) Color(0xFFE8FAF8) else Color(0xFFFFF8EA)
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                if (ready) "Réussi" else "Action nécessaire",
                color = if (ready) PremiumColors.Success else Color(0xFFB45309),
                fontSize = 18.sp,
                fontWeight = FontWeight.Black
            )
            Text(
                if (ready) {
                    "Votre configuration est prête pour la bêta."
                } else {
                    state.configurationResultLabels().filterNot { it == "Réussi" }.joinToString(" · ")
                },
                color = PremiumColors.Muted,
                fontSize = 14.sp,
                lineHeight = 21.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun OnboardingInfoCard(title: String, body: String) {
    PremiumCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), radius = 30.dp) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = PremiumColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.Black)
            Text(body, color = PremiumColors.Muted, fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
