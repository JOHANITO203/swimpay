package com.swimpay.receiver

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AndroidPremiumTextIntegrityTest {
    private val premiumUiRoot = File("src/main/java/com/swimpay/receiver/ui/premium")

    @Test
    fun premiumUiSourceMustNotContainReplacementCharactersOrMojibake() {
        val badPatterns = listOf(
            "\uFFFD",
            "\u00C3",
            "\u00E2\u201A",
            "\u00E2\u20AC\u00A2",
            "\u00E2\u20AC\u2122",
            "Aper\uFFFD",
            "Aujourd\uFFFD",
            "v\uFFFDrification",
            "r\uFFFDception",
            "d\uFFFDtection",
            "op\uFFFDrationnelle",
            "donn\uFFFDes",
            "m\uFFFDthodes",
            "s\uFFFDcurit\uFFFD",
            "t\uFFFDl\uFFFDphone"
        )
        val offenders = premiumUiRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .flatMap { file ->
                val text = file.readText(Charsets.UTF_8)
                badPatterns
                    .filter { pattern -> text.contains(pattern) }
                    .map { pattern -> "${file.relativeTo(premiumUiRoot)} contains $pattern" }
            }
            .toList()

        assertTrue(offenders.joinToString("\n"), offenders.isEmpty())
    }

    @Test
    fun bottomNavLabelsMustStayReadableAndFrench() {
        val source = File(premiumUiRoot, "PremiumNavigationState.kt").readText(Charsets.UTF_8)

        listOf("Accueil", "En attente", "Récepteurs", "Intégrations", "Paramètres").forEach { label ->
            assertTrue("Missing bottom nav label: $label", source.contains(label))
        }
        assertFalse(source.contains("R\u00C3\u00A9cepteurs"))
        assertFalse(source.contains("Int\u00C3\u00A9grations"))
        assertFalse(source.contains("Param\u00C3\u00A8tres"))
    }

    @Test
    fun dashboardHeaderMustUseResponsiveGreetingComponent() {
        val source = File(premiumUiRoot, "PremiumDashboardScreens.kt").readText(Charsets.UTF_8)

        assertTrue(source.contains("PremiumDashboardGreeting(\"Merchant\")"))
        assertTrue(source.contains("PremiumBodyText(\"Aper\\u00E7u de votre activit\\u00E9 aujourd\\u2019hui\")"))
        assertFalse(source.contains("Row {\n                            Text(\"Bonjour, \")"))
    }

    @Test
    fun importantTextHelpersMustDisableHyphenation() {
        val source = File(premiumUiRoot, "PremiumText.kt").readText(Charsets.UTF_8)

        assertTrue(source.contains("Hyphens.None"))
        assertTrue(source.contains("LineBreak.Heading"))
        assertTrue(source.contains("PremiumScreenTitle"))
        assertTrue(source.contains("PremiumBottomNavLabel"))
        assertTrue(source.contains("PremiumStatusChipText"))
    }

    @Test
    fun premiumCurrencyFixturesMustNotRenderBrokenRubleSymbol() {
        val source = premiumUiRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { it.readText(Charsets.UTF_8) }

        assertFalse(source.contains("₽"))
        assertFalse(Regex("""\d[\d\s,.]*\?""").containsMatchIn(source))
        assertTrue(source.contains("RUB"))
    }

    @Test
    fun premiumFrenchLabelsMustKeepAccents() {
        val source = premiumUiRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { it.readText(Charsets.UTF_8) }

        listOf("A verifier", "Priorite", "Qualite", "Apres", "Elements", "Apercu", "aujourd hui").forEach { downgraded ->
            assertFalse("Downgraded French label found: $downgraded", source.contains(downgraded))
        }
        listOf("À vérifier", "Priorité", "Qualité", "Après", "Éléments", "Aperçu").forEach { accented ->
            assertTrue("Expected accented label missing: $accented", source.contains(accented))
        }
    }
}
