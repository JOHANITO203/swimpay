package com.swimpay.receiver

/**
 * International wallet (wallet_transfer) receiver identifier — the Android mirror of the
 * backend `normalizeWalletIdentifier` (apps/api/src/orders.ts) and the
 * `receiver_identifier_type` domain (`email | tag | phone`).
 *
 * A wallet_transfer route (Wise / Revolut / Payoneer) is addressed by ONE of three
 * identifier kinds, derived from the value itself — exactly the backend's rule — so the
 * client validates the same thing the server will accept and never invents a format the
 * backend would reject. The raw (trimmed) value is what is sent as `receiver_identifier`;
 * the backend re-normalises, encrypts and masks it. The local [mask] mirrors the backend
 * masking only for the optimistic pre-reload display; the authoritative masked value comes
 * from the route list response (`receiver_identifier_masked`).
 */
enum class WalletIdentifierKind { EMAIL, TAG, PHONE }

data class NormalizedWalletIdentifier(
    val kind: WalletIdentifierKind,
    /** Display/normalised form (email lowercased, tag with leading @, phone as +<digits>). */
    val normalized: String
)

object WalletReceiverIdentifier {
    private val EMAIL_REGEX = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$")
    private val TAG_REGEX = Regex("^[a-z0-9_]{3,32}$")

    /**
     * Mirror of backend `normalizeWalletIdentifier`: e-mail, @tag, or international phone;
     * null when none matches. Order matters (email before tag) exactly as the backend.
     */
    fun normalize(value: String): NormalizedWalletIdentifier? {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return null
        if (trimmed.contains('@') && !trimmed.startsWith('@')) {
            val email = trimmed.lowercase()
            return if (EMAIL_REGEX.matches(email)) NormalizedWalletIdentifier(WalletIdentifierKind.EMAIL, email) else null
        }
        if (trimmed.startsWith('@')) {
            val tag = trimmed.drop(1).lowercase()
            return if (TAG_REGEX.matches(tag)) NormalizedWalletIdentifier(WalletIdentifierKind.TAG, "@$tag") else null
        }
        val digits = trimmed.filter { it.isDigit() }
        return if (digits.length in 8..15) NormalizedWalletIdentifier(WalletIdentifierKind.PHONE, "+$digits") else null
    }

    fun isValid(value: String): Boolean = normalize(value) != null

    /**
     * Local optimistic mask mirroring the backend masking shapes:
     *  - email: `f•••@•••.com`
     *  - tag:   `@f•••nd` (first + last 2 when long enough) or `@•••g`
     *  - phone: `+••• ••• ••23` (last 2 digits)
     * Returns a neutral placeholder when the value is not a recognised identifier.
     */
    fun mask(value: String): String {
        val normalized = normalize(value) ?: return "••••"
        return when (normalized.kind) {
            WalletIdentifierKind.EMAIL -> {
                val tld = normalized.normalized.substringAfterLast('.', "")
                "${normalized.normalized.first()}•••@•••${if (tld.isNotEmpty()) ".$tld" else ""}"
            }
            WalletIdentifierKind.TAG -> {
                val body = normalized.normalized.drop(1)
                if (body.length > 3) "@${body.first()}•••${body.takeLast(2)}" else "@•••${body.takeLast(1)}"
            }
            WalletIdentifierKind.PHONE -> {
                val digits = normalized.normalized.filter { it.isDigit() }
                "+••• ••• ••${digits.takeLast(2)}"
            }
        }
    }
}
