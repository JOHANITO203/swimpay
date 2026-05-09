package com.swimpay.sdk

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.Button

enum class SwimPayButtonState {
    Ready,
    Loading,
    Disabled
}

data class SwimPayButtonConfig(
    val text: String = "Payer avec SwimPay",
    val loadingText: String = "Ouverture...",
    val disabledText: String = "Paiement indisponible",
    val contentDescription: String = "Payer avec SwimPay",
    val minHeightDp: Int = 56,
    val horizontalPaddingDp: Int = 22,
    val cornerRadiusDp: Int = 18,
    val backgroundColor: Int = Color.rgb(0, 151, 167),
    val disabledBackgroundColor: Int = Color.rgb(183, 194, 204),
    val textColor: Int = Color.WHITE
)

object SwimPayButton {
    fun create(
        context: Context,
        config: SwimPayButtonConfig = SwimPayButtonConfig(),
        state: SwimPayButtonState = SwimPayButtonState.Ready,
        onClick: (View) -> Unit
    ): Button {
        return Button(context).apply {
            isAllCaps = false
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
            contentDescription = config.contentDescription
            minHeight = context.dp(config.minHeightDp)
            setPadding(
                context.dp(config.horizontalPaddingDp),
                0,
                context.dp(config.horizontalPaddingDp),
                0
            )
            setOnClickListener { view ->
                if (isEnabled) {
                    onClick(view)
                }
            }
            bind(this, state, config)
        }
    }

    fun bind(
        button: Button,
        state: SwimPayButtonState,
        config: SwimPayButtonConfig = SwimPayButtonConfig()
    ) {
        val enabled = state == SwimPayButtonState.Ready
        button.isEnabled = enabled
        button.text = when (state) {
            SwimPayButtonState.Ready -> config.text
            SwimPayButtonState.Loading -> config.loadingText
            SwimPayButtonState.Disabled -> config.disabledText
        }
        button.setTextColor(config.textColor)
        button.background = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = button.context.dp(config.cornerRadiusDp).toFloat()
            setColor(if (enabled) config.backgroundColor else config.disabledBackgroundColor)
        }
        button.alpha = if (state == SwimPayButtonState.Loading) 0.82f else 1f
    }

    private fun Context.dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }
}
