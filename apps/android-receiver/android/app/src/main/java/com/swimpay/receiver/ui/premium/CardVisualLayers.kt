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
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

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
    CardSurfaceTextureImage(
        textureRes = theme.surface.surfaceTextureRes,
        alpha = theme.surface.surfaceTextureAlpha,
        scale = theme.surface.surfaceTextureScale,
        contentScale = theme.surface.surfaceTextureContentScale,
        blendMode = BlendMode.SrcOver,
        cardShape = cardShape
    )
    CardSurfaceTextureImage(
        textureRes = theme.surface.surfaceAccentTextureRes,
        alpha = theme.surface.surfaceAccentTextureAlpha,
        scale = theme.surface.surfaceAccentTextureScale,
        contentScale = theme.surface.surfaceAccentTextureContentScale,
        blendMode = BlendMode.SrcOver,
        cardShape = cardShape
    )
}

@Composable
fun BoxScope.SurfaceFinishTextureLayer(theme: CardVisualTheme, cardShape: Shape) {
    CardSurfaceTextureImage(
        textureRes = theme.surface.surfaceFinishTextureRes,
        alpha = theme.surface.surfaceFinishTextureAlpha,
        scale = theme.surface.surfaceFinishTextureScale,
        contentScale = theme.surface.surfaceFinishTextureContentScale,
        blendMode = theme.surface.surfaceFinishTextureBlendMode,
        cardShape = cardShape
    )
}

@Composable
private fun BoxScope.CardSurfaceTextureImage(
    textureRes: Int?,
    alpha: Float,
    scale: Float,
    contentScale: ContentScale,
    blendMode: BlendMode,
    cardShape: Shape
) {
    textureRes ?: return
    val image = ImageBitmap.imageResource(id = textureRes)
    Box(
        Modifier
            .matchParentSize()
            .clip(cardShape)
            .drawWithCache {
                val sourceAspect = image.width.toFloat() / image.height.toFloat()
                val targetAspect = size.width / size.height
                val sourceSize: IntSize
                val sourceOffset: IntOffset

                if (sourceAspect > targetAspect) {
                    val croppedWidth = (image.height * targetAspect).roundToInt()
                    sourceSize = IntSize(croppedWidth, image.height)
                    sourceOffset = IntOffset((image.width - croppedWidth) / 2, 0)
                } else {
                    val croppedHeight = (image.width / targetAspect).roundToInt()
                    sourceSize = IntSize(image.width, croppedHeight)
                    sourceOffset = IntOffset(0, (image.height - croppedHeight) / 2)
                }

                val destinationSize = IntSize(
                    width = (size.width * scale).roundToInt(),
                    height = (size.height * scale).roundToInt()
                )
                val destinationOffset = IntOffset(
                    x = ((size.width - destinationSize.width) / 2f).roundToInt(),
                    y = ((size.height - destinationSize.height) / 2f).roundToInt()
                )

                onDrawBehind {
                    drawImage(
                        image = image,
                        srcOffset = sourceOffset,
                        srcSize = sourceSize,
                        dstOffset = destinationOffset,
                        dstSize = destinationSize,
                        alpha = alpha,
                        blendMode = blendMode
                    )
                }
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
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFFFFE1D7).copy(alpha = 0.070f),
                        Color.Transparent,
                        Color(0xFFE04A3F).copy(alpha = 0.040f)
                    )
                )
            )
    )
}

@Composable
fun BoxScope.CardDetailsLayer(content: @Composable BoxScope.() -> Unit) {
    content()
}
