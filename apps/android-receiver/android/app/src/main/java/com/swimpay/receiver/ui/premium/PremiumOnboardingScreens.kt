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
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.fillMaxSize())
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
                "Terminal marchand".uppercase(),
                color = PremiumColors.PageMuted,
                fontWeight = FontWeight.Black,
                fontSize = PremiumType.Micro,
                letterSpacing = 2.sp
            )
            Text(
                "Configurez SwimPay sur ce téléphone pour suivre les paiements reçus.",
                color = PremiumColors.PageMuted,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                lineHeight = 24.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 12.dp)
            )
            Spacer(Modifier.height(44.dp))
            LiquidGlassCard(
                Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .premiumTap(onStart),
                radius = PremiumRadius.CardLarge
            ) {
                Column(
                    Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    SwimPayLauncherBadge(size = 78.dp)
                    Spacer(Modifier.height(26.dp))
                    Text("Configuration initiale", color = PremiumColors.Ink, fontSize = PremiumType.ScreenTitle, fontWeight = FontWeight.Black)
                    Text("Commencer", color = PremiumColors.SoftText, fontSize = PremiumType.Micro, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                }
            }
        }
    }
}

@Composable
fun PremiumOnboardingFlow(
    notificationAccessEnabled: Boolean,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    openNotificationSettings: () -> Unit,
    onDone: (PremiumOnboardingSessionState) -> Unit
) {
    var state by remember {
        mutableStateOf(PremiumOnboardingSessionState(notificationAccessEnabled = notificationAccessEnabled))
    }

    LaunchedEffect(notificationAccessEnabled) {
        state = state.withNotificationAccess(notificationAccessEnabled)
    }
    LaunchedEffect(state.onboardingCompleted, state.skippedConnectedSite) {
        if (state.onboardingCompleted && state.skippedConnectedSite) {
            delay(650)
            onDone(state)
        }
    }

    fun moveNext(nextState: PremiumOnboardingSessionState = state) {
        val moved = nextState.completeAndMoveNext()
        state = moved
        if (moved.onboardingCompleted && !moved.skippedConnectedSite) {
            onDone(moved)
        }
    }

    when (state.currentStep) {
        PremiumOnboardingStep.WELCOME -> WelcomeStep(language) { moveNext() }
        PremiumOnboardingStep.NOTIFICATION_ACCESS -> NotificationAccessStep(
            notificationAccessEnabled = state.notificationAccessEnabled,
            language = language,
            openNotificationSettings = openNotificationSettings,
            onBack = { state = state.goBack() },
            onNext = { if (state.canContinueFrom()) moveNext() }
        )
        PremiumOnboardingStep.RECEIVING_METHOD -> ReceivingMethodDetailsStep(
            selectedMethod = state.receivingMethodDraft,
            initialBankProfileId = state.receivingMethodSubmission?.bankProfileId,
            language = language,
            onSelectChoice = { state = state.withReceivingMethod(it) },
            onSave = {
                val next = state.withReceivingMethod(it)
                moveNext(next)
            },
            onBack = { state = state.goBack() },
        )
        PremiumOnboardingStep.CONNECTED_SITE -> ConnectedSiteStep(
            skipped = state.skippedConnectedSite,
            language = language,
            onBack = { state = state.goBack() },
            onConnectNow = { moveNext(state.connectSite()) },
            onSkip = { moveNext(state.skipConnectedSite()) }
        )
        PremiumOnboardingStep.CONFIGURATION_TEST -> ConfigurationTestStep(
            state = state,
            language = language,
            onBack = { state = state.goBack() },
            onConnectSite = { state = state.goTo(PremiumOnboardingStep.CONNECTED_SITE).connectSite() },
            onRunTest = { moveNext(state.withConfigurationTestRan()) }
        )
    }
}

@Composable
private fun WelcomeStep(language: PremiumLanguageOption, onNext: () -> Unit) {
    Box(Modifier.fillMaxSize().statusBarsPadding()) {
        PremiumPaperBackground(Modifier.fillMaxSize())
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide, vertical = 28.dp)
                .padding(bottom = 92.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SwimPayLauncherBadge(size = 76.dp)
            Spacer(Modifier.height(26.dp))
            Text(
                language.ui("Recevez vos paiements plus facilement"),
                color = PremiumColors.Ink,
                fontSize = PremiumType.Hero,
                lineHeight = 34.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Text(
                language.ui("SwimPay détecte les paiements reçus, vous aide à les confirmer et prévient votre site ou votre application."),
                color = PremiumColors.Muted,
                fontSize = PremiumType.Body,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 23.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 14.dp)
            )
            Spacer(Modifier.height(28.dp))
            BenefitRow(Icons.Default.Bolt, language.ui("Détection rapide"), language.ui("Repérez plus vite les paiements reçus."))
            BenefitRow(Icons.Default.CheckCircle, language.ui("Confirmation simple"), language.ui("Confirmez ou rejetez en quelques secondes."))
            BenefitRow(Icons.Default.Link, language.ui("Business connecté"), language.ui("Votre site ou application reçoit la mise à jour."))
        }
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(PremiumColors.Background.copy(alpha = 0.92f))
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide, vertical = 18.dp)
        ) {
            PremiumPrimaryButton(language.ui("Commencer"), onClick = onNext)
        }
    }
}

@Composable
private fun NotificationAccessStep(
    notificationAccessEnabled: Boolean,
    language: PremiumLanguageOption,
    openNotificationSettings: () -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    OnboardingShell(language.ui("Accès notifications"), PremiumOnboardingStep.NOTIFICATION_ACCESS, onBack) {
        Box(
            Modifier
                .size(52.dp)
                .background(
                    if (notificationAccessEnabled) PremiumColors.Success else PremiumColors.Ink,
                    RoundedCornerShape(PremiumRadius.Tile)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                if (notificationAccessEnabled) Icons.Default.CheckCircle else Icons.Default.VerifiedUser,
                null,
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(Modifier.height(20.dp))
        Text(
            language.ui("Connectez votre téléphone"),
            color = PremiumColors.Ink,
            fontSize = PremiumType.Hero,
            lineHeight = 34.sp,
            fontWeight = FontWeight.Black
        )
        Spacer(Modifier.height(10.dp))
        Text(
            if (notificationAccessEnabled) {
                language.ui("L'accès notifications est activé.")
            } else {
                language.ui("SwimPay a besoin d'accéder aux notifications de cet appareil pour fonctionner.")
            },
            color = PremiumColors.Muted,
            fontSize = PremiumType.Body,
            lineHeight = 22.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(24.dp))
        LiquidGlassCard(Modifier.fillMaxWidth(), radius = PremiumRadius.CardLarge, color = PremiumColors.Surface) {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                ReassuranceRow(language.ui("Uniquement les apps que vous activez"))
                ReassuranceDivider()
                ReassuranceRow(language.ui("Aucun accès aux SMS ni aux autres apps"))
                ReassuranceDivider()
                ReassuranceRow(language.ui("Chiffré — jamais le texte brut conservé"))
            }
        }
        Spacer(Modifier.height(16.dp))
        // Honest framing: SwimPay does not enumerate or monitor installed apps. It reads
        // only the payment notification of the receiving methods the user chooses next.
        Text(
            language.ui("Vous choisirez ensuite vos moyens de réception ; SwimPay lit uniquement la notification de paiement de ces apps. Jamais vos SMS ni vos autres apps. Le texte brut n'est jamais conservé."),
            color = PremiumColors.Muted,
            fontSize = PremiumType.Body,
            lineHeight = 22.sp,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.height(24.dp))
        // status string retained for the source-copy contract / disabled affordance
        if (!notificationAccessEnabled) {
            Text(
                language.ui("Accès nécessaire"),
                color = PremiumColors.SoftText,
                fontSize = PremiumType.Caption,
                fontWeight = FontWeight.Black,
                letterSpacing = 0.4.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        PremiumPrimaryButton(
            if (notificationAccessEnabled) language.ui("Continuer") else language.ui("Activer l'accès"),
            onClick = if (notificationAccessEnabled) onNext else openNotificationSettings
        )
        Spacer(Modifier.height(12.dp))
        Text(
            language.ui("Plus tard"),
            color = PremiumColors.SoftText,
            fontSize = PremiumType.Body,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .premiumTap(onNext)
                .padding(vertical = 6.dp)
        )
    }
}

@Composable
private fun ReassuranceRow(text: String) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Icon(
            Icons.Default.CheckCircle,
            null,
            tint = PremiumColors.Success,
            modifier = Modifier.size(22.dp)
        )
        Text(
            text,
            color = PremiumColors.Ink,
            fontSize = PremiumType.Body,
            lineHeight = 20.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun ReassuranceDivider() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(PremiumColors.Line)
    )
}

@Composable
private fun ReceivingMethodDetailsStep(
    selectedMethod: PremiumReceivingMethodDraft?,
    initialBankProfileId: String?,
    language: PremiumLanguageOption,
    onSelectChoice: (PremiumReceivingMethodDraft) -> Unit,
    onSave: (MerchantReceivingMethodSubmission) -> Unit,
    onBack: () -> Unit
) {
    // Receiving-first, unified catalog: every region (RU + INT + WA mobile money)
    // is selectable here, so a merchant declares what they receive on in one place.
    val catalog = ReceivingCatalog.allMethods
    val bankOptions = catalog.map { entry ->
        PremiumReceivingMethodBankOption(
            bankProfileId = entry.bankProfileId,
            displayName = entry.displayName
        )
    }
    val firstBankId = initialBankProfileId?.takeIf { id -> catalog.any { it.bankProfileId == id } }
        ?: bankOptions.firstOrNull()?.bankProfileId.orEmpty()
    var selectedBankId by remember(firstBankId) { mutableStateOf(firstBankId) }

    val selectedEntry = catalog.firstOrNull { it.bankProfileId == selectedBankId }
    // WA wallets are phone-addressed mobile money; lock their input/type accordingly.
    val isMobileMoney = selectedEntry?.methodType == ReceivingMethodType.MOBILE_MONEY
    val selectedBankDisplayName = selectedEntry?.displayName ?: "la banque choisie"

    // The card / phone toggle only applies to card-rail (RU/INT) banks. Mobile money
    // ignores it and submits MOBILE_MONEY with a phone-style identifier.
    var cardRailMethod by remember(selectedMethod) {
        mutableStateOf(
            when (selectedMethod) {
                PremiumReceivingMethodDraft.PHONE_TRANSFER -> ReceivingMethodType.PHONE_TRANSFER
                else -> ReceivingMethodType.CARD_TRANSFER
            }
        )
    }
    val effectiveMethodType = if (isMobileMoney) ReceivingMethodType.MOBILE_MONEY else cardRailMethod
    val usesCardInput = effectiveMethodType == ReceivingMethodType.CARD_TRANSFER
    var identifierInput by remember { mutableStateOf("") }

    OnboardingShell(language.ui("Moyen de réception"), PremiumOnboardingStep.RECEIVING_METHOD, onBack) {
        PremiumTitle(
            language.ui("Ajoutez votre moyen de réception"),
            language.ui("Vos clients utiliseront ces informations pour vous payer sur {bank}.").replace("{bank}", selectedBankDisplayName)
        )
        if (!isMobileMoney) {
            ReceivingMethodOption(
                icon = Icons.Default.ShoppingCart,
                title = language.ui("Carte bancaire"),
                subtitle = language.ui("Recevez les paiements sur votre carte."),
                selected = cardRailMethod == ReceivingMethodType.CARD_TRANSFER,
                onClick = {
                    cardRailMethod = ReceivingMethodType.CARD_TRANSFER
                    onSelectChoice(PremiumReceivingMethodDraft.CARD_TRANSFER)
                }
            )
            ReceivingMethodOption(
                icon = Icons.Default.PhoneAndroid,
                title = language.ui("Numéro de téléphone"),
                subtitle = language.ui("Pratique pour les virements via SBP."),
                selected = cardRailMethod == ReceivingMethodType.PHONE_TRANSFER,
                onClick = {
                    cardRailMethod = ReceivingMethodType.PHONE_TRANSFER
                    onSelectChoice(PremiumReceivingMethodDraft.PHONE_TRANSFER)
                }
            )
        }
        Spacer(Modifier.height(6.dp))
        CompactReceivingBankSelector(
            selectedBankId = selectedBankId,
            bankOptions = bankOptions,
            language = language,
            onBankSelected = { selectedBankId = it }
        )
        Spacer(Modifier.height(6.dp))
        OutlinedTextField(
            value = identifierInput,
            onValueChange = { identifierInput = it },
            label = { Text(language.ui("Identifiant utilisé seulement pour l'enregistrement")) },
            placeholder = { Text(if (usesCardInput) language.ui("Numéro de carte") else language.ui("Numéro de téléphone")) },
            leadingIcon = {
                if (usesCardInput) {
                    Icon(Icons.Default.CreditCard, null, tint = PremiumColors.Blue)
                } else {
                    Icon(Icons.Default.PhoneAndroid, null, tint = PremiumColors.Blue)
                }
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(18.dp)
        )
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton(
            language.ui("Enregistrer et continuer"),
            enabled = identifierInput.isNotBlank(),
            onClick = {
                onSave(
                    MerchantReceivingRouteDraft(
                        bankProfileId = selectedBankId,
                        type = effectiveMethodType,
                        rawIdentifierInput = identifierInput
                    ).toSubmission()
                )
            }
        )
    }
}

@Composable
private fun ConnectedSiteStep(
    skipped: Boolean,
    language: PremiumLanguageOption,
    onBack: () -> Unit,
    onConnectNow: () -> Unit,
    onSkip: () -> Unit
) {
    OnboardingShell(language.ui("Site ou application"), PremiumOnboardingStep.CONNECTED_SITE, onBack) {
        PremiumTitle(
            language.ui("Connectez votre site ou application"),
            language.ui("Recevez une mise à jour après votre validation manuelle.")
        )
        LiquidGlassCard(Modifier.fillMaxWidth(), radius = PremiumRadius.CardLarge) {
            Row(
                Modifier.padding(24.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                Box(Modifier.size(58.dp).background(PremiumColors.Mint, RoundedCornerShape(PremiumRadius.Tile)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Link, null, tint = PremiumColors.Teal, modifier = Modifier.size(30.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        if (skipped) language.ui("Configuration reportée") else language.ui("Prêt à ajouter"),
                        color = PremiumColors.Ink,
                        fontSize = PremiumType.ScreenTitle,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        if (skipped) {
                            language.ui("Vous entrez dans l'app maintenant. Le webhook pourra être ajouté plus tard.")
                        } else {
                            language.ui("Ajoutez un endpoint pour lancer ensuite un test webhook backend.")
                        },
                        color = PremiumColors.Muted,
                        fontSize = PremiumType.Body,
                        lineHeight = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }
        Spacer(Modifier.height(22.dp))
        PremiumPrimaryButton(language.ui("Ajouter maintenant"), onClick = onConnectNow)
        Spacer(Modifier.height(12.dp))
        PremiumOutlineButton(language.ui("Configurer plus tard"), onClick = onSkip)
    }
}

@Composable
private fun ConfigurationTestStep(
    state: PremiumOnboardingSessionState,
    language: PremiumLanguageOption,
    onBack: () -> Unit,
    onConnectSite: () -> Unit,
    onRunTest: () -> Unit
) {
    OnboardingShell(language.ui("Test"), PremiumOnboardingStep.CONFIGURATION_TEST, onBack) {
        PremiumTitle(
            language.ui("Test webhook"),
            language.ui("Le test est déclenché par le backend vers votre endpoint. Android ne traite aucune notification réelle et ne confirme aucun paiement.")
        )
        ChecklistCard(state, language)
        Spacer(Modifier.height(22.dp))
        ResultCard(state, language)
        Spacer(Modifier.height(18.dp))
        if (state.connectedSiteConfigured) {
            PremiumPrimaryButton(language.ui("Lancer le test webhook"), onClick = onRunTest)
        } else {
            PremiumPrimaryButton(language.ui("Ajouter maintenant"), onClick = onConnectSite)
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
    Box(Modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.fillMaxSize())
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Row(Modifier.fillMaxWidth().height(PremiumComponentSize.TopChromeHeight).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                CircleAction(Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
                Text(
                    title,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    color = PremiumColors.Cyan,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
                SwimPayLauncherBadge(size = 42.dp)
            }
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = PremiumSpacing.ScreenHorizontalWide)
                    .padding(bottom = 28.dp),
            ) {
                ProgressLine(step)
                Spacer(Modifier.height(24.dp))
                content()
            }
        }
    }
}

@Composable
private fun ProgressLine(step: PremiumOnboardingStep) {
    val activeIndex = PremiumOnboardingStep.requiredSequence.indexOf(step)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(PremiumComponentSize.TouchTarget)
            .padding(horizontal = 4.dp)
    ) {
        PremiumOnboardingStep.requiredSequence.forEachIndexed { index, _ ->
            Box(
                Modifier
                    .weight(1f)
                    .height(6.dp)
                    .background(if (index <= activeIndex) PremiumColors.Cyan else PremiumColors.Line, CircleShape)
            )
        }
    }
}

@Composable
private fun BenefitRow(icon: ImageVector, title: String, body: String) {
    LiquidGlassCard(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 14.dp),
        radius = PremiumRadius.CardLarge,
        color = PremiumColors.Surface
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 88.dp)
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                Modifier
                    .size(PremiumComponentSize.TouchTarget)
                    .background(PremiumColors.IconTile, RoundedCornerShape(PremiumRadius.Tile))
                    .border(1.dp, PremiumColors.Cyan.copy(alpha = 0.28f), RoundedCornerShape(PremiumRadius.Tile)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = PremiumColors.Cyan, modifier = Modifier.size(26.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = PremiumType.Body)
                Text(body, color = PremiumColors.Muted, fontWeight = FontWeight.SemiBold, fontSize = PremiumType.Caption, lineHeight = 20.sp)
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
    LiquidGlassCard(
        Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap(onClick),
        radius = PremiumRadius.CardLarge,
        color = if (selected) PremiumToneColors.Selected.background else PremiumColors.Surface
    ) {
        Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Box(Modifier.size(62.dp).background(PremiumColors.IconTile, RoundedCornerShape(PremiumRadius.Tile)), contentAlignment = Alignment.Center) {
                if (title.contains("SBP", ignoreCase = true) || title.contains("téléphone", ignoreCase = true)) {
                    Image(
                        painter = painterResource(R.drawable.ic_payment_sbp_mark),
                        contentDescription = "SBP",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.size(34.dp)
                    )
                } else {
                    Icon(icon, null, tint = PremiumColors.Cyan, modifier = Modifier.size(30.dp))
                }
            }
            Column(Modifier.weight(1f)) {
                Text(title, color = PremiumColors.Ink, fontSize = PremiumType.ScreenTitle, fontWeight = FontWeight.Black)
                Text(subtitle, color = PremiumColors.Muted, fontSize = PremiumType.Body, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold)
            }
            Box(
                Modifier
                    .size(30.dp)
                    .background(if (selected) PremiumToneColors.Selected.foreground else Color.Transparent, CircleShape)
                    .border(2.dp, if (selected) PremiumToneColors.Selected.foreground else PremiumColors.Line, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                if (selected) Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Surface, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun ChecklistCard(state: PremiumOnboardingSessionState, language: PremiumLanguageOption) {
    LiquidGlassCard(Modifier.fillMaxWidth(), radius = PremiumRadius.CardLarge) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            state.configurationChecklistLabels().forEach { label ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Box(Modifier.size(32.dp).background(PremiumColors.Mint, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.CheckCircle, null, tint = PremiumColors.Teal, modifier = Modifier.size(20.dp))
                    }
                    Text(language.ui(label), color = PremiumColors.Ink, fontSize = PremiumType.Body, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun ResultCard(state: PremiumOnboardingSessionState, language: PremiumLanguageOption) {
    val ready = state.configurationTestReady
    LiquidGlassCard(
        Modifier.fillMaxWidth(),
        radius = PremiumRadius.Card,
        color = if (ready) PremiumColors.SurfaceAlt else PremiumColors.Surface
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                if (ready) language.ui("Webhook prêt") else language.ui("Action nécessaire"),
                color = if (ready) PremiumColors.Success else PremiumColors.Warning,
                fontSize = PremiumType.Body,
                fontWeight = FontWeight.Black
            )
            Text(
                if (ready) {
                    language.ui("Le backend peut envoyer un événement de test vers votre endpoint configuré.")
                } else {
                    state.configurationResultLabels().filterNot { it == "Réussi" }.joinToString(" · ") { language.ui(it) }
                },
                color = PremiumColors.Muted,
                fontSize = PremiumType.Caption,
                lineHeight = 21.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun OnboardingInfoCard(title: String, body: String) {
    LiquidGlassCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), radius = PremiumRadius.Card) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = PremiumColors.Ink, fontSize = PremiumType.Body, fontWeight = FontWeight.Black)
            Text(body, color = PremiumColors.Muted, fontSize = PremiumType.Caption, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}
