# Currency-First Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The buyer picks the currency they pay in on the checkout page; the choice re-quotes the session (FX router ECB+CBR+UEMOA peg) and determines the rails; reconciliation deltas are capped at 1% per currency; the confirmed webhook exposes the buyer's selection.

**Spec:** `docs/superpowers/specs/2026-06-06-currency-first-checkout-design.md` (READ IT FIRST — every task below references its sections).

**Architecture:** A multi-source FX router generalises the existing `FxRateService` (ECB/frankfurter kept, CBR XML daily added for RUB, fixed 655.957 XOF/EUR peg; ≤2 pivot hops, single final rounding). A new `currency_selection` checkout state precedes bank selection; `POST /v1/checkout/:id/currency` re-quotes the session in a transaction (release lease → update currency/amounts/trace → new lease). `payment_sessions.currency` already drives everything downstream, so matching/rails follow for free.

**Tech Stack:** TypeScript monorepo, vitest, Fastify, PostgreSQL. Windows PowerShell (no `&&`). Long-running suites: `npx vitest run <paths>`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/api/src/fx.ts` | Modify (extend) | `FxRateService.quote(source, target, amountMinor, sourceMinorDigits, targetMinorDigits)` + CBR provider + peg + path composition; `quoteToUsd` kept as a thin delegate |
| `apps/api/src/fx.test.ts` | Modify | router path tests, CBR XML parsing, single-rounding adversarial |
| `apps/api/src/orders.ts` | Modify | `selectAmountLeaseCandidate` 1% cap; session requote repository method; `normalizeReconciliationDelta(value, maxDelta)` |
| `packages/contracts/src/index.ts` | Modify | `CheckoutSessionStates` += `currency_selection`; `mapPaymentSessionToCheckoutState` gains the state; `deriveReconciliationDeltaMinor(paymentSessionId, reference, maxDelta?)` |
| `packages/database/migrations/029_buyer_currency_selection.sql` | Create | 6 nullable session columns |
| `apps/api/src/server.ts` | Modify | `GET /v1/checkout/:id/payable-currencies`, `POST /v1/checkout/:id/currency` |
| `apps/api/src/payment-sessions.ts` | Modify | checkout-state input plumbing (payable currency count), buyer-safe session fields (base amounts for dual display) |
| `apps/web/src/screens/CheckoutScreen.ts` + `apps/web/src/index.ts` | Modify | currency step UI (fr/en/ru), dual-currency display, step routing |
| `apps/api/src/reviews.ts` + `apps/job-worker/src/webhook-runtime.ts` | Modify | `buyer_currency_selection` webhook block; review-list `formatAmountMinor` currency fix |
| `docs/06_API_SPEC.md`, `docs/12_WEBHOOKS.md`, `docs/05_DATABASE_SCHEMA.md` | Modify | endpoints, payload, columns |

---

### Task 1: FX router (ECB + CBR + UEMOA peg)

**Files:**
- Modify: `apps/api/src/fx.ts` (extend the existing class — keep `quoteToUsd` API intact)
- Test: `apps/api/src/fx.test.ts`

- [ ] **Step 1: Failing tests.** Append to `fx.test.ts` (reuse the file's `fetchReturning` helper for ECB; add a CBR helper):

```typescript
function cbrFetchReturning(rates: Record<string, { nominal: number; value: string }>) {
  const valutes = Object.entries(rates)
    .map(([code, r]) => `<Valute ID="X"><NumCode>0</NumCode><CharCode>${code}</CharCode><Nominal>${r.nominal}</Nominal><Name>x</Name><Value>${r.value}</Value></Valute>`)
    .join('');
  return vi.fn(async () =>
    new Response(`<?xml version="1.0" encoding="windows-1251"?><ValCurs Date="06.06.2026" name="Foreign Currency Market">${valutes}</ValCurs>`, { status: 200 })
  );
}

describe('FxRateService.quote (multi-source router)', () => {
  const clock = () => new Date('2026-06-06T10:00:00Z');

  it('quotes EUR->USD via ECB (existing path through the generic API)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('EUR', 'USD', 999, 2, 2); // €9.99
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1084, source: 'ecb' } });
  });

  it('quotes USD->RUB via CBR (Value/Nominal, comma decimal)', async () => {
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ USD: { nominal: 1, value: '79,5000' } }),
      clock
    });
    const result = await service.quote('USD', 'RUB', 1000, 2, 2); // $10.00 -> 795.00 RUB
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 79500, source: 'cbr' } });
  });

  it('quotes RUB->USD via CBR inverse', async () => {
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ USD: { nominal: 1, value: '80,0000' } }),
      clock
    });
    const result = await service.quote('RUB', 'USD', 80000, 2, 2); // 800 RUB -> $10.00
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1000 } });
  });

  it('quotes EUR->XOF via the fixed UEMOA peg (zero-decimal target)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('EUR', 'XOF', 1000, 2, 0); // €10.00 -> 6560 XOF (655.957*10 = 6559.57 -> 6560)
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 6560, source: 'uemoa_peg' } });
  });

  it('quotes USD->XOF with two hops and a SINGLE final rounding', async () => {
    // USD->EUR via ECB inverse (1/1.0852), EUR->XOF peg. $10 -> 9.21489€... -> 6044.55... -> 6045 XOF.
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quote('USD', 'XOF', 1000, 2, 0);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 6045, source: 'ecb+uemoa_peg' } });
  });

  it('quotes RUB->XOF (CBR inverse -> EUR -> peg) with handled JPY-style nominals', async () => {
    const service = new FxRateService({
      fetchImpl: fetchReturning(1.0852),
      cbrFetchImpl: cbrFetchReturning({ EUR: { nominal: 1, value: '86,2750' }, JPY: { nominal: 100, value: '52,9000' } }),
      clock
    });
    // 8627.50 RUB -> 100 EUR -> 65595.7 -> 65596 XOF
    const result = await service.quote('RUB', 'XOF', 862750, 2, 0);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 65596 } });
    // JPY nominal=100: 1 JPY = 0.529 RUB
    const jpy = await service.quote('JPY', 'RUB', 1000, 0, 2); // 1000 JPY -> 529.00 RUB
    expect(jpy).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 52900 } });
  });

  it('returns unavailable for unreachable targets and same-currency is identity', async () => {
    const failing = vi.fn(async () => { throw new Error('down'); });
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), cbrFetchImpl: failing, clock });
    expect((await service.quote('USD', 'RUB', 1000, 2, 2)).kind).toBe('unavailable');
    expect(await service.quote('USD', 'USD', 1234, 2, 2)).toMatchObject({ kind: 'ok', quote: { amountMinorTarget: 1234, rate: '1' } });
  });

  it('keeps quoteToUsd behavior identical (delegation)', async () => {
    const service = new FxRateService({ fetchImpl: fetchReturning(1.0852), clock });
    const result = await service.quoteToUsd('EUR', 999, 2);
    expect(result).toMatchObject({ kind: 'ok', quote: { amountMinorUsd: 1084 } });
  });
});
```

- [ ] **Step 2:** `npx vitest run apps/api/src/fx.test.ts` → new FAIL, 7 old PASS.

- [ ] **Step 3: Implement in `fx.ts`.** Keep the file single-responsibility (FX only). Structure:

```typescript
export const UEMOA_XOF_PER_EUR = 655.957; // fixed legal parity

export interface FxRouteQuote {
  rate: string;            // composed rate as decimal string
  rateTimestamp: string;
  amountMinorTarget: number;
  source: 'ecb' | 'cbr' | 'uemoa_peg' | 'ecb+uemoa_peg' | 'cbr+ecb' | 'cbr+ecb+uemoa_peg' | 'identity';
}

export type FxRouteResult =
  | { kind: 'ok'; quote: FxRouteQuote }
  | { kind: 'unavailable'; reason: 'fx_rate_unavailable' };
```

Constructor gains `cbrBaseUrl?` (default `https://www.cbr.ru/scripts`) and `cbrFetchImpl?` (default = fetchImpl). Add a CBR cache (`Map<string, { ratePerUnit: number; fetchedAt: number }>` keyed by CharCode, one fetch fills ALL codes — the XML is a single document):

```typescript
  private async cbrRatePerUnit(code: string): Promise<number | null> {
    // RUB per 1 unit of `code`. Cached document-wide; comma decimal; Value/Nominal.
    const nowMs = this.clock().getTime();
    const cached = this.cbrCache.get(code);
    if (!cached || nowMs - cached.fetchedAt > this.ttlMs) {
      await this.refreshCbr(nowMs);
    }
    const entry = this.cbrCache.get(code);
    if (!entry || nowMs - entry.fetchedAt > this.staleMaxMs) {
      return null;
    }
    return entry.ratePerUnit;
  }

  private async refreshCbr(nowMs: number): Promise<void> {
    try {
      const response = await this.cbrFetchImpl(`${this.cbrBaseUrl}/XML_daily.asp`);
      if (!response.ok) return;
      const xml = await response.text();
      for (const m of xml.matchAll(/<Valute[^>]*>[\s\S]*?<CharCode>([A-Z]{3})<\/CharCode>[\s\S]*?<Nominal>(\d+)<\/Nominal>[\s\S]*?<Value>([\d.,]+)<\/Value>[\s\S]*?<\/Valute>/g)) {
        const code = m[1] as string;
        const nominal = Number.parseInt(m[2] as string, 10);
        const value = Number.parseFloat((m[3] as string).replace(',', '.'));
        if (nominal > 0 && Number.isFinite(value) && value > 0) {
          this.cbrCache.set(code, { ratePerUnit: value / nominal, fetchedAt: nowMs });
        }
      }
    } catch {
      // stale window applies; never invent a rate
    }
  }
```

Then the router. Internal: `unitRate(source, target): Promise<{ rate: number; source: FxRouteQuote['source'] } | null>` — composes WITHOUT rounding:

- identity: source === target → rate 1
- ECB direct: both in ECB scope → reuse the existing per-pair fetch (`fetchRate` generalised to `latest?base=S&symbols=T`; keep the USD-specific cache keyed `S->T`)
- RUB target: `cbrRatePerUnit(source)` → rate = thatValue (RUB per source unit); RUB source: `1 / cbrRatePerUnit(target)`; if the other leg isn't CBR-listed, compose via EUR: `RUB->EUR (CBR inverse)` then `EUR->X (ECB or peg)`
- XOF target: `S->EUR` (ECB, identity if S=EUR) × `UEMOA_XOF_PER_EUR`; XOF source: ÷ peg then `EUR->T`
- compose at most: [CBR leg] × [ECB leg] × [peg leg]; build the `source` label by joining the legs actually used with '+'

`quote(source, target, amountMinor, sourceMinorDigits, targetMinorDigits)`:

```typescript
    const amountMajor = amountMinor / 10 ** sourceMinorDigits;
    const amountMinorTarget = Math.round(amountMajor * unit.rate * 10 ** targetMinorDigits); // SINGLE rounding
```

guard `Number.isSafeInteger && > 0` → else unavailable. `quoteToUsd(currency, amountMinor, minorDigits)` becomes `return this.quote(currency, 'USD', amountMinor, minorDigits, 2)` mapped back to the old `FxQuoteResult` shape (`amountMinorUsd`, same `rate`/`rateTimestamp` fields) so ALL existing callers/tests stay green.

- [ ] **Step 4:** `npx vitest run apps/api/src/fx.test.ts` → ALL PASS (old 7 + new 8). `npm run typecheck`.

- [ ] **Step 5: Commit** — `git add apps/api/src/fx.ts apps/api/src/fx.test.ts` ; `git commit -m "feat(api): multi-source FX router — ECB + CBR daily XML + UEMOA peg, single final rounding"`

---

### Task 2: Per-currency reconciliation cap (≤1%)

**Files:**
- Modify: `apps/api/src/orders.ts` — `selectAmountLeaseCandidate` (~line 353), `normalizeReconciliationDelta` (~line 2571)
- Modify: `packages/contracts/src/index.ts` — `deriveReconciliationDeltaMinor` (~line 1345)
- Test: `apps/api/src/orders.test.ts`, `packages/contracts/src/checkout.test.ts`

- [ ] **Step 1: Failing tests.** `orders.test.ts`, next to existing `selectAmountLeaseCandidate` tests (search them; if none exist, new describe):

```typescript
  describe('per-currency reconciliation cap', () => {
    it('caps the delta at 1% of the display amount', () => {
      // $5.00 -> maxDelta = max(1, floor(500/100)) = 5
      const candidate = selectAmountLeaseCandidate({
        displayAmountMinor: 500,
        preferredDeltaMinor: 42, // out of cap -> renormalized within 1..5
        unavailablePayableAmounts: new Set()
      });
      expect(candidate).not.toBeNull();
      expect(candidate!.reconciliationDeltaMinor).toBeGreaterThanOrEqual(1);
      expect(candidate!.reconciliationDeltaMinor).toBeLessThanOrEqual(5);
    });

    it('keeps the historical 1..99 range for large amounts', () => {
      const candidate = selectAmountLeaseCandidate({
        displayAmountMinor: 100000, // 1000 RUB -> floor(1000)=99 cap
        preferredDeltaMinor: 67,
        unavailablePayableAmounts: new Set()
      });
      expect(candidate!.reconciliationDeltaMinor).toBe(67);
    });

    it('always allows at least delta 1 on tiny amounts', () => {
      const candidate = selectAmountLeaseCandidate({
        displayAmountMinor: 50, // floor(0.5) -> clamped to 1
        preferredDeltaMinor: 1,
        unavailablePayableAmounts: new Set()
      });
      expect(candidate!.reconciliationDeltaMinor).toBe(1);
    });

    it('returns null when every capped payable amount is taken', () => {
      const taken = new Set([501, 502, 503, 504, 505]);
      expect(selectAmountLeaseCandidate({ displayAmountMinor: 500, preferredDeltaMinor: 1, unavailablePayableAmounts: taken })).toBeNull();
    });
  });
```

- [ ] **Step 2:** Run → FAIL (out-of-cap deltas accepted today).

- [ ] **Step 3: Implement.** In `orders.ts`:

```typescript
/** Reconciliation deltas stay <=1% of the display amount (min 1 minor unit, max 99). */
export function maxReconciliationDeltaMinor(displayAmountMinor: number): number {
  return Math.min(99, Math.max(1, Math.floor(displayAmountMinor / 100)));
}
```

`selectAmountLeaseCandidate` becomes:

```typescript
  const maxDelta = maxReconciliationDeltaMinor(input.displayAmountMinor);
  const preferredDelta = normalizeReconciliationDelta(input.preferredDeltaMinor, maxDelta);
  const deltas = [
    preferredDelta,
    ...Array.from({ length: maxDelta }, (_value, index) => index + 1).filter((delta) => delta !== preferredDelta)
  ];
```

`normalizeReconciliationDelta(value: number, maxDelta = 99)`: invalid or out of `1..maxDelta` → `1 + (Math.abs(value || 0) % maxDelta)` if integer else `1` — read the existing body first and keep its fallback spirit (current: returns 1 when invalid). Simplest faithful version:

```typescript
function normalizeReconciliationDelta(value: number, maxDelta = 99): number {
  if (!Number.isInteger(value) || value < 1) {
    return 1;
  }
  return value > maxDelta ? 1 + ((value - 1) % maxDelta) : value;
}
```

In `packages/contracts/src/index.ts`, `deriveReconciliationDeltaMinor` gains an optional cap: `(paymentSessionId, reference, maxDelta = 99)` → `(seed % maxDelta) + 1`. Grep ITS call sites and pass the cap where a display amount is in scope (api side passes `maxReconciliationDeltaMinor(displayAmountMinor)`); contracts-internal callers keep the default.

- [ ] **Step 4:** `npx vitest run apps/api/src/orders.test.ts packages/contracts/src` → PASS incl. pre-existing lease tests (a pre-existing test may assert delta ranges up to 99 on small fixtures — fix the FIXTURE amount, not the policy, unless the test was specifically pinning small-amount behavior, then update expectation and note it). `npm run typecheck`.

- [ ] **Step 5: Commit** — `git commit -m "feat(api,contracts): cap reconciliation deltas at 1% of the display amount"`

---

### Task 3: Migration 029 + session requote (repository)

**Files:**
- Create: `packages/database/migrations/029_buyer_currency_selection.sql`
- Modify: `apps/api/src/orders.ts` — `StoredPaymentSessionRecord`, row mappings, new `requotePaymentSessionCurrency` repository method
- Test: `apps/api/src/orders.test.ts`

- [ ] **Step 1: Migration**

```sql
-- 029 — Buyer currency selection on payment sessions. All nullable; legacy
-- sessions never set them. base_* freeze the creation-time currency/amount so
-- re-selections always re-quote from the base, never from the previous choice.
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS base_currency TEXT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS base_amount_minor BIGINT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS buyer_fx_rate TEXT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS buyer_fx_source TEXT;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS buyer_fx_timestamp TIMESTAMPTZ;
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS currency_selected_at TIMESTAMPTZ;
```

- [ ] **Step 2: Failing repository test** (mirror the in-memory + SQL-shape test idioms of the file — READ how `selectReceivingRoute`-style mutations are tested first):

Scenarios (one `describe('requotePaymentSessionCurrency')`):
1. happy path: session RUB 99900 minor, requote to USD 1234 minor with trace → session currency USD, expected/display amounts updated, `base_currency='RUB'`, `base_amount_minor=99900`, `currency_selected_at` set, previous amount lease released, new lease in the USD bucket with a ≤1% delta;
2. second requote (USD → XOF): `base_*` UNCHANGED (still RUB/99900), amounts now XOF;
3. rejected when `selected_receiving_route_id` is set → `{ kind: 'route_already_locked' }`;
4. rejected on final statuses (`manual_confirmed` etc.) → `{ kind: 'not_requotable' }`.

- [ ] **Step 3: Implement.** `StoredPaymentSessionRecord` += `baseCurrency?`, `baseAmountMinor?`, `buyerFxRate?`, `buyerFxSource?`, `buyerFxTimestamp?`, `currencySelectedAt?` (all optional). Extend every SELECT/INSERT/row-mapping of payment_sessions in `orders.ts` (grep `expected_amount_minor` to find them all) with the six columns. New repository method (PG + in-memory + interface):

```typescript
requotePaymentSessionCurrency(input: {
  merchantId: string;
  paymentSessionId: string;
  currency: string;
  amountMinor: number;
  fxRate: string;
  fxSource: string;
  fxTimestamp: string;
  auditEventId: string;
  now: string;
}): Promise<
  | { kind: 'requoted'; paymentSession: StoredPaymentSessionRecord }
  | { kind: 'route_already_locked' }
  | { kind: 'not_requotable' }
  | { kind: 'not_found' }
>
```

PG implementation, single transaction: `SELECT ... FOR UPDATE` the session; guard `selected_receiving_route_id IS NULL` and status not final; release any active amount lease for the session (reuse the existing release SQL idiom — grep `SET status = 'released'`); UPDATE the session: `currency=$, expected_amount_minor=$, display_amount_minor=$ (same value), payable_amount_minor=NULL, reconciliation_delta_minor=NULL, amount_lease_id=NULL, base_currency=COALESCE(base_currency, <previous currency>), base_amount_minor=COALESCE(base_amount_minor, <previous expected>), buyer_fx_rate=$, buyer_fx_source=$, buyer_fx_timestamp=$, currency_selected_at=$, updated_at=$`; insert an audit event (`payment_session.currency_selected`, payloadRedacted with currencies/amounts/rate — no PII). The payable/lease re-acquisition happens lazily through the EXISTING route-selection flow (leases attach when a route is selected — verify by reading `selectReceivingRoute`; if the lease is created earlier, recreate it here with `selectAmountLeaseCandidate`). ADAPT to what the code actually does — the tests pin the observable invariants, not the SQL shape.

- [ ] **Step 4:** `npx vitest run apps/api/src/orders.test.ts` → PASS; `npm run typecheck`.

- [ ] **Step 5: Commit** — `git commit -m "feat(api,db): payment session currency requote with base trace (migration 029)"`

---

### Task 4: Checkout state + API endpoints

**Files:**
- Modify: `packages/contracts/src/index.ts` — `CheckoutSessionStates` (~line 39), `mapPaymentSessionToCheckoutState` (~line 539), `CheckoutStateInput`
- Modify: `apps/api/src/server.ts` — two endpoints next to the existing checkout endpoints (~line 2254 area)
- Modify: `apps/api/src/payment-sessions.ts` — state input plumbing + buyer-safe fields
- Test: `packages/contracts/src/checkout.test.ts`, `apps/api/src/payment-sessions.test.ts`

- [ ] **Step 1: Contracts (TDD).** Tests in `checkout.test.ts`: `mapPaymentSessionToCheckoutState` returns `'currency_selection'` when input has `payableCurrencyCount >= 2`, no `currencySelectedAt`, no selected route, status created/receiver_arming...; returns the EXISTING states otherwise (statuses with selections unchanged — non-regression assertions on 3 existing transitions). Implement: `CheckoutSessionStates` gains `'currency_selection'` after `'buyer_identity'`; `CheckoutStateInput` gains `payableCurrencyCount?: number | undefined; currencySelectedAt?: string | null | undefined;`; the mapper returns `currency_selection` before the bank-selection branch when `payableCurrencyCount !== undefined && payableCurrencyCount >= 2 && !currencySelectedAt && !selectedReceiverBankId && !selectedReceivingRouteId`. READ the existing switch carefully — insert without disturbing the later stages.

- [ ] **Step 2: Endpoints.** In `server.ts`, mirror the `payer-bank-launchers` endpoint pair idiom (~2254-2319):

`GET /v1/checkout/:id/payable-currencies` — loads the session, computes the candidate list: `readiness.receivable_currencies` of the merchant (reuse `resolveMerchantPaymentReadiness`); for each candidate ≠ session base: `fxRateService.quote(base, candidate, baseAmountMinor, currencyMinorDigits(base), currencyMinorDigits(candidate))` where base = `session.baseCurrency ?? session.currency` and baseAmount = `session.baseAmountMinor ?? session.expectedAmountMinor`; omit unavailable; current currency always present with `is_current: true`. Response per spec §2.

`POST /v1/checkout/:id/currency { currency }` — validate the currency is in the computed payable list (else 400 `currency_not_payable`); quote (409 `fx_rate_unavailable` on miss); call `repository.requotePaymentSessionCurrency` (map `route_already_locked` → 409, `not_requotable` → 409, `not_found` → 404); identity selection (same currency) allowed → marks `currency_selected_at` so the step completes. Respond with the refreshed checkout state payload (mirror what POST receiver-bank returns).

- [ ] **Step 3: payment-sessions plumbing.** Wherever `mapPaymentSessionToCheckoutState` is called (grep), thread `payableCurrencyCount` + `currencySelectedAt`. The buyer-safe session response gains `base_amount?: { value, currency }` + `selected_currency_quote?: { rate, source, timestamp }` for the dual display (read `toBuyerSafe...` builders and extend additively). Tests: state transitions with 1 vs 2 currencies; endpoint tests with an fx stub (mirror orders.test.ts patterns: bearer + fxRateService option).

- [ ] **Step 4:** `npx vitest run packages/contracts/src apps/api/src` → ALL PASS; `npm run typecheck`; `npm run lint`.

- [ ] **Step 5: Commit** — `git commit -m "feat(api,contracts): currency_selection checkout state + payable-currencies endpoints"`

---

### Task 5: Web checkout — currency step + dual display

**Files:**
- Modify: `apps/web/src/screens/CheckoutScreen.ts`, `apps/web/src/index.ts`
- Test: `apps/web/src/checkout.test.ts`

- [ ] **Step 1 (TDD):** Fake provider gains a session variant with `checkout_state: 'currency_selection'` + a `payable_currencies` list (read how the web app fetches state — the session payload or a sub-fetch; mirror the receiver-banks data path). Tests: step renders one card per currency with the quoted amount (`Payer 999 ₽` / `Pay $13.45` / RU variant), posts to `/checkout/:id/currency`; single-currency session NEVER shows the step (existing flows untouched — non-regression on 3 existing tests); instructions step shows `≈ {base}` when `base_amount` present and differs.

- [ ] **Step 2:** i18n: ~6 new keys ×3 locales (fr: `currencyKicker: 'Devise'`, `currencyTitle: 'Choisissez votre devise de paiement'`, `currencyText: 'Le montant est converti au taux du jour.'`, `payInLabel: 'Payer'`, `approxBaseLabel: '≈'`, `currentCurrencyBadge: 'Actuelle'`; en/ru equivalents — translator's judgment, consistent register with existing strings). Step rendering mirrors `renderReceivingRouteSelection` (option cards, `selection-form` posts). Step routing: handle `currency_selection` in the step mapping (`visualStageForStep` etc. — grep `buyer_identity` handling and mirror).

- [ ] **Step 3:** `npx vitest run apps/web/src` + `npm run typecheck` + `npm run lint` → green.

- [ ] **Step 4: Commit** — `git commit -m "feat(checkout): buyer currency selection step with live quotes and dual-currency display"`

---

### Task 6: Webhook block + review-list currency fix

**Files:**
- Modify: `apps/api/src/reviews.ts` (action SELECT + `ReviewActionResult` + `buildReviewActionEvent` + the 4 `formatAmountMinor(item.*Minor)` calls ~lines 1042-1063)
- Modify: `apps/job-worker/src/webhook-runtime.ts` (confirmed branch passthrough)
- Test: `apps/api/src/reviews.test.ts`, `apps/job-worker/src/webhook-runtime.test.ts`

- [ ] **Step 1 (TDD):** Mirror EXACTLY the `currency_detection` threading shipped in the previous cycle (same files, same pattern — read it):
- action SELECT adds `ps.base_currency, ps.base_amount_minor, ps.buyer_fx_rate, ps.buyer_fx_source, ps.buyer_fx_timestamp, ps.currency_selected_at`;
- `ReviewActionResult.updated` += `buyerCurrencySelection?: { selectedCurrency, baseCurrency, baseAmountMinor, fxRate, fxSource, fxTimestamp }` populated when `currency_selected_at` non-null (selectedCurrency = the session currency already in the result);
- `buildReviewActionEvent` emits `buyer_currency_selection: { selected_currency, base_currency, base_amount_minor, fx_rate, fx_source, fx_rate_timestamp }` (conditional spread — absent otherwise);
- `webhook-runtime.ts` confirmed branch: `buyer_currency_selection: readOptionalRecord(event.data.buyer_currency_selection)`.
Tests: round-trip presence + absence (4 tests, mirroring the currency_detection ones).
- [ ] **Step 2: Review-list fix.** The four `formatAmountMinor(item.amountMinor)`-style calls (~1042/1049/1056/1063) gain `, item.currency` — pre-existing XOF display bug. One test: a review item with XOF currency formats `'1000'` not `'1000.00'`.
- [ ] **Step 3:** `npx vitest run apps/api/src/reviews.test.ts apps/job-worker/src` + typecheck + lint → green.
- [ ] **Step 4: Commit** — `git commit -m "feat(webhooks): buyer_currency_selection block on payment.confirmed + currency-aware review amounts"`

---

### Task 7: Documentation

- [ ] `docs/06_API_SPEC.md`: the two checkout endpoints (request/response/errors `currency_not_payable`, `route_already_locked`, `fx_rate_unavailable`); the currency-selection step in the checkout flow narrative.
- [ ] `docs/12_WEBHOOKS.md`: `buyer_currency_selection` block (presence condition).
- [ ] `docs/05_DATABASE_SCHEMA.md`: 6 new payment_sessions columns (migration 029).
- [ ] No raw mojibake anywhere (repo guardrail).
- [ ] Commit — `git commit -m "docs: currency-first checkout endpoints, webhook block, schema 029"`

---

### Task 8: VERIFY

- [ ] `npm test` (full), `npm run typecheck`, `npm run lint`, `npx vitest run tests` — all green; `git diff --stat main..HEAD` confined to the listed files; final cross-cutting review (data-flow coherence quote→session→webhook; deploy order: migration 029 BEFORE push; merchant-facing inventory); report.
