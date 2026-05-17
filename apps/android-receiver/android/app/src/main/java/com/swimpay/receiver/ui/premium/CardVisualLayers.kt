package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp

@Composable
fun BoxScope.CardSurfaceLayer(theme: CardVisualTheme, cardShape: Shape) {
    Box(
        Modifier
            .matchParentSize()
            .clip(cardShape)
            .background(theme.surfaceBrush)
            .then(
                if (theme.surface.edgeColor == Color.Transparent) {
                    Modifier
                } else {
                    Modifier.border(1.dp, theme.surface.edgeColor, cardShape)
                }
            )
    )
}

@Composable
fun BoxScope.SurfaceTextureLayer(theme: CardVisualTheme, cardShape: Shape) {
    val textureRes = theme.surface.surfaceTextureRes ?: return
    Image(
        painter = painterResource(id = textureRes),
        contentDescription = null,
        contentScale = theme.surface.surfaceTextureContentScale,
        modifier = Modifier
            .matchParentSize()
            .clip(cardShape)
            .graphicsLayer {
                alpha = theme.surface.surfaceTextureAlpha
                scaleX = theme.surface.surfaceTextureScale
                scaleY = theme.surface.surfaceTextureScale
            }
    )
}

@Composable
fun BoxScope.ArtworkSkinLayer(theme: CardVisualTheme, cardShape: Shape) {
    val artworkRes = theme.artwork.artworkRes ?: return
    Image(
        painter = painterResource(id = artworkRes),
        contentDescription = null,
        contentScale = ContentScale.Crop,
        modifier = Modifier
            .matchParentSize()
            .clip(cardShape)
            .graphicsLayer {
                alpha = theme.artwork.artworkAlpha
                scaleX = theme.artwork.artworkScale
                scaleY = theme.artwork.artworkScale
                translationX = theme.artwork.artworkOffsetX.toPx()
                translationY = theme.artwork.artworkOffsetY.toPx()
                rotationZ = theme.artwork.artworkRotation
            }
    )
}

@Composable
fun BoxScope.SurfaceEffectsLayer(theme: CardVisualTheme, cardShape: Shape) {
    if (!theme.effects.reflection) return
    Box(
        Modifier
            .matchParentSize()
            .clip(cardShape)
            .background(Color.White.copy(alpha = 0.04f))
    )
}

@Composable
fun BoxScope.CardDetailsLayer(content: @Composable BoxScope.() -> Unit) {
    content()
}
