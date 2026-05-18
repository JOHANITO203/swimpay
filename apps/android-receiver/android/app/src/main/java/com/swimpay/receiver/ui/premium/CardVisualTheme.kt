package com.swimpay.receiver.ui.premium

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

data class CardSurfaceTheme(
    val background: List<Color>,
    val radius: Dp,
    val edgeColor: Color,
    val surfaceTextureRes: Int? = null,
    val surfaceTextureAlpha: Float = 0.16f,
    val surfaceTextureScale: Float = 1f,
    val surfaceTextureContentScale: ContentScale = ContentScale.Crop,
    val surfaceAccentTextureRes: Int? = null,
    val surfaceAccentTextureAlpha: Float = 0.16f,
    val surfaceAccentTextureScale: Float = 1f,
    val surfaceAccentTextureContentScale: ContentScale = ContentScale.Crop,
    val surfaceFinishTextureRes: Int? = null,
    val surfaceFinishTextureAlpha: Float = 0.16f,
    val surfaceFinishTextureScale: Float = 1f,
    val surfaceFinishTextureContentScale: ContentScale = ContentScale.Crop,
    val surfaceFinishTextureBlendMode: BlendMode = BlendMode.SrcOver
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
    val reflection: Boolean = false,
    val goldGlow: Boolean = false,
    val goldGlowIntensity: Float = 1f
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
