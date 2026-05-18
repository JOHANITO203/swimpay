package com.swimpay.receiver.ui.premium

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.swimpay.receiver.R

object CardVisualDefaults {
    val HomeDashboard: CardVisualTheme
        get() = CardVisualTheme(
            surface = CardSurfaceTheme(
                background = listOf(PremiumColors.Teal, PremiumColors.Blue, PremiumColors.ElectricBlue),
                radius = PremiumRadius.CardLarge,
                edgeColor = Color.Transparent
            )
        )

    val MerchantReceiving: CardVisualTheme
        get() = CardVisualTheme(
            surface = CardSurfaceTheme(
                background = PremiumBrandGradient.PaymentCard,
                radius = 34.dp,
                edgeColor = Color.White.copy(alpha = 0.10f)
            )
        )

    // Legacy comparison theme: dragon artwork on the original blue surface.
    val DragonGoldPreview: CardVisualTheme
        get() = HomeDashboard.copy(
            artwork = HomeDashboard.artwork.copy(
                artworkRes = R.drawable.card_artwork_dragon_gold,
                artworkAlpha = 0.36f,
                artworkScale = 1.08f,
                artworkOffsetX = 0.dp,
                artworkOffsetY = 0.dp,
                artworkRotation = 0f
            )
        )

    // Current Home Dashboard card candidate. This replaces the blue card in
    // runtime while HomeDashboard remains available as an explicit fallback.
    val HomeDashboardDragonGoldCandidate: CardVisualTheme
        get() = DragonGoldPreview.copy(
            surface = DragonGoldPreview.surface.copy(
                background = listOf(
                    Color(0xFF010204),
                    Color(0xFF030509),
                    Color(0xFF0A0704)
                )
            )
        )

    val HomeDashboardDragonGoldMaterial: CardVisualTheme
        get() = HomeDashboardDragonGoldCandidate.copy(
            surface = HomeDashboardDragonGoldCandidate.surface.copy(
                surfaceTextureRes = R.drawable.card_texture_brushed_black_metal,
                surfaceTextureAlpha = 0.32f,
                surfaceTextureScale = 1f
            ),
            effects = CardEffectsTheme(
                reflection = true,
                goldGlow = true,
                goldGlowIntensity = 1.0f
            )
        )

    val HomeDashboardDark: CardVisualTheme
        get() = CardVisualTheme(
            surface = CardSurfaceTheme(
                background = listOf(
                    Color(0xFF050405),
                    Color(0xFF12090B),
                    Color(0xFF241014)
                ),
                radius = PremiumRadius.CardLarge,
                edgeColor = Color(0xFFFFB7A6).copy(alpha = 0.26f),
                surfaceTextureRes = R.drawable.card_surface_dark_black_brushed_workbench,
                surfaceTextureAlpha = 0.86f,
                surfaceTextureScale = 1f,
                surfaceAccentTextureRes = R.drawable.card_overlay_dark_feathered_armor,
                surfaceAccentTextureAlpha = 0.44f,
                surfaceAccentTextureScale = 1f
            ),
            artwork = CardArtworkTheme(
                artworkRes = R.drawable.card_artwork_dark_oni_yatagarasu,
                artworkAlpha = 0.78f,
                artworkScale = 1.03f,
                artworkOffsetX = 0.dp,
                artworkOffsetY = 0.dp,
                artworkRotation = 0f
            ),
            effects = CardEffectsTheme(reflection = true)
        )

    val HomeDashboardDragonGoldTrial: CardVisualTheme
        get() = HomeDashboardDragonGoldMaterial
}
