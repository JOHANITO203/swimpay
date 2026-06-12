package com.swimpay.receiver.ui.premium

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.*
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.swimpay.receiver.R
import kotlin.math.max
import kotlin.math.min

/**
 * LiquidGlassCard: The core container of the new design system.
 * It uses a high opacity (0.98f) to ensure legibility while maintaining
 * the "glass" aesthetic through subtle borders and shadows.
 */
@Composable
fun LiquidGlassCard(
    modifier: Modifier = Modifier,
    radius: Dp = PremiumRadius.Card,
    color: Color = PremiumColors.Surface,
    content: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(radius)
    Box(
        modifier = modifier
            .clip(shape)
            .background(premiumPolishedSurfaceBrush(color))
            .border(1.dp, premiumPolishedSurfaceBorder(color), shape)
    ) {
        content()
    }
}

private fun premiumPolishedSurfaceBrush(color: Color): Brush {
    val usesThemeSurface = color == PremiumColors.Surface || color == PremiumColors.SurfaceAlt || color == PremiumColors.PanelTint
    return if (usesThemeSurface) {
        if (PremiumColors.IsDark) {
            Brush.linearGradient(
                listOf(
                    Color(0xFF252017),
                    Color(0xFF1B1711),
                    Color(0xFF211B12)
                )
            )
        } else {
            Brush.linearGradient(
                listOf(
                    Color(0xFFFFFFFF),
                    Color(0xFFFDFCF9),
                    Color(0xFFF8F5EE)
                )
            )
        }
    } else {
        Brush.linearGradient(listOf(color, color))
    }
}

private fun premiumPolishedSurfaceBorder(color: Color): Color {
    val usesThemeSurface = color == PremiumColors.Surface || color == PremiumColors.SurfaceAlt || color == PremiumColors.PanelTint
    return if (usesThemeSurface) {
        if (PremiumColors.IsDark) Color.White.copy(alpha = PremiumOpacity.Hairline) else Color(0xFFE7E1D5)
    } else {
        PremiumColors.Line
    }
}

@Composable
fun PremiumStatePanel(
    state: PremiumScreenState<*>,
    modifier: Modifier = Modifier,
    onAction: () -> Unit = {}
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(24.dp)
        ) {
            when (state) {
                is PremiumScreenState.Loading -> {
                    CircularProgressIndicator(color = PremiumColors.Blue)
                }
                is PremiumScreenState.Error, is PremiumScreenState.Offline -> {
                    Icon(Icons.Default.Info, null, tint = PremiumColors.Danger, modifier = Modifier.size(48.dp))
                    Spacer(Modifier.height(16.dp))
                    Text(state.title, color = PremiumColors.PageInk, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(state.message, color = PremiumColors.PageMuted, textAlign = TextAlign.Center)
                    if (state.actionLabel != null) {
                        Button(onClick = onAction, modifier = Modifier.padding(top = 16.dp)) {
                            Text(state.actionLabel!!)
                        }
                    }
                }
                is PremiumScreenState.Empty -> {
                    Text(state.title, color = PremiumColors.PageInk, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Text(state.message, color = PremiumColors.PageMuted, textAlign = TextAlign.Center)
                    if (state.actionLabel != null) {
                        PremiumPrimaryButton(state.actionLabel!!, Modifier.padding(top = 16.dp), onClick = onAction)
                    }
                }
                else -> {}
            }
        }
    }
}

@Composable
fun IntelligenceCube(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "IntelligenceCube")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(10000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "Rotation"
    )

    Canvas(modifier = modifier.size(80.dp)) {
        val size = size.minDimension
        drawRect(
            brush = Brush.linearGradient(listOf(PremiumColors.Teal, PremiumColors.Blue)),
            topLeft = Offset(size * 0.2f, size * 0.2f),
            size = Size(size * 0.6f, size * 0.6f),
            style = Stroke(width = 2.dp.toPx())
        )
    }
}

@Composable
fun PremiumTitle(
    title: String = "",
    body: String? = null,
    modifier: Modifier = Modifier,
    text: String? = null, // For compatibility
    centered: Boolean = false,
    color: Color = PremiumColors.PageInk,
    fontSize: androidx.compose.ui.unit.TextUnit = PremiumType.ScreenTitle,
    fontWeight: FontWeight = FontWeight.Bold
) {
    val displayTitle = text ?: title
    Column(modifier, horizontalAlignment = if (centered) Alignment.CenterHorizontally else Alignment.Start) {
        Text(
            text = displayTitle,
            color = color,
            fontSize = fontSize,
            fontWeight = fontWeight,
            textAlign = if (centered) TextAlign.Center else TextAlign.Start,
            lineHeight = (fontSize.value * 1.15).sp
        )
        if (body != null) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = body,
                color = PremiumColors.PageMuted,
                fontSize = PremiumType.Body,
                fontWeight = FontWeight.SemiBold,
                textAlign = if (centered) TextAlign.Center else TextAlign.Start,
                lineHeight = 20.sp
            )
        }
    }
}

@Composable
fun StatusChip(
    text: String,
    tone: PremiumTone,
    modifier: Modifier = Modifier
) {
    Surface(
        color = tone.background,
        shape = RoundedCornerShape(PremiumRadius.Pill),
        modifier = modifier
    ) {
        Text(
            text = text,
            color = tone.foreground,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
    }
}

@Composable
fun SwimPayLogo(modifier: Modifier = Modifier, markSize: Dp = 48.dp) {
    SwimPayLauncherBadge(size = markSize, modifier = modifier)
}

@Composable
fun SwimPayLauncherBadge(
    size: Dp,
    modifier: Modifier = Modifier,
    contentDescription: String? = "SwimPay"
) {
    val launcherShape = RoundedCornerShape(size * 0.24f)
    Box(
        modifier
            .size(size)
            .clip(launcherShape)
            .background(Color(0xFF1D1A14), launcherShape)
            .border(1.dp, Color.White.copy(alpha = PremiumOpacity.Hairline), launcherShape),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(R.mipmap.ic_launcher_foreground),
            contentDescription = contentDescription,
            contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize()
        )
    }
}

@Composable
fun BentoGridCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    icon: ImageVector? = null,
    isLarge: Boolean = false,
    content: @Composable () -> Unit
) {
    LiquidGlassCard(modifier, radius = if (isLarge) PremiumRadius.CardLarge else PremiumRadius.Card) {
        Column(Modifier.padding(20.dp)) {
            if (title != null || icon != null) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 12.dp)) {
                    if (icon != null) {
                        Icon(icon, null, tint = PremiumColors.Blue, modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(8.dp))
                    }
                    if (title != null) {
                        SectionLabel(title)
                    }
                }
            }
            content()
        }
    }
}

fun StatusTone(status: String): PremiumTone = when (status.lowercase()) {
    "success", "completed", "paid", "validé" -> PremiumToneColors.Success
    "pending", "processing", "en cours", "aujourd'hui" -> PremiumToneColors.Warning
    "failed", "error", "cancelled", "refusé" -> PremiumToneColors.Danger
    else -> PremiumToneColors.Info
}

object StatusTone {
    val Success get() = PremiumToneColors.Success
    val Warning get() = PremiumToneColors.Warning
    val Danger get() = PremiumToneColors.Danger
    val Info get() = PremiumToneColors.Info
    val Neutral get() = PremiumToneColors.Disabled
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        color = PremiumColors.Muted,
        fontWeight = FontWeight.Bold,
        fontSize = 12.sp,
        letterSpacing = 1.sp
    )
}

@Composable
fun PremiumPrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    val gradient = if (enabled) PremiumBrandGradient.Primary else PremiumBrandGradient.Disabled
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val reduceMotion = premiumReduceMotion()
    val pressScale by animateFloatAsState(
        targetValue = if (pressed && !reduceMotion) 0.98f else 1f,
        animationSpec = tween(120),
        label = "PremiumPrimaryButtonPress"
    )
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(PremiumComponentSize.ButtonHeight)
            .graphicsLayer {
                scaleX = pressScale
                scaleY = pressScale
            }
            .clip(RoundedCornerShape(PremiumRadius.Button))
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick
            ),
        color = Color.Transparent
    ) {
        Box(
            Modifier.background(Brush.linearGradient(gradient)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = text,
                color = PremiumColors.OnInk,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}

@Composable
fun PremiumSecondaryButton(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Surface(
        modifier = modifier
            .height(PremiumComponentSize.ButtonHeight)
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(PremiumRadius.Button),
        border = BorderStroke(1.dp, PremiumColors.Line),
        color = PremiumColors.Surface
    ) {
        Box(contentAlignment = Alignment.Center) {
            Text(
                text = text,
                color = PremiumColors.Ink,
                fontWeight = FontWeight.Bold,
                fontSize = PremiumType.Body
            )
        }
    }
}

@Composable
fun PremiumBlueButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    PremiumPrimaryButton(text = text, modifier = modifier, onClick = onClick)
}

@Composable
fun PremiumOutlineButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    PremiumSecondaryButton(text = text, modifier = modifier, onClick = onClick)
}

@Composable
fun CircleAction(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    Surface(
        modifier = modifier
            .size(PremiumComponentSize.TopAction)
            .clickable(onClick = onClick),
        shape = CircleShape,
        color = PremiumColors.Surface,
        border = BorderStroke(1.dp, PremiumColors.Line)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, null, modifier = Modifier.size(PremiumIconSize.Default), tint = PremiumColors.Ink)
        }
    }
}

@Composable
fun Chevron() {
    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = PremiumColors.SoftText)
}

@Composable
fun SwimPayWavesMark(modifier: Modifier = Modifier, tint: Color? = null) {
    PremiumBrandWavesMark(modifier = modifier, tint = tint)
}

@Composable
fun PremiumBrandWavesMark(
    modifier: Modifier = Modifier,
    tint: Color? = null,
    compact: Boolean = false
) {
    Canvas(modifier = modifier) {
        val color = tint ?: PremiumColors.Cyan
        val stroke = if (compact) PremiumBrandMark.WaveStrokeCompact else PremiumBrandMark.WaveStroke
        val strokeWidth = max(stroke.toPx(), size.minDimension * 0.065f)
        val waveStart = size.width * PremiumBrandMark.WaveStart
        val waveEnd = size.width * PremiumBrandMark.WaveEnd
        val waveWidth = waveEnd - waveStart
        val spacing = size.height * 0.205f
        val centerY = size.height * 0.50f
        val amplitude = size.height * 0.095f

        for (i in 0..2) {
            val y = centerY + (i - 1) * spacing
            val path = Path().apply {
                moveTo(waveStart, y)
                cubicTo(
                    waveStart + waveWidth * 0.25f,
                    y - amplitude,
                    waveStart + waveWidth * 0.75f,
                    y + amplitude,
                    waveEnd,
                    y
                )
            }
            drawPath(
                path = path,
                color = color,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
        }
    }
}

@Composable
fun PremiumBrandSignalTile(
    modifier: Modifier = Modifier,
    compact: Boolean = false
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(PremiumRadius.Tile))
            .background(Brush.linearGradient(PremiumBrandGradient.PrimaryDeep)),
        contentAlignment = Alignment.Center
    ) {
        PremiumBrandWavesMark(
            modifier = Modifier
                .fillMaxSize(PremiumBrandMark.WaveEnd - PremiumBrandMark.WaveStart + PremiumBrandMark.TileInset),
            tint = Color.White,
            compact = compact
        )
    }
}

@Composable
fun PremiumCard(
    modifier: Modifier = Modifier,
    radius: Dp = 24.dp,
    color: Color = PremiumColors.Surface,
    content: @Composable () -> Unit
) {
    val shape = RoundedCornerShape(radius)
    Box(
        modifier
            .clip(shape)
            .background(premiumPolishedSurfaceBrush(color))
            .border(1.dp, premiumPolishedSurfaceBorder(color), shape)
    ) {
        content()
    }
}

@Composable
fun PremiumGradientPanel(
    modifier: Modifier = Modifier,
    radius: Dp = PremiumRadius.CardLarge,
    content: @Composable () -> Unit
) {
    Box(
        modifier
            .clip(RoundedCornerShape(radius))
            .background(
                Brush.linearGradient(
                    PremiumBrandGradient.Primary
                )
            )
    ) {
        content()
    }
}

@Composable
fun TrendLine(
    modifier: Modifier = Modifier,
    data: List<Float> = emptyList(),
    colors: List<Color> = emptyList(),
    primaryValues: List<Float> = emptyList(),
    secondaryValues: List<Float> = emptyList()
) {
    Canvas(modifier) {
        val values = when {
            primaryValues.isNotEmpty() -> primaryValues
            data.isNotEmpty() -> data
            else -> listOf(8f, 14f, 12f, 19f, 24f, 22f, 31f, 38f, 46f, 52f)
        }
        val chartMax = max(values.maxOrNull() ?: 1f, 1f)
        val chartMin = min(values.minOrNull() ?: 0f, chartMax)
        val range = max(chartMax - chartMin, 1f)
        val left = 6.dp.toPx()
        val right = size.width - 6.dp.toPx()
        val top = 8.dp.toPx()
        val bottom = size.height - 10.dp.toPx()
        val height = max(bottom - top, 1f)
        val width = max(right - left, 1f)

        repeat(4) { index ->
            val y = top + (height / 3f) * index
            drawLine(
                color = PremiumColors.Line.copy(alpha = 0.72f),
                start = Offset(left, y),
                end = Offset(right, y),
                strokeWidth = 1.dp.toPx()
            )
        }

        fun pointAt(index: Int, value: Float): Offset {
            val x = if (values.size == 1) left else left + width * (index.toFloat() / (values.lastIndex).toFloat())
            val normalized = (value - chartMin) / range
            val y = bottom - normalized * height
            return Offset(x, y)
        }

        val linePath = Path()
        values.forEachIndexed { index, value ->
            val point = pointAt(index, value)
            if (index == 0) linePath.moveTo(point.x, point.y) else linePath.lineTo(point.x, point.y)
        }

        val areaPath = Path().apply {
            val first = pointAt(0, values.first())
            moveTo(first.x, bottom)
            lineTo(first.x, first.y)
            values.drop(1).forEachIndexed { index, value ->
                val point = pointAt(index + 1, value)
                lineTo(point.x, point.y)
            }
            lineTo(pointAt(values.lastIndex, values.last()).x, bottom)
            close()
        }

        val fillColors = colors.takeIf { it.isNotEmpty() } ?: PremiumBrandGradient.ChartArea
        drawPath(
            path = areaPath,
            brush = Brush.verticalGradient(fillColors, startY = top, endY = bottom)
        )
        drawPath(
            path = linePath,
            color = PremiumColors.Teal,
            style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
        )
        values.forEachIndexed { index, value ->
            drawCircle(
                color = PremiumColors.Surface,
                radius = 4.dp.toPx(),
                center = pointAt(index, value)
            )
            drawCircle(
                color = PremiumColors.Teal,
                radius = 2.25.dp.toPx(),
                center = pointAt(index, value)
            )
        }
    }
}

@Composable
fun PremiumGoogleIcon(modifier: Modifier = Modifier.size(24.dp)) {
    Canvas(modifier) {
        val stroke = Stroke(width = max(size.minDimension * 0.16f, 2.dp.toPx()), cap = StrokeCap.Round)
        val arcSize = Size(size.width * 0.72f, size.height * 0.72f)
        val topLeft = Offset(size.width * 0.14f, size.height * 0.14f)
        drawArc(ExternalBrandTokens.Google.Blue, startAngle = -38f, sweepAngle = 92f, useCenter = false, topLeft = topLeft, size = arcSize, style = stroke)
        drawArc(ExternalBrandTokens.Google.Green, startAngle = 54f, sweepAngle = 96f, useCenter = false, topLeft = topLeft, size = arcSize, style = stroke)
        drawArc(ExternalBrandTokens.Google.Yellow, startAngle = 150f, sweepAngle = 74f, useCenter = false, topLeft = topLeft, size = arcSize, style = stroke)
        drawArc(ExternalBrandTokens.Google.Red, startAngle = 224f, sweepAngle = 98f, useCenter = false, topLeft = topLeft, size = arcSize, style = stroke)
        drawLine(
            color = ExternalBrandTokens.Google.Blue,
            start = Offset(size.width * 0.54f, size.height * 0.50f),
            end = Offset(size.width * 0.88f, size.height * 0.50f),
            strokeWidth = stroke.width,
            cap = StrokeCap.Round
        )
    }
}

fun Modifier.navigationBarsPaddingIf(condition: Boolean) = if (condition) this.navigationBarsPadding() else this

// Motion sobre (T6) : le systeme « reduire les animations » est respecte partout.
// Lecture unique par composition : un changement du reglage systeme prend effet a la prochaine
// recreation d'activite (compromis assume, pas d'observer pour rester simple).
@Composable
fun premiumReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember(context) {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        ) == 0f
    }
}

// Transition d'ecran douce : fondu + leger glissement vertical, fondu sortant rapide.
@Composable
fun PremiumRouteTransition(
    route: PremiumRoute,
    modifier: Modifier = Modifier,
    content: @Composable (PremiumRoute) -> Unit
) {
    if (premiumReduceMotion()) {
        Box(modifier) { content(route) }
        return
    }
    AnimatedContent(
        targetState = route,
        modifier = modifier,
        transitionSpec = {
            (fadeIn(tween(220, easing = FastOutSlowInEasing)) +
                slideInVertically(tween(260, easing = FastOutSlowInEasing)) { it / 24 })
                .togetherWith(fadeOut(tween(140)))
        },
        // Les routes porteuses d'etat (recovery, lien Google) avancent par sous-etats :
        // on ne rejoue pas la transition a chaque tick, seulement au changement d'ecran.
        contentKey = { r ->
            when (r) {
                is PremiumRoute.AccountRecovery -> "account-recovery"
                is PremiumRoute.GoogleAccountLink -> "google-account-link"
                else -> r
            }
        },
        label = "PremiumRouteTransition"
    ) { animatedRoute ->
        content(animatedRoute)
    }
}

fun Modifier.premiumTap(onClick: () -> Unit) = this.clickable(
    interactionSource = null,
    indication = null,
    onClick = onClick
)

@Composable
fun PremiumAppShell(
    modifier: Modifier = Modifier,
    title: String = "",
    onBack: (() -> Unit)? = null,
    selectedTab: PremiumMainTab? = null,
    onTab: ((PremiumMainTab) -> Unit)? = null,
    profileInitials: String? = null,
    language: PremiumLanguageOption = PremiumLanguageOption.FR,
    content: @Composable (androidx.compose.foundation.layout.PaddingValues) -> Unit
) {
    Box(modifier.fillMaxSize()) {
        PremiumPaperBackground(Modifier.matchParentSize())
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = PremiumSpacing.ScreenHorizontalWide, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (onBack != null) {
                    CircleAction(Icons.AutoMirrored.Filled.ArrowBack, onClick = onBack)
                    Spacer(Modifier.width(16.dp))
                }
                PremiumTitle(modifier = Modifier.weight(1f), title = title)
                if (profileInitials != null) {
                    Surface(
                        Modifier.size(40.dp),
                        shape = CircleShape,
                        color = PremiumColors.Surface,
                        border = BorderStroke(1.dp, PremiumColors.Line)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Person, null, tint = PremiumColors.Teal, modifier = Modifier.size(22.dp))
                        }
                    }
                }
            }
            Box(Modifier.weight(1f)) {
                content(PaddingValues(
                    start = PremiumSpacing.ScreenHorizontalWide,
                    top = 16.dp,
                    end = PremiumSpacing.ScreenHorizontalWide,
                    bottom = 24.dp
                ))
            }
            if (selectedTab != null && onTab != null) {
                PremiumNavigationBar(selectedTab = selectedTab, onTab = onTab, language = language)
            }
        }
    }
}

@Composable
fun PremiumPaperBackground(
    modifier: Modifier = Modifier,
    useNaturalLightLayer: Boolean = true,
    useDragonRimLightLayer: Boolean = true,
    useSoftContrastLayer: Boolean = true,
    useMythBackgroundOverlay: Boolean = true,
    mythBackgroundOverlayAlpha: Float = 1f,
    mythBackgroundOverlayScale: Float = 1f,
    mythBackgroundOverlayOffsetX: Dp = 0.dp,
    mythBackgroundOverlayOffsetY: Dp = 0.dp
) {
    val context = LocalContext.current
    val backgroundResName = if (PremiumColors.IsDark) {
        "app_bg_dark_minimal_gradient"
    } else {
        "app_bg_light_minimal_gradient"
    }
    val backgroundRes = remember(context, backgroundResName) {
        context.resources.getIdentifier(
            backgroundResName,
            "drawable",
            context.packageName
        )
    }
    val backgroundAlpha = if (!PremiumColors.IsDark && useMythBackgroundOverlay) {
        mythBackgroundOverlayAlpha
    } else {
        1f
    }
    Box(modifier) {
        Box(Modifier.matchParentSize().background(PremiumColors.Background))
        if (backgroundRes != 0 && (PremiumColors.IsDark || useMythBackgroundOverlay)) {
            Image(
                painter = painterResource(id = backgroundRes),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .matchParentSize()
                    .graphicsLayer {
                        alpha = backgroundAlpha
                        scaleX = mythBackgroundOverlayScale
                        scaleY = mythBackgroundOverlayScale
                        translationX = mythBackgroundOverlayOffsetX.toPx()
                        translationY = mythBackgroundOverlayOffsetY.toPx()
                    }
            )
        }
        if (useNaturalLightLayer) {
            BackgroundMaterialVeil(Modifier.matchParentSize())
        }
        if (useDragonRimLightLayer) {
            BackgroundAmbientHalo(Modifier.matchParentSize())
        }
        if (useSoftContrastLayer) {
            BackgroundNavigationComfort(Modifier.matchParentSize())
        }
    }
}

@Composable
private fun BackgroundMaterialVeil(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val shadow = if (PremiumColors.IsDark) Color(0xFF0B0906) else Color(0xFF4C463C)

        drawRect(
            brush = Brush.verticalGradient(
                colors = listOf(
                    Color.White.copy(alpha = if (PremiumColors.IsDark) 0.018f else 0.18f),
                    Color.Transparent,
                    shadow.copy(alpha = if (PremiumColors.IsDark) 0.11f else 0.055f)
                )
            )
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color.White.copy(alpha = if (PremiumColors.IsDark) 0.026f else 0.038f),
                    Color.Transparent
                ),
                center = Offset(size.width * 0.50f, size.height * 0.26f),
                radius = size.minDimension * 0.92f
            ),
            radius = size.minDimension * 0.92f,
            center = Offset(size.width * 0.50f, size.height * 0.26f)
        )
    }
}

@Composable
private fun BackgroundAmbientHalo(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        if (PremiumColors.IsDark) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFD9A84E).copy(alpha = 0.08f),
                        Color(0xFF8A6A2E).copy(alpha = 0.035f),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.82f, size.height * 0.26f),
                    radius = size.minDimension * 0.58f
                ),
                radius = size.minDimension * 0.58f,
                center = Offset(size.width * 0.82f, size.height * 0.26f)
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF0E7B57).copy(alpha = 0.09f),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.16f, size.height * 0.78f),
                    radius = size.minDimension * 0.64f
                ),
                radius = size.minDimension * 0.64f,
                center = Offset(size.width * 0.16f, size.height * 0.78f)
            )
        } else {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFFFFFFF).copy(alpha = 0.20f),
                        Color(0xFFF1EADC).copy(alpha = 0.10f),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.84f, size.height * 0.30f),
                    radius = size.minDimension * 0.58f
                ),
                radius = size.minDimension * 0.58f,
                center = Offset(size.width * 0.84f, size.height * 0.30f)
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF1F1D1A).copy(alpha = 0.10f),
                        Color.Transparent
                    ),
                    center = Offset(size.width * 0.18f, size.height * 0.80f),
                    radius = size.minDimension * 0.68f
                ),
                radius = size.minDimension * 0.68f,
                center = Offset(size.width * 0.18f, size.height * 0.80f)
            )
        }
    }
}

@Composable
private fun BackgroundNavigationComfort(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val base = if (PremiumColors.IsDark) Color(0xFF0B0906) else Color(0xFF454033)
        if (!PremiumColors.IsDark) {
            drawRect(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF17140F).copy(alpha = 0.14f),
                        Color(0xFF3A342A).copy(alpha = 0.06f),
                        Color.Transparent
                    ),
                    startY = 0f,
                    endY = size.height * 0.16f
                ),
                topLeft = Offset.Zero,
                size = Size(size.width, size.height * 0.16f)
            )
        }
        drawRect(
            brush = Brush.verticalGradient(
                colors = listOf(
                    base.copy(alpha = if (PremiumColors.IsDark) 0.42f else 0.08f),
                    base.copy(alpha = if (PremiumColors.IsDark) 0.06f else 0.025f),
                    Color.Transparent,
                    base.copy(alpha = if (PremiumColors.IsDark) 0.08f else 0.03f),
                    base.copy(alpha = if (PremiumColors.IsDark) 0.48f else 0.12f)
                ),
                startY = 0f,
                endY = size.height
            )
        )
        drawCircle(
            brush = Brush.radialGradient(
                colors = listOf(
                    Color.White.copy(alpha = if (PremiumColors.IsDark) 0.035f else 0.045f),
                    Color.Transparent
                ),
                center = Offset(size.width * 0.50f, size.height * 0.38f),
                radius = size.minDimension * 0.86f
            ),
            radius = size.minDimension * 0.86f,
            center = Offset(size.width * 0.50f, size.height * 0.38f)
        )
    }
}

@Composable
fun PremiumStartupSplashScreen(modifier: Modifier = Modifier) {
    Box(
        modifier
            .fillMaxSize()
            .background(NoirColors.bg)
            .statusBarsPadding()
            .navigationBarsPadding(),
        contentAlignment = Alignment.Center
    ) {
        Box(
            Modifier
                .size(144.dp)
                .clip(RoundedCornerShape(38.dp))
                .background(NoirColors.bg),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(R.mipmap.ic_launcher_foreground),
                contentDescription = "SwimPay",
                modifier = Modifier.size(108.dp)
            )
        }
    }
}

@Composable
fun PremiumNavigationBar(
    selectedTab: PremiumMainTab,
    onTab: (PremiumMainTab) -> Unit,
    language: PremiumLanguageOption = PremiumLanguageOption.FR
) {
    Surface(
        Modifier
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .fillMaxWidth(),
        color = PremiumColors.Surface,
        shape = RoundedCornerShape(23.dp),
        border = BorderStroke(1.dp, PremiumColors.Line),
        shadowElevation = PremiumElevation.Card
    ) {
        Row(
            Modifier
                .padding(vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            PremiumMainTab.entries.forEach { tab ->
                val selected = tab == selectedTab
                val label = PremiumLocalizedCopy.forLanguage(language).mainTabLabel(tab)
                Column(
                    Modifier
                        .premiumTap { onTab(tab) }
                        .padding(horizontal = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Icon(
                        imageVector = premiumTabIcon(tab),
                        contentDescription = label,
                        tint = if (selected) PremiumColors.Ink else PremiumColors.SoftText,
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        text = label,
                        color = if (selected) PremiumColors.Ink else PremiumColors.SoftText,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Box(
                        Modifier
                            .size(4.dp)
                            .background(
                                if (selected) PremiumColors.Teal else Color.Transparent,
                                CircleShape
                            )
                    )
                }
            }
        }
    }
}

private fun premiumTabIcon(tab: PremiumMainTab): ImageVector = when (tab) {
    PremiumMainTab.Home -> Icons.Default.Home
    PremiumMainTab.Reviews -> Icons.AutoMirrored.Filled.ReceiptLong
    PremiumMainTab.Payment -> Icons.Default.AccountBalanceWallet
    PremiumMainTab.Business -> Icons.Default.Business
    PremiumMainTab.Settings -> Icons.Default.Settings
}
