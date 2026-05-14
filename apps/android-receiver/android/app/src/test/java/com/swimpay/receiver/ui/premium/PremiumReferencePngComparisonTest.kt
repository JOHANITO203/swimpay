package com.swimpay.receiver.ui.premium

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import java.io.File
import java.util.Locale
import kotlin.math.sqrt
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class PremiumReferencePngComparisonTest {
    @Test
    fun targetGoldensHaveReferencePixelMetrics() {
        val root = File("../../../..").canonicalFile
        val referenceDir = File(root, "design/reference/android-merchant")
        val goldenDir = File("src/test/snapshots")
        val reportFile = File(root, ".swimpay-agent/ANDROID_MERCHANT_REFERENCE_PIXEL_DIFF_REPORT.md")

        assertTrue("missing reference directory: ${referenceDir.path}", referenceDir.isDirectory)
        assertTrue("missing golden directory: ${goldenDir.path}", goldenDir.isDirectory)

        val rows = TargetReferenceScreens.map { screen ->
            val reference = referenceDir.listFiles()
                ?.firstOrNull { it.name.startsWith(screen.substring(0, 2)) && it.extension == "png" }
                ?: error("missing reference PNG for $screen")
            val golden = File(goldenDir, "$screen.png")
            assertTrue("missing golden PNG for $screen", golden.isFile)

            val referenceImage = BitmapFactory.decodeFile(reference.path) ?: error("cannot decode ${reference.path}")
            val goldenImage = BitmapFactory.decodeFile(golden.path) ?: error("cannot decode ${golden.path}")
            val normalizedReference = normalizeReference(referenceImage, goldenImage.width, goldenImage.height)
            val metrics = compare(normalizedReference, goldenImage)

            ReferenceDiffRow(
                screen = screen,
                referenceName = reference.name,
                referenceSize = "${referenceImage.width}x${referenceImage.height}",
                goldenSize = "${goldenImage.width}x${goldenImage.height}",
                meanAbsoluteDelta = metrics.meanAbsoluteDelta,
                rmsDelta = metrics.rmsDelta,
                matchLevel = metrics.matchLevel
            )
        }

        reportFile.parentFile?.mkdirs()
        reportFile.writeText(buildReport(rows))

        assertTrue(
            "reference PNG comparison did not evaluate all 14 targets",
            rows.size == TargetReferenceScreens.size
        )
    }

    private fun normalizeReference(source: Bitmap, targetWidth: Int, targetHeight: Int): Bitmap {
        val targetRatio = targetWidth.toDouble() / targetHeight.toDouble()
        val sourceRatio = source.width.toDouble() / source.height.toDouble()
        val cropWidth: Int
        val cropHeight: Int
        val cropX: Int
        val cropY: Int

        if (sourceRatio > targetRatio) {
            cropHeight = source.height
            cropWidth = (cropHeight * targetRatio).toInt().coerceAtMost(source.width)
            cropX = (source.width - cropWidth) / 2
            cropY = 0
        } else {
            cropWidth = source.width
            cropHeight = (cropWidth / targetRatio).toInt().coerceAtMost(source.height)
            cropX = 0
            cropY = 0
        }

        val output = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        canvas.drawBitmap(
            source,
            Rect(cropX, cropY, cropX + cropWidth, cropY + cropHeight),
            Rect(0, 0, targetWidth, targetHeight),
            paint
        )
        return output
    }

    private fun compare(reference: Bitmap, golden: Bitmap): ReferenceDiffMetrics {
        var absoluteDelta = 0.0
        var squaredDelta = 0.0
        val pixelCount = reference.width * reference.height

        for (y in 0 until reference.height) {
            for (x in 0 until reference.width) {
                val ref = reference.getPixel(x, y)
                val got = golden.getPixel(x, y)
                val dr = (Color.red(ref) - Color.red(got)).toDouble()
                val dg = (Color.green(ref) - Color.green(got)).toDouble()
                val db = (Color.blue(ref) - Color.blue(got)).toDouble()
                absoluteDelta += (kotlin.math.abs(dr) + kotlin.math.abs(dg) + kotlin.math.abs(db)) / (3.0 * 255.0)
                squaredDelta += (dr * dr + dg * dg + db * db) / (3.0 * 255.0 * 255.0)
            }
        }

        val mean = absoluteDelta / pixelCount
        val rms = sqrt(squaredDelta / pixelCount)
        return ReferenceDiffMetrics(
            meanAbsoluteDelta = mean,
            rmsDelta = rms,
            matchLevel = when {
                mean <= 0.08 -> "close"
                mean <= 0.16 -> "partial"
                else -> "reference-drift"
            }
        )
    }

    private fun buildReport(rows: List<ReferenceDiffRow>): String {
        return buildString {
            appendLine("# Android Merchant Reference Pixel Diff Report")
            appendLine()
            appendLine("Date: 2026-05-13")
            appendLine()
            appendLine("This automated comparison normalizes each reference PNG to the Roborazzi golden viewport, then computes color-distance metrics.")
            appendLine("It is a measurement aid, not a pixel-perfect gate, because the provided references include Android system chrome and taller device captures.")
            appendLine()
            appendLine("| Screen | Reference | Ref size | Golden size | Mean abs delta | RMS delta | Automated level |")
            appendLine("| --- | --- | --- | --- | --- | --- | --- |")
            rows.forEach { row ->
                appendLine(
                    "| `${row.screen}` | `${row.referenceName}` | ${row.referenceSize} | ${row.goldenSize} | ${"%.4f".format(Locale.US, row.meanAbsoluteDelta)} | ${"%.4f".format(Locale.US, row.rmsDelta)} | ${row.matchLevel} |"
                )
            }
            appendLine()
            appendLine("Pixel-perfect is not claimed. Roborazzi remains the drift gate for implemented Compose screens.")
        }
    }

    private data class ReferenceDiffMetrics(
        val meanAbsoluteDelta: Double,
        val rmsDelta: Double,
        val matchLevel: String
    )

    private data class ReferenceDiffRow(
        val screen: String,
        val referenceName: String,
        val referenceSize: String,
        val goldenSize: String,
        val meanAbsoluteDelta: Double,
        val rmsDelta: Double,
        val matchLevel: String
    )

    private companion object {
        private val TargetReferenceScreens = listOf(
            "01_login_welcome",
            "02_notification_access",
            "03_bank_selection",
            "04_receiving_setup",
            "05_site_app_setup",
            "06_webhook_test",
            "07_dashboard_home",
            "08_review_queue",
            "09_review_detail",
            "10_receiving_methods",
            "11_integrations_list",
            "12_integration_detail",
            "13_receiver_health",
            "14_security_settings"
        )
    }
}
