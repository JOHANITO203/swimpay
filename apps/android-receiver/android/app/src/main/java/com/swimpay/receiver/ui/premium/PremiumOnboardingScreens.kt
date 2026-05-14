package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
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
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.R
import com.swimpay.receiver.ReceivingMethodType
import com.swimpay.receiver.MerchantReceivingMethodDraft as MerchantReceivingRouteDraft
import kotlinx.coroutines.delay

@Composable
fun PremiumLandingScreen(onStart: () -> Unit) {
    MockupScreenBackground(Modifier.fillMaxSize()) {
    Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
        SwimPayLogo(markSize = 56.dp)
        Spacer(Modifier.height(22.dp))
        Text(
            "Terminal marchand",
            color = PremiumMockupColors.Cyan,
            fontWeight = FontWeight.Black,
            fontSize = 12.sp,
            letterSpacing = 4.sp
        )
        Text(
            "Configurez SwimPay sur ce téléphone pour suivre les paiements reçus.",
            color = PremiumMockupColors.Muted,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            lineHeight = 24.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp)
        )
        Spacer(Modifier.height(44.dp))
        MockupGlassCard(
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
                Box(Modifier.size(78.dp).background(PremiumMockupColors.Field, RoundedCornerShape(26.dp)).border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(26.dp)), contentAlignment = Alignment.Center) {
                    SwimPayWavesMark(Modifier.size(PremiumIconSize.Large), tint = PremiumMockupColors.Green)
                }
                Spacer(Modifier.height(26.dp))
                Text("Configuration initiale", color = PremiumMockupColors.White, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("Commencer", color = PremiumMockupColors.Cyan, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            }
        }
    }
    }
}

@Composable
fun PremiumOnboardingFlow(
    notificationAccessEnabled: Boolean,
    bankTargetsState: PremiumScreenState<PremiumBanksUiState> = PremiumScreenState.loading(),
    openNotificationSettings: () -> Unit,
    onDone: (PremiumOnboardingSessionState) -> Unit,
    initialState: PremiumOnboardingSessionState = PremiumOnboardingSessionState(
        notificationAccessEnabled = notificationAccessEnabled
    )
) {
    var state by remember {
        mutableStateOf(initialState.withNotificationAccess(notificationAccessEnabled))
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
    LaunchedEffect(state.onboardingCompleted, state.skippedConnectedSite) {
        if (state.onboardingCompleted && state.skippedConnectedSite) {
            delay(650)
            onDone(state)
        }
    }

    fun moveNext(nextState: PremiumOnboardingSessionState = state) {
        val moved = when (nextState.currentStep) {
            PremiumOnboardingStep.COMPATIBLE_BANK_SELECTION -> nextState
                .withDefaultDetectedBanksSelected()
                .completeAndMoveNext()
            else -> nextState.completeAndMoveNext()
        }
        state = moved
        if (moved.onboardingCompleted && !moved.skippedConnectedSite) {
            onDone(moved)
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
        PremiumOnboardingStep.RECEIVING_METHOD -> ReceivingMethodDetailsStep(
            selectedBankDisplayName = state.selectedBankDisplayName(bankTargetsState),
            selectedBankIds = state.selectedBankIds,
            selectedMethod = state.receivingMethodDraft,
            onSelectChoice = { state = state.withReceivingMethod(it) },
            onSave = {
                val next = state.withReceivingMethod(it)
                moveNext(next)
            },
            onBack = { state = state.goBack() },
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize()) {
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
                color = PremiumMockupColors.White,
                fontSize = 30.sp,
                lineHeight = 34.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Text(
                "SwimPay détecte les paiements reçus, vous aide à les confirmer et prévient votre site ou votre application.",
                color = PremiumMockupColors.Muted,
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
                .padding(horizontal = 22.dp, vertical = 18.dp)
        ) {
            PremiumPrimaryButton("Commencer", onClick = onNext)
        }
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
        MockupGlassCard(
            Modifier.fillMaxWidth(),
            radius = 30.dp,
            border = if (notificationAccessEnabled) PremiumMockupColors.Green else PremiumMockupColors.Cyan.copy(alpha = 0.42f)
        ) {
            Row(
                Modifier.padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                MockupIconTile(
                    Icons.Default.Fingerprint,
                    size = 64.dp,
                    tint = if (notificationAccessEnabled) PremiumMockupColors.Green else PremiumMockupColors.Cyan
                )
                Column(Modifier.weight(1f)) {
                    Text(
                        if (notificationAccessEnabled) "Activé" else "Accès nécessaire",
                        color = if (notificationAccessEnabled) PremiumMockupColors.Green else PremiumMockupColors.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        if (notificationAccessEnabled) {
                            "L’accès notifications est activé."
                        } else {
                            "Activez l’accès aux notifications pour détecter les paiements reçus."
                        },
                        color = PremiumMockupColors.Muted,
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
private fun ReceivingMethodDetailsStep(
    selectedBankDisplayName: String,
    selectedBankIds: Set<String>,
    selectedMethod: PremiumReceivingMethodDraft?,
    onSelectChoice: (PremiumReceivingMethodDraft) -> Unit,
    onSave: (MerchantReceivingMethodSubmission) -> Unit,
    onBack: () -> Unit
) {
    val bankOptions = PremiumReceivingMethodBankCatalog.availableBanks
    val availableBankIds = bankOptions.map { it.bankProfileId }.toSet()
    val initialBankId = selectedBankIds.firstOrNull { it in availableBankIds }
        ?: bankOptions.firstOrNull()?.bankProfileId.orEmpty()
    var selectedBankId by remember(initialBankId) { mutableStateOf(initialBankId) }
    var methodType by remember(selectedMethod) {
        mutableStateOf(
            when (selectedMethod) {
                PremiumReceivingMethodDraft.PHONE_TRANSFER -> ReceivingMethodType.PHONE_TRANSFER
                else -> ReceivingMethodType.CARD_TRANSFER
            }
        )
    }
    var visualMethodSelection by remember(selectedMethod) {
        mutableStateOf(
            when (selectedMethod) {
                PremiumReceivingMethodDraft.PHONE_TRANSFER -> setOf(ReceivingMethodType.PHONE_TRANSFER)
                PremiumReceivingMethodDraft.CARD_TRANSFER -> setOf(ReceivingMethodType.CARD_TRANSFER)
                null -> setOf(ReceivingMethodType.CARD_TRANSFER)
            }
        )
    }
    var identifierInput by remember { mutableStateOf("") }

    OnboardingShell("Moyen de réception", PremiumOnboardingStep.RECEIVING_METHOD, onBack) {
        PremiumTitle(
            "Ajoutez votre moyen de réception",
            "Vos clients utiliseront ces informations pour vous payer sur $selectedBankDisplayName."
        )
        ReceivingMethodOption(
            icon = Icons.Default.ShoppingCart,
            title = "Carte bancaire",
            subtitle = "Recevez les paiements sur votre carte.",
            selected = ReceivingMethodType.CARD_TRANSFER in visualMethodSelection,
            onClick = {
                methodType = ReceivingMethodType.CARD_TRANSFER
                visualMethodSelection = toggleVisualReceivingMethod(visualMethodSelection, ReceivingMethodType.CARD_TRANSFER)
                onSelectChoice(PremiumReceivingMethodDraft.CARD_TRANSFER)
            }
        )
        ReceivingMethodOption(
            icon = Icons.Default.PhoneAndroid,
            title = "Numéro de téléphone",
            subtitle = "Pratique pour les virements via SBP.",
            selected = ReceivingMethodType.PHONE_TRANSFER in visualMethodSelection,
            sbp = true,
            onClick = {
                methodType = ReceivingMethodType.PHONE_TRANSFER
                visualMethodSelection = toggleVisualReceivingMethod(visualMethodSelection, ReceivingMethodType.PHONE_TRANSFER)
                onSelectChoice(PremiumReceivingMethodDraft.PHONE_TRANSFER)
            }
        )
        Spacer(Modifier.height(6.dp))
        Text("Choisir la banque", color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
        Spacer(Modifier.height(10.dp))
        bankOptions.forEach { bank ->
            val selected = bank.bankProfileId == selectedBankId
            MockupGlassCard(
                Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
                    .premiumTap { selectedBankId = bank.bankProfileId },
                radius = 24.dp,
                border = if (selected) PremiumMockupColors.Green else PremiumMockupColors.BorderSoft
            ) {
                Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = 42.dp)
                    Column(Modifier.weight(1f).padding(start = 14.dp)) {
                        Text(bank.displayName, color = PremiumMockupColors.White, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        Text("Destination de réception", color = PremiumMockupColors.MutedDark, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Box(
                        Modifier
                            .size(30.dp)
                            .background(if (selected) PremiumMockupColors.Green else Color.Transparent, RoundedCornerShape(8.dp))
                            .border(2.dp, if (selected) PremiumMockupColors.Green else PremiumMockupColors.Border, RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (selected) Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF02070A), modifier = Modifier.size(20.dp))
                    }
                }
            }
        }
        bankOptions.firstOrNull { it.bankProfileId == selectedBankId }?.let { bank ->
            MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp, border = PremiumMockupColors.Green.copy(alpha = 0.34f)) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = 44.dp)
                    if (ReceivingMethodType.PHONE_TRANSFER in visualMethodSelection) {
                        Image(
                            painter = painterResource(R.drawable.ic_payment_sbp_placeholder),
                            contentDescription = "SBP",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier.size(34.dp)
                        )
                    }
                    Column(Modifier.weight(1f)) {
                        Text("Destination exemple", color = PremiumMockupColors.MutedDark, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        Text(
                            if (ReceivingMethodType.PHONE_TRANSFER in visualMethodSelection) "+7 *** *** ** 42 / SBP" else "**** 4242",
                            color = PremiumMockupColors.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(bank.displayName, color = PremiumMockupColors.Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                    MockupStatusChip(if (visualMethodSelection.size > 1) "Carte + SBP" else if (ReceivingMethodType.PHONE_TRANSFER in visualMethodSelection) "SBP" else "Carte")
                }
            }
        }
        OutlinedTextField(
            value = identifierInput,
            onValueChange = { identifierInput = it },
            label = { Text("Identifiant utilisé seulement pour l'enregistrement") },
            placeholder = { Text(if (methodType == ReceivingMethodType.CARD_TRANSFER) "Numéro de carte" else "Numéro de téléphone") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(18.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = PremiumMockupColors.White,
                unfocusedTextColor = PremiumMockupColors.White,
                focusedContainerColor = PremiumMockupColors.Field,
                unfocusedContainerColor = PremiumMockupColors.Field,
                focusedBorderColor = PremiumMockupColors.Green,
                unfocusedBorderColor = PremiumMockupColors.Border,
                focusedLabelColor = PremiumMockupColors.Green,
                unfocusedLabelColor = PremiumMockupColors.Muted,
                focusedPlaceholderColor = PremiumMockupColors.MutedDark,
                unfocusedPlaceholderColor = PremiumMockupColors.MutedDark,
                cursorColor = PremiumMockupColors.Green
            )
        )
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton(
            "Enregistrer et continuer",
            enabled = identifierInput.isNotBlank(),
            onClick = {
                onSave(
                    MerchantReceivingRouteDraft(
                        bankProfileId = selectedBankId,
                        type = methodType,
                        rawIdentifierInput = identifierInput
                    ).toSubmission()
                )
            }
        )
    }
}

private fun toggleVisualReceivingMethod(
    current: Set<ReceivingMethodType>,
    method: ReceivingMethodType
): Set<ReceivingMethodType> {
    val next = if (method in current) current - method else current + method
    return next.ifEmpty { setOf(method) }
}

@Composable
private fun ReceivingMethodStep(
    selectedBankDisplayName: String,
    selectedMethod: PremiumReceivingMethodDraft?,
    onSelect: (PremiumReceivingMethodDraft) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    OnboardingShell("Moyen de réception", PremiumOnboardingStep.RECEIVING_METHOD, onBack) {
        PremiumTitle(
            "Ajoutez votre moyen de réception",
            "Vos clients utiliseront ces informations pour vous payer sur $selectedBankDisplayName."
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
            sbp = true,
            onClick = { onSelect(PremiumReceivingMethodDraft.PHONE_TRANSFER) }
        )
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton("Ajouter", onClick = onNext)
    }
}

private fun PremiumOnboardingSessionState.selectedBankDisplayName(
    bankTargetsState: PremiumScreenState<PremiumBanksUiState>
): String {
    val selectedBankId = selectedBankIds.firstOrNull()
    val detectedName = (bankTargetsState as? PremiumScreenState.Content)
        ?.value
        ?.items
        ?.firstOrNull { it.bankProfileId == selectedBankId }
        ?.displayName
    return detectedName ?: "la banque choisie"
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
            "Recevez une mise à jour après votre validation manuelle."
        )
        MockupGlassCard(Modifier.fillMaxWidth(), radius = 30.dp, border = PremiumMockupColors.Cyan.copy(alpha = 0.38f)) {
            Row(
                Modifier.padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                MockupIconTile(Icons.Default.Link, size = 58.dp, tint = PremiumMockupColors.Cyan)
                Column(Modifier.weight(1f)) {
                    Text(
                        if (skipped) "Configuration reportée" else "Prêt à ajouter",
                        color = PremiumMockupColors.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        if (skipped) {
                            "Vous entrez dans l’app maintenant. Le webhook pourra être ajouté plus tard."
                        } else {
                            "Ajoutez un endpoint pour lancer ensuite un test webhook backend."
                        },
                        color = PremiumMockupColors.Muted,
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
        PremiumTitle(
            "Test webhook",
            "Le test est déclenché par le backend vers votre endpoint. Android ne traite aucune notification réelle et ne confirme aucun paiement."
        )
        ResultCard(state)
        Spacer(Modifier.height(16.dp))
        MockupInfoBanner(
            title = "Point de test",
            body = state.configurationChecklistLabels().joinToString(" - "),
            icon = Icons.Default.Link,
            tone = PremiumMockupColors.Blue
        )
        Spacer(Modifier.height(16.dp))
        ChecklistCard(state)
        Spacer(Modifier.height(18.dp))
        if (state.connectedSiteConfigured) {
            PremiumOutlineButton("Relancer le test", onClick = onRunTest)
            Spacer(Modifier.height(12.dp))
            PremiumPrimaryButton(if (state.configurationTestRan) "Terminer" else "Lancer le test webhook", onClick = onRunTest)
        } else {
            PremiumPrimaryButton("Ajouter maintenant", onClick = onConnectSite)
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
    MockupScreenBackground(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = PremiumMockupSpacing.ScreenHorizontal)
                .padding(top = 20.dp, bottom = 24.dp),
        ) {
            MockupTopBar(title = title, stepLabel = "${PremiumOnboardingStep.requiredSequence.indexOf(step) + 1}/6", onBack = onBack)
            ProgressLine(step)
            Spacer(Modifier.height(24.dp))
            content()
        }
    }
}

@Composable
private fun ProgressLine(step: PremiumOnboardingStep) {
    val activeIndex = PremiumOnboardingStep.requiredSequence.indexOf(step)
    MockupStepIndicator(currentStep = activeIndex + 1, totalSteps = PremiumOnboardingStep.requiredSequence.size)
}

@Composable
private fun BenefitRow(icon: ImageVector, title: String, body: String) {
    MockupGlassCard(Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap {}, radius = 28.dp) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            MockupIconTile(icon, size = 54.dp, tint = PremiumMockupColors.Green)
            Column {
                Text(title, color = PremiumMockupColors.White, fontWeight = FontWeight.Black, fontSize = 17.sp)
                Text(body, color = PremiumMockupColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 20.sp)
            }
        }
    }
}

@Composable
private fun NoticeRow(icon: ImageVector, text: String) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 22.dp, border = PremiumMockupColors.BorderSoft) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            Icon(icon, null, tint = PremiumMockupColors.Cyan, modifier = Modifier.size(28.dp))
            Text(text, color = PremiumMockupColors.Muted, fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold)
        }
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
            PremiumMockupColors.Cyan
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
                if (detected > 0) PremiumMockupColors.Green else PremiumMockupColors.MutedDark
            )
        }
        is PremiumScreenState.Empty -> Quadruple(
            "Aucune banque détectée",
            "Vous pourrez configurer une banque compatible plus tard.",
            Icons.Default.AccountBalance,
            PremiumMockupColors.MutedDark
        )
        is PremiumScreenState.ActionRequired -> Quadruple(
            bankTargetsState.title,
            bankTargetsState.message,
            Icons.Default.AccountBalance,
            PremiumMockupColors.Warning
        )
        is PremiumScreenState.Error,
        is PremiumScreenState.Offline -> Quadruple(
            "Recherche à relancer",
            "Réessayez dans quelques instants.",
            Icons.Default.AccountBalance,
            PremiumMockupColors.Warning
        )
    }

    MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp, border = toneColor.copy(alpha = 0.48f)) {
        Row(
            Modifier.padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            MockupIconTile(icon, tint = toneColor, size = 54.dp)
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
                Text(body, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 19.sp, fontWeight = FontWeight.SemiBold)
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
    MockupGlassCard(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp)
            .premiumTap {
                if (selectable) onToggleBank(bank.bankProfileId)
            },
        radius = 28.dp,
        border = if (selected) PremiumMockupColors.Green else PremiumMockupColors.BorderSoft
    ) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            PremiumBankLogo(bankProfileId = bank.bankProfileId, displayName = bank.displayName, size = 50.dp)
            Column(Modifier.weight(1f).padding(start = 16.dp)) {
                Text(bank.displayName, color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
                Text(label, color = if (detected) PremiumMockupColors.Green else PremiumMockupColors.MutedDark, fontSize = 12.sp, fontWeight = FontWeight.Black)
            }
            Box(
                Modifier
                    .size(30.dp)
                    .background(if (selected) PremiumMockupColors.Green else Color.Transparent, RoundedCornerShape(11.dp))
                    .border(2.dp, if (selected) PremiumMockupColors.Green else PremiumMockupColors.Border, RoundedCornerShape(11.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (selected) Icon(Icons.Default.VerifiedUser, null, tint = PremiumMockupColors.Black, modifier = Modifier.size(18.dp))
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
    sbp: Boolean = false,
    onClick: () -> Unit
) {
    MockupGlassCard(
        Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap(onClick),
        radius = 30.dp,
        border = if (selected) PremiumMockupColors.Green else PremiumMockupColors.BorderSoft
    ) {
        Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            if (sbp) {
                Box(
                    Modifier
                        .size(62.dp)
                        .background(PremiumMockupColors.Green.copy(alpha = 0.14f), RoundedCornerShape(20.dp))
                        .border(1.dp, PremiumMockupColors.Green.copy(alpha = 0.24f), RoundedCornerShape(20.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        painter = painterResource(R.drawable.ic_payment_sbp_placeholder),
                        contentDescription = "SBP",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.size(42.dp)
                    )
                }
            } else {
                MockupIconTile(icon, size = 62.dp)
            }
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumMockupColors.White, fontSize = 18.sp, fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumMockupColors.Muted, fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold)
            }
            Box(
                Modifier
                    .size(30.dp)
                    .background(if (selected) PremiumMockupColors.Green else Color.Transparent, CircleShape)
                    .border(2.dp, if (selected) PremiumMockupColors.Green else PremiumMockupColors.Border, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (selected) Icon(Icons.Default.CheckCircle, null, tint = PremiumMockupColors.Black, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun ChecklistCard(state: PremiumOnboardingSessionState) {
    MockupGlassCard(Modifier.fillMaxWidth(), radius = 24.dp) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            state.configurationChecklistLabels().forEach { label ->
                MockupBulletLine(label)
            }
        }
    }
}

@Composable
private fun ResultCard(state: PremiumOnboardingSessionState) {
    val ready = state.configurationTestReady
    MockupGlassCard(
        Modifier.fillMaxWidth(),
        radius = 28.dp,
        border = if (ready) PremiumMockupColors.Green else PremiumMockupColors.Warning
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            MockupIconTile(Icons.Default.CheckCircle, size = 72.dp, tint = if (ready) PremiumMockupColors.Green else PremiumMockupColors.Warning)
            Text(
                if (ready) "Webhook prêt" else "Action nécessaire",
                color = if (ready) PremiumMockupColors.Green else PremiumMockupColors.Warning,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Text(
                if (ready) {
                    "Le backend peut envoyer un événement de test vers votre endpoint configuré."
                } else {
                    state.configurationResultLabels().filterNot { it == "Réussi" }.joinToString(" · ")
                },
                color = PremiumMockupColors.Muted,
                fontSize = 14.sp,
                lineHeight = 21.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center
            )
            MockupStatusChip(if (ready) "Reussi" else "En attente", tone = if (ready) PremiumMockupColors.Green else PremiumMockupColors.Warning)
        }
    }
}

@Composable
private fun OnboardingInfoCard(title: String, body: String) {
    MockupGlassCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), radius = 24.dp) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = PremiumMockupColors.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
            Text(body, color = PremiumMockupColors.Muted, fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
