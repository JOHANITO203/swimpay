package com.swimpay.receiver.ui.premium

import com.swimpay.receiver.R
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SignalWifiOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PremiumAppShell(
    selectedTab: PremiumMainTab,
    onTab: (PremiumMainTab) -> Unit,
    profileInitials: String = "S.",
    content: @Composable () -> Unit
) {
    Box(Modifier.fillMaxSize().background(PremiumColors.Surface)) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            PremiumTopChrome(profileInitials = profileInitials)
            Box(Modifier.weight(1f)) { content() }
            PremiumBottomNav(selectedTab, onTab)
        }
    }
}

@Composable
fun PremiumTopChrome(profileInitials: String = "S.") {
    Row(
        Modifier
            .fillMaxWidth()
            .height(PremiumSpacing.TopChromeHeight)
            .padding(horizontal = 22.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Box(
            Modifier.size(26.dp).background(PremiumColors.Navy, RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            SwimPayWavesMark(Modifier.size(PremiumIconSize.Small), tint = PremiumColors.Cyan)
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Surface(Modifier.size(34.dp), shape = CircleShape, color = PremiumColors.Surface, shadowElevation = 2.dp) {
                Icon(Icons.Default.DarkMode, null, tint = PremiumColors.Muted, modifier = Modifier.padding(8.dp))
            }
            Box {
                Box(Modifier.size(42.dp).background(PremiumColors.Blue, CircleShape), contentAlignment = Alignment.Center) {
                    Text(profileInitials, color = PremiumColors.Surface, fontWeight = FontWeight.Black)
                }
                Box(Modifier.align(Alignment.TopEnd).size(9.dp).background(PremiumColors.Success, CircleShape))
            }
        }
    }
}

@Composable
fun PremiumBottomNav(selected: PremiumMainTab, onTab: (PremiumMainTab) -> Unit) {
    val tabs = listOf(
        PremiumMainTab.Home to Icons.Default.Home,
        PremiumMainTab.Reviews to Icons.AutoMirrored.Filled.ReceiptLong,
        PremiumMainTab.Payment to Icons.Default.AccountBalanceWallet,
        PremiumMainTab.Business to Icons.Default.Business,
        PremiumMainTab.Settings to Icons.Default.Settings,
    )
    Box(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .height(96.dp)
            .padding(horizontal = 14.dp, vertical = 10.dp)
    ) {
        Surface(
            Modifier.fillMaxSize(),
            color = PremiumColors.Surface,
            shadowElevation = 16.dp,
            shape = RoundedCornerShape(30.dp)
        ) {
            Row(Modifier.fillMaxSize().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.SpaceAround, verticalAlignment = Alignment.CenterVertically) {
                tabs.forEach { item ->
                    val active = selected == item.first
                    Column(
                        Modifier
                            .premiumTap { onTab(item.first) }
                            .padding(horizontal = 6.dp, vertical = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            Modifier
                                .size(if (active) 38.dp else 32.dp)
                                .background(
                                    if (active) PremiumColors.Blue else Color.Transparent,
                                    RoundedCornerShape(14.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(item.second, item.first.accessibilityLabel, tint = if (active) PremiumColors.Surface else PremiumColors.Muted, modifier = Modifier.size(22.dp))
                        }
                        Text(
                            item.first.navLabel,
                            color = if (active) PremiumColors.Blue else PremiumColors.Muted,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun <T> PremiumStatePanel(
    state: PremiumScreenState<T>,
    modifier: Modifier = Modifier,
    onAction: () -> Unit = {}
) {
    val icon = when (state) {
        is PremiumScreenState.ActionRequired -> Icons.Default.Info
        is PremiumScreenState.Empty -> Icons.Default.Info
        is PremiumScreenState.Error -> Icons.Default.ErrorOutline
        is PremiumScreenState.Loading -> Icons.Default.HourglassEmpty
        is PremiumScreenState.Offline -> Icons.Default.SignalWifiOff
        is PremiumScreenState.Content -> Icons.Default.CheckCircle
    }
    PremiumCard(modifier.fillMaxWidth(), radius = PremiumRadius.Card) {
        Column(
            Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(Modifier.size(58.dp).background(PremiumColors.Mint, RoundedCornerShape(22.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = PremiumColors.Blue, modifier = Modifier.size(28.dp))
            }
            Text(state.title, color = PremiumColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.Black, textAlign = TextAlign.Center)
            Text(state.message, color = PremiumColors.Muted, fontSize = 14.sp, lineHeight = 21.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
            state.actionLabel?.let {
                PremiumOutlineButton(it, Modifier.padding(top = 4.dp), onAction)
            }
        }
    }
}

@Composable
fun SwimPayLogo(markSize: Dp = 52.dp) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier.size(markSize).background(PremiumColors.Navy, RoundedCornerShape((markSize.value / 4).dp)),
            contentAlignment = Alignment.Center
        ) {
            // Keeps the runtime brand tied to the registered official launcher asset.
            Icon(painterResource(R.mipmap.ic_launcher), null, tint = Color.Unspecified, modifier = Modifier.size(markSize * 0.64f))
        }
        Spacer(Modifier.height(12.dp))
        Text(
            buildAnnotatedString {
                append("Swim")
                withStyle(SpanStyle(color = PremiumColors.Cyan)) { append("Pay") }
            },
            color = PremiumColors.Ink,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black
        )
    }
}

@Composable
fun SwimPayWavesMark(modifier: Modifier = Modifier, tint: Color = PremiumColors.Cyan) {
    Canvas(modifier) {
        val strokeWidth = size.minDimension * 0.18f
        val style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
        val left = size.width * 0.2f
        val right = size.width * 0.8f
        val top = size.height * 0.34f
        val middle = size.height * 0.5f
        val bottom = size.height * 0.66f
        drawLine(tint, Offset(left, top), Offset(right, top), strokeWidth = strokeWidth, cap = StrokeCap.Round)
        drawLine(tint, Offset(left, middle), Offset(right, middle), strokeWidth = strokeWidth, cap = StrokeCap.Round)
        drawLine(tint, Offset(left, bottom), Offset(right, bottom), strokeWidth = strokeWidth, cap = StrokeCap.Round)
        drawArc(
            color = tint,
            startAngle = 90f,
            sweepAngle = 180f,
            useCenter = false,
            topLeft = Offset(size.width * 0.08f, size.height * 0.22f),
            size = Size(size.width * 0.32f, size.height * 0.56f),
            style = style
        )
    }
}

@Composable
fun PremiumCard(
    modifier: Modifier = Modifier,
    radius: Dp = PremiumRadius.Card,
    color: Color = PremiumColors.Surface,
    content: @Composable () -> Unit
) {
    Surface(
        modifier.shadow(18.dp, RoundedCornerShape(radius)),
        color = color,
        shape = RoundedCornerShape(radius),
        content = content
    )
}

@Composable
fun Modifier.premiumTap(onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.97f else 1f,
        animationSpec = spring(stiffness = 650f, dampingRatio = 0.72f),
        label = "premiumTapScale"
    )
    return this
        .scale(scale)
        .clickable(
            interactionSource = source,
            indication = null,
            onClick = onClick
        )
}

@Composable
fun PremiumGradientPanel(
    modifier: Modifier = Modifier,
    radius: Dp = PremiumRadius.CardLarge,
    content: @Composable () -> Unit
) {
    Box(
        modifier
            .shadow(18.dp, RoundedCornerShape(radius))
            .background(
                Brush.linearGradient(
                    colors = listOf(PremiumColors.Blue, Color(0xFF1E7BF0), PremiumColors.ElectricBlue)
                ),
                RoundedCornerShape(radius)
            )
    ) {
        content()
    }
}

@Composable
fun PremiumIconTile(icon: ImageVector, size: Dp, tint: Color = PremiumColors.Cyan) {
    Box(
        Modifier.size(size).background(PremiumColors.Navy, RoundedCornerShape(size / 3f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(size * 0.52f))
    }
}

@Composable
fun PremiumGoogleIcon(modifier: Modifier = Modifier.size(26.dp)) {
    Canvas(modifier) {
        val strokeWidth = size.minDimension * 0.16f
        val arcStyle = Stroke(width = strokeWidth, cap = StrokeCap.Round)
        val inset = strokeWidth / 2f
        val arcBounds = Size(size.width - strokeWidth, size.height - strokeWidth)
        drawArc(ExternalBrandTokens.Google.Blue, startAngle = -35f, sweepAngle = 105f, useCenter = false, topLeft = Offset(inset, inset), size = arcBounds, style = arcStyle)
        drawArc(ExternalBrandTokens.Google.Green, startAngle = 70f, sweepAngle = 70f, useCenter = false, topLeft = Offset(inset, inset), size = arcBounds, style = arcStyle)
        drawArc(ExternalBrandTokens.Google.Yellow, startAngle = 140f, sweepAngle = 75f, useCenter = false, topLeft = Offset(inset, inset), size = arcBounds, style = arcStyle)
        drawArc(ExternalBrandTokens.Google.Red, startAngle = 215f, sweepAngle = 110f, useCenter = false, topLeft = Offset(inset, inset), size = arcBounds, style = arcStyle)
        drawLine(
            ExternalBrandTokens.Google.Blue,
            start = Offset(size.width * 0.52f, size.height * 0.52f),
            end = Offset(size.width * 0.88f, size.height * 0.52f),
            strokeWidth = strokeWidth,
            cap = StrokeCap.Round
        )
    }
}

@Composable
fun PremiumPrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    val buttonModifier = modifier
        .fillMaxWidth()
        .height(PremiumComponentSize.ButtonHeight)
        .clip(RoundedCornerShape(PremiumRadius.Button))
        .background(
            if (enabled) {
                Brush.linearGradient(PremiumBrandGradient.PrimaryDeep)
            } else {
                Brush.linearGradient(PremiumBrandGradient.Disabled)
            },
            RoundedCornerShape(PremiumRadius.Button)
        )
    Box(
        if (enabled) buttonModifier.premiumTap(onClick) else buttonModifier,
        contentAlignment = Alignment.Center
    ) {
        Text(text.uppercase(), color = PremiumColors.Surface, fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.5.sp)
    }
}

@Composable
fun PremiumOutlineButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .fillMaxWidth()
            .height(PremiumComponentSize.ButtonHeight)
            .clip(RoundedCornerShape(PremiumRadius.Button))
            .background(PremiumColors.Surface, RoundedCornerShape(PremiumRadius.Button))
            .border(1.dp, PremiumColors.Line, RoundedCornerShape(PremiumRadius.Button))
            .premiumTap(onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(text.uppercase(), color = PremiumColors.Navy, fontWeight = FontWeight.Black, fontSize = 12.sp, letterSpacing = 1.2.sp)
    }
}

@Composable
fun PremiumBlueButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .fillMaxWidth()
            .height(PremiumComponentSize.ButtonHeight)
            .clip(RoundedCornerShape(PremiumRadius.Button))
            .background(
                Brush.linearGradient(PremiumBrandGradient.Primary),
                RoundedCornerShape(PremiumRadius.Button)
            )
            .premiumTap(onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(text.uppercase(), color = PremiumColors.Surface, fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.5.sp)
    }
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        color = PremiumColors.SoftText,
        fontSize = 10.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 3.sp,
        modifier = modifier.padding(bottom = 14.dp)
    )
}

@Composable
fun StatusChip(text: String, tone: StatusTone, modifier: Modifier = Modifier) {
    val (bg, fg) = when (tone) {
        StatusTone.Success -> PremiumColors.Mint to PremiumColors.Success
        StatusTone.Warning -> Color(0xFFFFF2DD) to Color(0xFFB45309)
        StatusTone.Info -> PremiumColors.IconTile to PremiumColors.Blue
        StatusTone.Neutral -> PremiumColors.NeutralChip to PremiumColors.Ink
    }
    Surface(modifier, color = bg, shape = CircleShape) {
        Text(text, color = fg, fontSize = 11.sp, fontWeight = FontWeight.Black, modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp))
    }
}

enum class StatusTone {
    Success,
    Warning,
    Info,
    Neutral
}

@Composable
fun CircleAction(icon: ImageVector, onClick: () -> Unit = {}) {
    Surface(Modifier.size(42.dp).premiumTap(onClick), shape = CircleShape, color = PremiumColors.Surface, shadowElevation = PremiumElevation.Card) {
        Icon(icon, null, tint = PremiumColors.Navy, modifier = Modifier.padding(10.dp))
    }
}

@Composable
fun TrendLine(
    modifier: Modifier = Modifier,
    primaryValues: List<Float> = emptyList(),
    secondaryValues: List<Float> = emptyList()
) {
    Canvas(modifier) {
        repeat(5) {
            val y = size.height * (it + 1) / 6f
            drawLine(PremiumColors.Line, Offset(0f, y), Offset(size.width, y), strokeWidth = 1.5f)
        }
        fun normalizedPoints(values: List<Float>, maxValue: Float): List<Offset> {
            if (values.isEmpty()) return emptyList()
            val denominator = maxOf(1, values.lastIndex).toFloat()
            return values.mapIndexed { index, value ->
                val x = if (values.size == 1) size.width / 2f else size.width * (index / denominator)
                val y = size.height - (size.height * 0.82f * (value.coerceAtLeast(0f) / maxValue.coerceAtLeast(1f))) - size.height * 0.09f
                Offset(x, y.coerceIn(size.height * 0.08f, size.height * 0.92f))
            }
        }

        fun drawSeries(values: List<Float>, color: Color, strokeWidth: Float) {
            val maxValue = values.maxOrNull()?.coerceAtLeast(1f) ?: return
            val points = normalizedPoints(values, maxValue)
            when (points.size) {
                0 -> Unit
                1 -> drawCircle(color, radius = strokeWidth, center = points.first())
                else -> {
                    val path = Path().apply {
                        moveTo(points.first().x, points.first().y)
                        points.drop(1).forEach { lineTo(it.x, it.y) }
                    }
                    drawPath(path, color = color, style = Stroke(width = strokeWidth, cap = StrokeCap.Round))
                }
            }
        }

        drawSeries(primaryValues, PremiumColors.Blue, 7f)
        drawSeries(secondaryValues, PremiumColors.Success, 4f)
    }
}

@Composable
fun PremiumTitle(title: String, body: String? = null, centered: Boolean = false) {
    Text(
        title,
        color = PremiumColors.Ink,
        fontSize = PremiumType.Hero,
        lineHeight = 34.sp,
        fontWeight = FontWeight.Black,
        textAlign = if (centered) TextAlign.Center else TextAlign.Start,
        modifier = Modifier.fillMaxWidth()
    )
    if (body != null) {
        Text(
            body,
            color = PremiumColors.Muted,
            fontSize = PremiumType.Body,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 23.sp,
            textAlign = if (centered) TextAlign.Center else TextAlign.Start,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 28.dp)
        )
    }
}

@Composable
fun ItalicReadyTitle() {
    Text(
        buildAnnotatedString {
            append("Prêt à ")
            withStyle(SpanStyle(color = PremiumColors.Cyan, fontStyle = FontStyle.Italic)) { append("Scanner") }
            append(".")
        },
        color = PremiumColors.Ink,
        fontSize = 30.sp,
        fontWeight = FontWeight.Black,
        textAlign = TextAlign.Center
    )
}

@Composable
fun Chevron() {
    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = Color(0xFFB7B7B7))
}
