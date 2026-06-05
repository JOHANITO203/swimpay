// packages/contracts/src/currency-detection.ts
/**
 * Pure currency detection from a merchant-surface formatted price string
 * ("1 000 FCFA", "$10.99", "999 ₽", "€9.99"). Native currencies (RUB/USD/XOF)
 * pass through; any other recognised currency is flagged needs_conversion
 * (converted to USD upstream). Ambiguity is rejected, never guessed.
 */

export type CurrencyDetectionResult =
  | { kind: 'detected'; currency: string; amount_minor: number; needs_conversion: boolean; raw_input: string }
  | { kind: 'ambiguous'; raw_input: string }
  | { kind: 'invalid_amount'; raw_input: string };

const NATIVE_CURRENCIES = new Set(['RUB', 'USD', 'XOF']);

/** Minor digits per detected currency; aligned with apps/api currencyMinorDigits(). */
const DETECTION_MINOR_DIGITS: Readonly<Record<string, number>> = {
  RUB: 2, USD: 2, EUR: 2, GBP: 2, XOF: 0, XAF: 0, JPY: 0,
  CAD: 2, AUD: 2, CHF: 2, CNY: 2, TRY: 2, AED: 2, KZT: 2, UAH: 2, NGN: 2, GHS: 2
};

/**
 * Marker tables, longest-first so 'US$' wins over '$' and 'F CFA' over 'CFA'.
 * Policy: a bare '$' is USD; prefixed dollars (CA$, A$, ...) are ambiguous.
 */
const CURRENCY_MARKERS: ReadonlyArray<{ marker: string; currency: string }> = [
  { marker: 'F CFA', currency: 'XOF' },
  { marker: 'FCFA', currency: 'XOF' },
  { marker: 'CFA', currency: 'XOF' },
  { marker: 'РУБ.', currency: 'RUB' },
  { marker: 'РУБ', currency: 'RUB' },
  { marker: 'Р.', currency: 'RUB' },
  { marker: '₽', currency: 'RUB' },
  { marker: 'US$', currency: 'USD' },
  { marker: '$', currency: 'USD' },
  { marker: '€', currency: 'EUR' },
  { marker: '£', currency: 'GBP' }
];

const ISO_CODES = new Set(Object.keys(DETECTION_MINOR_DIGITS));

export function detectCurrencyFromDisplayPrice(input: string): CurrencyDetectionResult {
  const raw = input;
  const trimmed = input.trim().toUpperCase().replace(/ /g, ' '); // nbsp -> space
  if (!trimmed) {
    return { kind: 'ambiguous', raw_input: raw };
  }

  // Prefixed dollar (CA$, A$, NZ$ ...) is ambiguous unless the prefix is US.
  if (/[A-Z]\$/u.test(trimmed) && !/US\$/u.test(trimmed)) {
    return { kind: 'ambiguous', raw_input: raw };
  }

  let currency: string | null = null;
  let numericPart = trimmed;

  // 1. Standalone ISO code (word-bounded).
  const isoMatch = trimmed.match(/(?:^|[\s])([A-Z]{3})(?:[\s.]|$)/u);
  if (isoMatch?.[1] && ISO_CODES.has(isoMatch[1])) {
    currency = isoMatch[1];
    numericPart = trimmed.replace(isoMatch[1], ' ');
  } else if (isoMatch?.[1] && !CURRENCY_MARKERS.some((m) => trimmed.includes(m.marker))) {
    // A 3-letter code we do not recognise (BTC, ...) and no symbol → never guess.
    return { kind: 'ambiguous', raw_input: raw };
  }

  // 2. Symbol / word markers (longest first).
  if (!currency) {
    for (const { marker, currency: markerCurrency } of CURRENCY_MARKERS) {
      if (trimmed.includes(marker)) {
        currency = markerCurrency;
        numericPart = trimmed.replace(marker, ' ');
        break;
      }
    }
  }

  if (!currency) {
    return { kind: 'ambiguous', raw_input: raw };
  }

  const minorDigits = DETECTION_MINOR_DIGITS[currency] ?? 2;
  const amountMinor = parseDisplayAmountMinor(numericPart.trim(), minorDigits);
  if (amountMinor === null) {
    return { kind: 'invalid_amount', raw_input: raw };
  }

  return {
    kind: 'detected',
    currency,
    amount_minor: amountMinor,
    needs_conversion: !NATIVE_CURRENCIES.has(currency),
    raw_input: raw
  };
}

/**
 * Decidable separator rules:
 * - spaces are always grouping;
 * - both '.' and ',' present → the LAST one is the decimal separator;
 * - a single '.' or ',' followed by exactly 3 digits → grouping; 1–2 digits → decimal;
 * - 0-decimal currencies accept grouping only (a decimal part is invalid_amount);
 * - anything else (sign, letters, second decimal) → invalid.
 */
function parseDisplayAmountMinor(value: string, minorDigits: number): number | null {
  const compact = value.replace(/\s/g, '');
  if (!/^[\d.,]+$/u.test(compact)) {
    return null;
  }

  const lastDot = compact.lastIndexOf('.');
  const lastComma = compact.lastIndexOf(',');
  let integerPart = compact;
  let decimalPart = '';

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSeparatorIndex = Math.max(lastDot, lastComma);
    integerPart = compact.slice(0, decimalSeparatorIndex);
    decimalPart = compact.slice(decimalSeparatorIndex + 1);
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separatorIndex = Math.max(lastDot, lastComma);
    const tail = compact.slice(separatorIndex + 1);
    const head = compact.slice(0, separatorIndex);
    const isLoneSeparator = compact.indexOf('.') === lastDot && compact.indexOf(',') === lastComma;
    if (isLoneSeparator && tail.length === 3) {
      integerPart = head + tail; // grouping: 1,000 / 1.000
    } else if (isLoneSeparator && tail.length >= 1 && tail.length <= 2) {
      integerPart = head;
      decimalPart = tail; // decimal: 10,50 / 1.5
    } else {
      // repeated same-separator grouping: 1.000.000
      const groups = compact.split(/[.,]/u);
      if (groups.length > 1 && groups.slice(1).every((g) => g.length === 3) && (groups[0]?.length ?? 0) >= 1) {
        integerPart = groups.join('');
      } else {
        return null;
      }
    }
  }

  integerPart = integerPart.replace(/[.,]/gu, '');
  if (!/^\d+$/u.test(integerPart)) {
    return null;
  }
  if (decimalPart && !/^\d{1,2}$/u.test(decimalPart)) {
    return null;
  }
  if (minorDigits === 0 && decimalPart) {
    return null;
  }

  const factor = 10 ** minorDigits;
  const minorFromDecimal = decimalPart ? Number.parseInt(decimalPart.padEnd(minorDigits, '0'), 10) : 0;
  const amount = Number.parseInt(integerPart, 10) * factor + minorFromDecimal;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}
