package com.swimpay.receiver.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Help
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.Water
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Ink = Color(0xFF071126)
private val Deep = Color(0xFF0F172A)
private val Blue = Color(0xFF155BD8)
private val Cyan = Color(0xFF16ADEC)
private val Teal = Color(0xFF0EA5A4)
private val Mint = Color(0xFFEAF6FA)
private val ScreenBg = Color(0xFFF2F7FA)
private val Line = Color(0xFFE2E8F0)
private val Muted = Color(0xFF59708D)
private val SoftText = Color(0xFF94A3B8)
private val Success = Color(0xFF059669)
private val Warning = Color(0xFFF59E0B)
private val Danger = Color(0xFFE5484D)

@Composable
fun ExactMerchantApp() {
    var route by remember { mutableStateOf("landing") }
    var tab by remember { mutableIntStateOf(0) }

    when (route) {
        "landing" -> ExactLandingScreen { route = "onboarding" }
        "onboarding" -> ExactOnboardingFlow(onDone = {
            tab = 0
            route = "main"
        })
        "main" -> ExactMainShell(
            selectedTab = tab,
            onTab = { tab = it },
            content = {
                when (tab) {
                    0 -> ExactDashboardScreen()
                    1 -> ExactReviewsScreen()
                    2 -> ExactOrdersScreen()
                    else -> ExactSettingsScreen()
                }
            }
        )
    }
}

@Composable
private fun ExactLandingScreen(onStart: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFFF6FAFC))
            .padding(horizontal = 20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        SwimLogo(markSize = 56.dp)
        Spacer(Modifier.height(18.dp))
        Text("MERCHANT TERMINAL", color = SoftText, fontWeight = FontWeight.Black, fontSize = 14.sp, letterSpacing = 6.sp)
        Text(
            "Transformez votre téléphone Android en un\nterminal de paiement sécurisé avec\ndétection de signaux bancaires.",
            color = Muted,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            lineHeight = 25.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 10.dp)
        )
        Spacer(Modifier.height(54.dp))
        SoftCard(
            Modifier
                .fillMaxWidth()
                .height(240.dp)
                .clickable(onClick = onStart),
            radius = 26
        ) {
            Column(
                Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                DarkIconTile(Icons.Default.ShoppingCart, 78)
                Spacer(Modifier.height(28.dp))
                Text("Terminal Vendeur", color = Ink, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Text("CONFIGURATION INITIALE", color = SoftText, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            }
        }
    }
}

@Composable
private fun ExactOnboardingFlow(onDone: () -> Unit) {
    var step by remember { mutableIntStateOf(0) }
    when (step) {
        0 -> WelcomeStep { step = 1 }
        1 -> AuthStep(onBack = { step = 0 }, onNext = { step = 2 })
        2 -> BankStep(onBack = { step = 1 }, onNext = { step = 3 })
        3 -> BusinessStep(onBack = { step = 2 }, onNext = { step = 4 })
        4 -> PolicyStep(onBack = { step = 3 }, onNext = { step = 5 })
        else -> ReadyStep(onDone)
    }
}

@Composable
private fun WelcomeStep(onNext: () -> Unit) {
    Box(Modifier.fillMaxSize().background(ScreenBg)) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 28.dp)
                .padding(bottom = 92.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            SwimLogo(markSize = 52.dp)
            Spacer(Modifier.height(24.dp))
            Text(
                buildAnnotatedString {
                    append("Vendez en toute ")
                    withStyle(SpanStyle(color = Cyan)) { append("Fluidité") }
                    append(".")
                },
                color = Ink,
                fontSize = 28.sp,
                lineHeight = 32.sp,
                fontWeight = FontWeight.Black,
                textAlign = TextAlign.Center
            )
            Text(
                "Transformez votre téléphone Android en un terminal\nintelligent détectant les notifications bancaires\ninstantanément.",
                color = Muted,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 22.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 12.dp)
            )
            Spacer(Modifier.height(24.dp))
            FeatureRow(Icons.Default.Bolt, "Détection Sync Engine", "LECTURE INTELLIGENTE DES SIGNAUX\nBANCAIRES.", Cyan)
            FeatureRow(Icons.Default.Security, "Zero Trust Privacy", "VOS DONNÉES SÉCURISÉES LOCALEMENT SUR\nL'APPAREIL.", Color(0xFF10B981))
            FeatureRow(Icons.Default.Sync, "Webhook Instant", "ACTIVEZ VOS SERVICES DÈS QUE LE PAIEMENT\nEST REÇU.", Warning)
        }
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(ScreenBg)
                .padding(horizontal = 20.dp, vertical = 18.dp)
        ) {
            PrimaryPill("INITIER LA CONFIGURATION", onClick = onNext)
        }
    }
}

@Composable
private fun AuthStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("AUTORISATION", 1, onBack) {
        TitleBlock(
            "Écoute Active",
            "Pour valider les paiements, SwimPay nécessite\nl'accès au service d'écoute des notifications système."
        )
        SoftCard(Modifier.fillMaxWidth().height(260.dp), radius = 24) {
            Box(Modifier.fillMaxSize().padding(28.dp)) {
                Surface(
                    modifier = Modifier.size(58.dp).shadow(18.dp, RoundedCornerShape(14.dp)),
                    color = Color(0xFFC9F0FF),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Fingerprint, null, tint = Cyan, modifier = Modifier.padding(12.dp))
                }
                Box(Modifier.align(Alignment.BottomStart).size(10.dp).background(Danger, CircleShape))
            }
        }
        SectionLabel("GUIDE ANDROID")
        listOf(
            "Menu Système > Confidentialité",
            "Accès spécial > Notifications",
            "Cochez l'application SwimPay"
        ).forEachIndexed { index, text -> NumberedStep(index + 1, text) }
        Spacer(Modifier.height(18.dp))
        PrimaryPill("CONTINUER L'ONBOARDING", onClick = onNext)
    }
}

@Composable
private fun BankStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("BANQUES", 2, onBack) {
        TitleBlock(
            "Sources de signaux",
            "Activez la détection sur vos comptes bancaires professionnels\nou personnels."
        )
        listOf("Sberbank", "T-Bank", "VTB", "Alfa-Bank", "Gazprombank").forEach {
            BankSourceRow(it)
        }
        Spacer(Modifier.height(18.dp))
        PrimaryPill("CONFIRMER LES SOURCES", onClick = onNext)
    }
}

@Composable
private fun BusinessStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("BUSINESS", 3, onBack) {
        TitleBlock("Profil Marchand", "Définissez la structure légale de votre activité pour adapter les\nwebhooks.")
        ChoiceRow(Icons.Default.Person, "Freelance", "Utilisation via téléphone ou virement nominatif\nclassique.", selected = true)
        ChoiceRow(Icons.Default.AccountBalance, "Entreprise", "Multi-utilisateurs, accès API complet et terminal\nillimité.", selected = false)
        SoftCard(Modifier.fillMaxWidth(), radius = 28, color = Deep) {
            Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Box(Modifier.size(48.dp).background(Color.White.copy(alpha = 0.08f), RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.AccountBalance, null, tint = Cyan)
                }
                Column {
                    Text("INFO", color = Cyan, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
                    Text("Le mode Freelance supporte l'envoi d'identifiants\ndynamiques par QR Code.", color = Color.White.copy(alpha = 0.72f), fontSize = 12.sp, lineHeight = 18.sp)
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        PrimaryPill("VALIDER LE PROFIL", onClick = onNext)
    }
}

@Composable
private fun PolicyStep(onBack: () -> Unit, onNext: () -> Unit) {
    OnboardingShell("SIGNATURE", 4, onBack) {
        TitleBlock("Policy Engine", "Configurez l'intelligence de détection pour éviter les faux\npositifs et fraudes.")
        SectionLabel("VÉRIFICATION DE DONNÉE")
        SoftCard(Modifier.fillMaxWidth(), radius = 22) {
            Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Référence Obligatoire", color = Ink, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                Box(Modifier.size(54.dp, 30.dp).background(Deep, CircleShape).padding(5.dp), contentAlignment = Alignment.CenterEnd) {
                    Box(Modifier.size(18.dp).background(Cyan, CircleShape))
                }
            }
        }
        SectionLabel("ALGORITHME DE CONFIANCE")
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f)) { PrimaryPill("HUMAIN (HIGH)", height = 58, onClick = {}) }
            Surface(Modifier.weight(1f).height(58.dp), color = Color.White, shape = RoundedCornerShape(22.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text("AI (EXPERT)", color = Color(0xFFD2DAE6), fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
                }
            }
        }
        Spacer(Modifier.height(18.dp))
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Box(Modifier.size(144.dp).background(Color.White, RoundedCornerShape(44.dp)).shadow(16.dp, RoundedCornerShape(44.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Bolt, null, tint = Teal, modifier = Modifier.size(70.dp))
            }
        }
        Spacer(Modifier.height(18.dp))
        PrimaryPill("FINALISER LE LINK", onClick = onNext)
    }
}

@Composable
private fun ReadyStep(onDone: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(ScreenBg).padding(horizontal = 54.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        DarkIconTile(Icons.Default.CheckCircle, 128)
        Spacer(Modifier.height(42.dp))
        Text(
            buildAnnotatedString {
                append("Prêt à ")
                withStyle(SpanStyle(color = Cyan, fontStyle = FontStyle.Italic)) { append("Scanner") }
                append(".")
            },
            color = Ink,
            fontSize = 30.sp,
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center
        )
        Text(
            "Votre terminal marchand est synchronisé.\nLes paiements seront détectés en temps\nréel et transmis à votre webhook.",
            color = Muted,
            fontSize = 16.sp,
            lineHeight = 25.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 22.dp, bottom = 70.dp)
        )
        Button(
            onClick = onDone,
            modifier = Modifier.fillMaxWidth().height(58.dp),
            shape = RoundedCornerShape(18.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Cyan)
        ) {
            Text("ENTRER DANS LE DASHBOARD", fontWeight = FontWeight.Black, letterSpacing = 1.5.sp)
            Icon(Icons.Default.ArrowForward, null, modifier = Modifier.padding(start = 8.dp))
        }
        Spacer(Modifier.height(36.dp))
        Text("•  TERMINAL SYNCHRONISÉ  •", color = Color(0xFFB6C9DD), fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 4.sp)
    }
}

@Composable
private fun ExactMainShell(selectedTab: Int, onTab: (Int) -> Unit, content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize().background(Color.White)) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            TopChrome()
            Box(Modifier.weight(1f)) { content() }
            BottomTabs(selectedTab, onTab)
        }
    }
}

@Composable
private fun ExactDashboardScreen() {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 24.dp),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        item {
            Surface(
                Modifier.fillMaxWidth().height(205.dp),
                color = Blue,
                shape = RoundedCornerShape(topStart = 80.dp, topEnd = 30.dp, bottomStart = 30.dp, bottomEnd = 80.dp)
            ) {
                Column(Modifier.padding(28.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        ChipText("↗ Activité Mensuelle", Color.White, Blue)
                        Text("LIVE FEED", color = Color.White.copy(alpha = 0.72f), fontWeight = FontWeight.Black, fontSize = 13.sp)
                    }
                    Spacer(Modifier.height(28.dp))
                    Text("1 482 000 ₽", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Black)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("+12.5%", color = Color(0xFF48FF9B), fontWeight = FontWeight.Black, fontSize = 13.sp)
                        Text("  vs mois précédent", color = Color.White.copy(alpha = 0.72f), fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                    Spacer(Modifier.height(20.dp))
                    Box(Modifier.fillMaxWidth().height(6.dp).background(Color.White.copy(alpha = 0.22f), CircleShape)) {
                        Box(Modifier.fillMaxWidth(0.68f).fillMaxHeight().background(Color.White.copy(alpha = 0.82f), CircleShape))
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                StatBubble("7", "À VÉRIFIER", "+2 new", Icons.Default.Visibility, Modifier.weight(1f))
                StatBubble("24", "VALIDÉS", "+84%", Icons.Default.CheckCircle, Modifier.weight(1f))
            }
        }
        item {
            SoftCard(Modifier.fillMaxWidth().height(260.dp), radius = 70, color = Color.White) {
                Column(Modifier.padding(30.dp)) {
                    Text("TENDANCES DES PAIEMENTS", color = Ink, fontWeight = FontWeight.Black, fontSize = 15.sp)
                    Canvas(Modifier.fillMaxWidth().height(170.dp).padding(top = 24.dp)) {
                        repeat(5) {
                            val y = size.height * (it + 1) / 6f
                            drawLine(Line, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.5f)
                        }
                        val points = listOf(
                            Offset(0f, size.height * .70f),
                            Offset(size.width * .18f, size.height * .80f),
                            Offset(size.width * .36f, size.height * .42f),
                            Offset(size.width * .55f, size.height * .24f),
                            Offset(size.width * .72f, size.height * .60f),
                            Offset(size.width * .86f, size.height * .10f),
                            Offset(size.width, size.height * .30f),
                        )
                        val path = Path().apply {
                            moveTo(points.first().x, points.first().y)
                            points.drop(1).forEach { lineTo(it.x, it.y) }
                        }
                        drawPath(path, color = Blue, style = Stroke(width = 7f, cap = StrokeCap.Round))
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("PAIEMENTS RÉCENTS", color = Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                Text("Voir tout", color = Blue, fontWeight = FontWeight.Black, fontSize = 13.sp)
            }
        }
        items(listOf("58,41 ₽" to "Sberbank • Il y a 2 min", "129,00 ₽" to "T-Bank • Il y a 8 min", "45,00 ₽" to "Alfa-Bank • Il y a 12 min")) {
            RecentPaymentRow(it.first, it.second)
        }
        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun ExactReviewsScreen() {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 24.dp),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Signalements Reçus", color = Ink, fontSize = 23.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black)
            Text("Confirmez les paiements détectés par votre terminal Android.", color = Ink, fontSize = 13.sp, lineHeight = 20.sp)
            Spacer(Modifier.height(28.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterLabel(Icons.Default.GridView, "Tout", false, Modifier.weight(1f))
                FilterLabel(Icons.Default.Sync, "Vérification", true, Modifier.weight(1.35f))
                FilterLabel(Icons.Default.CheckCircle, "Validés", false, Modifier.weight(1f))
            }
        }
        items(listOf(
            ExactReviewItem("58,41 ₽", "Sberbank", "À vérifier", "Il y a 2 min", false),
            ExactReviewItem("129,00 ₽", "T-Bank", "À vérifier", "Il y a 8 min", false),
            ExactReviewItem("45,00 ₽", "Alfa-Bank", "Validé", "Il y a 12 min", true),
        )) { item -> ExactReviewCard(item) }
    }
}

@Composable
private fun ExactOrdersScreen() {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 24.dp),
        contentPadding = PaddingValues(bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Text("Historique des transactions e-commerce synchronisées.", color = Ink, fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black)
            Spacer(Modifier.height(24.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = "",
                    onValueChange = {},
                    placeholder = { Text("ID, Client, Montant...") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(18.dp)
                )
                CircleIconButton(Icons.Default.FilterList)
            }
        }
        items(listOf("ord_123" to "58,41 ₽" to "CONFIRMÉ", "ord_124" to "129,00 ₽" to "EN ATTENTE")) { row ->
            OrderCard(row.first.first, row.first.second, row.second)
        }
    }
}

@Composable
private fun ExactSettingsScreen() {
    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 24.dp),
        contentPadding = PaddingValues(bottom = 22.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            Spacer(Modifier.height(22.dp))
            Box(Modifier.size(108.dp).background(Blue, CircleShape), contentAlignment = Alignment.Center) {
                Text("JD", color = Color.White, fontSize = 31.sp, fontWeight = FontWeight.Black)
            }
            Text("Terminal Marchand", color = Ink, fontSize = 24.sp, lineHeight = 28.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(top = 12.dp))
            Text("UID: #7114-4466-8301", color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(24.dp))
        }
        item { SettingsGroup("INFRASTRUCTURE", listOf(Icons.Default.PhoneAndroid to "Paramètres Android", Icons.Default.CreditCard to "Canaux de Paiement", Icons.Default.AccountBalance to "Comptes Bancaires", Icons.Default.Link to "Développeur & API")) }
        item { SettingsGroup("SUPPORT & SÉCURITÉ", listOf(Icons.Default.Security to "Centre de Sécurité", Icons.Default.Help to "Aide & Assistance", Icons.Default.Description to "Conditions Générales")) }
        item {
            Text("↪  SE DÉCONNECTER", color = Color(0xFFE38A83), fontSize = 12.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp, modifier = Modifier.padding(vertical = 28.dp))
        }
    }
}

@Composable
private fun TopChrome() {
    Row(
        Modifier.fillMaxWidth().height(58.dp).padding(horizontal = 22.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Box(Modifier.size(26.dp).background(Deep, RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Water, null, tint = Cyan, modifier = Modifier.size(16.dp))
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(Modifier.size(34.dp), shape = CircleShape, color = Color.White, shadowElevation = 2.dp) {
                Icon(Icons.Default.DarkMode, null, tint = Color(0xFF777777), modifier = Modifier.padding(8.dp))
            }
            Box {
                Box(Modifier.size(42.dp).background(Blue, CircleShape), contentAlignment = Alignment.Center) {
                    Text("JD", color = Color.White, fontWeight = FontWeight.Black)
                }
                Box(Modifier.align(Alignment.TopEnd).size(9.dp).background(Success, CircleShape))
            }
        }
    }
}

@Composable
private fun BottomTabs(selected: Int, onTab: (Int) -> Unit) {
    val tabs = listOf(
        Triple(Icons.Default.Home, "HOME", "Accueil"),
        Triple(Icons.Default.ReceiptLong, "REVUES", "Revue"),
        Triple(Icons.Default.ShoppingCart, "VENTES", "Ventes"),
        Triple(Icons.Default.MoreHoriz, "MENU", "Plus"),
    )
    Surface(
        Modifier.fillMaxWidth().navigationBarsPadding().height(88.dp),
        color = Color.White,
        shadowElevation = 8.dp,
        shape = RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)
    ) {
        Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
            tabs.forEachIndexed { index, item ->
                Column(Modifier.clickable { onTab(index) }.padding(8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(item.first, null, tint = if (selected == index) Blue else Color(0xFF444444))
                    Text(item.second, color = if (selected == index) Blue else Color(0xFF444444), fontSize = 12.sp, fontWeight = FontWeight.Black)
                }
            }
        }
    }
}

@Composable
private fun OnboardingShell(title: String, step: Int, onBack: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxSize().background(ScreenBg)) {
        Row(Modifier.fillMaxWidth().height(110.dp).padding(horizontal = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            CircleIconButton(Icons.Default.ArrowBack, onClick = onBack)
            Text(title, modifier = Modifier.weight(1f), textAlign = TextAlign.Center, color = SoftText, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 5.sp)
            Box(Modifier.size(34.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                Text("MP", color = Cyan, fontSize = 9.sp, fontWeight = FontWeight.Black)
            }
        }
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            content = {
            ProgressLine(step)
            Spacer(Modifier.height(48.dp))
            content()
        })
    }
}

@Composable
private fun ProgressLine(step: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(7.dp), modifier = Modifier.fillMaxWidth()) {
        repeat(5) { i ->
            Box(Modifier.weight(1f).height(4.dp).background(if (i < step) Deep else Color.White.copy(alpha = 0.55f), CircleShape))
        }
    }
}

@Composable
private fun TitleBlock(title: String, body: String) {
    Text(title, color = Ink, fontSize = 28.sp, lineHeight = 32.sp, fontWeight = FontWeight.Black)
    Text(body, color = Muted, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, lineHeight = 24.sp, modifier = Modifier.padding(top = 14.dp, bottom = 34.dp))
}

@Composable
private fun SwimLogo(markSize: androidx.compose.ui.unit.Dp) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.size(markSize).background(Deep, RoundedCornerShape((markSize.value / 4).dp)), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Water, null, tint = Cyan, modifier = Modifier.size(markSize * 0.5f))
        }
        Spacer(Modifier.height(12.dp))
        Text(
            buildAnnotatedString {
                append("Swim")
                withStyle(SpanStyle(color = Cyan)) { append("Pay") }
            },
            color = Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black
        )
    }
}

@Composable
private fun SoftCard(modifier: Modifier = Modifier, radius: Int = 28, color: Color = Color.White, content: @Composable () -> Unit) {
    Surface(modifier.shadow(20.dp, RoundedCornerShape(radius.dp)), color = color, shape = RoundedCornerShape(radius.dp), content = content)
}

@Composable
private fun DarkIconTile(icon: ImageVector, size: Int) {
    Box(Modifier.size(size.dp).background(Deep, RoundedCornerShape((size / 3).dp)), contentAlignment = Alignment.Center) {
        Icon(icon, null, tint = Cyan, modifier = Modifier.size((size * 0.52).dp))
    }
}

@Composable
private fun FeatureRow(icon: ImageVector, title: String, body: String, tint: Color) {
    SoftCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), radius = 22) {
        Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Box(Modifier.size(50.dp).background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = tint)
            }
            Column {
                Text(title, color = Ink, fontWeight = FontWeight.Black, fontSize = 14.sp)
                Text(body, color = SoftText, fontWeight = FontWeight.Black, fontSize = 11.sp, lineHeight = 17.sp, letterSpacing = 1.5.sp)
            }
        }
    }
}

@Composable
private fun PrimaryPill(text: String, height: Int = 56, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().height(height.dp),
        shape = RoundedCornerShape(20.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Deep, contentColor = Color.White)
    ) {
        Text(text.uppercase(), fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.5.sp)
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(text, color = SoftText, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 3.sp, modifier = Modifier.padding(bottom = 14.dp))
}

@Composable
private fun NumberedStep(number: Int, text: String) {
    Row(Modifier.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(number.toString(), color = SoftText, fontWeight = FontWeight.Black, modifier = Modifier.width(56.dp), textAlign = TextAlign.Center)
        Text(text, color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Black)
    }
}

@Composable
private fun BankSourceRow(name: String) {
    SoftCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), radius = 22) {
        Row(Modifier.padding(22.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(48.dp).background(Color.White, RoundedCornerShape(14.dp)).border(1.dp, Line, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Text(name.take(2), color = SoftText, fontWeight = FontWeight.Black)
            }
            Column(Modifier.weight(1f).padding(start = 18.dp)) {
                Text(name, color = Ink, fontSize = 16.sp, fontWeight = FontWeight.Black)
                Text("COMPATIBLE WEBHOOK", color = SoftText, fontSize = 10.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp)
            }
            Box(Modifier.size(28.dp).border(2.dp, Line, RoundedCornerShape(10.dp)))
        }
    }
}

@Composable
private fun ChoiceRow(icon: ImageVector, title: String, body: String, selected: Boolean) {
    SoftCard(Modifier.fillMaxWidth().padding(bottom = 16.dp), radius = 22) {
        Row(Modifier.padding(24.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Box(Modifier.size(64.dp).background(Color.White, RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = if (selected) Teal else SoftText, modifier = Modifier.size(30.dp))
            }
            Column {
                Text(title, color = if (selected) Ink else SoftText, fontSize = 18.sp, fontWeight = FontWeight.Black)
                Text(body, color = Muted, fontSize = 11.sp, lineHeight = 17.sp, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun CircleIconButton(icon: ImageVector, onClick: () -> Unit = {}) {
    Surface(Modifier.size(42.dp).clickable(onClick = onClick), shape = CircleShape, color = Color.White, shadowElevation = 3.dp) {
        Icon(icon, null, tint = Deep, modifier = Modifier.padding(10.dp))
    }
}

@Composable
private fun ChipText(text: String, bg: Color, fg: Color) {
    Surface(color = bg.copy(alpha = 0.92f), shape = CircleShape) {
        Text(text, color = fg, fontSize = 12.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
    }
}

@Composable
private fun StatBubble(value: String, label: String, trend: String, icon: ImageVector, modifier: Modifier) {
    Surface(modifier.height(150.dp).border(1.dp, Line, RoundedCornerShape(80.dp)), color = Color.White, shape = RoundedCornerShape(80.dp)) {
        Column(Modifier.padding(26.dp), verticalArrangement = Arrangement.Center) {
            Icon(icon, null, tint = Blue)
            Text(value, color = Ink, fontSize = 34.sp, fontWeight = FontWeight.Black)
            Row {
                Text(label, color = Ink, fontSize = 11.sp, fontWeight = FontWeight.Black)
                Text(trend, color = Success, fontSize = 11.sp, fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
private fun RecentPaymentRow(amount: String, detail: String) {
    Surface(Modifier.fillMaxWidth().height(96.dp).border(1.dp, Line, RoundedCornerShape(48.dp)), color = Color.White, shape = RoundedCornerShape(48.dp)) {
        Row(Modifier.padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(50.dp).background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)))
            Column(Modifier.weight(1f).padding(start = 28.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(amount, color = Ink, fontSize = 19.sp, fontWeight = FontWeight.Black)
                Text(detail, color = Ink, fontSize = 12.sp)
            }
            Icon(Icons.Default.KeyboardArrowRight, null, tint = Color(0xFFB7B7B7))
        }
    }
}

private data class ExactReviewItem(val amount: String, val bank: String, val status: String, val time: String, val valid: Boolean)

@Composable
private fun ExactReviewCard(item: ExactReviewItem) {
    Surface(Modifier.fillMaxWidth().height(132.dp).border(1.dp, Line, RoundedCornerShape(48.dp)), color = if (item.valid) Color(0xFFF3F7FC) else Color.White, shape = RoundedCornerShape(48.dp)) {
        Column(Modifier.padding(horizontal = 18.dp, vertical = 16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(46.dp).background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp)).border(1.dp, Line, RoundedCornerShape(16.dp)))
                Column(Modifier.weight(1f).padding(start = 18.dp)) {
                    Text(item.amount, color = Ink, fontSize = 21.sp, lineHeight = 25.sp, fontWeight = FontWeight.Black)
                    Text(item.bank, color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                StatusBadge(item.status, item.valid)
            }
            Spacer(Modifier.height(12.dp))
            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                ChipText(item.time, Color.White, Ink)
                Spacer(Modifier.width(10.dp))
                Text(if (item.valid) "Signaux cohérents" else "Validation requise", color = Ink, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun StatusBadge(text: String, valid: Boolean) {
    Surface(color = if (valid) Color(0xFFE5F7EB) else Color(0xFFFFF2DD), shape = CircleShape) {
        Text(text, color = if (valid) Success else Color(0xFFB45309), fontSize = 11.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
    }
}

@Composable
private fun FilterLabel(icon: ImageVector, text: String, selected: Boolean, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            Icon(icon, null, tint = if (selected) Blue else Color(0xFF555555), modifier = Modifier.size(17.dp))
            Text(text, color = if (selected) Blue else Color(0xFF444444), fontSize = 12.sp, fontWeight = FontWeight.Black, maxLines = 1)
        }
        if (selected) Box(Modifier.padding(top = 20.dp).fillMaxWidth().height(2.dp).background(Blue))
    }
}

@Composable
private fun OrderCard(id: String, amount: String, status: String) {
    Surface(Modifier.fillMaxWidth().height(112.dp).border(1.dp, Line, RoundedCornerShape(58.dp)), color = Color.White, shape = RoundedCornerShape(58.dp)) {
        Row(Modifier.padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(54.dp).background(Color(0xFFF3F6FF), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.ShoppingCart, null, tint = Blue)
            }
            Column(Modifier.weight(1f).padding(start = 14.dp)) {
                Text(id, color = Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                Text("Client #12 · Aujourd'hui, 14:20", color = Ink, fontSize = 12.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(amount, color = Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                StatusBadge(status, status == "CONFIRMÉ")
            }
        }
    }
}

@Composable
private fun SettingsGroup(title: String, rows: List<Pair<ImageVector, String>>) {
    Column(Modifier.fillMaxWidth()) {
        Text(title, color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp, modifier = Modifier.padding(start = 8.dp, bottom = 14.dp))
        Surface(Modifier.fillMaxWidth().border(1.dp, Line, RoundedCornerShape(58.dp)), color = Color.White, shape = RoundedCornerShape(58.dp)) {
            Column {
                rows.forEachIndexed { index, row ->
                    Row(Modifier.fillMaxWidth().height(84.dp).padding(horizontal = 24.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(46.dp).background(Color(0xFFF3F4F6), RoundedCornerShape(15.dp)), contentAlignment = Alignment.Center) {
                            Icon(row.first, null, tint = Color(0xFF555555))
                        }
                        Text(row.second, modifier = Modifier.weight(1f).padding(start = 28.dp), color = Ink, fontWeight = FontWeight.Black, fontSize = 16.sp)
                        Icon(Icons.Default.KeyboardArrowRight, null, tint = Color(0xFFD0D0D0))
                    }
                    if (index < rows.lastIndex) Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
                }
            }
        }
    }
}
