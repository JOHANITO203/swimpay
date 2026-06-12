package com.swimpay.receiver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.swimpay.receiver.ui.premium.PremiumColors
import com.swimpay.receiver.ui.premium.PremiumMaterialTypography

private fun premiumLightColorScheme() = lightColorScheme(
    primary = PremiumColors.Blue,
    onPrimary = PremiumColors.OnInk,
    primaryContainer = PremiumColors.IconTile,
    onPrimaryContainer = PremiumColors.Cyan,
    secondary = PremiumColors.Teal,
    onSecondary = PremiumColors.Ink,
    secondaryContainer = PremiumColors.SurfaceAlt,
    onSecondaryContainer = PremiumColors.Muted,
    background = PremiumColors.Background,
    onBackground = PremiumColors.Ink,
    surface = PremiumColors.Surface,
    onSurface = PremiumColors.Ink,
    surfaceVariant = PremiumColors.SurfaceAlt,
    onSurfaceVariant = PremiumColors.Muted,
    outline = PremiumColors.Line,
    error = PremiumColors.Danger
)

private fun premiumDarkColorScheme() = darkColorScheme(
    primary = PremiumColors.Blue,
    onPrimary = PremiumColors.OnInk,
    primaryContainer = PremiumColors.IconTile,
    onPrimaryContainer = PremiumColors.Cyan,
    secondary = PremiumColors.Teal,
    onSecondary = Color.White,
    secondaryContainer = PremiumColors.SurfaceAlt,
    onSecondaryContainer = PremiumColors.Muted,
    background = PremiumColors.Background,
    onBackground = PremiumColors.Ink,
    surface = PremiumColors.Surface,
    onSurface = PremiumColors.Ink,
    surfaceVariant = PremiumColors.SurfaceAlt,
    onSurfaceVariant = PremiumColors.Muted,
    outline = PremiumColors.Line,
    error = PremiumColors.Danger
)

@Composable
fun SwimPayMerchantTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    PremiumColors.useDarkTheme(darkTheme)
    val colorScheme = if (darkTheme) premiumDarkColorScheme() else premiumLightColorScheme()

    MaterialTheme(
        colorScheme = colorScheme,
        typography = PremiumMaterialTypography,
        content = content
    )
}

