package com.swimpay.receiver

/**
 * Universal money extractor for incoming bank notifications: amount + ISO currency,
 * position- and locale-agnostic. Replaces the RUB-only regexes in the live receiver
 * pipeline so USD / EUR / GBP / XOF incoming payments are detected, not just roubles.
 *
 * Minor-unit convention mirrors the backend currency model: 2-decimal currencies are stored
 * x100 (RUB kopecks, USD/EUR/GBP cents); zero-decimal West/Central-Africa CFA (XOF/XAF) x1.
 * A currency token (symbol or ISO code) must be present, before OR after the number — bare
 * numbers are never treated as money (no over-extraction).
 */
data class DetectedMoney(val amountMinor: Long, val currency: String)

object MoneyGrammar {
    private data class CurrencySpec(val iso: String, val decimals: Int, val tokens: List<String>)

    // FCFA / CFA resolve to XOF (the West-Africa product target, matching the backend
    // display_price model); XAF only via the explicit "xaf" code.
    private val currencies: List<CurrencySpec> = listOf(
        CurrencySpec("RUB", 2, listOf("₽", "руб.", "руб", "rub")),
        CurrencySpec("USD", 2, listOf("$", "usd")),
        CurrencySpec("EUR", 2, listOf("€", "eur")),
        CurrencySpec("GBP", 2, listOf("£", "gbp")),
        CurrencySpec("XOF", 0, listOf("fcfa", "f cfa", "cfa", "xof")),
        CurrencySpec("XAF", 0, listOf("xaf"))
    )

    // Longest tokens first so "руб." wins over "руб" and "fcfa" over "cfa".
    private val tokenAlt: String = currencies
        .flatMap { it.tokens }
        .distinct()
        .sortedByDescending { it.length }
        .joinToString("|") { Regex.escape(it) }

    // A number with optional thousands separators: digits, dot, comma, space, or the
    // non-breaking space (  — a regex escape, never a literal char in this source).
    private const val NUMBER = "\\d[\\d., \\u00A0]*\\d|\\d"
    private const val SEP = "[\\s\\u00A0]*"

    private val moneyRegex = Regex(
        "(?:($tokenAlt)$SEP($NUMBER)|($NUMBER)$SEP($tokenAlt))",
        RegexOption.IGNORE_CASE
    )

    /** Regex used to redact any "amount + currency" run to "<AMOUNT> <CURRENCY>". */
    val redactionRegex: Regex get() = moneyRegex

    /** First money value carrying a recognised currency token, or null. */
    fun detect(text: String): DetectedMoney? {
        for (match in moneyRegex.findAll(text)) {
            val token = match.groupValues[1].ifBlank { match.groupValues[4] }.lowercase().trim()
            val numberStr = match.groupValues[2].ifBlank { match.groupValues[3] }
            val spec = currencies.firstOrNull { c -> c.tokens.any { it.equals(token, ignoreCase = true) } } ?: continue
            val amount = parseAmountMinor(numberStr, spec.decimals) ?: continue
            return DetectedMoney(amount, spec.iso)
        }
        return null
    }

    private fun parseAmountMinor(raw: String, decimals: Int): Long? {
        val compact = raw.filter { !it.isWhitespace() }
        if (decimals == 0) {
            return compact.filter { it.isDigit() }.toLongOrNull()
        }
        // 2-decimal: a trailing "[.,]dd" (1-2 digits) is the decimal part; any other
        // separators are thousands groupings.
        val decimal = Regex("[.,](\\d{1,2})$").find(compact)
        return if (decimal != null) {
            val whole = compact.substring(0, decimal.range.first).filter { it.isDigit() }.ifBlank { "0" }
            val frac = decimal.groupValues[1].padEnd(2, '0').take(2)
            whole.toLong() * 100 + frac.toLong()
        } else {
            compact.filter { it.isDigit() }.toLongOrNull()?.times(100)
        }
    }
}
