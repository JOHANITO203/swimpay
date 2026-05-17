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
                    Color(0xFF02040A),
                    Color(0xFF090D16),
                    Color(0xFF15110A)
                )
            )
        )

    val HomeDashboardDragonGoldMaterial: CardVisualTheme
        get() = HomeDashboardDragonGoldCandidate.copy(
            surface = HomeDashboardDragonGoldCandidate.surface.copy(
                surfaceTextureRes = R.drawable.card_texture_brushed_black_metal,
                surfaceTextureAlpha = 0.16f,
                surfaceTextureScale = 1f
            )
        )

    val HomeDashboardDragonGoldTrial: CardVisualTheme
        get() = HomeDashboardDragonGoldMaterial
}
