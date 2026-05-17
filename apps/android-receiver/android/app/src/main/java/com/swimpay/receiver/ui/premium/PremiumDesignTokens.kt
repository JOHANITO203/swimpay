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
        blue = Color(0xFF2F6BFF),
        electricBlue = Color(0xFF6EA8FF),
        cyan = Color(0xFF57DEFF),
        teal = Color(0xFF57DEFF),
        mint = Color(0xFF071B35),
        background = Color(0xFF000613),
        surface = Color(0xFF061225),
        surfaceAlt = Color(0xFF0B203D),
        line = Color(0xFF1D3A66),
        muted = Color(0xFFB8C8E8),
        softText = Color(0xFF8299C2),
        success = Color(0xFF34D399),
        warning = Color(0xFFFBBF24),
        danger = Color(0xFFF87171),
        panelTint = Color(0xFF07182F),
        iconTile = Color(0xFF0D274C),
        neutralChip = Color(0xFF102848)
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
        listOf(Color(0xFF2F6BFF), Color(0xFF6EA8FF))
    } else {
        listOf(Color(0xFF5E93B3), Color(0xFFB9ECFF))
    }
    val PrimaryDeep: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF2F6BFF), Color(0xFF061225))
    } else {
        listOf(Color(0xFF0B2742), Color(0xFF5E93B3))
    }
    val PaymentCard: List<Color> get() = listOf(Color(0xFF000A1F), Color(0xFF0A1828), Color(0xFF123A59))
    val SbpCard: List<Color> get() = listOf(Color(0xFF000A1F), Color(0xFF0A2740), Color(0xFF78BFD8))
    val ReceivingSurface: List<Color> get() = listOf(Color(0xFF071827), Color(0xFF0D253C), Color(0xFF061225))
    val ChartArea: List<Color> get() = listOf(PremiumColors.Blue.copy(alpha = 0.26f), PremiumColors.Cyan.copy(alpha = 0.12f), Color.Transparent)
    val PaperGlow: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF000613), Color(0xFF061225), Color(0xFF00113A), Color(0xFF000613))
    } else {
        listOf(Color(0xFF000A1F), Color(0xFF07152F), Color(0xFF002EAD), Color(0xFF000A1F))
    }
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
