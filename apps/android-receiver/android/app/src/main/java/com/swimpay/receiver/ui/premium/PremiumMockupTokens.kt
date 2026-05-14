package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.max

object PremiumMockupColors {
    val Black = Color(0xFF000407)
    val DeepNavy = Color(0xFF020817)
    val Night = Color(0xFF07111F)
    val Card = Color(0xE00A121E)
    val CardStrong = Color(0xF50A121E)
    val Field = Color(0x4DFFFFFF)
    val Border = Color(0x14FFFFFF)
    val BorderSoft = Color(0x14FFFFFF)
    val Highlight = Color(0x1F2491FF)
    val White = Color(0xFFF8FAFC)
    val Muted = Color(0xADBFFFFFFF)
    val MutedDark = Color(0x73FFFFFF)
    val Cyan = Color(0xFF23D8F3)
    val Green = Color(0xFF39FF88)
    val GreenDeep = Color(0xFF22C55E)
    val Lime = Color(0xFF9BF24A)
    val Blue = Color(0xFF2491FF)
    val Warning = Color(0xFFFFC933)
    val Purple = Color(0xFF8B5CF6)
    val Danger = Color(0xFFFF4D6D)
}

object PremiumMockupRadius {
    val Card = 11.dp
    val CardLarge = 13.dp
    val Field = 8.dp
    val Button = 9.dp
    val Pill = 999.dp
}

object PremiumMockupSpacing {
    val ScreenHorizontal = 24.dp
    val Section = 22.dp
    val CardPadding = 22.dp
}

object PremiumMockupGradient {
    val Background = listOf(
        PremiumMockupColors.DeepNavy,
        PremiumMockupColors.Night,
        PremiumMockupColors.DeepNavy
    )
    val Primary = listOf(
        PremiumMockupColors.Cyan,
        Color(0xFF4EE6A5),
        PremiumMockupColors.Lime
    )
    val Glass = listOf(
        Color(0xF50B121E),
        Color(0xEB070D18)
    )
}

@Composable
fun mockupSp(value: Int): TextUnit {
    val scaled = value * 0.58f
    val minimum = when {
        value >= 28 -> 24f
        value >= 22 -> 22f
        value >= 18 -> 16f
        value >= 15 -> 14f
        value >= 13 -> 13f
        else -> 12f
    }
    return max(scaled, minimum).sp
}

fun mockupDp(value: Int): Dp {
    return (value * 0.58f).dp
}

@Composable
fun MockupScreenBackground(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier.background(
            Brush.verticalGradient(PremiumMockupGradient.Background)
        )
    ) {
        Canvas(Modifier.matchParentSize()) {
            drawCircle(
                color = PremiumMockupColors.Blue.copy(alpha = 0.055f),
                radius = size.width * 0.42f,
                center = Offset(size.width * -0.05f, size.height * 0.08f)
            )
            drawCircle(
                color = PremiumMockupColors.Green.copy(alpha = 0.04f),
                radius = size.width * 0.5f,
                center = Offset(size.width * 0.96f, size.height * 0.3f)
            )
        }
        content()
    }
}

@Composable
fun MockupGlassCard(
    modifier: Modifier = Modifier,
    radius: Dp = PremiumMockupRadius.Card,
    border: Color = PremiumMockupColors.BorderSoft,
    content: @Composable () -> Unit
) {
    Card(
        modifier = modifier
            .border(BorderStroke(1.dp, border), RoundedCornerShape(radius)),
        shape = RoundedCornerShape(radius),
        colors = CardDefaults.cardColors(containerColor = PremiumMockupColors.Card),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        content = { content() }
    )
}

@Composable
fun MockupTopBar(
    title: String,
    stepLabel: String? = null,
    onBack: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Row(
        modifier
            .fillMaxWidth()
            .height(58.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .size(42.dp)
                .premiumTap { onBack?.invoke() },
            contentAlignment = Alignment.Center
        ) {
            if (onBack != null) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    null,
                    tint = PremiumMockupColors.White,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
        Text(
            title,
            modifier = Modifier.weight(1f),
            color = PremiumMockupColors.White,
            fontSize = mockupSp(20),
            lineHeight = mockupSp(24),
            fontWeight = FontWeight.Black,
            textAlign = TextAlign.Center
        )
        Box(Modifier.width(48.dp), contentAlignment = Alignment.CenterEnd) {
            if (stepLabel != null) {
                Text(stepLabel, color = PremiumMockupColors.Green, fontSize = mockupSp(17), fontWeight = FontWeight.Black)
            }
        }
    }
}

@Composable
fun MockupStepIndicator(currentStep: Int, totalSteps: Int = 6, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(totalSteps) { index ->
            Box(
                Modifier
                    .weight(1f)
                    .height(4.dp)
                    .background(
                        Brush.horizontalGradient(
                            if (index < currentStep) PremiumMockupGradient.Primary else listOf(
                                PremiumMockupColors.Border,
                                PremiumMockupColors.BorderSoft
                            )
                        ),
                        CircleShape
                    )
            )
        }
    }
}

@Composable
fun MockupStatusChip(text: String, tone: Color = PremiumMockupColors.Green, modifier: Modifier = Modifier) {
    Row(
        modifier
            .background(tone.copy(alpha = 0.14f), RoundedCornerShape(PremiumMockupRadius.Pill))
            .border(1.dp, tone.copy(alpha = 0.55f), RoundedCornerShape(PremiumMockupRadius.Pill))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Icon(Icons.Default.CheckCircle, null, tint = tone, modifier = Modifier.size(15.dp))
        Text(text, color = tone, fontSize = mockupSp(12), fontWeight = FontWeight.Black)
    }
}

@Composable
fun MockupInfoBanner(
    title: String,
    body: String,
    icon: ImageVector = Icons.Default.Info,
    tone: Color = PremiumMockupColors.Blue,
    modifier: Modifier = Modifier
) {
    MockupGlassCard(modifier, radius = 18.dp, border = tone.copy(alpha = 0.55f)) {
        Row(
            Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(icon, null, tint = tone, modifier = Modifier.size(30.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                if (title.isNotBlank()) {
                    Text(title, color = PremiumMockupColors.White, fontSize = mockupSp(15), fontWeight = FontWeight.Black)
                }
                Text(body, color = PremiumMockupColors.Muted, fontSize = mockupSp(13), lineHeight = mockupSp(18), fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
fun MockupBulletLine(
    text: String,
    icon: ImageVector = Icons.Default.Check,
    tone: Color = PremiumMockupColors.Green,
    modifier: Modifier = Modifier
) {
    Row(
        modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Icon(icon, null, tint = tone, modifier = Modifier.size(20.dp))
        Text(text, color = PremiumMockupColors.Muted, fontSize = mockupSp(14), lineHeight = mockupSp(19), fontWeight = FontWeight.Medium)
    }
}

@Composable
fun MockupLogo(modifier: Modifier = Modifier) {
    Row(
        modifier,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        MockupSwimPayMark(Modifier.size(width = 66.dp, height = 46.dp))
        Text(
            buildAnnotatedString {
                append("Swim")
                withStyle(SpanStyle(color = PremiumMockupColors.Green)) { append("Pay") }
            },
            color = PremiumMockupColors.White,
            fontSize = mockupSp(31),
            fontWeight = FontWeight.Black
        )
    }
}

@Composable
fun MockupSwimPayMark(modifier: Modifier = Modifier) {
    Canvas(modifier) {
        val cyan = PremiumMockupColors.Cyan
        val green = PremiumMockupColors.Green
    val stroke = Stroke(width = size.minDimension * 0.2f, cap = StrokeCap.Round)
        val top = Path().apply {
            moveTo(size.width * 0.78f, size.height * 0.16f)
            cubicTo(size.width * 0.5f, size.height * 0.12f, size.width * 0.2f, size.height * 0.2f, size.width * 0.17f, size.height * 0.43f)
            cubicTo(size.width * 0.14f, size.height * 0.65f, size.width * 0.52f, size.height * 0.58f, size.width * 0.58f, size.height * 0.76f)
        }
        val bottom = Path().apply {
            moveTo(size.width * 0.18f, size.height * 0.82f)
            cubicTo(size.width * 0.34f, size.height * 0.6f, size.width * 0.72f, size.height * 0.84f, size.width * 0.68f, size.height * 0.53f)
        }
        drawPath(top, cyan, style = stroke)
        drawPath(bottom, green, style = stroke)
        drawOval(
            color = Color.Black.copy(alpha = 0.58f),
            topLeft = Offset(size.width * 0.28f, size.height * 0.38f),
            size = Size(size.width * 0.4f, size.height * 0.2f),
            style = Stroke(width = size.minDimension * 0.08f, cap = StrokeCap.Round)
        )
    }
}

@Composable
fun MockupIconTile(
    icon: ImageVector,
    modifier: Modifier = Modifier,
    tint: Color = PremiumMockupColors.Green,
    size: Dp = 62.dp
) {
    Box(
        modifier
            .size(size)
            .background(Color(0x2928E879), RoundedCornerShape(20.dp))
            .border(1.dp, PremiumMockupColors.Green.copy(alpha = 0.24f), RoundedCornerShape(20.dp)),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(size * 0.48f))
    }
}

@Composable
fun MockupInputRow(
    icon: ImageVector,
    placeholder: String,
    trailing: ImageVector? = null
) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 44.dp)
            .background(PremiumMockupColors.Field, RoundedCornerShape(PremiumMockupRadius.Field))
            .border(1.dp, PremiumMockupColors.Border, RoundedCornerShape(PremiumMockupRadius.Field))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(placeholder, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(14), fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        trailing?.let { Icon(it, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(24.dp)) }
    }
}

@Composable
fun MockupPrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(
        modifier
            .fillMaxWidth()
            .height(46.dp)
            .background(
                Brush.horizontalGradient(
                    if (enabled) PremiumMockupGradient.Primary else listOf(
                        PremiumMockupColors.Border,
                        PremiumMockupColors.BorderSoft
                    )
                ),
                RoundedCornerShape(PremiumMockupRadius.Button)
            )
            .premiumTap { if (enabled) onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = Color(0xFF02070A), fontSize = mockupSp(17), fontWeight = FontWeight.Black)
        Icon(
            Icons.AutoMirrored.Filled.ArrowForward,
            null,
            tint = Color(0xFF02070A),
            modifier = Modifier.align(Alignment.CenterEnd).padding(end = 20.dp).size(26.dp)
        )
    }
}

@Composable
fun MockupOutlineButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Row(
        modifier
            .fillMaxWidth()
            .height(46.dp)
            .border(
                1.5.dp,
                if (enabled) PremiumMockupColors.Green else PremiumMockupColors.Border,
                RoundedCornerShape(PremiumMockupRadius.Button)
            )
            .premiumTap { if (enabled) onClick() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        val tone = if (enabled) PremiumMockupColors.Green else PremiumMockupColors.MutedDark
        Icon(Icons.Default.PersonAdd, null, tint = tone, modifier = Modifier.size(28.dp))
        Spacer(Modifier.width(14.dp))
        Text(text, color = tone, fontSize = mockupSp(16), fontWeight = FontWeight.Black)
    }
}

@Composable
fun MockupTruthBanner(modifier: Modifier = Modifier) {
    MockupGlassCard(modifier, radius = 18.dp) {
        Row(
            Modifier.padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                Modifier.size(36.dp).background(Color(0x1FFFFFFF), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Lock, null, tint = PremiumMockupColors.Muted, modifier = Modifier.size(20.dp))
            }
            Text(
                "SwimPay n'est pas une banque et ne fournit\npas de confirmation bancaire officielle.",
                color = PremiumMockupColors.Muted,
                fontSize = mockupSp(13),
                lineHeight = mockupSp(18),
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f)
            )
            Icon(Icons.Default.Info, null, tint = PremiumMockupColors.MutedDark, modifier = Modifier.size(22.dp))
        }
    }
}

@Composable
fun MockupFeature(label: String, body: String, icon: ImageVector, modifier: Modifier = Modifier) {
    androidx.compose.foundation.layout.Column(
        modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            Modifier.size(38.dp).background(Color(0x1FFFFFFF), RoundedCornerShape(13.dp)).border(1.dp, PremiumMockupColors.BorderSoft, RoundedCornerShape(13.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = PremiumMockupColors.Green, modifier = Modifier.size(23.dp))
        }
        Spacer(Modifier.height(8.dp))
        Text(label, color = PremiumMockupColors.White, fontSize = mockupSp(13), fontWeight = FontWeight.Medium, textAlign = TextAlign.Center)
        Text(body, color = PremiumMockupColors.MutedDark, fontSize = mockupSp(11), lineHeight = mockupSp(15), textAlign = TextAlign.Center)
    }
}
