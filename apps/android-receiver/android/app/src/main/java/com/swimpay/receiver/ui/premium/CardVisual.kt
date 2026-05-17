package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun CardVisual(
    modifier: Modifier = Modifier,
    theme: CardVisualTheme = CardVisualDefaults.HomeDashboard,
    content: @Composable BoxScope.() -> Unit
) {
    val cardShape = RoundedCornerShape(theme.surface.radius)
    Box(modifier) {
        CardSurfaceLayer(theme = theme, cardShape = cardShape)
        SurfaceTextureLayer(theme = theme, cardShape = cardShape)
        ArtworkSkinLayer(theme = theme, cardShape = cardShape)
        SurfaceEffectsLayer(theme = theme, cardShape = cardShape)
        CardDetailsLayer(content)
    }
}
