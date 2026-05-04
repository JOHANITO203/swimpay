package com.swimpay.receiver

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class AndroidMerchantViewComponents(private val context: Context) {
    fun screenContainer(): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(28), dp(22), dp(28))
            setBackgroundColor(AndroidMerchantColors.SURFACE)
        }
    }

    fun brandHeader(onBack: (() -> Unit)? = null): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = matchWrap().withMargins(bottom = dp(8))

            if (onBack != null) {
                addView(iconButton("‹", onBack))
            } else {
                addView(View(context).apply { layoutParams = LinearLayout.LayoutParams(dp(44), dp(44)) })
            }

            addView(LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                addView(TextView(context).apply {
                    text = "S"
                    textSize = 25f
                    setTypeface(AndroidMerchantTypography.title, Typeface.BOLD)
                    setTextColor(Color.WHITE)
                    gravity = Gravity.CENTER
                    background = GradientDrawable(
                        GradientDrawable.Orientation.TL_BR,
                        intArrayOf(AndroidMerchantColors.CYAN, AndroidMerchantColors.TEAL)
                    ).apply { cornerRadius = dp(18).toFloat() }
                    layoutParams = LinearLayout.LayoutParams(dp(54), dp(54)).withMargins(right = dp(12))
                })
                addView(TextView(context).apply {
                    text = "SwimPay"
                    textSize = 33f
                    setTypeface(AndroidMerchantTypography.title, Typeface.BOLD)
                    setTextColor(AndroidMerchantColors.DEEP_NAVY)
                    gravity = Gravity.CENTER
                })
            })

            addView(View(context).apply { layoutParams = LinearLayout.LayoutParams(dp(44), dp(44)) })
        }
    }

    fun waveBand(): View {
        return object : View(context) {
            private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dp(2).toFloat()
                color = AndroidMerchantColors.CYAN
                alpha = 34
            }

            override fun onDraw(canvas: Canvas) {
                super.onDraw(canvas)
                val w = width.toFloat()
                repeat(10) { index ->
                    val y = dp(18 + index * 3).toFloat()
                    val path = Path().apply {
                        moveTo(0f, y)
                        cubicTo(w * 0.25f, y + dp(35), w * 0.45f, y - dp(35), w, y + dp(12))
                    }
                    canvas.drawPath(path, paint)
                }
            }
        }.apply {
            layoutParams = matchWrap().apply { height = dp(86) }.withMargins(bottom = dp(14))
        }
    }

    fun pageHeader(title: String, subtitle: String? = null, badge: String? = null): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            layoutParams = matchWrap().withMargins(bottom = dp(26))
            addView(TextView(context).apply {
                text = title
                textSize = 38f
                setTypeface(AndroidMerchantTypography.title, Typeface.BOLD)
                setTextColor(AndroidMerchantColors.DEEP_NAVY)
                gravity = Gravity.CENTER
                includeFontPadding = true
                maxLines = 3
            })
            subtitle?.let {
                addView(TextView(context).apply {
                    text = it
                    textSize = 18f
                    setTextColor(AndroidMerchantColors.MUTED)
                    gravity = Gravity.CENTER
                    setLineSpacing(dp(2).toFloat(), 1.0f)
                    layoutParams = matchWrap().withMargins(top = dp(12))
                })
            }
            badge?.let {
                addView(statusChip(it, "info").apply {
                    layoutParams = wrapWrap().withMargins(top = dp(16))
                })
            }
        }
    }

    fun card(children: List<View>, selected: Boolean = false): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(24), dp(24), dp(24))
            background = rounded(
                color = if (selected) Color.rgb(244, 254, 253) else AndroidMerchantColors.SURFACE,
                radiusDp = 30,
                strokeColor = if (selected) AndroidMerchantColors.TEAL else AndroidMerchantColors.BORDER,
                strokeWidthDp = if (selected) 2 else 1
            )
            elevation = dp(5).toFloat()
            layoutParams = matchWrap().withMargins(bottom = dp(18))
            children.forEach { addView(it) }
        }
    }

    fun rowCard(
        iconText: String,
        title: String,
        subtitle: String? = null,
        trailing: String? = null,
        selected: Boolean = false,
            onClick: (() -> Unit)? = null
    ): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = dp(92)
            setPadding(dp(18), dp(18), dp(18), dp(18))
            background = rounded(
                color = if (selected) Color.rgb(244, 254, 253) else AndroidMerchantColors.SURFACE,
                radiusDp = 26,
                strokeColor = if (selected) AndroidMerchantColors.TEAL else AndroidMerchantColors.BORDER,
                strokeWidthDp = if (selected) 2 else 1
            )
            elevation = dp(4).toFloat()
            layoutParams = matchWrap().withMargins(bottom = dp(16))
            if (onClick != null) setOnClickListener { onClick() }

            addView(iconBubble(iconText))
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).withMargins(left = dp(16))
                addView(label(title, 20f, AndroidMerchantColors.DEEP_NAVY, bold = true))
                subtitle?.let { addView(label(it, 16f, AndroidMerchantColors.MUTED)) }
            })
            trailing?.let {
                addView(TextView(context).apply {
                    text = it
                    textSize = 18f
                    setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
                    setTextColor(if (selected) AndroidMerchantColors.TEAL else Color.rgb(170, 180, 192))
                    gravity = Gravity.CENTER
                    layoutParams = LinearLayout.LayoutParams(dp(42), dp(42))
                })
            }
        }
    }

    fun metricCard(label: String, value: String, icon: String): LinearLayout {
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
            background = rounded(AndroidMerchantColors.SURFACE, 22, AndroidMerchantColors.BORDER, 1)
            elevation = dp(2).toFloat()
            addView(iconBubble(icon, 44))
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).withMargins(left = dp(12))
                addView(label(label, 13f, AndroidMerchantColors.DEEP_NAVY, bold = true))
                addView(label(value, 26f, AndroidMerchantColors.DEEP_NAVY, bold = true))
            })
        }
    }

    fun primaryButton(text: String, onClick: () -> Unit): Button {
        return Button(context).apply {
            this.text = text
            textSize = 20f
            isAllCaps = false
            setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
            setTextColor(Color.WHITE)
            background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(AndroidMerchantColors.TEAL, Color.rgb(0, 98, 137))
            ).apply { cornerRadius = dp(24).toFloat() }
            setOnClickListener { onClick() }
            layoutParams = matchWrap().withMargins(top = dp(18), bottom = dp(12))
            minHeight = dp(72)
        }
    }

    fun outlineButton(text: String, danger: Boolean = false, onClick: () -> Unit): Button {
        return Button(context).apply {
            this.text = text
            textSize = 16f
            isAllCaps = false
            setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
            setTextColor(if (danger) AndroidMerchantColors.DANGER else AndroidMerchantColors.TEAL)
            background = rounded(AndroidMerchantColors.SURFACE, AndroidMerchantSpacing.BUTTON_RADIUS_DP, if (danger) AndroidMerchantColors.DANGER else AndroidMerchantColors.TEAL, 1)
            setOnClickListener { onClick() }
            layoutParams = matchWrap().withMargins(top = dp(8))
            minHeight = dp(54)
        }
    }

    fun statusChip(text: String, variant: String): TextView {
        val color = when (variant) {
            "success" -> AndroidMerchantColors.SUCCESS
            "warning" -> AndroidMerchantColors.WARNING
            "danger" -> AndroidMerchantColors.DANGER
            else -> AndroidMerchantColors.TEAL
        }
        val bg = when (variant) {
            "success" -> Color.rgb(229, 250, 240)
            "warning" -> Color.rgb(255, 247, 224)
            "danger" -> Color.rgb(255, 238, 238)
            else -> AndroidMerchantColors.MINT_LIGHT
        }
        return TextView(context).apply {
            this.text = text
            textSize = 13f
            setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
            setTextColor(color)
            setPadding(dp(14), dp(7), dp(14), dp(7))
            background = rounded(bg, AndroidMerchantSpacing.PILL_RADIUS_DP, Color.TRANSPARENT, 0)
        }
    }

    fun title(text: String): TextView = label(text, 22f, AndroidMerchantColors.DEEP_NAVY, bold = true)

    fun body(text: String): TextView = label(text, 15f, AndroidMerchantColors.MUTED)

    fun label(text: String, size: Float, color: Int, bold: Boolean = false): TextView {
        return TextView(context).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            if (bold) setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
            setLineSpacing(dp(2).toFloat(), 1.0f)
        }
    }

    fun bottomNav(active: AndroidMerchantVisualScreen, navigate: (AndroidMerchantVisualScreen) -> Unit): LinearLayout {
        val items = listOf(
            Triple(AndroidMerchantVisualScreen.DASHBOARD, "Accueil", "⌂"),
            Triple(AndroidMerchantVisualScreen.REVIEW_QUEUE, "Revue", "✓"),
            Triple(AndroidMerchantVisualScreen.RECEIVING_METHODS, "Commandes", "▣"),
            Triple(AndroidMerchantVisualScreen.RECEIVER_HEALTH, "Plus", "…")
        )
        return LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(10), dp(8), dp(10))
            background = rounded(AndroidMerchantColors.SURFACE, 28, AndroidMerchantColors.BORDER, 1)
            elevation = dp(5).toFloat()
            layoutParams = matchWrap().withMargins(top = dp(12))
            items.forEach { (screen, label, icon) ->
                addView(LinearLayout(context).apply {
                    orientation = LinearLayout.VERTICAL
                    gravity = Gravity.CENTER
                    setPadding(dp(8), dp(6), dp(8), dp(6))
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    setOnClickListener { navigate(screen) }
                    addView(TextView(context).apply {
                        text = icon
                        textSize = 22f
                        gravity = Gravity.CENTER
                        setTextColor(if (active == screen) AndroidMerchantColors.TEAL else AndroidMerchantColors.MUTED)
                    })
                    addView(TextView(context).apply {
                        text = label
                        textSize = 12f
                        gravity = Gravity.CENTER
                        setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
                        setTextColor(if (active == screen) AndroidMerchantColors.TEAL else AndroidMerchantColors.MUTED)
                    })
                })
            }
        }
    }

    private fun iconButton(text: String, onClick: () -> Unit): TextView {
        return TextView(context).apply {
            this.text = text
            textSize = 32f
            setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
            setTextColor(AndroidMerchantColors.TEAL)
            gravity = Gravity.CENTER
            background = rounded(AndroidMerchantColors.SURFACE, 18, AndroidMerchantColors.BORDER, 1)
            setOnClickListener { onClick() }
            layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
        }
    }

    private fun iconBubble(text: String, sizeDp: Int = 58): TextView {
        return TextView(context).apply {
            this.text = text
            textSize = if (text.length > 2) 12f else 24f
            setTypeface(AndroidMerchantTypography.strong, Typeface.BOLD)
            setTextColor(AndroidMerchantColors.TEAL)
            gravity = Gravity.CENTER
            background = rounded(AndroidMerchantColors.MINT_LIGHT, 999, Color.TRANSPARENT, 0)
            layoutParams = LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp))
        }
    }

    fun rounded(color: Int, radiusDp: Int, strokeColor: Int, strokeWidthDp: Int): GradientDrawable {
        return GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radiusDp).toFloat()
            if (strokeWidthDp > 0) setStroke(dp(strokeWidthDp), strokeColor)
        }
    }

    fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()

    fun matchWrap(): LinearLayout.LayoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    )

    fun wrapWrap(): LinearLayout.LayoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.WRAP_CONTENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
    )
}

fun LinearLayout.LayoutParams.withMargins(
    left: Int = 0,
    top: Int = 0,
    right: Int = 0,
    bottom: Int = 0
): LinearLayout.LayoutParams {
    setMargins(left, top, right, bottom)
    return this
}
