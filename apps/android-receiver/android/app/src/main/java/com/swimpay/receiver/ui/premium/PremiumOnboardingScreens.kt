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
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumLandingScreen(onStart: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFFF6FAFC))
            .statusBarsPadding()
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        SwimPayLogo(markSize = 56.dp)
        Spacer(Modifier.height(18.dp))
        Text("MERCHANT TERMINAL", color = PremiumColors.SoftText, fontWeight = FontWeight.Black, fontSize = 14.sp, letterSpacing = 6.sp)
        Text(
            "Transformez votre téléphone Android en un\nterminal de paiement sécurisé avec\ndétection de signaux bancaires.",
            color = PremiumColors.Muted,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            lineHeight = 25.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 10.dp)
        )
        Spacer(Modifier.height(54.dp))
        PremiumCard(
            Modifier
                .fillMaxWidth()
                .height(240.dp)
                .premiumTap(onStart),
            radius = 26.dp
        ) {
            Column(
                Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                PremiumIconTile(Icons.Default.ShoppingCart, 78.dp)
                Spacer(Modifier.height(28.dp))
                Text("Terminal Vendeur", color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("CONFIGURATION INITIALE", color = PremiumColors.SoftText, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            }
        }
    }
}

@Composable
fun PremiumOnboardingFlow(
    notificationAccessEnabled: Boolean,
    openNotificationSettings: () -> Unit,
    onDone: () -> Unit
) {
    var step by remember { mutableIntStateOf(0) }
    when (step) {
        0 -> WelcomeStep { step = 1 }
        1 -> AuthorizationStep(
            notificationAccessEnabled = notificationAccessEnabled,
            openNotificationSettings = openNotificationSettings,
            onBack = { step = 0 },
            onNext = { step = 2 }
        )
        2 -> BankSourcesStep(onBack = { step = 1 }, onNext = { step = 3 })
        3 -> BusinessProfileStep(onBack = { step = 2 }, onNext = { step = 4 })
        4 -> PolicyEngineStep(onBack = { step = 3 }, onNext = { step = 5 })
        else -> ReadyToScanStep(onDone)
    }
}

@Composable
private fun WelcomeStep(onNext: () -> Unit) {
    Box(Modifier.fillMaxSize().background(PremiumColors.Background).statusBarsPadding()) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 28.dp)
                .padding(bottom = 92.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SwimPayLogo(markSize = 52.dp)
            Spacer(Modifier.height(24.dp))
            Text(
                buildAnnotatedString {
                    append("Vendez en toute ")
                    withStyle(SpanStyle(color = PremiumColors.Cyan)) { append("Fluidité") }
                    append(".")
                },
                color = PremiumColors.Ink,
                fontSize = 28.sp,
                lineHeight = 32.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Text(
                "Transformez votre téléphone Android en un terminal\nintelligent détectant les notifications bancaires\ninstantanément.",
                color = PremiumColors.Muted,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 22.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 12.dp)
            )
            Spacer(Modifier.height(24.dp))
            HeroFeatureRow(Icons.Default.Bolt, "Détection Sync Engine", "LECTURE INTELLIGENTE DES SIGNAUX\nBANCAIRES.", PremiumColors.Cyan)
            HeroFeatureRow(Icons.Default.Security, "Zero Trust Privacy", "VOS DONNÉES SÉCURISÉES LOCALEMENT SUR\nL'APPAREIL.", Color(0xFF10B981))
            HeroFeatureRow(Icons.Default.Sync, "Webhook Instant", "ACTIVEZ VOS SERVICES DÈS QUE LE PAIEMENT\nEST REÇU.", PremiumColors.Warning)
        }
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(PremiumColors.Background)
                .padding(horizontal = 20.dp, vertical = 18.dp)
        ) {
            PremiumPrimaryButton("INITIER LA CONFIGURATION", onClick = onNext)
        }
    }
}

@Composable
private fun AuthorizationStep(
    notificationAccessEnabled: Boolean,
    openNotificationSettings: () -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    OnboardingShell("AUTORISATION", 1, onBack) {
        PremiumTitle(
            "Écoute Active",
            "Pour détecter les paiements reçus, SwimPay a besoin\nd'accéder aux notifications système."
        )
        PremiumCard(Modifier.fillMaxWidth().height(260.dp), radius = 34.dp) {
            Box(Modifier.fillMaxSize().padding(28.dp)) {
                Surface(
                    modifier = Modifier.size(58.dp).shadow(18.dp, RoundedCornerShape(14.dp)),
                    color = Color(0xFFC9F0FF),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Fingerprint, null, tint = PremiumColors.Cyan, modifier = Modifier.padding(12.dp))
                }
                Box(Modifier.align(Alignment.BottomStart).size(10.dp).background(PremiumColors.Danger, CircleShape))
            }
        }
        SectionLabel("GUIDE ANDROID", Modifier.padding(top = 30.dp))
        listOf(
            "Menu Système > Confidentialité",
            "Accès spécial > Notifications",
            "Cochez l'application SwimPay"
        ).forEachIndexed { index, text -> NumberedStep(index + 1, text) }
        NumberedStep(4, "Cherchez SwimPay dans la liste Android")
        NumberedStep(5, "Activez l'interrupteur SwimPay")
        NumberedStep(6, "Revenez dans SwimPay")
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton(
            if (notificationAccessEnabled) "CONTINUER L'ONBOARDING" else "ACTIVER L'ACCÈS",
            onClick = if (notificationAccessEnabled) onNext else openNotificationSettings
        )
        Spacer(Modifier.height(12.dp))
        PremiumOutlineButton("OUVRIR LES REGLAGES NOTIFICATIONS", onClick = openNotificationSettings)
    }
}

@Composable
private fun BankSourcesStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("BANQUES", 2, onBack) {
        PremiumTitle(
            "Sources de signaux",
            "Activez la détection sur vos comptes bancaires professionnels\nou personnels."
        )
        listOf("Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Gazprombank").forEachIndexed { index, bank ->
            BankSourceRow(bank, selected = index == 0)
        }
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton("CONFIRMER LES SOURCES", onClick = onNext)
    }
}

@Composable
private fun BusinessProfileStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("BUSINESS", 3, onBack) {
        PremiumTitle("Profil Marchand", "Définissez la structure légale de votre activité pour adapter les\nwebhooks.")
        ChoiceRow(Icons.Default.Person, "Freelance", "Utilisation via téléphone ou virement nominatif\nclassique.", selected = true)
        ChoiceRow(Icons.Default.AccountBalance, "Entreprise", "Multi-utilisateurs, accès API complet et terminal\nillimité.", selected = false)
        PremiumCard(Modifier.fillMaxWidth(), radius = 28.dp, color = PremiumColors.Navy) {
            Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Box(Modifier.size(48.dp).background(Color.White.copy(alpha = 0.08f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AccountBalance, null, tint = PremiumColors.Cyan)
                }
                Column {
                    Text("INFO", color = PremiumColors.Cyan, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                    Text("Le mode Freelance supporte l'envoi d'identifiants\ndynamiques par QR Code.", color = Color.White.copy(alpha = 0.72f), fontSize = 12.sp, lineHeight = 18.sp)
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        PremiumPrimaryButton("VALIDER LE PROFIL", onClick = onNext)
    }
}

@Composable
private fun PolicyEngineStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("SIGNATURE", 4, onBack) {
        PremiumTitle("Validation sûre", "Gardez une validation manuelle claire avant les vrais\npaiements.")
        SectionLabel("VÉRIFICATION DE DONNÉE")
        PremiumCard(Modifier.fillMaxWidth(), radius = 22.dp) {
            Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Référence Obligatoire", color = PremiumColors.Ink, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                Box(Modifier.size(54.dp, 30.dp).background(PremiumColors.Navy, CircleShape).padding(5.dp), contentAlignment = Alignment.CenterEnd) {
                    Box(Modifier.size(18.dp).background(PremiumColors.Cyan, CircleShape))
                }
            }
        }
        SectionLabel("MODE DE VALIDATION", Modifier.padding(top = 28.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f)) { PremiumPrimaryButton("REVUE HUMAINE", onClick = {}) }
            Surface(Modifier.weight(1f).height(56.dp), color = PremiumColors.Surface, shape = RoundedCornerShape(20.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text("OPTION FUTURE", color = Color(0xFFD2DAE6), fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
                }
            }
        }
        Spacer(Modifier.height(40.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(Modifier.size(144.dp).background(PremiumColors.Surface, RoundedCornerShape(44.dp)).shadow(16.dp, RoundedCornerShape(44.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Bolt, null, tint = PremiumColors.Teal, modifier = Modifier.size(70.dp))
            }
        }
        Spacer(Modifier.height(42.dp))
        PremiumPrimaryButton("FINALISER LE LINK", onClick = onNext)
    }
}

@Composable
private fun ReadyToScanStep(onDone: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(PremiumColors.Background).statusBarsPadding().padding(horizontal = 54.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        PremiumIconTile(Icons.Default.CheckCircle, 128.dp, tint = PremiumColors.ElectricBlue)
        Spacer(Modifier.height(42.dp))
        ItalicReadyTitle()
        Text(
            "Votre terminal marchand est synchronisé.\nLes paiements seront détectés en temps\nréel et transmis à votre webhook.",
            color = PremiumColors.Muted,
            fontSize = 16.sp,
            lineHeight = 25.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 22.dp, bottom = 70.dp)
        )
        PremiumBlueButton("ENTRER DANS LE DASHBOARD  →", onClick = onDone)
        Spacer(Modifier.height(36.dp))
        Text("•  TERMINAL SYNCHRONISÉ  •", color = Color(0xFFB6C9DD), fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 4.sp)
    }
}

@Composable
private fun OnboardingShell(title: String, step: Int, onBack: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxSize().background(PremiumColors.Background).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().height(86.dp).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            CircleAction(Icons.Default.ArrowBack, onClick = onBack)
            Text(title, modifier = Modifier.weight(1f), textAlign = TextAlign.Center, color = PremiumColors.SoftText, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 5.sp)
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
            Spacer(Modifier.height(48.dp))
            content()
        }
    }
}

@Composable
private fun ProgressLine(step: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(7.dp), modifier = Modifier.fillMaxWidth()) {
        repeat(5) { index ->
            Box(Modifier.weight(1f).height(4.dp).background(if (index < step) PremiumColors.Navy else Color.White.copy(alpha = 0.55f), CircleShape))
        }
    }
}

@Composable
private fun HeroFeatureRow(icon: ImageVector, title: String, body: String, tint: Color) {
    PremiumCard(Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap {}, radius = 28.dp) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Box(Modifier.size(52.dp).background(Color(0xFFF8FAFC), RoundedCornerShape(18.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = tint)
            }
            Column {
                Text(title, color = PremiumColors.Ink, fontWeight = FontWeight.Black, fontSize = 14.sp)
                Text(body, color = PremiumColors.SoftText, fontWeight = FontWeight.Black, fontSize = 11.sp, lineHeight = 17.sp, letterSpacing = 1.5.sp)
            }
        }
    }
}

@Composable
private fun NumberedStep(number: Int, text: String) {
    Row(Modifier.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(number.toString(), color = PremiumColors.SoftText, fontWeight = FontWeight.Black, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
        Text(text, color = PremiumColors.Ink, fontSize = 14.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun BankSourceRow(name: String, selected: Boolean) {
    PremiumCard(
        Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap {},
        radius = 30.dp,
        color = if (selected) Color(0xFFF7FDFF) else PremiumColors.Surface
    ) {
        Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(50.dp).background(PremiumColors.Surface, RoundedCornerShape(17.dp)).border(1.dp, PremiumColors.Line, RoundedCornerShape(17.dp)), contentAlignment = Alignment.Center) {
                Text(name.take(2), color = PremiumColors.SoftText, fontWeight = FontWeight.Black)
            }
            Column(Modifier.weight(1f).padding(start = 18.dp)) {
                Text(name, color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Black)
                Text("COMPATIBLE WEBHOOK", color = PremiumColors.SoftText, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            }
            Box(
                Modifier
                    .size(30.dp)
                    .background(if (selected) PremiumColors.Blue else Color.Transparent, RoundedCornerShape(11.dp))
                    .border(2.dp, if (selected) PremiumColors.Blue else PremiumColors.Line, RoundedCornerShape(11.dp)),
                contentAlignment = Alignment.Center
            ) {
                if (selected) Icon(Icons.Default.VerifiedUser, null, tint = PremiumColors.Surface, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun ChoiceRow(icon: ImageVector, title: String, body: String, selected: Boolean) {
    PremiumCard(
        Modifier.fillMaxWidth().padding(bottom = 16.dp).premiumTap {},
        radius = 30.dp,
        color = if (selected) Color(0xFFF8FEFD) else PremiumColors.Surface
    ) {
        Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Box(Modifier.size(64.dp).background(PremiumColors.Surface, RoundedCornerShape(20.dp)).border(1.dp, PremiumColors.Line, RoundedCornerShape(20.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = if (selected) PremiumColors.Teal else PremiumColors.SoftText, modifier = Modifier.size(30.dp))
            }
            Column {
                Text(title, color = if (selected) PremiumColors.Ink else PremiumColors.SoftText, fontSize = 18.sp, fontWeight = FontWeight.Black)
                Text(body, color = PremiumColors.Muted, fontSize = 11.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
