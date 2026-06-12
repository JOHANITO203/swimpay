@file:OptIn(ExperimentalTextApi::class)

package com.swimpay.receiver.ui.premium

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.swimpay.receiver.R

// Typographie « papier calme » (spec T6) :
//  - Hanken Grotesk (variable) = toute l'UI
//  - Fraunces (variable, serif) = montants héro + titres de marque, chiffres tabulaires
private fun hanken(weight: Int) = Font(
    resId = R.font.hanken_grotesk_variable,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight))
)

private fun fraunces(weight: Int, opticalSize: Float) = Font(
    resId = R.font.fraunces_variable,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(
        FontVariation.weight(weight),
        FontVariation.Setting("opsz", opticalSize)
    )
)

// Typographie « noir vivant » (port prototype, Compose P0) :
//  - DM Sans (variable) = TOUTE l'UI ET les montants (pas de serif dans ce langage)
//  - Caractère mono-famille, chiffres tabulaires (tnum) sur les montants
private fun dmSans(weight: Int) = Font(
    resId = R.font.dm_sans_variable,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight))
)

object PremiumFontFamily {
    val Ui: FontFamily = FontFamily(
        hanken(400), hanken(500), hanken(600), hanken(700), hanken(800), hanken(900)
    )
    val Amount: FontFamily = FontFamily(
        fraunces(400, 40f), fraunces(500, 48f), fraunces(600, 48f), fraunces(700, 56f)
    )
}

// Chiffres « ledger » : tabulaires partout où des montants s'alignent.
const val PremiumTabularNumbers = "tnum"

object PremiumTextStyle {
    // Montant héro (prototype .amount : Fraunces 540, 44px, -0.02em, tnum)
    val HeroAmount = TextStyle(
        fontFamily = PremiumFontFamily.Amount,
        fontWeight = FontWeight.Medium,
        fontSize = 44.sp,
        letterSpacing = (-0.02).em,
        fontFeatureSettings = PremiumTabularNumbers
    )
    val AmountMedium = TextStyle(
        fontFamily = PremiumFontFamily.Amount,
        fontWeight = FontWeight.Medium,
        fontSize = 26.sp,
        letterSpacing = (-0.02).em,
        fontFeatureSettings = PremiumTabularNumbers
    )
    // Lignes de montants dans les listes : grotesk + tnum (prototype .num)
    val TabularBody = TextStyle(
        fontFamily = PremiumFontFamily.Ui,
        fontFeatureSettings = PremiumTabularNumbers
    )
    // Titres éditoriaux (prototype .board-h : Fraunces 560)
    val SerifTitle = TextStyle(
        fontFamily = PremiumFontFamily.Amount,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        letterSpacing = (-0.01).em
    )
    // Légendes de section (prototype .sect h2 : 11.5px, 700, +0.10em, uppercase)
    val SectionLabel = TextStyle(
        fontFamily = PremiumFontFamily.Ui,
        fontWeight = FontWeight.Bold,
        fontSize = 11.5.sp,
        letterSpacing = 0.1.em
    )
}

// ── Noir vivant (port prototype, Compose P0) — additif, ne remplace pas PremiumFontFamily ──
object NoirFontFamily {
    val Sans: FontFamily = FontFamily(
        dmSans(400), dmSans(500), dmSans(600), dmSans(700), dmSans(800)
    )
}

// Styles « noir vivant » : DM Sans partout, montants tabulaires, tracking serré sur les héros.
object NoirTextStyle {
    // Montant héro (prototype .amount : DM Sans 700, 40px, -0.025em, tnum)
    val Amount = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.Bold,
        fontSize = 40.sp,
        letterSpacing = (-0.025).em,
        fontFeatureSettings = PremiumTabularNumbers
    )
    val AmountMedium = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        fontFeatureSettings = PremiumTabularNumbers
    )
    // Montant de ligne (transactions) : DM Sans 600, 17px, tnum
    val TxAmount = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 17.sp,
        fontFeatureSettings = PremiumTabularNumbers
    )
    val Label = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp
    )
    val Micro = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp
    )
    // Légende de section (prototype : 11.5px, 700, +0.12em, uppercase)
    val SectionLabel = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.Bold,
        fontSize = 11.5.sp,
        letterSpacing = 0.12.em
    )
    // Titre d'écran (prototype h1 : DM Sans 700, 30px, -0.03em)
    val H1 = TextStyle(
        fontFamily = NoirFontFamily.Sans,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        letterSpacing = (-0.03).em
    )
}

val PremiumMaterialTypography: Typography = Typography().run {
    copy(
        displayLarge = displayLarge.copy(fontFamily = PremiumFontFamily.Amount, fontFeatureSettings = PremiumTabularNumbers),
        displayMedium = displayMedium.copy(fontFamily = PremiumFontFamily.Amount, fontFeatureSettings = PremiumTabularNumbers),
        displaySmall = displaySmall.copy(fontFamily = PremiumFontFamily.Amount, fontFeatureSettings = PremiumTabularNumbers),
        headlineLarge = headlineLarge.copy(fontFamily = PremiumFontFamily.Ui),
        headlineMedium = headlineMedium.copy(fontFamily = PremiumFontFamily.Ui),
        headlineSmall = headlineSmall.copy(fontFamily = PremiumFontFamily.Ui),
        titleLarge = titleLarge.copy(fontFamily = PremiumFontFamily.Ui),
        titleMedium = titleMedium.copy(fontFamily = PremiumFontFamily.Ui),
        titleSmall = titleSmall.copy(fontFamily = PremiumFontFamily.Ui),
        bodyLarge = bodyLarge.copy(fontFamily = PremiumFontFamily.Ui),
        bodyMedium = bodyMedium.copy(fontFamily = PremiumFontFamily.Ui),
        bodySmall = bodySmall.copy(fontFamily = PremiumFontFamily.Ui),
        labelLarge = labelLarge.copy(fontFamily = PremiumFontFamily.Ui),
        labelMedium = labelMedium.copy(fontFamily = PremiumFontFamily.Ui),
        labelSmall = labelSmall.copy(fontFamily = PremiumFontFamily.Ui)
    )
}
