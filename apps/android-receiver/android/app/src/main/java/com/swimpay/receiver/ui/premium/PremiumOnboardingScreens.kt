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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.PhoneAndroid
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swimpay.receiver.MerchantReceivingMethodSubmission
import com.swimpay.receiver.R
import com.swimpay.receiver.ReceivingMethodType
import com.swimpay.receiver.MerchantReceivingMethodDraft as MerchantReceivingRouteDraft
import kotlinx.coroutines.delay

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding « noir vivant » (port prototype, Compose P2).
// Restyle visuel UNIQUEMENT : la séquence receiving-first, les callbacks, l'état,
// la copie honnête (T3) et le catalogue unifié (T2) sont préservés à l'identique.
// Langage : fond nuit (NoirColors.bg) + tint radial violet (NoirColors.multi),
// barre de progression violette, cartes posées par luminosité (NoirColors.surface)
// avec filets (hairlines), aucune ombre portée, DM Sans (NoirTextStyle) partout.
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun PremiumLandingScreen(onStart: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        NoirOnboardingBackground(Modifier.fillMaxSize())
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .padding(horizontal = NoirSpacing.Section),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(Modifier.height(8.dp))
            SwimPayLauncherBadge(size = 52.dp)
            WalletStackHero(Modifier.weight(1f))
            Text(
                "Terminal marchand".uppercase(),
                style = NoirTextStyle.SectionLabel,
                color = NoirColors.multi
            )
            Spacer(Modifier.height(12.dp))
            Text(
                "Configurez SwimPay sur ce téléphone pour suivre les paiements reçus.",
                style = NoirTextStyle.Label.copy(fontSize = 15.sp),
                color = NoirColors.ink2,
                lineHeight = 23.sp,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(28.dp))
            NoirAccentButton("Commencer", onClick = onStart)
            Spacer(Modifier.height(28.dp))
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
        NoirOnboardingBackground(Modifier.fillMaxSize())
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = NoirSpacing.Section, vertical = 24.dp)
                .padding(bottom = 96.dp)
        ) {
            WalletStackHero(
                Modifier
                    .fillMaxWidth()
                    .height(220.dp)
            )
            Spacer(Modifier.height(20.dp))
            Text(
                language.ui("Recevez vos paiements plus facilement"),
                style = NoirTextStyle.H1,
                color = NoirColors.ink1,
                lineHeight = 34.sp
            )
            Text(
                language.ui("SwimPay détecte les paiements reçus, vous aide à les confirmer et prévient votre site ou votre application."),
                style = NoirTextStyle.Label.copy(fontSize = 14.5.sp),
                color = NoirColors.ink2,
                lineHeight = 23.sp,
                modifier = Modifier.padding(top = 14.dp)
            )
            Spacer(Modifier.height(24.dp))
            BenefitRow(Icons.Default.Bolt, language.ui("Détection rapide"), language.ui("Repérez plus vite les paiements reçus."))
            BenefitRow(Icons.Default.CheckCircle, language.ui("Confirmation simple"), language.ui("Confirmez ou rejetez en quelques secondes."))
            BenefitRow(Icons.Default.Link, language.ui("Business connecté"), language.ui("Votre site ou application reçoit la mise à jour."))
        }
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(NoirColors.bg.copy(alpha = 0.94f))
                .navigationBarsPadding()
                .padding(horizontal = NoirSpacing.Section, vertical = 18.dp)
        ) {
            NoirAccentButton(language.ui("Commencer"), onClick = onNext)
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
        // Bouclier (prototype .shield) : tuile violette, ou vert succès une fois l'accès accordé.
        Box(
            Modifier
                .size(64.dp)
                .background(
                    if (notificationAccessEnabled) NoirColors.success else NoirColors.multi,
                    RoundedCornerShape(NoirRadius.Card)
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                if (notificationAccessEnabled) Icons.Default.CheckCircle else Icons.Default.VerifiedUser,
                null,
                tint = Color(0xFF0E0820),
                modifier = Modifier.size(32.dp)
            )
        }
        Spacer(Modifier.height(20.dp))
        Text(
            language.ui("Connectez votre téléphone"),
            style = NoirTextStyle.H1,
            color = NoirColors.ink1,
            lineHeight = 34.sp
        )
        Spacer(Modifier.height(12.dp))
        Text(
            if (notificationAccessEnabled) {
                language.ui("L'accès notifications est activé.")
            } else {
                language.ui("SwimPay a besoin d'accéder aux notifications de cet appareil pour fonctionner.")
            },
            style = NoirTextStyle.Label.copy(fontSize = 14.5.sp),
            color = NoirColors.ink2,
            lineHeight = 22.sp
        )
        Spacer(Modifier.height(20.dp))
        NoirCard {
            Column {
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
            style = NoirTextStyle.Label.copy(fontSize = 13.sp),
            color = NoirColors.ink2,
            lineHeight = 21.sp
        )
        Spacer(Modifier.height(24.dp))
        // status string retained for the source-copy contract / disabled affordance
        if (!notificationAccessEnabled) {
            Text(
                language.ui("Accès nécessaire"),
                style = NoirTextStyle.Micro,
                color = NoirColors.ink3,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.4.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        NoirAccentButton(
            if (notificationAccessEnabled) language.ui("Continuer") else language.ui("Activer l'accès"),
            onClick = if (notificationAccessEnabled) onNext else openNotificationSettings
        )
        Spacer(Modifier.height(10.dp))
        Text(
            language.ui("Plus tard"),
            style = NoirTextStyle.Label,
            color = NoirColors.ink2,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .premiumTap(onNext)
                .padding(vertical = 10.dp)
        )
    }
}

@Composable
private fun ReassuranceRow(text: String) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            Modifier
                .size(24.dp)
                .background(NoirColors.success.copy(alpha = 0.16f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Check, null, tint = NoirColors.success, modifier = Modifier.size(14.dp))
        }
        Text(
            text,
            style = NoirTextStyle.Label.copy(fontSize = 13.sp),
            color = NoirColors.ink1,
            lineHeight = 19.sp,
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
            .background(NoirColors.hair)
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
        NoirTitle(
            language.ui("Ajoutez votre moyen de réception"),
            language.ui("Vos clients utiliseront ces informations pour vous payer sur {bank}.").replace("{bank}", selectedBankDisplayName)
        )
        Spacer(Modifier.height(20.dp))
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
        Spacer(Modifier.height(8.dp))
        CompactReceivingBankSelector(
            selectedBankId = selectedBankId,
            bankOptions = bankOptions,
            language = language,
            onBankSelected = { selectedBankId = it }
        )
        Spacer(Modifier.height(14.dp))
        OutlinedTextField(
            value = identifierInput,
            onValueChange = { identifierInput = it },
            label = { Text(language.ui("Identifiant utilisé seulement pour l'enregistrement")) },
            placeholder = { Text(if (usesCardInput) language.ui("Numéro de carte") else language.ui("Numéro de téléphone")) },
            leadingIcon = {
                if (usesCardInput) {
                    Icon(Icons.Default.CreditCard, null, tint = NoirColors.multi)
                } else {
                    Icon(Icons.Default.PhoneAndroid, null, tint = NoirColors.multi)
                }
            },
            colors = noirTextFieldColors(),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(NoirRadius.Tile)
        )
        // Masked-number hint (prototype .hint) : seule la version masquée est affichée.
        Row(
            Modifier.fillMaxWidth().padding(top = 9.dp),
            horizontalArrangement = Arrangement.spacedBy(7.dp)
        ) {
            Icon(Icons.Default.VerifiedUser, null, tint = NoirColors.ink2, modifier = Modifier.size(15.dp).padding(top = 1.dp))
            Text(
                language.ui("Seule la version masquée sera affichée dans l'app. Le numéro complet n'est jamais conservé en clair."),
                style = NoirTextStyle.Micro,
                color = NoirColors.ink3,
                lineHeight = 17.sp
            )
        }
        Spacer(Modifier.height(20.dp))
        NoirAccentButton(
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
        NoirTitle(
            language.ui("Connectez votre site ou application"),
            language.ui("Recevez une mise à jour après votre validation manuelle.")
        )
        Spacer(Modifier.height(20.dp))
        NoirCard {
            Row(
                Modifier.padding(20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    Modifier
                        .size(56.dp)
                        .background(NoirColors.multi.copy(alpha = 0.16f), RoundedCornerShape(NoirRadius.Tile)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Link, null, tint = NoirColors.multi, modifier = Modifier.size(28.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        if (skipped) language.ui("Configuration reportée") else language.ui("Prêt à ajouter"),
                        style = NoirTextStyle.Label.copy(fontSize = 16.sp),
                        color = NoirColors.ink1,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        if (skipped) {
                            language.ui("Vous entrez dans l'app maintenant. Le webhook pourra être ajouté plus tard.")
                        } else {
                            language.ui("Ajoutez un endpoint pour lancer ensuite un test webhook backend.")
                        },
                        style = NoirTextStyle.Label.copy(fontSize = 13.sp),
                        color = NoirColors.ink2,
                        lineHeight = 19.sp,
                        modifier = Modifier.padding(top = 3.dp)
                    )
                }
            }
        }
        Spacer(Modifier.height(22.dp))
        NoirAccentButton(language.ui("Ajouter maintenant"), onClick = onConnectNow)
        Spacer(Modifier.height(10.dp))
        NoirGhostButton(language.ui("Configurer plus tard"), onClick = onSkip)
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
        // Activation / réussite (prototype .readywrap / .bigcheck) une fois le webhook prêt.
        if (state.configurationTestReady) {
            ReadyBadge()
            Spacer(Modifier.height(20.dp))
        }
        NoirTitle(
            language.ui("Test webhook"),
            language.ui("Le test est déclenché par le backend vers votre endpoint. Android ne traite aucune notification réelle et ne confirme aucun paiement.")
        )
        Spacer(Modifier.height(20.dp))
        ChecklistCard(state, language)
        Spacer(Modifier.height(16.dp))
        ResultCard(state, language)
        Spacer(Modifier.height(20.dp))
        if (state.connectedSiteConfigured) {
            NoirAccentButton(language.ui("Lancer le test webhook"), onClick = onRunTest)
        } else {
            NoirAccentButton(language.ui("Ajouter maintenant"), onClick = onConnectSite)
        }
    }
}

@Composable
private fun ReadyBadge() {
    Box(
        Modifier.fillMaxWidth().padding(top = 4.dp),
        contentAlignment = Alignment.Center
    ) {
        Box(
            Modifier
                .size(88.dp)
                .background(NoirColors.success.copy(alpha = 0.16f), CircleShape)
                .border(1.5.dp, NoirColors.success.copy(alpha = 0.30f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Check, null, tint = NoirColors.success, modifier = Modifier.size(42.dp))
        }
    }
}

// ── Noir-vivant onboarding chrome ────────────────────────────────────────────

@Composable
private fun OnboardingShell(
    title: String,
    step: PremiumOnboardingStep,
    onBack: () -> Unit,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(Modifier.fillMaxSize()) {
        NoirOnboardingBackground(Modifier.fillMaxSize())
        Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding()) {
            // Top chrome (prototype .ohead) : back rond, barre de progression violette, « Passer ».
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = NoirSpacing.Section)
                    .padding(top = 10.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                NoirBackAction(onClick = onBack)
                ProgressLine(step, Modifier.weight(1f))
                Text(
                    title,
                    style = NoirTextStyle.Micro.copy(fontSize = 13.sp),
                    color = NoirColors.ink2,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = NoirSpacing.Section)
                    .padding(top = 18.dp, bottom = 28.dp),
            ) {
                content()
            }
        }
    }
}

@Composable
private fun NoirBackAction(onClick: () -> Unit) {
    Box(
        Modifier
            .size(38.dp)
            .clip(CircleShape)
            .border(1.dp, NoirColors.hair2, CircleShape)
            .premiumTap(onClick),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            Icons.AutoMirrored.Filled.ArrowBack,
            null,
            tint = NoirColors.ink1,
            modifier = Modifier.size(18.dp)
        )
    }
}

@Composable
private fun ProgressLine(step: PremiumOnboardingStep, modifier: Modifier = Modifier) {
    val sequence = PremiumOnboardingStep.requiredSequence
    val activeIndex = sequence.indexOf(step)
    val fraction = ((activeIndex + 1).toFloat() / sequence.size).coerceIn(0f, 1f)
    Box(
        modifier
            .height(5.dp)
            .clip(CircleShape)
            .background(NoirColors.hair2)
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction)
                .height(5.dp)
                .clip(CircleShape)
                .background(NoirColors.multi)
        )
    }
}

@Composable
private fun BenefitRow(icon: ImageVector, title: String, body: String) {
    NoirCard(Modifier.fillMaxWidth().padding(bottom = 12.dp)) {
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 80.dp)
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(
                Modifier
                    .size(44.dp)
                    .background(NoirColors.activeSurface, RoundedCornerShape(NoirRadius.Tile)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, null, tint = NoirColors.multi, modifier = Modifier.size(22.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, style = NoirTextStyle.Label.copy(fontSize = 14.5.sp), color = NoirColors.ink1, fontWeight = FontWeight.SemiBold)
                Text(body, style = NoirTextStyle.Micro, color = NoirColors.ink2, lineHeight = 17.sp, modifier = Modifier.padding(top = 2.dp))
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
    val shape = RoundedCornerShape(NoirRadius.Card)
    // Tuile de méthode (prototype .ctile/.mtile) : surface posée, bord violet + voile
    // de sélection quand active. Le jeton PremiumToneColors.Selected reste la source de
    // vérité de l'état « sélectionné » (contrat de revue visuelle) : ici son background
    // (teinté accent à faible opacité) sert de voile au-dessus de la surface nuit.
    val selectedTint = PremiumToneColors.Selected.background
    Row(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 12.dp)
            .clip(shape)
            .background(NoirColors.surface)
            .then(if (selected) Modifier.background(selectedTint).background(NoirColors.multi.copy(alpha = 0.08f)) else Modifier)
            .border(
                1.5.dp,
                if (selected) NoirColors.multi else NoirColors.hair,
                shape
            )
            .premiumTap(onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            Modifier.size(44.dp).background(NoirColors.activeSurface, RoundedCornerShape(NoirRadius.Tile)),
            contentAlignment = Alignment.Center
        ) {
            if (title.contains("SBP", ignoreCase = true) || title.contains("téléphone", ignoreCase = true)) {
                Image(
                    painter = painterResource(R.drawable.ic_payment_sbp_mark),
                    contentDescription = "SBP",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Icon(icon, null, tint = NoirColors.multi, modifier = Modifier.size(22.dp))
            }
        }
        Column(Modifier.weight(1f)) {
            Text(title, style = NoirTextStyle.Label.copy(fontSize = 15.sp), color = NoirColors.ink1, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = NoirTextStyle.Micro, color = NoirColors.ink2, lineHeight = 17.sp, modifier = Modifier.padding(top = 2.dp))
        }
        Box(
            Modifier
                .size(24.dp)
                .background(if (selected) NoirColors.multi else Color.Transparent, CircleShape)
                .border(1.5.dp, if (selected) NoirColors.multi else NoirColors.hair2, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            if (selected) Icon(Icons.Default.Check, null, tint = Color(0xFF0E0820), modifier = Modifier.size(14.dp))
        }
    }
}

@Composable
private fun ChecklistCard(state: PremiumOnboardingSessionState, language: PremiumLanguageOption) {
    NoirCard {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            state.configurationChecklistLabels().forEach { label ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        Modifier.size(28.dp).background(NoirColors.success.copy(alpha = 0.16f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Check, null, tint = NoirColors.success, modifier = Modifier.size(16.dp))
                    }
                    Text(language.ui(label), style = NoirTextStyle.Label.copy(fontSize = 14.sp), color = NoirColors.ink1, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun ResultCard(state: PremiumOnboardingSessionState, language: PremiumLanguageOption) {
    val ready = state.configurationTestReady
    val accent = if (ready) NoirColors.success else NoirColors.warn
    Box(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(NoirRadius.Card))
            .background(accent.copy(alpha = 0.10f))
            .border(1.dp, accent.copy(alpha = 0.24f), RoundedCornerShape(NoirRadius.Card))
            .padding(20.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                if (ready) language.ui("Webhook prêt") else language.ui("Action nécessaire"),
                style = NoirTextStyle.Label.copy(fontSize = 14.sp),
                color = accent,
                fontWeight = FontWeight.Bold
            )
            Text(
                if (ready) {
                    language.ui("Le backend peut envoyer un événement de test vers votre endpoint configuré.")
                } else {
                    state.configurationResultLabels().filterNot { it == "Réussi" }.joinToString(" · ") { language.ui(it) }
                },
                style = NoirTextStyle.Micro,
                color = NoirColors.ink2,
                lineHeight = 18.sp
            )
        }
    }
}

// ── Noir-vivant building blocks (locaux à l'onboarding) ──────────────────────

@Composable
private fun NoirOnboardingBackground(modifier: Modifier = Modifier) {
    // Fond nuit (base solide) + tint radial violet posé au-dessus (prototype .device).
    Box(modifier.background(NoirColors.bg)) {
        Box(
            Modifier
                .matchParentSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(NoirColors.multi.copy(alpha = 0.12f), Color.Transparent),
                        radius = 900f
                    )
                )
        )
    }
}

@Composable
private fun NoirCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    Box(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(NoirRadius.Card))
            .background(NoirColors.surface)
            .border(1.dp, NoirColors.hair, RoundedCornerShape(NoirRadius.Card))
    ) {
        content()
    }
}

@Composable
private fun NoirTitle(title: String, body: String) {
    Column {
        Text(title, style = NoirTextStyle.H1, color = NoirColors.ink1, lineHeight = 34.sp)
        Spacer(Modifier.height(12.dp))
        Text(
            body,
            style = NoirTextStyle.Label.copy(fontSize = 14.5.sp),
            color = NoirColors.ink2,
            lineHeight = 22.sp
        )
    }
}

@Composable
private fun NoirAccentButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(NoirRadius.Button)
    Box(
        modifier
            .fillMaxWidth()
            .height(54.dp)
            .clip(shape)
            .background(if (enabled) NoirColors.multi else NoirColors.activeSurface)
            .then(if (enabled) Modifier.premiumTap(onClick) else Modifier),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            style = NoirTextStyle.Label.copy(fontSize = 15.sp),
            color = if (enabled) Color(0xFF0E0820) else NoirColors.ink3,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
private fun NoirGhostButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(NoirRadius.Button)
    Box(
        modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(shape)
            .border(1.dp, NoirColors.hair2, shape)
            .premiumTap(onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            style = NoirTextStyle.Label.copy(fontSize = 14.sp),
            color = NoirColors.ink2,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun noirTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = NoirColors.ink1,
    unfocusedTextColor = NoirColors.ink1,
    focusedContainerColor = NoirColors.surface,
    unfocusedContainerColor = NoirColors.surface,
    cursorColor = NoirColors.multi,
    focusedBorderColor = NoirColors.multi,
    unfocusedBorderColor = NoirColors.hair2,
    focusedLabelColor = NoirColors.multi,
    unfocusedLabelColor = NoirColors.ink2,
    focusedPlaceholderColor = NoirColors.ink3,
    unfocusedPlaceholderColor = NoirColors.ink3
)

/**
 * Wallet-stack hero (prototype .stack) : three fanned receiving cards reusing the
 * WalletSkins gradients, each badged with its wallet accent and a tabular amount.
 */
@Composable
private fun WalletStackHero(modifier: Modifier = Modifier) {
    Box(modifier, contentAlignment = Alignment.Center) {
        WalletStackCard(
            skinId = "wave",
            initial = "W",
            amount = "147 500 F",
            rotation = -13f,
            offsetX = (-30).dp,
            offsetY = 18.dp
        )
        WalletStackCard(
            skinId = "orange",
            initial = "O",
            amount = "83 200 F",
            rotation = -2f,
            offsetX = 0.dp,
            offsetY = (-6).dp
        )
        WalletStackCard(
            skinId = "multi",
            initial = "✦",
            amount = "312 400 F",
            rotation = 11f,
            offsetX = 34.dp,
            offsetY = 16.dp
        )
    }
}

@Composable
private fun WalletStackCard(
    skinId: String,
    initial: String,
    amount: String,
    rotation: Float,
    offsetX: Dp,
    offsetY: Dp
) {
    val skin = WalletSkins.byId(skinId) ?: WalletSkins.all.first()
    val shape = RoundedCornerShape(18.dp)
    Box(
        Modifier
            .offset(offsetX, offsetY)
            .rotate(rotation)
            .size(width = 200.dp, height = 124.dp)
            .clip(shape)
            .background(Brush.linearGradient(listOf(skin.gradientTop, skin.gradientBottom)))
            .border(1.dp, Color.White.copy(alpha = 0.12f), shape)
    ) {
        Box(
            Modifier
                .padding(start = 14.dp, top = 12.dp)
                .size(26.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(skin.accent.copy(alpha = 0.40f)),
            contentAlignment = Alignment.Center
        ) {
            Text(initial, style = NoirTextStyle.Micro, color = Color.White, fontWeight = FontWeight.Bold)
        }
        Text(
            amount,
            style = NoirTextStyle.TxAmount,
            color = NoirColors.ink1,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 14.dp, bottom = 14.dp)
        )
    }
}
