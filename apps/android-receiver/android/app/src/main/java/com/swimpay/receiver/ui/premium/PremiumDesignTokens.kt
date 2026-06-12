package com.swimpay.receiver.ui.premium

import androidx.compose.runtime.compositionLocalOf
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

// Langage « papier calme » (spec T6) : papier chaud + encre, accents émeraude/or/corail.
// Les noms de slots sont historiques ; leur rôle réel :
//   blue = action primaire (encre) · teal = accent actif (émeraude) · mint = fond accent doux
//   cyan = accent clair sur surface sombre · electricBlue = encre secondaire
object PremiumColors {
    private val light = PremiumColorPalette(
        ink = Color(0xFF17140F),
        navy = Color(0xFF1F1D1A),
        blue = Color(0xFF17140F),
        electricBlue = Color(0xFF4B463D),
        cyan = Color(0xFFCFC7B6),
        teal = Color(0xFF0E7B57),
        mint = Color(0xFFE4F1E9),
        background = Color(0xFFF6F3EC),
        surface = Color(0xFCFFFFFF),
        surfaceAlt = Color(0xF7EFEAE0),
        line = Color(0xD8E7E1D5),
        muted = Color(0xFF4B463D),
        softText = Color(0xFF938B7C),
        success = Color(0xFF0E7B57),
        warning = Color(0xFF9A6712),
        danger = Color(0xFFF0532E),
        panelTint = Color(0xF4FBF8F2),
        iconTile = Color(0xF4FFFFFF),
        neutralChip = Color(0xEDEFEAE0)
    )
    // Langage « noir vivant » (port prototype, Compose P6) : nuit profonde + ivoire chaud,
    // un seul accent de marque violet (NoirColors.multi) pour les écrans secondaires
    // (pas de Caméléon par-wallet ici). Les valeurs sont alignées sur NoirColors.
    //   blue/navy/electricBlue/cyan/teal = accent violet de marque
    //   mint = fond accent doux (violet très transparent)
    private val dark = PremiumColorPalette(
        ink = Color(0xFFF5F0EB),            // NoirColors.ink1
        navy = Color(0xFF8264D2),           // accent marque (NoirColors.multi)
        blue = Color(0xFF8264D2),           // action primaire = accent marque
        electricBlue = Color(0xFF8A857E),   // encre secondaire (NoirColors.ink2)
        cyan = Color(0xFF8264D2),           // accent clair sur surface sombre = accent marque
        teal = Color(0xFF8264D2),           // accent actif = accent marque
        mint = Color(0x1F8264D2),           // fond accent doux (violet ~0.12 alpha)
        background = Color(0xFF08080C),     // NoirColors.bg
        surface = Color(0xFF141418),        // NoirColors.surface
        surfaceAlt = Color(0xFF1E1E24),     // NoirColors.activeSurface
        line = Color(0x0FF5F0EB),           // ink1 ~0.06 alpha (hairline)
        muted = Color(0xFF8A857E),          // NoirColors.ink2
        softText = Color(0xFF5A5650),       // NoirColors.ink3
        success = Color(0xFF2ECC71),        // NoirColors.success
        warning = Color(0xFFE67E22),        // NoirColors.warn
        danger = Color(0xFFE74C3C),         // NoirColors.danger
        panelTint = Color(0xFF141418),      // ≈ surface
        iconTile = Color(0xFF1E1E24),       // ≈ activeSurface
        neutralChip = Color(0xFF1E1E24)     // ≈ surfaceAlt
    )

    private var palette: PremiumColorPalette = light
    private var darkThemeEnabled: Boolean = false

    fun useDarkTheme(enabled: Boolean) {
        darkThemeEnabled = enabled
        palette = if (enabled) dark else light
    }

    val IsDark: Boolean get() = darkThemeEnabled
    val Ink: Color get() = palette.ink
    val PageInk: Color get() = palette.ink
    val PageMuted: Color get() = palette.muted
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
    // Papier inversé : texte/éléments posés sur une surface encre (boutons primaires, cartes sombres).
    // Noir vivant : texte quasi-noir sur les boutons violet/clairs du mode sombre.
    val OnInk: Color get() = if (darkThemeEnabled) Color(0xFF0E0820) else Color(0xFFF6F3EC)
    // Papier fixe (indépendant du mode) : contenu posé sur les cartes encre qui restent sombres partout.
    val Paper: Color = Color(0xFFF6F3EC)
}

// Échelle d'opacité unique — remplace les alphas ad hoc dispersés dans les écrans.
object PremiumOpacity {
    const val Hairline = 0.10f
    const val Soft = 0.12f
    const val Medium = 0.18f
    const val Strong = 0.28f
    const val Veil = 0.62f
    const val Emphasis = 0.78f
}

object PremiumRadius {
    val Card = 22.dp
    val CardLarge = 30.dp
    val CardXL = 36.dp
    val Button = 18.dp // rectangles arrondis calmes (prototype), plus de pilules CTA
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
    val Success: PremiumTone get() = PremiumTone(PremiumColors.Success, PremiumColors.Success.copy(alpha = PremiumOpacity.Soft))
    val Warning: PremiumTone get() = PremiumTone(PremiumColors.Warning, PremiumColors.Warning.copy(alpha = PremiumOpacity.Soft))
    val Danger: PremiumTone get() = PremiumTone(PremiumColors.Danger, PremiumColors.Danger.copy(alpha = PremiumOpacity.Soft))
    val Info: PremiumTone get() = PremiumTone(PremiumColors.Muted, PremiumColors.NeutralChip)
    val Selected: PremiumTone get() = PremiumTone(PremiumColors.Teal, PremiumColors.Teal.copy(alpha = PremiumOpacity.Soft))
    val Disabled: PremiumTone get() = PremiumTone(PremiumColors.SoftText, PremiumColors.Line.copy(alpha = 0.5f))
}

object PremiumBrandGradient {
    // Encre chaude — CTA et marque (prototype .mark : 145deg #1d1a14 → #3a342a).
    val Primary: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFFF2EDE2), Color(0xFFE3DAC6), Color(0xFFCFC7B6))
    } else {
        listOf(Color(0xFF1D1A14), Color(0xFF2A261F), Color(0xFF3A342A))
    }
    val PrimaryDeep: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF221D14), Color(0xFF1A1610), Color(0xFF14110C))
    } else {
        listOf(Color(0xFF17140F), Color(0xFF221E17), Color(0xFF322D25))
    }
    // Émeraude profonde (prototype .w-wise : #163F2E → #0E7B57).
    val PaymentCard: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF0E2A1F), Color(0xFF134632), Color(0xFF0E7B57))
    } else {
        listOf(Color(0xFF163F2E), Color(0xFF11583F), Color(0xFF0E7B57))
    }
    // Encre sobre (prototype .w-sber : #1F1D1A → #3b372f).
    val SbpCard: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF181510), Color(0xFF26221B), Color(0xFF38332A))
    } else {
        listOf(Color(0xFF1F1D1A), Color(0xFF2C2922), Color(0xFF3B372F))
    }
    val ReceivingSurface: List<Color> get() = if (PremiumColors.IsDark) {
        listOf(Color(0xFF0C2218), Color(0xFF10301F), Color(0xFF163F2E))
    } else {
        listOf(Color(0xFF163F2E), Color(0xFF12503A), Color(0xFF0E6B4C))
    }
    val ChartArea: List<Color> get() = listOf(
        PremiumColors.Success.copy(alpha = 0.16f),
        PremiumColors.Success.copy(alpha = 0.08f),
        Color.Transparent
    )
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

// ─────────────────────────────────────────────────────────────────────────────
// Langage « noir vivant » (port prototype, Compose P0) — FONDATION ADDITIVE.
// Aucune valeur ci-dessus n'est modifiée ; ces objets ne sont consommés que par
// les écrans portés (P1+). Tant qu'aucun écran n'est migré, l'app reste identique.
// ─────────────────────────────────────────────────────────────────────────────
object NoirColors {
    // Fonds : nuit profonde, surfaces posées, surface active (sélection/press).
    val bg = Color(0xFF08080C)
    val surface = Color(0xFF141418)
    val activeSurface = Color(0xFF1E1E24)

    // Encres : ivoire chaud → gris froids dégressifs.
    val ink1 = Color(0xFFF5F0EB)
    val ink2 = Color(0xFF8A857E)
    val ink3 = Color(0xFF5A5650)

    // États sémantiques.
    val success = Color(0xFF2ECC71)
    val warn = Color(0xFFE67E22)
    val danger = Color(0xFFE74C3C)

    // Filets (hairlines) : ivoire très transparent.
    val hair = Color(0xFFF5F0EB).copy(alpha = 0.05f)
    val hair2 = Color(0xFFF5F0EB).copy(alpha = 0.08f)

    // Accents fournisseurs / wallets (marques).
    val wave = Color(0xFF1DC3E6)
    val orange = Color(0xFFFF6600)
    val free = Color(0xFF00A859)
    val sber = Color(0xFF1A9F4B)
    val usdt = Color(0xFF26A17B)
    val multi = Color(0xFF8264D2)
    val amber = Color(0xFFD4A054)
}

// Skin d'un wallet : accent de marque + dégradé profond pour la carte.
data class WalletSkin(
    val id: String,
    val label: String,
    val accent: Color,
    val gradientTop: Color,
    val gradientBottom: Color
)

object WalletSkins {
    val all: List<WalletSkin> = listOf(
        WalletSkin(
            id = "wave",
            label = "Wave",
            accent = NoirColors.wave,
            gradientTop = Color(0xFF0D2D3A),
            gradientBottom = Color(0xFF1A4A5C)
        ),
        WalletSkin(
            id = "orange",
            label = "Orange Money",
            accent = NoirColors.orange,
            gradientTop = Color(0xFF3A1A00),
            gradientBottom = Color(0xFF5C2E0D)
        ),
        WalletSkin(
            id = "sber",
            label = "Sberbank",
            accent = NoirColors.sber,
            gradientTop = Color(0xFF2A1F0F),
            gradientBottom = Color(0xFF3D2E18)
        ),
        WalletSkin(
            id = "usdt",
            label = "USDT",
            accent = NoirColors.usdt,
            gradientTop = Color(0xFF0A2E22),
            gradientBottom = Color(0xFF153D2F)
        ),
        WalletSkin(
            id = "multi",
            label = "Multi",
            accent = NoirColors.multi,
            gradientTop = Color(0xFF1A1330),
            gradientBottom = Color(0xFF2D1F4A)
        )
    )

    fun byId(id: String): WalletSkin? = all.firstOrNull { it.id == id }
}

object NoirRadius {
    val Card = 20.dp
    val Spark = 16.dp
    val Tile = 12.dp
    val Button = 14.dp
    val ButtonTight = 10.dp
}

object NoirSpacing {
    val Base = 8.dp
    val Screen = 20.dp
    val Section = 24.dp
    val Item = 16.dp
}

// Caméléon : un écran fournit l'accent du wallet actif via LocalNoirAccent,
// les enfants le lisent (l'animation éventuelle est portée plus tard, P2 Home).
val LocalNoirAccent = compositionLocalOf { NoirColors.wave }
