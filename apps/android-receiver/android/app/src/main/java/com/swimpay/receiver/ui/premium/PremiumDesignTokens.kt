package com.swimpay.receiver.ui.premium

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class PremiumColorPalette(
    val ink: Color,
    val navy: Color,
    val blue: Color,
    val electricBlue: Color,
    val cyan: Color,
    val teal: Color,
    val mint: Color,
    val background: Color,
    val surface: Color,
    val surfaceAlt: Color,
    val line: Color,
    val muted: Color,
    val softText: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val panelTint: Color,
    val iconTile: Color,
    val neutralChip: Color
)

object PremiumColors {
    private val light = PremiumColorPalette(
        ink = Color(0xFFF8FAFF),
        navy = Color(0xFFFFFFFF),
        blue = Color(0xFF6EA8C8),
        electricBlue = Color(0xFFA7D8F2),
        cyan = Color(0xFFB9ECFF),
        teal = Color(0xFF78BFD8),
        mint = Color(0xFF153450),
        background = Color(0xFF000A1F),
        surface = Color(0xE60A1828),
        surfaceAlt = Color(0xCC102A42),
        line = Color(0x4D8FC9E8),
        muted = Color(0xFFB9D4E6),
        softText = Color(0xFF89A9BE),
        success = Color(0xFF47C88A),
        warning = Color(0xFFD6B56D),
        danger = Color(0xFFE16B78),
        panelTint = Color(0xD90A2035),
        iconTile = Color(0xCC12304A),
        neutralChip = Color(0xB816354E)
    )
    private val dark = PremiumColorPalette(
        ink = Color(0xFFF8FAFC),
        navy = Color(0xFFFFFFFF),
        blue = Color(0xFFE04A3F),
        electricBlue = Color(0xFFFF735A),
        cyan = Color(0xFFFFB7A6),
        teal = Color(0xFFE2362F),
        mint = Color(0xFF261011),
        background = Color(0xFF050406),
        surface = Color(0xE60B0A0E),
        surfaceAlt = Color(0xD9141015),
        line = Color(0x73A2423D),
        muted = Color(0xFFE4CBC5),
        softText = Color(0xFFB8958F),
        success = Color(0xFF7CCB8F),
        warning = Color(0xFFE1A34A),
        danger = Color(0xFFFF6958),
        panelTint = Color(0xD9110B0F),
        iconTile = Color(0xCC231015),
        neutralChip = Color(0xB8251719)
    )

    private var palette: PremiumColorPalette = light
    private var darkThemeEnabled: Boolean = false

    fun useDarkTheme(enabled: Boolean) {
        darkThemeEnabled = enabled
        palette = if (enabled) dark else light
    }

    val IsDark: Boolean get() = darkThemeEnabled
    val Ink: Color get() = palette.ink
    val Navy: Color get() = palette.navy
    val Blue: Color get() = palette.blue
    val ElectricBlue: Color get() = palette.electricBlue
    val Cyan: Color get() = palette.cyan
    val Teal: Color get() = palette.teal
    val Mint: Color get() = palette.mint
    val Background: Color get() = palette.background
    val Surface: Color get() = palette.surface
    val SurfaceAlt: Color get() = palette.surfaceAlt
    val Line: Color get() = palette.line
    val Muted: Color get() = palette.muted
    val SoftText: Color get() = palette.softText
    val Success: Color get() = palette.success
    val Warning: Color get() = palette.warning
    val Danger: Color get() = palette.danger
    val PanelTint: Color get() = palette.panelTint
    val IconTile: Color get() = palette.iconTile
    val NeutralChip: Color get() = palette.neutralChip
}

object PremiumRadius {
    val Card = 24.dp
    val CardLarge = 32.dp
    val CardXL = 40.dp
    val Button = 999.dp // Pills as in reference
    val Tile = 20.dp
    val Pill = 999.dp
}

object PremiumSpacing {
    val ScreenHorizontal = 20.dp
    val ScreenHorizontalWide = 24.dp
    val BottomNavHeight = 88.dp
    val TopChromeHeight = 58.dp
}

object PremiumType {
    val Hero = 30.sp
    val ScreenTitle = 24.sp
    val Body = 14.sp
    val Caption = 12.sp
    val Micro = 10.sp
}

object PremiumElevation {
    val None = 0.dp
    val Card = 3.dp
    val CardRaised = 6.dp
    val Button = 8.dp
    val Floating = 12.dp
}

object PremiumIconSize {
    val Small = 16.dp
    val Default = 22.dp
    val Medium = 28.dp
    val Large = 36.dp
    val Tile = 48.dp
}

object PremiumBrandMark {
    val WaveStroke = 2.6.dp
    val WaveStrokeCompact = 2.2.dp
    val TileInset = 0.18f
    val WaveStart = 0.16f
    val WaveEnd = 0.84f
}

object PremiumComponentSize {
    val ButtonHeight = 56.dp
    val CompactButtonHeight = 44.dp
    val RowHeight = 84.dp
    val TouchTarget = 48.dp
    val TopAction = 48.dp
    val TopChromeHeight = 72.dp
}

data class PremiumTone(
    val foreground: Color,
    val background: Color
)

object PremiumToneColors {
    val Success: PremiumTone get() = PremiumTone(PremiumColors.Success, PremiumColors.Success.copy(alpha = 0.12f))
    val Warning: PremiumTone get() = PremiumTone(PremiumColors.Warning, PremiumColors.Warning.copy(alpha = 0.12f))
    val Danger: PremiumTone get() = PremiumTone(PremiumColors.Danger, PremiumColors.Danger.copy(alpha = 0.12f))
    val Info: PremiumTone get() = PremiumTone(PremiumColors.Blue, PremiumColors.Blue.copy(alpha = 0.12f))
    val Selected: PremiumTone get() = PremiumTone(PremiumColors.Teal, PremiumColors.Teal.copy(alpha = 0.12f))
    val Disabled: PremiumTone get() = PremiumTone(PremiumColors.SoftText, PremiumColors.Line.copy(alpha = 0.5f))
}

object PremiumBrandGradient {
    val Primary: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF7A1518), Color(0xFFE04A3F), Color(0xFFFF735A))
    } else {
        listOf(Color(0xFF5E93B3), Color(0xFFB9ECFF))
    }
    val PrimaryDeep: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF6E1116), Color(0xFF1B0A0D), Color(0xFF060406))
    } else {
        listOf(Color(0xFF0B2742), Color(0xFF5E93B3))
    }
    val PaymentCard: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF080507), Color(0xFF1A0D10), Color(0xFF3C1215))
    } else {
        listOf(Color(0xFF000A1F), Color(0xFF0A1828), Color(0xFF123A59))
    }
    val SbpCard: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF080507), Color(0xFF211014), Color(0xFF6E1918))
    } else {
        listOf(Color(0xFF000A1F), Color(0xFF0A2740), Color(0xFF78BFD8))
    }
    val ReceivingSurface: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF070506), Color(0xFF150B0E), Color(0xFF261014))
    } else {
        listOf(Color(0xFF071827), Color(0xFF0D253C), Color(0xFF061225))
    }
    val ChartArea: List<Color> get() = listOf(PremiumColors.Blue.copy(alpha = 0.22f), PremiumColors.Cyan.copy(alpha = 0.10f), Color.Transparent)
    val Disabled: List<Color> get() = listOf(PremiumColors.Line, PremiumColors.NeutralChip)
}

object ExternalBrandTokens {
    object Google {
        val Blue = Color(0xFF4285F4)
        val Red = Color(0xFFEA4335)
        val Yellow = Color(0xFFFBBC05)
        val Green = Color(0xFF34A853)
    }
}
