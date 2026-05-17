package com.swimpay.receiver.ui.premium

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class CardSurfaceTheme(
    val background: List<Color>,
    val radius: Dp,
    val edgeColor: Color
)

data class CardArtworkTheme(
    val artworkRes: Int?,
    val artworkAlpha: Float,
    val artworkScale: Float,
    val artworkOffsetX: Dp,
    val artworkOffsetY: Dp,
    val artworkRotation: Float
)

data class CardEffectsTheme(
    val reflection: Boolean = false
)

data class CardVisualTheme(
    val surface: CardSurfaceTheme,
    val artwork: CardArtworkTheme = CardArtworkTheme(
        artworkRes = null,
        artworkAlpha = 1f,
        artworkScale = 1f,
        artworkOffsetX = 0.dp,
        artworkOffsetY = 0.dp,
        artworkRotation = 0f
    ),
    val effects: CardEffectsTheme = CardEffectsTheme()
) {
    val surfaceBrush: Brush
        get() = Brush.linearGradient(surface.background)
}
