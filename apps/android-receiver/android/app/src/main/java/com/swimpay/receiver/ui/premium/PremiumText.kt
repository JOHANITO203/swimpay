package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.Hyphens
import androidx.compose.ui.text.style.LineBreak
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private fun premiumNoBrokenWordStyle(
    fontSize: TextUnit,
    lineHeight: TextUnit,
    fontWeight: FontWeight
): TextStyle {
    return TextStyle(
        fontSize = fontSize,
        lineHeight = lineHeight,
        fontWeight = fontWeight,
        lineBreak = LineBreak.Heading,
        hyphens = Hyphens.None
    )
}

@Composable
fun PremiumScreenTitle(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = PremiumMockupColors.White,
    maxLines: Int = 2
) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(mockupSp(25), mockupSp(31), FontWeight.Black),
        maxLines = maxLines,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumSectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        color = PremiumMockupColors.White,
        style = premiumNoBrokenWordStyle(mockupSp(19), mockupSp(24), FontWeight.Black),
        maxLines = 2,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumCardTitle(text: String, modifier: Modifier = Modifier, color: Color = PremiumMockupColors.White) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(mockupSp(17), mockupSp(22), FontWeight.Black),
        maxLines = 2,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumMetricValue(text: String, modifier: Modifier = Modifier, color: Color = PremiumMockupColors.White) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(mockupSp(28), mockupSp(34), FontWeight.Black),
        maxLines = 2,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumBodyText(text: String, modifier: Modifier = Modifier, color: Color = PremiumMockupColors.Muted) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(mockupSp(14), mockupSp(20), FontWeight.SemiBold),
        maxLines = 4,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumLabelText(text: String, modifier: Modifier = Modifier, color: Color = PremiumMockupColors.Muted) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(mockupSp(13), mockupSp(17), FontWeight.Bold),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumBottomNavLabel(text: String, color: Color, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(10.sp, 12.sp, FontWeight.Bold),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumStatusChipText(text: String, color: Color, modifier: Modifier = Modifier) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        style = premiumNoBrokenWordStyle(mockupSp(11), mockupSp(14), FontWeight.Black),
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun PremiumDashboardGreeting(merchantName: String, modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier.fillMaxWidth()) {
        if (maxWidth < 315.dp) {
            Column(Modifier.fillMaxWidth()) {
                PremiumScreenTitle("Bonjour,", maxLines = 1)
                PremiumScreenTitle(merchantName, color = PremiumMockupColors.Green, maxLines = 1)
            }
        } else {
            Row(Modifier.fillMaxWidth()) {
                Text(
                    text = buildAnnotatedString {
                        append("Bonjour, ")
                        withStyle(SpanStyle(color = PremiumMockupColors.Green)) {
                            append(merchantName)
                        }
                    },
                    color = PremiumMockupColors.White,
                    style = premiumNoBrokenWordStyle(mockupSp(28), mockupSp(34), FontWeight.Black),
                    softWrap = false,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
