package com.swimpay.receiver.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.swimpay.receiver.ui.premium.PremiumColors

// Palette officielle Google Blue / Material 3
val GoogleBlue = Color(0xFF0B57D0)
val GoogleBlueVariant = Color(0xFFD3E3FD)
val SuccessGreen = Color(0xFF22C55E)
val AlertOrange = Color(0xFFF59E0B)

private val LightColorScheme = lightColorScheme(
    primary = GoogleBlue,
    onPrimary = Color.White,
    primaryContainer = GoogleBlueVariant,
    onPrimaryContainer = GoogleBlue,
    secondary = Color(0xFF535F70),
    background = Color(0xFFF8FAFD),
    surface = Color.White,
    onSurface = Color(0xFF1B1B1F),
    surfaceVariant = Color(0xFFE1E2EC)
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFA8C7FA),
    onPrimary = Color(0xFF062E6F),
    primaryContainer = Color(0xFF0842A0),
    onPrimaryContainer = Color(0xFFD3E3FD),
    background = Color(0xFF1B1B1F),
    surface = Color(0xFF111114),
    onSurface = Color(0xFFE3E2E6)
)

@Composable
fun SwimPayMerchantTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    PremiumColors.useDarkTheme(darkTheme)

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

