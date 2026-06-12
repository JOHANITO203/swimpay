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
