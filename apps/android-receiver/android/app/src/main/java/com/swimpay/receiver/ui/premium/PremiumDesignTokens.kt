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
        ink = Color(0xFF071126),
        navy = Color(0xFF0F172A),
        blue = Color(0xFF155BD8),
        electricBlue = Color(0xFF1EA7F2),
        cyan = Color(0xFF16ADEC),
        teal = Color(0xFF0EA5A4),
        mint = Color(0xFFEAF6FA),
        background = Color(0xFFF2F7FA),
        surface = Color(0xFFFFFFFF),
        surfaceAlt = Color(0xFFF6FAFD),
        line = Color(0xFFE2E8F0),
        muted = Color(0xFF59708D),
        softText = Color(0xFF94A3B8),
        success = Color(0xFF059669),
        warning = Color(0xFFF59E0B),
        danger = Color(0xFFE5484D),
        panelTint = Color(0xFFF7FDFF),
        iconTile = Color(0xFFEAF3FF),
        neutralChip = Color(0xFFF3F4F6)
    )
    private val dark = PremiumColorPalette(
        ink = Color(0xFFE8F0FF),
        navy = Color(0xFFD7E6FF),
        blue = Color(0xFF68A4FF),
        electricBlue = Color(0xFF54C0FF),
        cyan = Color(0xFF42D6FF),
        teal = Color(0xFF2DD4BF),
        mint = Color(0xFF102D3A),
        background = Color(0xFF07111F),
        surface = Color(0xFF0D1728),
        surfaceAlt = Color(0xFF132238),
        line = Color(0xFF26364E),
        muted = Color(0xFFA7B7CC),
        softText = Color(0xFF77869E),
        success = Color(0xFF34D399),
        warning = Color(0xFFFBBF24),
        danger = Color(0xFFFF6B72),
        panelTint = Color(0xFF0F2234),
        iconTile = Color(0xFF142B47),
        neutralChip = Color(0xFF1D2B3F)
    )

    private var palette: PremiumColorPalette = light

    fun useDarkTheme(enabled: Boolean) {
        palette = if (enabled) dark else light
    }

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
    val Card = 28.dp
    val CardLarge = 36.dp
    val CardXL = 52.dp
    val Button = 20.dp
    val Tile = 16.dp
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

object PremiumComponentSize {
    val ButtonHeight = 56.dp
    val CompactButtonHeight = 44.dp
    val RowHeight = 84.dp
    val TouchTarget = 48.dp
    val TopAction = 46.dp
}

data class PremiumTone(
    val foreground: Color,
    val background: Color
)

object PremiumToneColors {
    val Success: PremiumTone get() = PremiumTone(PremiumColors.Success, Color(0xFFE7F7EF))
    val Warning: PremiumTone get() = PremiumTone(PremiumColors.Warning, Color(0xFFFFF4E5))
    val Danger: PremiumTone get() = PremiumTone(PremiumColors.Danger, Color(0xFFFDECEC))
    val Info: PremiumTone get() = PremiumTone(PremiumColors.Blue, PremiumColors.IconTile)
    val Selected: PremiumTone get() = PremiumTone(PremiumColors.Teal, Color(0xFFF7FEFE))
    val Disabled: PremiumTone get() = PremiumTone(PremiumColors.SoftText, PremiumColors.NeutralChip)
}

object PremiumBrandGradient {
    val Primary: List<Color> get() = listOf(PremiumColors.Teal, PremiumColors.Cyan)
    val PrimaryDeep: List<Color> get() = listOf(PremiumColors.Teal, PremiumColors.Blue)
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
