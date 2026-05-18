package com.swimpay.receiver.ui.premium

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35])
class PremiumBackgroundMaterialPolishScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun capturesLightMaterialBackgroundPolish() {
        capture("background_material_polish_light_390x844.png", dark = false)
    }

    @Test
    fun capturesDarkMaterialBackgroundPolish() {
        capture("background_material_polish_dark_390x844.png", dark = true)
    }

    private fun capture(name: String, dark: Boolean) {
        PremiumColors.useDarkTheme(dark)
        composeRule.setContent {
            BackgroundPolishFixture(dark = dark)
        }
        composeRule.onRoot().captureRoboImage(filePath = "../../../../.swimpay-agent/screenshots/$name")
    }
}

@Composable
private fun BackgroundPolishFixture(dark: Boolean) {
    PremiumColors.useDarkTheme(dark)
    Box(Modifier.size(width = 390.dp, height = 844.dp)) {
        PremiumPaperBackground(Modifier.matchParentSize())
        Column(
            modifier = Modifier
                .matchParentSize()
                .padding(horizontal = PremiumSpacing.ScreenHorizontalWide, vertical = 34.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(
                    text = if (dark) "Dashboard dark" else "Dashboard light",
                    color = PremiumColors.Ink,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black
                )
                Spacer(Modifier.height(18.dp))
                CardVisual(
                    modifier = Modifier.fillMaxWidth().height(214.dp),
                    theme = if (dark) {
                        CardVisualDefaults.HomeDashboardDark
                    } else {
                        CardVisualDefaults.HomeDashboardDragonGoldMaterial
                    }
                ) {
                    MonthlyActivityCardDetails("Paiements recus", "12 450 RUB", true, PremiumLanguageOption.FR)
                }
                Spacer(Modifier.height(18.dp))
                LiquidGlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    radius = PremiumRadius.Card,
                    color = PremiumColors.Surface.copy(alpha = if (dark) 0.86f else 0.82f)
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text("Activite recente", color = PremiumColors.Ink, fontSize = 16.sp, fontWeight = FontWeight.Black)
                        Spacer(Modifier.height(14.dp))
                        PolishRow("Signal reconnu", Icons.Default.Notifications)
                        Spacer(Modifier.height(12.dp))
                        PolishRow("Review marchand", Icons.Default.CheckCircle)
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                PolishTile("Solde", Icons.Default.AccountBalanceWallet, Modifier.weight(1f))
                PolishTile("Suivi", Icons.Default.CheckCircle, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PolishRow(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .background(PremiumColors.IconTile, RoundedCornerShape(14.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, null, tint = PremiumColors.Cyan, modifier = Modifier.size(20.dp))
        }
        Spacer(Modifier.width(12.dp))
        Text(label, color = PremiumColors.Muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun PolishTile(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .height(92.dp)
            .background(PremiumColors.SurfaceAlt.copy(alpha = 0.84f), RoundedCornerShape(24.dp))
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Color.White.copy(alpha = 0.82f), modifier = Modifier.size(22.dp))
            Spacer(Modifier.width(10.dp))
            Text(label, color = PremiumColors.Ink, fontSize = 14.sp, fontWeight = FontWeight.Black)
        }
    }
}
