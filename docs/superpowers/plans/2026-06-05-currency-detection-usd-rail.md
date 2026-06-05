# Currency Detection + USD Neobank Rail + WA Reduction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect order currency from a formatted `display_price` (RUB/USD/XOF native, anything else FX-converted to USD), open the USD receiving rail via international neobanks (Wise/Revolut/Payoneer), reduce West Africa registries to Wave CI / Orange Money CI / MTN MoMo CI, and enrich the `payment.confirmed` webhook with detection + routing metadata.

**Spec:** `docs/superpowers/specs/2026-06-05-currency-detection-usd-rail-design.md`

**Architecture:** Pure detection module in `@swimpay/contracts` (shared, zero I/O) → async amount resolution in the order-creation handler (`apps/api`) with an injectable `FxRateService` (frankfurter.dev, in-process cache TTL 1h / stale 24h) → existing currency-symmetry invariant reused for the final currency → FX trace persisted on `orders` → threaded through `ReviewActionResult` → `buildReviewActionEvent` → webhook payload.

**Deviation from spec (documented):** the FX cache is **in-process** (injectable clock/fetch, trivially testable), not Valkey. Rates are public data; per-instance caching is correct for the single-API deployment. A Valkey adapter can be added later without changing the `FxRateService` interface.

**Tech Stack:** TypeScript (npm workspaces), Fastify, PostgreSQL (raw SQL migrations in `packages/database/migrations/`), vitest. Run all commands from repo root (`D:\Dev\Projects\swimpay`). Tests: `npx vitest run <file>`; full suite `npm test`; types `npm run typecheck`.

**Conventions:** SQL migrations are plain `.sql`, additive + idempotent (`IF NOT EXISTS`, `ON CONFLICT`). Conventional commits (`feat(...)`, `docs(...)`). Never delete DB rows — soft-disable. Match surrounding code style (no semicolint surprises: the repo uses semicolons, 2-space indent, single quotes).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `packages/contracts/src/currency-detection.ts` | Create | Pure `detectCurrencyFromDisplayPrice()` — markers, separators, minor units |
| `packages/contracts/src/currency-detection.test.ts` | Create | Golden parsing cases |
| `packages/contracts/src/index.ts` | Modify | Re-export detection; `wallet_transfer` rail; `email`/`tag` identifier types; masking; international registries; `payerLaunchersForCurrency('USD')`; `receivingCurrencyForBankProfile()`; `getPayerBankLauncherOption()` all-registry fix; WA reduction; `wave_ci` logo |
| `packages/contracts/src/west-africa-launchers.test.ts` | Modify | Expectations for the reduced WA registry |
| `packages/contracts/src/checkout.test.ts` | Modify | New masking + intl launcher assertions |
| `packages/database/migrations/026_wallet_rail_and_fx_trace.sql` | Create | rail/identifier CHECK domains + `orders` FX columns |
| `packages/database/migrations/027_international_profiles_wa_reduction.sql` | Create | wise/revolut/payoneer + wave_ci profiles; soft-disable retired WA |
| `apps/api/src/fx.ts` | Create | `FxRateService` (frankfurter.dev, cache TTL/stale, half-up rounding) |
| `apps/api/src/fx.test.ts` | Create | cache hit/miss/stale/unavailable/rounding |
| `apps/api/src/orders.ts` | Modify | `display_price` in body validation; `resolveOrderAmount()`; wallet identifier normalization; FX columns in `StoredOrderRecord` + INSERT; `ACCEPTED_ORDER_CURRENCIES` += USD |
| `apps/api/src/orders.test.ts` | Modify | display_price e2e cases, wallet route creation |
| `apps/api/src/server.ts` | Modify | order handler uses resolved currency; `wallet` readiness method; response amount currency fix |
| `apps/api/src/payment-sessions.ts` | Modify | `wallet_transfer` → method `wallet` mapping |
| `apps/api/src/reviews.ts` | Modify | SELECT FX + route columns; `ReviewActionResult` enrichment; event data |
| `apps/job-worker/src/webhook-runtime.ts` | Modify | pass `currency_detection` + `receiving_route` through to payload |
| `apps/job-worker/src/webhook-runtime.test.ts` | Modify | enriched payload assertions |
| `docs/12_WEBHOOKS.md`, `docs/06_API_SPEC.md` | Modify | payload example, `display_price`, new error codes |

Out of scope (later phases, per spec): Android family cards, checkout USD screens, neobank notification parsers, `payment.currency_mismatch`.

---

### Task 1: Currency detection module (contracts)

**Files:**
- Create: `packages/contracts/src/currency-detection.ts`
- Create: `packages/contracts/src/currency-detection.test.ts`
- Modify: `packages/contracts/src/index.ts` (add one re-export line at the very top, below the existing import)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/contracts/src/currency-detection.test.ts
import { describe, expect, it } from 'vitest';
import { detectCurrencyFromDisplayPrice } from './currency-detection.js';

describe('detectCurrencyFromDisplayPrice', () => {
  it('detects native RUB from symbol and codes', () => {
    expect(detectCurrencyFromDisplayPrice('999 ₽')).toEqual({
      kind: 'detected', currency: 'RUB', amount_minor: 99900, needs_conversion: false, raw_input: '999 ₽'
    });
    expect(detectCurrencyFromDisplayPrice('1 000,50 руб.')).toMatchObject({ currency: 'RUB', amount_minor: 100050 });
    expect(detectCurrencyFromDisplayPrice('1500 RUB')).toMatchObject({ currency: 'RUB', amount_minor: 150000 });
  });

  it('detects native USD ($ alone is USD by documented policy)', () => {
    expect(detectCurrencyFromDisplayPrice('$10.99')).toMatchObject({ currency: 'USD', amount_minor: 1099, needs_conversion: false });
    expect(detectCurrencyFromDisplayPrice('1,000.50 USD')).toMatchObject({ currency: 'USD', amount_minor: 100050 });
    expect(detectCurrencyFromDisplayPrice('US$ 5')).toMatchObject({ currency: 'USD', amount_minor: 500 });
  });

  it('detects native XOF with zero decimals', () => {
    expect(detectCurrencyFromDisplayPrice('1 000 FCFA')).toMatchObject({ currency: 'XOF', amount_minor: 1000, needs_conversion: false });
    expect(detectCurrencyFromDisplayPrice('2500 CFA')).toMatchObject({ currency: 'XOF', amount_minor: 2500 });
    expect(detectCurrencyFromDisplayPrice('10.000 XOF')).toMatchObject({ currency: 'XOF', amount_minor: 10000 });
  });

  it('flags convertible currencies (EUR, GBP, XAF, JPY) for conversion', () => {
    expect(detectCurrencyFromDisplayPrice('€9.99')).toEqual({
      kind: 'detected', currency: 'EUR', amount_minor: 999, needs_conversion: true, raw_input: '€9.99'
    });
    expect(detectCurrencyFromDisplayPrice('£20')).toMatchObject({ currency: 'GBP', amount_minor: 2000, needs_conversion: true });
    expect(detectCurrencyFromDisplayPrice('1000 XAF')).toMatchObject({ currency: 'XAF', amount_minor: 1000, needs_conversion: true });
    expect(detectCurrencyFromDisplayPrice('500 JPY')).toMatchObject({ currency: 'JPY', amount_minor: 500, needs_conversion: true });
  });

  it('handles locale separators decidably', () => {
    expect(detectCurrencyFromDisplayPrice('1.000,50 EUR')).toMatchObject({ amount_minor: 100050 }); // EU style
    expect(detectCurrencyFromDisplayPrice('1,000.50 $')).toMatchObject({ amount_minor: 100050 }); // US style
    expect(detectCurrencyFromDisplayPrice('1,000 $')).toMatchObject({ amount_minor: 100000 }); // 3 digits after lone separator = grouping
    expect(detectCurrencyFromDisplayPrice('1.5 $')).toMatchObject({ amount_minor: 150 }); // 1 digit = decimal
  });

  it('rejects ambiguous or invalid input — never guesses', () => {
    expect(detectCurrencyFromDisplayPrice('1000')).toEqual({ kind: 'ambiguous', raw_input: '1000' });
    expect(detectCurrencyFromDisplayPrice('CA$ 10')).toEqual({ kind: 'ambiguous', raw_input: 'CA$ 10' });
    expect(detectCurrencyFromDisplayPrice('A$10')).toEqual({ kind: 'ambiguous', raw_input: 'A$10' });
    expect(detectCurrencyFromDisplayPrice('10 BTC')).toEqual({ kind: 'ambiguous', raw_input: '10 BTC' });
    expect(detectCurrencyFromDisplayPrice('')).toEqual({ kind: 'ambiguous', raw_input: '' });
    expect(detectCurrencyFromDisplayPrice('0 $')).toEqual({ kind: 'invalid_amount', raw_input: '0 $' });
    expect(detectCurrencyFromDisplayPrice('-5 $')).toEqual({ kind: 'invalid_amount', raw_input: '-5 $' });
    expect(detectCurrencyFromDisplayPrice('10.5 FCFA')).toEqual({ kind: 'invalid_amount', raw_input: '10.5 FCFA' }); // XOF has no decimals
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/contracts/src/currency-detection.test.ts`
Expected: FAIL — `Cannot find module './currency-detection.js'`

- [ ] **Step 3: Write the implementation**

```typescript
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
  const trimmed = input.trim().toUpperCase().replace(/\u00A0/g, ' '); // nbsp -> space
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
```

- [ ] **Step 4: Re-export from the contracts barrel** — in `packages/contracts/src/index.ts`, directly below line 1 (`import type { EventType } ...`), add:

```typescript
export { detectCurrencyFromDisplayPrice, type CurrencyDetectionResult } from './currency-detection.js';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/contracts/src/currency-detection.test.ts`
Expected: PASS (all cases). If a separator case fails, fix `parseDisplayAmountMinor` — do NOT weaken the test.

- [ ] **Step 6: Typecheck and commit**

```powershell
npm run typecheck
git add packages/contracts/src/currency-detection.ts packages/contracts/src/currency-detection.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): pure display-price currency detection (RUB/USD/XOF native)"
```

---

### Task 2: Wallet rail + email/tag identifier types + masking (contracts)

**Files:**
- Modify: `packages/contracts/src/index.ts:75-79` (rail + identifier unions), `:623-642` (masking)
- Modify: `packages/contracts/src/checkout.test.ts` (add masking assertions next to line 471)

- [ ] **Step 1: Write the failing test** — in `packages/contracts/src/checkout.test.ts`, inside the same `describe` as the existing masking test (line ~471), add:

```typescript
  it('masks wallet email and tag identifiers without leaking the value', () => {
    expect(maskReceiverIdentifier('email', 'john.doe@gmail.com')).toBe('j•••@•••.com');
    expect(maskReceiverIdentifier('tag', 'wisetag67')).toBe('@w•••67');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/contracts/src/checkout.test.ts`
Expected: FAIL — type error / wrong mask output.

- [ ] **Step 3: Extend the unions** — `packages/contracts/src/index.ts` lines 75–79:

```typescript
export const ReceivingRouteRailTypes = ['phone_transfer', 'card_transfer', 'mobile_money', 'wallet_transfer'] as const;
export type ReceivingRouteRailType = (typeof ReceivingRouteRailTypes)[number];

export const ReceiverIdentifierTypes = ['phone', 'card', 'email', 'tag'] as const;
export type ReceiverIdentifierType = (typeof ReceiverIdentifierTypes)[number];
```

And line 72 (buyer method union) plus the readiness interface lines 102–106:

```typescript
export const BuyerCheckoutPaymentMethods = ['card', 'sbp', 'mobile_money', 'wallet'] as const;
```

```typescript
  available_payment_methods: {
    card: boolean;
    sbp: boolean;
    mobile_money: boolean;
    wallet: boolean;
  };
```

- [ ] **Step 4: Extend masking** — replace `maskReceiverIdentifier` (lines 623–642) with:

```typescript
export function maskReceiverIdentifier(
  type: ReceiverIdentifierType,
  value: string,
  options: { international?: boolean } = {}
): string {
  if (type === 'email') {
    const [local = '', domain = ''] = value.split('@');
    const tld = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
    return `${local.slice(0, 1)}•••@•••${tld}`;
  }
  if (type === 'tag') {
    const tag = value.replace(/^@/u, '');
    return `@${tag.slice(0, 1)}•••${tag.slice(-2)}`;
  }

  const digits = value.replace(/\D/g, '');
  if (type === 'phone') {
    const lastTwo = digits.slice(-2).padStart(2, '*');
    if (options.international) {
      // West Africa / mobile money / wallets: no Russian +7 assumption.
      return `+••• ••• ••${lastTwo}`;
    }
    return `+7 *** *** **${lastTwo}`;
  }

  if (digits.length < 8) {
    return '****';
  }
  return `${digits.slice(0, 4)} **** **** ${digits.slice(-4)}`;
}
```

- [ ] **Step 5: Run tests, fix type fallout**

Run: `npx vitest run packages/contracts/src && npm run typecheck` (PowerShell: run the two commands separately).
Expected: the masking test PASSES. Typecheck will surface every place that builds an `available_payment_methods` object — fix them now (they are part of this task):
- `apps/api/src/server.ts:5179-5183` — add `wallet: routes.some((route) => route.rail_type === 'wallet_transfer')`
- `apps/api/src/payment-sessions.ts:395-433` — extend the two ternaries and the `methods` object (full code in Task 6 Step 3; if typecheck demands it now, apply that code now and skip it in Task 6).

- [ ] **Step 6: Commit**

```powershell
git add packages/contracts/src/index.ts packages/contracts/src/checkout.test.ts apps/api/src/server.ts apps/api/src/payment-sessions.ts
git commit -m "feat(contracts): wallet_transfer rail + email/tag receiver identifiers with masking"
```

---

### Task 3: International registries + currency branchements (contracts)

**Files:**
- Modify: `packages/contracts/src/index.ts` — `receiverBank()` (line 1350), registries (after line 358 and after line 488), `receivingCurrencyForBankProfile()` (line 117), `payerLaunchersForCurrency()` (line 498), `getPayerBankLauncherOption()` (line 517), `bankLogoAssetKey()` (line 1387)
- Modify: `packages/contracts/src/checkout.test.ts`

- [ ] **Step 1: Write the failing test** — append to `packages/contracts/src/checkout.test.ts` (import the new symbols at the top of the file):

```typescript
describe('international USD rail', () => {
  it('exposes the neobank receiver profiles with detection disabled', () => {
    expect(InternationalReceiverBankProfiles.map((b) => b.bank_profile_id)).toEqual(['wise_int', 'revolut_int', 'payoneer_int']);
    for (const profile of InternationalReceiverBankProfiles) {
      expect(profile.detection_supported).toBe(false);
      expect(profile.status).toBe('review_required_beta');
    }
    expect(AllReceiverBankProfiles.map((b) => b.bank_profile_id)).toContain('wise_int');
  });

  it('routes USD sessions to international launchers and resolves their currency', () => {
    expect(payerLaunchersForCurrency('USD')).toBe(InternationalPayerBankLauncherRegistry);
    expect(payerLaunchersForCurrency('usd')).toBe(InternationalPayerBankLauncherRegistry);
    expect(receivingCurrencyForBankProfile('wise_int')).toBe('USD');
    expect(receivingCurrencyForBankProfile('sber_ru')).toBe('RUB');
  });

  it('resolves any registry launcher by id (fixes the WA selection gap)', () => {
    expect(getPayerBankLauncherOption('wise_int')?.country).toBe('INT');
    expect(getPayerBankLauncherOption('orange_money_ci')).not.toBeNull();
    expect(getPayerBankLauncherOption('sber_ru')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/contracts/src/checkout.test.ts`
Expected: FAIL — symbols not exported.

- [ ] **Step 3: Implement.** In `packages/contracts/src/index.ts`:

(a) Line 213 — extend the country union:

```typescript
export type PayerBankCountry = 'RU' | 'SN' | 'CI' | 'ML' | 'BF' | 'BJ' | 'TG' | 'NE' | 'GW' | 'INT';
```

(b) `receiverBank()` (line 1350) — add a `detectionSupported` option. In the options type add `detectionSupported?: boolean;` and change line 1375 to `detection_supported: options.detectionSupported ?? true,`.

(c) After `AllReceiverBankProfiles` (line 358) — insert the international receiver registry and update the combined set:

```typescript
/**
 * International (USD) neobank receiving profiles — wallet_transfer rail, manual
 * review only (no notification parsers yet, detection_supported false). The
 * merchant-side mirror of InternationalPayerBankLauncherRegistry.
 */
export const InternationalReceiverBankProfiles: readonly ReceiverBankOption[] = [
  receiverBank('wise_int', 'Wise', { packageName: 'com.transferwise.android', detectionSupported: false }),
  receiverBank('revolut_int', 'Revolut', { packageName: 'com.revolut.revolut', detectionSupported: false }),
  receiverBank('payoneer_int', 'Payoneer', { packageName: 'com.payoneer.android', detectionSupported: false })
] as const;

/** Every receiver bank profile the platform recognises (RU V1 + West Africa + international USD). */
export const AllReceiverBankProfiles: readonly ReceiverBankOption[] = [
  ...V1ReceiverBankOptions,
  ...WestAfricaReceiverBankProfiles,
  ...InternationalReceiverBankProfiles
] as const;
```

(Delete the previous two-member `AllReceiverBankProfiles` literal — there must be exactly one.)

(d) After `WestAfricaPayerBankLauncherRegistry` (line 488) — insert:

```typescript
/**
 * International (USD) payer launchers — neobank apps. Not device-validated:
 * package_hint_only / not_validated, with the standard manual-copy fallback.
 */
export const InternationalPayerBankLauncherRegistry: readonly PayerBankLauncherOption[] = [
  payerLauncher('wise_int', 'Wise', ['com.transferwise.android'], { country: 'INT', enabled: true }),
  payerLauncher('revolut_int', 'Revolut', ['com.revolut.revolut'], { country: 'INT', enabled: true }),
  payerLauncher('payoneer_int', 'Payoneer', ['com.payoneer.android'], { country: 'INT', enabled: true })
] as const;
```

(e) Replace `receivingCurrencyForBankProfile()` (lines 116–119):

```typescript
/** Currency a receiving bank profile collects in. International = USD; West Africa = XOF; RU = RUB. */
export function receivingCurrencyForBankProfile(bankProfileId: string): string {
  if (InternationalReceiverBankProfiles.some((bank) => bank.bank_profile_id === bankProfileId)) {
    return 'USD';
  }
  return WestAfricaReceiverBankProfiles.some((bank) => bank.bank_profile_id === bankProfileId) ? 'XOF' : 'RUB';
}
```

(f) Replace `payerLaunchersForCurrency()` (lines 498–502):

```typescript
export function payerLaunchersForCurrency(currency: string | undefined): readonly PayerBankLauncherOption[] {
  const normalized = currency?.toUpperCase();
  if (normalized && XOF_CURRENCIES.has(normalized)) {
    return WestAfricaPayerBankLauncherRegistry;
  }
  if (normalized === 'USD') {
    return InternationalPayerBankLauncherRegistry;
  }
  return PayerBankLauncherRegistry;
}
```

(g) Replace `getPayerBankLauncherOption()` (lines 517–519) — root-cause fix: the old version only searched the RU registry, so selecting a WA (and soon USD) launcher via `POST /v1/checkout/:id/payer-bank-launcher` failed validation:

```typescript
export function getPayerBankLauncherOption(payerBankLauncherId: string): PayerBankLauncherOption | null {
  return (
    [...PayerBankLauncherRegistry, ...WestAfricaPayerBankLauncherRegistry, ...InternationalPayerBankLauncherRegistry]
      .find((launcher) => launcher.payer_bank_launcher_id === payerBankLauncherId) ?? null
  );
}
```

(h) `bankLogoAssetKey()` (line 1387) — add before `default:`:

```typescript
    case 'wise_int':
      return 'ic_bank_wise';
    case 'revolut_int':
      return 'ic_bank_revolut';
    case 'payoneer_int':
      return 'ic_bank_payoneer';
```

Note: `receiverBank()` is called with `(id, name, options)` — the intl calls above pass options as the third argument; keep the existing signature.

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/contracts/src && npm run typecheck`
Expected: PASS, including the pre-existing `checkout.test.ts` RU assertions (the all-registry find preserves RU lookups).

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src/index.ts packages/contracts/src/checkout.test.ts
git commit -m "feat(contracts): international USD neobank registries + currency routing branchements"
```

---

### Task 4: West Africa reduction to Wave CI / Orange Money CI / MTN MoMo CI (contracts)

**Files:**
- Modify: `packages/contracts/src/index.ts:341-352` (receiver profiles), `:423-488` (payer launchers), `:1401-1420` (logo: add `wave_ci`)
- Modify: `packages/contracts/src/west-africa-launchers.test.ts`

- [ ] **Step 1: Update the test first** — replace the id-list assertions in `packages/contracts/src/west-africa-launchers.test.ts`:

Lines 11–24 become:

```typescript
    const ids = WestAfricaPayerBankLauncherRegistry.map((l) => l.payer_bank_launcher_id);
    expect(ids).toEqual(['wave_ci', 'orange_money_ci', 'mtn_momo_ci']);
    for (const l of WestAfricaPayerBankLauncherRegistry) {
      expect(l.country).toBe('CI');
    }
```

Lines 49–51 become:

```typescript
    const xofSenderBanks = toAvailableSenderBanks(payerLaunchersForCurrency('XOF')).map((b) => b.payer_bank_launcher_id);
    expect(xofSenderBanks).toContain('wave_ci');
    expect(xofSenderBanks).toContain('orange_money_ci');
    expect(xofSenderBanks).toContain('mtn_momo_ci');
```

Lines 54–63 (the deeplink/ussd test) become:

```typescript
  it('carries manifest-extracted deeplink schemes on the CI launchers', () => {
    const wave = WestAfricaPayerBankLauncherRegistry.find((l) => l.payer_bank_launcher_id === 'wave_ci');
    expect(wave?.deeplink_schemes).toContain('wave');
    expect(wave?.launch_strategy).toBe('deeplink_then_package');

    const mtn = WestAfricaPayerBankLauncherRegistry.find((l) => l.payer_bank_launcher_id === 'mtn_momo_ci');
    expect(mtn?.ussd_transfer_template).toBe('*133#');
  });
```

Line 67: `expect(ruIds).not.toContain('wave_ci');`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/contracts/src/west-africa-launchers.test.ts`
Expected: FAIL — registry still has 11 entries.

- [ ] **Step 3: Reduce both registries.** Replace `WestAfricaReceiverBankProfiles` (lines 341–352) with:

```typescript
export const WestAfricaReceiverBankProfiles: readonly ReceiverBankOption[] = [
  receiverBank('wave_ci', "Wave (Côte d'Ivoire)"),
  receiverBank('orange_money_ci', "Orange Money (Côte d'Ivoire)"),
  receiverBank('mtn_momo_ci', "MTN MoMo (Côte d'Ivoire)")
] as const;
```

Replace `WestAfricaPayerBankLauncherRegistry` (lines 423–488; keep the doc comment, update its first line to mention the CI-only reduction) with:

```typescript
export const WestAfricaPayerBankLauncherRegistry: readonly PayerBankLauncherOption[] = [
  payerLauncher('wave_ci', 'Wave', ['com.wave.personal'], {
    country: 'CI',
    deeplinkSchemes: ['wave'],
    launchStrategy: 'deeplink_then_package',
    enabled: true
  }),
  payerLauncher('orange_money_ci', 'Orange Money / Max it', ['com.orange.myorange.oci', 'com.orange.orangemoneyafrique'], {
    country: 'CI',
    deeplinkSchemes: ['omk', 'orangemoneyafrique'],
    launchStrategy: 'deeplink_then_package',
    enabled: true
  }),
  payerLauncher('mtn_momo_ci', 'MTN MoMo', ['mtnft.momo.consumer'], {
    country: 'CI',
    launchStrategy: 'package_hint_only',
    ussdTransferTemplate: '*133#',
    enabled: true
  })
] as const;
```

In `bankLogoAssetKey()` add `case 'wave_ci':` alongside `case 'wave_sn':` (keep the retired cases — soft-disabled DB rows may still render their logo in merchant history):

```typescript
    case 'wave_sn':
    case 'wave_ci':
      return 'ic_bank_wave';
```

- [ ] **Step 4: Run the full contracts + api suites** — the reduction may break fixtures referencing retired ids (e.g. `orange_money_sn` in api tests). Fix fixtures by switching them to `orange_money_ci` or `wave_ci`; do NOT re-add registry entries.

Run: `npx vitest run packages/contracts/src apps/api/src && npm run typecheck`
Expected: PASS after fixture updates.

- [ ] **Step 5: Commit**

```powershell
git add packages/contracts/src apps/api/src
git commit -m "feat(west-africa): reduce WA registries to Wave CI / Orange Money CI / MTN MoMo CI"
```

---

### Task 5: Migrations 026 + 027

**Files:**
- Create: `packages/database/migrations/026_wallet_rail_and_fx_trace.sql`
- Create: `packages/database/migrations/027_international_profiles_wa_reduction.sql`

- [ ] **Step 1: Find the exact identifier-type CHECK constraint name**

Run: `Select-String -Pattern "receiver_identifier_type" -Path packages\database\migrations\*.sql | Select-Object -First 10`
Note the constraint name used at creation (in `007_hybrid_receiving_routes.sql` or `001_initial_schema.sql`). Use that exact name in the `DROP CONSTRAINT IF EXISTS` below (replace `merchant_receiving_routes_receiver_identifier_type_check` if it differs).

- [ ] **Step 2: Write migration 026**

```sql
-- 026 — Wallet rail (international USD neobanks) + FX detection trace on orders.
-- Mirrors 024's pattern: widen CHECK domains, additive nullable columns.

-- 1. wallet_transfer joins the receiving rail domain.
ALTER TABLE merchant_receiving_routes
  DROP CONSTRAINT IF EXISTS merchant_receiving_routes_rail_type_check;
ALTER TABLE merchant_receiving_routes
  ADD CONSTRAINT merchant_receiving_routes_rail_type_check
  CHECK (rail_type IN ('phone_transfer', 'card_transfer', 'mobile_money', 'wallet_transfer'));

-- 2. Wallet identifiers: email (Wise/Payoneer) or tag (Wisetag/Revtag), besides phone.
ALTER TABLE merchant_receiving_routes
  DROP CONSTRAINT IF EXISTS merchant_receiving_routes_receiver_identifier_type_check;
ALTER TABLE merchant_receiving_routes
  ADD CONSTRAINT merchant_receiving_routes_receiver_identifier_type_check
  CHECK (receiver_identifier_type IN ('phone', 'card', 'email', 'tag'));

-- 3. FX / detection trace. NULL for explicit-amount orders (the V1 default).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS detection_source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS detection_raw_input TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_currency TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_amount_minor BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fx_rate TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fx_rate_timestamp TIMESTAMPTZ;
```

- [ ] **Step 3: Write migration 027**

```sql
-- 027 — International USD neobank receiving profiles + West Africa reduction.
-- Reduction is NON-destructive: retired profiles become unselectable, their
-- merchant routes go pending_disable. Nothing is deleted.

INSERT INTO bank_profiles (
  id, bank_name, country, currency, status, auto_confirm_status,
  selectable, supported_roles, runtime_capture_status, runtime_verified,
  package_name, package_cert_sha256, logo_asset, official_bank_confirmation
) VALUES
  ('wise_int',     'Wise',     'INT', 'USD', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.transferwise.android', 'documented_unknown', 'ic_bank_wise', false),
  ('revolut_int',  'Revolut',  'INT', 'USD', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.revolut.revolut',      'documented_unknown', 'ic_bank_revolut', false),
  ('payoneer_int', 'Payoneer', 'INT', 'USD', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.payoneer.android',     'documented_unknown', 'ic_bank_payoneer', false),
  ('wave_ci',      'Wave (Cote d''Ivoire)', 'CI', 'XOF', 'review_only', 'disabled', true, ARRAY['receiver_bank'], 'observed', false, 'com.wave.personal', 'documented_unknown', 'ic_bank_wave', false)
ON CONFLICT (id) DO UPDATE SET
  bank_name = EXCLUDED.bank_name,
  country = EXCLUDED.country,
  currency = EXCLUDED.currency,
  status = 'review_only',
  auto_confirm_status = 'disabled',
  selectable = EXCLUDED.selectable,
  supported_roles = EXCLUDED.supported_roles,
  logo_asset = EXCLUDED.logo_asset,
  official_bank_confirmation = false,
  updated_at = now();

-- West Africa reduction: retire everything but orange_money_ci / mtn_momo_ci / wave_ci.
UPDATE bank_profiles
SET selectable = false, updated_at = now()
WHERE id IN ('orange_money_sn', 'wave_sn', 'free_money_sn', 'wizall_sn',
             'moov_money_ci', 'djamo_ci', 'ecobank_ci', 'sg_connect_ci');

UPDATE merchant_receiving_routes
SET lifecycle_status = 'pending_disable', updated_at = now()
WHERE bank_profile_id IN ('orange_money_sn', 'wave_sn', 'free_money_sn', 'wizall_sn',
                          'moov_money_ci', 'djamo_ci', 'ecobank_ci', 'sg_connect_ci')
  AND lifecycle_status = 'active';
```

- [ ] **Step 4: Sanity-check the SQL against the local stack if available**

Run: `npm run backend:doctor` — if the local Docker Postgres is up, apply both files with psql and re-run; otherwise state explicitly in the task report that the SQL was not executed locally (staging/VPS application is manual per repo practice — `plink` + `docker exec psql`, see memory/infra docs).

- [ ] **Step 5: Commit**

```powershell
git add packages/database/migrations/026_wallet_rail_and_fx_trace.sql packages/database/migrations/027_international_profiles_wa_reduction.sql
git commit -m "feat(db): wallet rail + FX trace columns; intl USD profiles; WA reduction soft-disable"
```

---### Task 6: Wallet rail support in the API (route creation + checkout mapping)

**Files:**
- Modify: `apps/api/src/orders.ts:2444-2563` (route record builder + helpers)
- Modify: `apps/api/src/payment-sessions.ts:391-433` (method mapping — if not already done in Task 2 Step 5)
- Test: `apps/api/src/orders.test.ts`

- [ ] **Step 1: Write the failing test** — in `apps/api/src/orders.test.ts`, next to the existing `buildMerchantReceivingRouteRecord` tests (search `buildMerchantReceivingRouteRecord(` in the file and add in the same describe):

```typescript
  it('creates a wallet_transfer route on an international profile with email identifier', () => {
    const record = buildMerchantReceivingRouteRecord({
      routeId: 'route_w1',
      merchantId: 'mer_01',
      bankProfileId: 'wise_int',
      railType: 'wallet_transfer',
      receiverIdentifier: 'John.Doe@Gmail.com',
      routeCode: 'usd-wise-main',
      displayLabel: 'Wise USD',
      encryptionSecret: 'test_secret',
      now: '2026-06-05T10:00:00.000Z'
    });
    expect(record).toMatchObject({
      rail_type: 'wallet_transfer',
      receiver_identifier_type: 'email',
      receiver_identifier_masked: 'j•••@•••.com',
      receiver_identifier_last4: '.com',
      review_policy: 'review_first'
    });
  });

  it('creates a wallet_transfer route with a tag identifier', () => {
    const record = buildMerchantReceivingRouteRecord({
      routeId: 'route_w2',
      merchantId: 'mer_01',
      bankProfileId: 'revolut_int',
      railType: 'wallet_transfer',
      receiverIdentifier: '@revtag67',
      routeCode: 'usd-revolut',
      displayLabel: 'Revolut USD',
      encryptionSecret: 'test_secret',
      now: '2026-06-05T10:00:00.000Z'
    });
    expect(record).toMatchObject({ receiver_identifier_type: 'tag', receiver_identifier_masked: '@r•••67' });
  });

  it('rejects wallet_transfer on a non-international profile', () => {
    const record = buildMerchantReceivingRouteRecord({
      routeId: 'route_w3',
      merchantId: 'mer_01',
      bankProfileId: 'sber_ru',
      railType: 'wallet_transfer',
      receiverIdentifier: 'a@b.com',
      routeCode: 'bad',
      displayLabel: 'Bad',
      encryptionSecret: 'test_secret',
      now: '2026-06-05T10:00:00.000Z'
    });
    expect(record).toHaveProperty('error');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/api/src/orders.test.ts`
Expected: FAIL — wallet rail rejected / identifier invalid.

- [ ] **Step 3: Implement in `apps/api/src/orders.ts`.**

(a) Import `InternationalReceiverBankProfiles` from `@swimpay/contracts` (extend the existing import list).

(b) Add the wallet normalizer next to `normalizeWestAfricaMobileNumber` (line 2603):

```typescript
/**
 * Normalizes a wallet (neobank) receiving identifier. Wise/Payoneer use email,
 * Wise/Revolut also use a tag (@wisetag / @revtag), Revolut accepts a phone.
 * The merchant enters their OWN identifier, so validation stays permissive.
 */
function normalizeWalletIdentifier(value: string): { type: ReceiverIdentifierType; normalized: string } | null {
  const trimmed = value.trim();
  if (trimmed.includes('@') && !trimmed.startsWith('@')) {
    const email = trimmed.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email) ? { type: 'email', normalized: email } : null;
  }
  if (trimmed.startsWith('@')) {
    const tag = trimmed.slice(1).toLowerCase();
    return /^[a-z0-9_]{3,32}$/u.test(tag) ? { type: 'tag', normalized: tag } : null;
  }
  const phone = normalizeWestAfricaMobileNumber(trimmed);
  return phone ? { type: 'phone', normalized: phone } : null;
}
```

(c) In `buildMerchantReceivingRouteRecord` (line 2444): after the existing `mobile_money` gate (lines 2464–2469), add the wallet gate:

```typescript
  if (input.railType === 'wallet_transfer' && !InternationalReceiverBankProfiles.some((bank) => bank.bank_profile_id === input.bankProfileId)) {
    return invalidRequest('wallet_transfer rail requires an international receiving profile.', {
      bank_profile_id: input.bankProfileId,
      rail_type: input.railType
    });
  }
```

Then replace the identifier-type resolution block (lines 2473–2485) with:

```typescript
  let receiverIdentifierType: ReceiverIdentifierType;
  let normalizedIdentifier: string | null;
  if (input.railType === 'wallet_transfer') {
    const wallet = normalizeWalletIdentifier(input.receiverIdentifier);
    if (!wallet) {
      return invalidRequest('receiver_identifier is not valid for a wallet receiving route.', {
        rail_type: input.railType
      });
    }
    receiverIdentifierType = wallet.type;
    normalizedIdentifier = wallet.normalized;
  } else {
    receiverIdentifierType = receiverIdentifierTypeForRail(input.railType);
    if (!input.receiverIdentifier.trim()) {
      return invalidRequest('receiver_identifier is required.', {});
    }
    normalizedIdentifier = normalizeReceiverIdentifier(receiverIdentifierType, input.receiverIdentifier, input.railType);
    if (!normalizedIdentifier) {
      return invalidRequest('receiver_identifier is not valid for the selected receiving route.', {
        type: receiverIdentifierType
      });
    }
  }
```

And in the returned record, replace the `masked` / `last4` lines (2508–2511) with:

```typescript
    receiver_identifier_masked: maskReceiverIdentifier(receiverIdentifierType, normalizedIdentifier, {
      international: input.railType === 'mobile_money' || input.railType === 'wallet_transfer'
    }),
    receiver_identifier_last4:
      receiverIdentifierType === 'email' || receiverIdentifierType === 'tag'
        ? normalizedIdentifier.slice(-4)
        : normalizedIdentifier.replace(/\D/g, '').slice(-4),
```

(d) `receiverIdentifierTypeForRail` (line 2554) — wallet never reaches it now, but make it total:

```typescript
export function receiverIdentifierTypeForRail(railType: ReceivingRouteRailType): ReceiverIdentifierType {
  // Mobile money accounts are addressed by phone number, like SBP. Wallet rails
  // resolve their identifier type from the value (normalizeWalletIdentifier).
  if (railType === 'wallet_transfer') {
    return 'email';
  }
  return railType === 'phone_transfer' || railType === 'mobile_money' ? 'phone' : 'card';
}
```

(e) `amountLeaseRailForRoute` (line 2565) — wallets are account-addressed; reuse the 'sbp' lease bucket like mobile money:

```typescript
function amountLeaseRailForRoute(railType: ReceivingRouteRailType): AmountLeaseRail {
  return railType === 'card_transfer' ? 'card' : 'sbp';
}
```

(`defaultReviewPolicyForRail` already returns `review_first` for any non-`phone_transfer` rail — no change.)

(f) `apps/api/src/payment-sessions.ts` (skip if applied in Task 2 Step 5) — method mapping at lines 395–400:

```typescript
      method_type:
        route.rail_type === 'phone_transfer'
          ? ('sbp' as const)
          : route.rail_type === 'mobile_money'
            ? ('mobile_money' as const)
            : route.rail_type === 'wallet_transfer'
              ? ('wallet' as const)
              : ('card' as const),
```

Label at lines 411–416 (add the wallet branch): `route.method_type === 'wallet' ? ('Wallet' as const) : ...` mirroring the `'Mobile money'` branch. `methods` object at 425–429 gains `wallet: availableRoutes.some((route) => route.method_type === 'wallet')`, and the `unavailableReason` guard at 430 adds `&& !methods.wallet`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run apps/api/src/orders.test.ts apps/api/src/payment-sessions.test.ts && npm run typecheck`
Expected: PASS. If the `AvailableReceivingMethod.label` union in contracts (line 309) rejects `'Wallet'`/`'Mobile money'`, extend it to `'Carte' | 'SBP' | 'Mobile money' | 'Wallet'`.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/orders.ts apps/api/src/orders.test.ts apps/api/src/payment-sessions.ts packages/contracts/src/index.ts
git commit -m "feat(api): wallet_transfer receiving routes (email/tag identifiers) + checkout wallet method"
```

---

### Task 7: FX service (`apps/api/src/fx.ts`)

**Files:**
- Create: `apps/api/src/fx.ts`
- Create: `apps/api/src/fx.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/fx.test.ts
import { describe, expect, it, vi } from 'vitest';
import { FxRateService } from './fx.js';

function fetchReturning(rate: number) {
  return vi.fn(async () =>
    new Response(JSON.stringify({ base: 'EUR', date: '2026-06-05', rates: { USD: rate } }), { status: 200 })
  );
}

describe('FxRateService', () => {
  it('quotes a convertible amount to USD cents with half-up rounding', async () => {
    const fetchImpl = fetchReturning(1.0852);
    const service = new FxRateService({ fetchImpl, clock: () => new Date('2026-06-05T10:00:00Z') });
    const result = await service.quoteToUsd('EUR', 999, 2); // €9.99
    expect(result).toEqual({
      kind: 'ok',
      quote: { rate: '1.0852', rateTimestamp: '2026-06-05T10:00:00.000Z', amountMinorUsd: 1084 } // 9.99*1.0852=10.84114 → 1084
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves from cache within the TTL', async () => {
    const fetchImpl = fetchReturning(2);
    let nowMs = Date.parse('2026-06-05T10:00:00Z');
    const service = new FxRateService({ fetchImpl, clock: () => new Date(nowMs) });
    await service.quoteToUsd('EUR', 100, 2);
    nowMs += 30 * 60_000; // +30min < 1h TTL
    await service.quoteToUsd('EUR', 100, 2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('serves a stale rate (≤24h) when the provider fails, and rejects beyond', async () => {
    let failing = false;
    const fetchImpl = vi.fn(async () => {
      if (failing) throw new Error('network down');
      return new Response(JSON.stringify({ rates: { USD: 1.5 } }), { status: 200 });
    });
    let nowMs = Date.parse('2026-06-05T10:00:00Z');
    const service = new FxRateService({ fetchImpl, clock: () => new Date(nowMs) });
    await service.quoteToUsd('EUR', 100, 2);

    failing = true;
    nowMs += 2 * 60 * 60_000; // +2h: TTL expired, stale OK
    expect((await service.quoteToUsd('EUR', 100, 2)).kind).toBe('ok');

    nowMs += 23 * 60 * 60_000; // +25h total: stale max exceeded
    const result = await service.quoteToUsd('EUR', 100, 2);
    expect(result).toEqual({ kind: 'unavailable', reason: 'fx_rate_unavailable' });
  });

  it('handles zero-decimal source currencies (JPY)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(0.0065), clock: () => new Date('2026-06-05T10:00:00Z') });
    const result = await service.quoteToUsd('JPY', 500, 0); // ¥500 → $3.25
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorUsd: 325 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/api/src/fx.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```typescript
// apps/api/src/fx.ts
/**
 * FX quotes to USD for display-price detected currencies (frankfurter.dev, ECB
 * reference rates, no API key). In-process cache: fresh ≤ 1h, stale tolerated
 * ≤ 24h when the provider is down, then orders are rejected — a rate is never
 * invented or hardcoded.
 */

export interface FxQuote {
  rate: string;
  rateTimestamp: string;
  amountMinorUsd: number;
}

export type FxQuoteResult =
  | { kind: 'ok'; quote: FxQuote }
  | { kind: 'unavailable'; reason: 'fx_rate_unavailable' };

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

export class FxRateService {
  private readonly baseUrl: string;
  private readonly ttlMs: number;
  private readonly staleMaxMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: () => Date;
  private readonly cache = new Map<string, CachedRate>();

  public constructor(options: {
    baseUrl?: string | undefined;
    ttlMs?: number | undefined;
    staleMaxMs?: number | undefined;
    fetchImpl?: typeof fetch | undefined;
    clock?: (() => Date) | undefined;
  } = {}) {
    this.baseUrl = options.baseUrl ?? 'https://api.frankfurter.dev/v1';
    this.ttlMs = options.ttlMs ?? 60 * 60_000;
    this.staleMaxMs = options.staleMaxMs ?? 24 * 60 * 60_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.clock = options.clock ?? (() => new Date());
  }

  public async quoteToUsd(currency: string, amountMinor: number, minorDigits: number): Promise<FxQuoteResult> {
    const source = currency.toUpperCase();
    const nowMs = this.clock().getTime();
    let cached = this.cache.get(source);

    if (!cached || nowMs - cached.fetchedAt > this.ttlMs) {
      const fetched = await this.fetchRate(source);
      if (fetched !== null) {
        cached = { rate: fetched, fetchedAt: nowMs };
        this.cache.set(source, cached);
      }
    }

    if (!cached || nowMs - cached.fetchedAt > this.staleMaxMs) {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }

    const amountMajor = amountMinor / 10 ** minorDigits;
    // Math.round is half-up for positive values — the documented rounding rule.
    const amountMinorUsd = Math.round(amountMajor * cached.rate * 100);
    if (!Number.isSafeInteger(amountMinorUsd) || amountMinorUsd <= 0) {
      return { kind: 'unavailable', reason: 'fx_rate_unavailable' };
    }

    return {
      kind: 'ok',
      quote: {
        rate: String(cached.rate),
        rateTimestamp: new Date(cached.fetchedAt).toISOString(),
        amountMinorUsd
      }
    };
  }

  private async fetchRate(source: string): Promise<number | null> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/latest?base=${encodeURIComponent(source)}&symbols=USD`);
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { rates?: Record<string, unknown> };
      const rate = body.rates?.USD;
      return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/api/src/fx.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/fx.ts apps/api/src/fx.test.ts
git commit -m "feat(api): FxRateService — frankfurter USD quotes with TTL/stale cache, never invents a rate"
```

---

### Task 8: `display_price` order-creation pipeline

**Files:**
- Modify: `apps/api/src/orders.ts` — `StoredOrderRecord` (line 27), `CreateOrderRequestBody` (line 394), orders INSERT (line 487), `ACCEPTED_ORDER_CURRENCIES` (line 2710), `validateCreateOrderBody` (line 2732), `buildOrderCreateInput` (line 2801), new `resolveOrderAmount()`
- Modify: `apps/api/src/server.ts` — `ApiServerOptions` (line 287), order handler (lines 1285–1381)
- Test: `apps/api/src/orders.test.ts`

- [ ] **Step 1: Write the failing tests** — in `apps/api/src/orders.test.ts`, find the existing order-creation handler tests (search `'merchant_currency_route_required'`, line ~1348, to locate the e2e setup pattern with a fake repository and `valkey: async () => 'skipped'`) and add, using the same setup helpers:

```typescript
  it('creates a USD order from display_price "€9.99" with FX trace (EUR converted)', async () => {
    // Arrange: merchant with an active wise_int wallet route (receivable USD),
    // FxRateService stubbed via createServer({ fxRateService }) returning rate 1.0852.
    // Act: POST /v1/orders with body { external_id: 'ord-dp-1', display_price: '€9.99' } (NO amount field).
    // Assert: 201; body.amount = { value: '10.84', currency: 'USD' };
    // repository captured order has originalCurrency 'EUR', originalAmountMinor 999,
    // fxRate '1.0852', detectionSource 'display_price_parsed'.
  });

  it('creates a native XOF order from display_price "1 000 FCFA" without conversion', async () => {
    // 201; amount { value: '1000', currency: 'XOF' }; no fx fields; detectionSource 'display_price_parsed'.
  });

  it('rejects ambiguous display_price with currency_detection_ambiguous', async () => {
    // POST display_price '1000' → 400, error.code 'currency_detection_ambiguous'.
  });

  it('rejects converted orders when no FX rate is available', async () => {
    // fxRateService stub returns { kind: 'unavailable' } → 409, error.code 'fx_rate_unavailable'.
  });

  it('keeps explicit amount precedence when both amount and display_price are sent', async () => {
    // amount {value:'137.00',currency:'RUB'} + display_price '$5' → RUB order; all six detection/FX columns are null
    // (explicit orders carry no currency_detection block — deliberate deviation from the spec's "source: explicit" wording, noted in Task 10 docs).
  });
```

Write these as REAL tests following the file's existing fake-repository pattern (copy the nearest order-creation test and adapt); the comments above define exact expectations.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run apps/api/src/orders.test.ts`
Expected: FAIL — `display_price` rejected by validation.

- [ ] **Step 3: Implement in `apps/api/src/orders.ts`.**

(a) `ACCEPTED_ORDER_CURRENCIES` (line 2710):

```typescript
export const ACCEPTED_ORDER_CURRENCIES: ReadonlySet<string> = new Set(['RUB', 'XOF', 'XAF', 'USD']);
```

(b) `StoredOrderRecord` (line 27) — append optional FX trace fields before `status`:

```typescript
  detectionSource?: 'display_price_parsed' | undefined;
  detectionRawInput?: string | undefined;
  originalCurrency?: string | undefined;
  originalAmountMinor?: number | undefined;
  fxRate?: string | undefined;
  fxRateTimestamp?: string | undefined;
```

(c) `CreateOrderRequestBody` (line 394) — `amount` becomes optional and `display_price` is added:

```typescript
  display_price?: string | undefined;
  amount?: {
    value: string;
    currency: string;
  } | undefined;
```

(d) `validateCreateOrderBody` (line 2732) — replace the required-fields check (lines 2751–2759) with:

```typescript
  const amount = candidate.amount;
  const displayPrice = candidate.display_price;

  if (typeof candidate.external_id !== 'string' || !candidate.external_id.trim()) {
    return invalidRequest('Order request is missing required fields.', {});
  }
  if (amount !== undefined && (typeof amount.value !== 'string' || typeof amount.currency !== 'string')) {
    return invalidRequest('Order amount must provide string value and currency.', {});
  }
  if (displayPrice !== undefined && typeof displayPrice !== 'string') {
    return invalidRequest('display_price must be a string when provided.', { field: 'display_price' });
  }
  if (!amount && !displayPrice?.trim()) {
    return invalidRequest('Order requires either amount or display_price.', {});
  }
```

and include both fields in the returned object (`amount` passed through as-is when present, plus `display_price: displayPrice?.trim() || undefined`).

(e) New exported resolver (place directly above `buildOrderCreateInput`):

```typescript
import { detectCurrencyFromDisplayPrice } from '@swimpay/contracts';
import type { FxRateService } from './fx.js';

export interface OrderAmountResolution {
  amountMinor: number;
  currency: string;
  detection?: {
    source: 'display_price_parsed';
    rawInput: string;
    originalCurrency?: string | undefined;
    originalAmountMinor?: number | undefined;
    fxRate?: string | undefined;
    fxRateTimestamp?: string | undefined;
  } | undefined;
}

/**
 * Resolves the order amount/currency. Explicit amount has precedence (V1
 * behavior, untouched). display_price goes through detection: native
 * RUB/USD/XOF stay as-is, any other detected currency is FX-converted to USD.
 */
export async function resolveOrderAmount(
  body: CreateOrderRequestBody,
  fx: Pick<FxRateService, 'quoteToUsd'> | null
): Promise<OrderAmountResolution | ApiErrorResponse> {
  if (body.amount) {
    const currency = body.amount.currency;
    const amountMinor = parseAmountMinor(body.amount.value, currency);
    if (amountMinor === null || !ACCEPTED_ORDER_CURRENCIES.has(currency)) {
      return invalidRequest(
        `Order amount must be positive and currency must be one of: ${[...ACCEPTED_ORDER_CURRENCIES].join(', ')}.`,
        { amount: body.amount.value, currency }
      );
    }
    return { amountMinor, currency };
  }

  const detected = detectCurrencyFromDisplayPrice(body.display_price ?? '');
  if (detected.kind !== 'detected') {
    return {
      error: {
        code: detected.kind === 'ambiguous' ? 'currency_detection_ambiguous' : 'invalid_request',
        message:
          detected.kind === 'ambiguous'
            ? 'display_price currency could not be detected unambiguously. Include a currency symbol or ISO code.'
            : 'display_price amount is not valid for the detected currency.',
        details: { display_price: body.display_price }
      }
    };
  }

  if (!detected.needs_conversion) {
    return {
      amountMinor: detected.amount_minor,
      currency: detected.currency,
      detection: { source: 'display_price_parsed', rawInput: detected.raw_input }
    };
  }

  if (!fx) {
    return { error: { code: 'fx_rate_unavailable', message: 'FX conversion is not configured.', details: {} } };
  }
  const quoted = await fx.quoteToUsd(detected.currency, detected.amount_minor, currencyMinorDigits(detected.currency));
  if (quoted.kind !== 'ok') {
    return {
      error: {
        code: 'fx_rate_unavailable',
        message: 'No current FX rate is available to convert the detected currency to USD.',
        details: { original_currency: detected.currency }
      }
    };
  }
  return {
    amountMinor: quoted.quote.amountMinorUsd,
    currency: 'USD',
    detection: {
      source: 'display_price_parsed',
      rawInput: detected.raw_input,
      originalCurrency: detected.currency,
      originalAmountMinor: detected.amount_minor,
      fxRate: quoted.quote.rate,
      fxRateTimestamp: quoted.quote.rateTimestamp
    }
  };
}
```

Add `JPY: 0, GBP: 2` to `CURRENCY_MINOR_DIGITS` (line 2699) so `currencyMinorDigits` agrees with detection for convertible inputs.

(f) `buildOrderCreateInput` (line 2801) — change the signature to take the resolution instead of re-parsing: replace `const currency = ...; const amountMinor = ...; if (...) return invalidRequest(...)` (lines 2808–2819) with a new required param `resolvedAmount: OrderAmountResolution` and use `resolvedAmount.amountMinor` / `resolvedAmount.currency` everywhere `amountMinor` / `params.body.amount.currency` was used (order, payment session, audit events). Set on the order record:

```typescript
    detectionSource: resolvedAmount.detection?.source,
    detectionRawInput: resolvedAmount.detection?.rawInput,
    originalCurrency: resolvedAmount.detection?.originalCurrency,
    originalAmountMinor: resolvedAmount.detection?.originalAmountMinor,
    fxRate: resolvedAmount.detection?.fxRate,
    fxRateTimestamp: resolvedAmount.detection?.fxRateTimestamp,
```

(g) Orders INSERT (line 487) — extend columns/values:

```typescript
        `INSERT INTO orders (
          id, merchant_id, external_id, return_url, product_id, product_name, product_risk_level,
          amount_minor, currency, status, expires_at, created_at, updated_at,
          detection_source, detection_raw_input, original_currency, original_amount_minor, fx_rate, fx_rate_timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
```

with the six new `input.order.* ?? null` values appended to the array.

(h) `apps/api/src/server.ts`:
- `ApiServerOptions` (line 287): add `fxRateService?: FxRateService | null;` (import type from `./fx.js`), resolved near line 602 as `const fxRateService = options.fxRateService ?? new FxRateService();`.
- Order handler: after `validateCreateOrderBody` (line 1298), insert:

```typescript
    const resolvedAmount = await resolveOrderAmount(body, fxRateService);
    if ('error' in resolvedAmount) {
      const status = resolvedAmount.error.code === 'fx_rate_unavailable' ? 409 : 400;
      return reply.status(status).send(resolvedAmount);
    }
```

- Symmetry gate (lines 1328–1338): replace `body.amount.currency` with `resolvedAmount.currency` (both the condition and the error call). Drop the `typeof body.amount?.currency === 'string'` guard (the resolver guarantees a currency).
- `buildOrderCreateInput` call (line 1340): pass `resolvedAmount`.
- Response (line 1373) — fix the latent currency bug while touching the line: `value: formatAmountMinor(result.order.amountMinor, result.order.currency)`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run apps/api/src/orders.test.ts apps/api/src/server.ts 2>$null; npx vitest run apps/api/src && npm run typecheck`
Expected: PASS, including pre-existing creation tests (explicit `amount` path byte-identical behavior, except the XOF response amount now formats correctly — if a fixture asserted the buggy `"10.00"` for XOF, fix the fixture, it was wrong).

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/orders.ts apps/api/src/orders.test.ts apps/api/src/server.ts
git commit -m "feat(api): display_price currency detection pipeline with FX->USD conversion and trace"
```

---

### Task 9: Adaptive webhook payload (`currency_detection` + `receiving_route`)

**Files:**
- Modify: `apps/api/src/reviews.ts` — `ReviewActionResult` (line 102), action SELECT (line 603), result mapping, `buildReviewActionEvent` (line 917)
- Modify: `apps/job-worker/src/webhook-runtime.ts` — confirmed handler (line 112)
- Test: `apps/job-worker/src/webhook-runtime.test.ts`, `apps/api/src/reviews.test.ts`

- [ ] **Step 1: Write the failing test** — in `apps/job-worker/src/webhook-runtime.test.ts`, copy the existing test at line 93 (`review.confirmed handler enqueues a final payment.confirmed...`) and add a variant where the incoming internal event `data` carries:

```typescript
        currency_detection: {
          source: 'display_price_parsed',
          raw_input: '€9.99',
          original_currency: 'EUR',
          original_amount_minor: 999,
          fx_rate: '1.0852',
          fx_rate_timestamp: '2026-06-05T10:00:00Z'
        },
        receiving_route: {
          route_code: 'USD-WISE-MAIN',
          rail_type: 'wallet_transfer',
          bank_profile_id: 'wise_int',
          receiver_identifier_masked: 'j•••@•••.com'
        }
```

and assert the enqueued webhook event `data` contains both objects verbatim, and that a confirmed event WITHOUT them produces a payload with neither key (additive / backward compatible).

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run apps/job-worker/src/webhook-runtime.test.ts`
Expected: FAIL — keys stripped.

- [ ] **Step 3: Pass-through in `apps/job-worker/src/webhook-runtime.ts`.** Add next to `readOptionalString` (line 240):

```typescript
function readOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
```

In the confirmed branch (lines 112–130), add to the `stripUndefined({...})` object:

```typescript
          currency_detection: readOptionalRecord(event.data.currency_detection),
          receiving_route: readOptionalRecord(event.data.receiving_route),
```

- [ ] **Step 4: Thread the data from the API side (`apps/api/src/reviews.ts`).**

(a) Action SELECT (lines 603–614) — extend to:

```sql
        `SELECT
           rq.id, rq.merchant_id, rq.order_id, rq.payment_session_id, rq.signal_id, rq.status,
           o.status AS order_status, o.external_id, o.amount_minor, o.currency,
           o.detection_source, o.detection_raw_input, o.original_currency, o.original_amount_minor,
           o.fx_rate, o.fx_rate_timestamp,
           ps.status AS payment_session_status,
           mrr.route_code AS route_code, mrr.rail_type AS route_rail_type,
           mrr.bank_profile_id AS route_bank_profile_id,
           mrr.receiver_identifier_masked AS route_receiver_identifier_masked
         FROM review_queue rq
         LEFT JOIN orders o ON o.id = rq.order_id AND o.merchant_id = rq.merchant_id
         LEFT JOIN payment_sessions ps ON ps.id = rq.payment_session_id AND ps.merchant_id = rq.merchant_id
         LEFT JOIN merchant_receiving_routes mrr ON mrr.id = ps.selected_receiving_route_id AND mrr.merchant_id = rq.merchant_id
         WHERE rq.merchant_id = $1 AND rq.id = $2
         FOR UPDATE OF rq`,
```

(Verify the session column name with `Select-String "selected_receiving_route_id" packages\database\migrations\*.sql` — it is referenced across the api/web code; if the column is named differently in SQL, use the SQL name.)

(b) `ReviewActionResult` 'updated' variant (line 104) — append:

```typescript
      currencyDetection?: {
        source: string;
        rawInput?: string | undefined;
        originalCurrency?: string | undefined;
        originalAmountMinor?: number | undefined;
        fxRate?: string | undefined;
        fxRateTimestamp?: string | undefined;
      } | undefined;
      receivingRoute?: {
        routeCode: string;
        railType: string;
        bankProfileId: string;
        receiverIdentifierMasked: string;
      } | undefined;
```

(c) Where the confirmed 'updated' result object is built in `actionReview` (the success return after line 722 — locate `kind: 'updated'` with `status: outcome.reviewStatus`), add (and extend the `ReviewActionRow` type with the new snake_case fields):

```typescript
        currencyDetection: review.detection_source
          ? {
              source: String(review.detection_source),
              rawInput: review.detection_raw_input ? String(review.detection_raw_input) : undefined,
              originalCurrency: review.original_currency ? String(review.original_currency) : undefined,
              originalAmountMinor: review.original_amount_minor === null || review.original_amount_minor === undefined ? undefined : Number(review.original_amount_minor),
              fxRate: review.fx_rate ? String(review.fx_rate) : undefined,
              fxRateTimestamp: review.fx_rate_timestamp ? new Date(String(review.fx_rate_timestamp)).toISOString() : undefined
            }
          : undefined,
        receivingRoute: review.route_code
          ? {
              routeCode: String(review.route_code),
              railType: String(review.route_rail_type),
              bankProfileId: String(review.route_bank_profile_id),
              receiverIdentifierMasked: String(review.route_receiver_identifier_masked)
            }
          : undefined,
```

(d) `buildReviewActionEvent` (line 917) — add to `data` (after `currency`):

```typescript
      currency_detection: params.result.currencyDetection
        ? {
            source: params.result.currencyDetection.source,
            raw_input: params.result.currencyDetection.rawInput,
            original_currency: params.result.currencyDetection.originalCurrency,
            original_amount_minor: params.result.currencyDetection.originalAmountMinor,
            fx_rate: params.result.currencyDetection.fxRate,
            fx_rate_timestamp: params.result.currencyDetection.fxRateTimestamp
          }
        : undefined,
      receiving_route: params.result.receivingRoute
        ? {
            route_code: params.result.receivingRoute.routeCode,
            rail_type: params.result.receivingRoute.railType,
            bank_profile_id: params.result.receivingRoute.bankProfileId,
            receiver_identifier_masked: params.result.receivingRoute.receiverIdentifierMasked
          }
        : undefined,
```

(Only masked values cross this boundary — never the encrypted identifier.) Add a `reviews.test.ts` case mirroring the existing `buildReviewActionEvent` tests asserting both blocks round-trip and are absent when the result lacks them.

- [ ] **Step 5: Run tests**

Run: `npx vitest run apps/job-worker/src apps/api/src/reviews.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/reviews.ts apps/api/src/reviews.test.ts apps/job-worker/src/webhook-runtime.ts apps/job-worker/src/webhook-runtime.test.ts
git commit -m "feat(webhooks): adaptive payment.confirmed payload — currency_detection + receiving_route blocks"
```

---

### Task 10: Documentation

**Files:**
- Modify: `docs/12_WEBHOOKS.md` (payload example, line ~59), `docs/06_API_SPEC.md` (order creation), `docs/05_DATABASE_SCHEMA.md` (orders + routes columns)

- [ ] **Step 1:** In `docs/12_WEBHOOKS.md`, extend the `payment.confirmed` example with the `currency_detection` and `receiving_route` blocks exactly as emitted (spec §3.6), marked "present only for display_price orders / when a route was locked".
- [ ] **Step 2:** In `docs/06_API_SPEC.md`, document on `POST /v1/orders`: `display_price` (optional, mutually fallback with `amount`, `amount` wins), error codes `currency_detection_ambiguous` (400) and `fx_rate_unavailable` (409), USD joining accepted currencies, and the wallet receiving-method registration (`rail_type: wallet_transfer`, identifier email/`@tag`/phone).
- [ ] **Step 3:** In `docs/05_DATABASE_SCHEMA.md`, add the six new `orders` columns and the widened `rail_type` / `receiver_identifier_type` domains.
- [ ] **Step 4: Commit**

```powershell
git add docs/12_WEBHOOKS.md docs/06_API_SPEC.md docs/05_DATABASE_SCHEMA.md
git commit -m "docs: display_price detection, FX trace, wallet rail, adaptive webhook payload"
```

---

### Task 11: Final VERIFY

- [ ] **Step 1:** `npm run typecheck` — expected: clean.
- [ ] **Step 2:** `npm test` — full suite. Expected: PASS. Any failure: fix at root cause; never weaken a test; report verbatim output if blocked.
- [ ] **Step 3:** `npm run lint` — expected: clean.
- [ ] **Step 4:** `git diff --stat main` (or against the start commit) — confirm only the files listed in this plan changed. Report the stat in the IMPLEMENTATION REPORT.
- [ ] **Step 5:** Produce the IMPLEMENTATION REPORT (per the repo's global CLAUDE.md format): files changed, business rules affected (currency ceiling, symmetry gate on resolved currency, WA reduction non-destructive), tests run/passed, remaining risks (frankfurter availability, `$`-policy, staging migration application is manual), deploy readiness.

**Known intentional behavior changes to call out in the report:**
1. `getPayerBankLauncherOption` now resolves WA/INT launchers (was RU-only — pre-existing gap).
2. Order-create response formats `amount.value` with the order currency (XOF was mis-formatted with 2 decimals).
3. Retired WA profiles: registry-removed + DB soft-disabled; `receivingCurrencyForBankProfile()` would report RUB for them, which is why migration 027 must be applied together with the deploy.
