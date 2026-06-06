# payment.currency_mismatch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a captured bank signal is in a different currency than a plausible payment session expects, emit an informational public webhook `payment.currency_mismatch` — without touching matching semantics.

**Spec:** `docs/superpowers/specs/2026-06-06-payment-currency-mismatch-design.md`

**Architecture:** `extractCurrency` learns XOF/USD → the signal-worker, on a `wait`/`no_candidate` decision, runs a read-only cross-currency probe (same-merchant active sessions, different currency, matching reference or exact amount) → emits internal `signal.currency_mismatch` (deduped via a new `notification_signals.currency_mismatch_notified_at` column, migration 028) → job-worker handler enqueues the public webhook (4th public event type, default-enabled for NEW provisioning only). SDK union updated.

**Tech Stack:** TypeScript monorepo, vitest, NATS JetStream internal bus, PostgreSQL. Windows PowerShell (no `&&`). Tests: `npx vitest run <path>`.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `packages/bank-templates/src/parser.ts:149-151` | Modify | `extractCurrency` → 'RUB' \| 'XOF' \| 'USD' \| null ; `ParsedBankNotification.currency` widened (line 15) |
| `packages/bank-templates/src/parser.test.ts` | Modify | golden cases 3 currencies + guards |
| `packages/events/src/index.ts:13-43` | Modify | `SIGNAL_CURRENCY_MISMATCH: 'signal.currency_mismatch'` |
| `packages/database/migrations/028_currency_mismatch_dedup.sql` | Create | dedup column |
| `apps/signal-worker/src/runtime.ts` | Modify | probe hook at the `wait && !match.selected` branch (~354-362) + repository probe/mark methods (next to `listCandidateSessions` ~829) |
| `apps/signal-worker/src/runtime.test.ts` | Modify | probe behavior tests |
| `apps/job-worker/src/webhooks.ts:10-15` | Modify | `PublicWebhookEventType` + `PUBLIC_WEBHOOK_EVENT_TYPES` |
| `apps/job-worker/src/webhook-runtime.ts` | Modify | `createCurrencyMismatchWebhookHandler` |
| `apps/job-worker/src/consumers.ts` + `index.ts:171` | Modify | consume + dispatch the new internal event |
| `apps/job-worker/src/webhook-runtime.test.ts` | Modify | handler tests |
| `apps/api/src/developer-integration.ts:8,794-796` | Modify | `PUBLIC_V1_WEBHOOK_EVENTS` += type (new provisioning default) |
| `packages/swimpay-node/src/types.ts:37` + `webhooks.ts:14-16` | Modify | SDK union + verification set |
| `docs/12_WEBHOOKS.md`, `docs/06_API_SPEC.md` | Modify | event documentation |

---

### Task 1: Extended currency extraction (bank-templates)

**Files:**
- Modify: `packages/bank-templates/src/parser.ts:15` (type), `:149-151` (extractCurrency)
- Test: `packages/bank-templates/src/parser.test.ts`

- [ ] **Step 1: Failing tests.** In `parser.test.ts`, next to the existing `extractCurrency` cases (line ~38), add:

```typescript
  it.each([
    ['Vous avez recu 1 000 FCFA de M. Diallo', 'XOF'],
    ['Recu 2500 F CFA via Wave', 'XOF'],
    ['Transfert de 5000 XOF recu', 'XOF'],
    ['You received $10.99 from John', 'USD'],
    ['Incoming transfer 137.50 USD', 'USD'],
    ['Received US$ 25.00', 'USD']
  ])('extracts non-RUB currency from %s', (text, expected) => {
    expect(extractCurrency(text)).toBe(expected);
  });

  it.each([
    ['You received CA$ 10.00'],        // prefixed dollar — never USD
    ['A$25 received'],
    ['CFAO Motors payment received'],  // CFA must be word-bounded
    ['USDT deposit confirmed'],        // USD must be word-bounded
    ['Received 100 RUB then 50 USD']   // conflicting currencies — never guess
  ])('returns null for ambiguous or unbounded currency text %s', (text) => {
    expect(extractCurrency(text)).toBeNull();
  });

  it('keeps RUB extraction unchanged and RUB wins its own contexts', () => {
    expect(extractCurrency('Поступление 137.50 ₽')).toBe('RUB');
    expect(extractCurrency('перевод 500 руб.')).toBe('RUB');
  });
```

- [ ] **Step 2:** `npx vitest run packages/bank-templates/src/parser.test.ts` → new FAIL, old PASS.

- [ ] **Step 3: Implement.** `ParsedBankNotification.currency` (line 15) becomes `currency?: 'RUB' | 'XOF' | 'USD' | undefined;`. Replace `extractCurrency` (lines 149-151) with:

```typescript
// RUB_CURRENCY_PATTERN: lift the EXISTING inline regex from extractCurrency verbatim into
// this const — it intentionally contains mojibake alternates of the ruble markers which must
// stay byte-identical (and which this plan does not reproduce: the repo mojibake guardrail
// allows them only in parser.ts/fixtures.ts).
const RUB_CURRENCY_PATTERN = /<existing extractCurrency regex, moved verbatim>/iu;
const XOF_CURRENCY_PATTERN = /(?:^|[\s])(?:FCFA|F\sCFA|XOF|CFA)(?=$|[\s.,;:])/iu;
// Bare $ is USD unless letter-prefixed (CA$, A$); US$ and the USD code are word-bounded.
const USD_CURRENCY_PATTERN = /(?:(?<![A-Za-z])\$|(?:^|[\s])(?:US\$|USD)(?=$|[\s.,;:]))/u;
const PREFIXED_DOLLAR_PATTERN = /[A-Za-z]\$/u;

export function extractCurrency(text: string): 'RUB' | 'XOF' | 'USD' | null {
  const rub = RUB_CURRENCY_PATTERN.test(text);
  const xof = XOF_CURRENCY_PATTERN.test(text);
  const usd = !PREFIXED_DOLLAR_PATTERN.test(text) && USD_CURRENCY_PATTERN.test(text);
  const matches = [rub, xof, usd].filter(Boolean).length;
  if (matches !== 1) {
    // No marker, or conflicting currency markers — never guess.
    return null;
  }
  if (rub) return 'RUB';
  if (xof) return 'XOF';
  return 'USD';
}
```

CAUTION: the existing RUB regex contains intentional mojibake alternates (garbled ruble-sign and 'rub' byte sequences — see parser.ts, not reproduced here because of the repo mojibake guardrail) — keep them byte-identical. Trace 'USDT': `USD` requires `(?=$|[\s.,;:])` after, 'T' follows → no match ✓. 'CFAO': `CFA` requires boundary after, 'O' follows → no match ✓. 'CA$ 10': PREFIXED_DOLLAR kills usd; no other marker → null ✓. '100 RUB then 50 USD': rub+usd → 2 matches → null ✓. NOTE the existing call site (line 73) and `markSignalParsed` need no change (currency flows as string).

- [ ] **Step 4:** `npx vitest run packages/bank-templates/src` → ALL PASS (existing RUB `it.each` at line 35-39 must stay green). Then `npm run typecheck` — `parsed.currency` consumers may need union widening fallout; fix additively and list every touched file.

- [ ] **Step 5: Commit** — `git add packages/bank-templates <fallout files>` ; `git commit -m "feat(bank-templates): extract XOF and USD currencies from notifications"`

---

### Task 2: Internal event type + migration 028

**Files:**
- Modify: `packages/events/src/index.ts:13-43`
- Create: `packages/database/migrations/028_currency_mismatch_dedup.sql`

- [ ] **Step 1:** In `EventTypes`, after `SIGNAL_QUALITY_SCORED`, add:

```typescript
  SIGNAL_CURRENCY_MISMATCH: 'signal.currency_mismatch',
```

- [ ] **Step 2:** Create the migration:

```sql
-- 028 — Dedup marker for payment.currency_mismatch notifications: a signal
-- notifies the merchant at most once. Additive and idempotent.
ALTER TABLE notification_signals
  ADD COLUMN IF NOT EXISTS currency_mismatch_notified_at TIMESTAMPTZ;
```

- [ ] **Step 3:** `npm run typecheck` clean; `npx vitest run packages/events/src` if a test asserts the EventTypes set (check; update additively if it enumerates values).

- [ ] **Step 4: Commit** — `git commit -m "feat(events,db): signal.currency_mismatch internal event + dedup column (migration 028)"`

---

### Task 3: Cross-currency probe (signal-worker)

**Files:**
- Modify: `apps/signal-worker/src/runtime.ts` — repository (next to `listCandidateSessions` ~line 829) + the `wait && !match.selected` branch (~line 354-362)
- Test: `apps/signal-worker/src/runtime.test.ts`

- [ ] **Step 1: Read first.** Read `runtime.ts` around lines 250-420 (decision flow), 740-930 (repository), and the test file's harness (how the fake/pg repository and signals/sessions are built — find the existing test for `routes trusted exact matches...` at ~line 444 of runtime.test.ts as a template). Identify the repository interface the runtime depends on (likely `SignalRuntimeRepository` — confirm its name and where the fake implements it in tests).

- [ ] **Step 2: Failing tests.** Add to `runtime.test.ts`, mirroring the harness:

1. `emits signal.currency_mismatch when a cross-currency session matches by reference` — signal: currency 'RUB', amountMinor 13700, referenceCode 'TANGO ALFA', merchant M; sessions: ONE active XOF session of M with reference 'TANGO ALFA' and a different amount; expectation: decision flow still ignores the signal (existing behavior assertions of the no-candidate path), AND the emitted runtime events include type `signal.currency_mismatch` with data `{ signal_id, merchant_id, order_id, external_id, payment_session_id, expected_currency: 'XOF', signal_currency: 'RUB', signal_amount_minor: 13700, expected_amount_minor: <session amount>, matched_on: 'reference' }`, AND the repository was asked to mark the signal notified.
2. `emits with matched_on amount when only the amount matches` — same but session reference differs and `payable/expected_amount_minor === 13700` → `matched_on: 'amount'`.
3. `does not emit when no cross-currency session corresponds` — different amount AND different reference → no `signal.currency_mismatch` event.
4. `does not probe twice for the same signal` — signal already `currencyMismatchNotifiedAt` set (or fake returns already-notified) → no event.
5. `does not probe signals without a currency` — signal.currency undefined → no event (and the probe repository method is not called).

(Exact assertion mechanics: the tests file has an event-capture pattern — reuse it. If the fake repository lacks the new methods, the tests define them on the fake.)

- [ ] **Step 3:** `npx vitest run apps/signal-worker/src/runtime.test.ts` → new FAIL.

- [ ] **Step 4: Repository methods.** Next to `listCandidateSessions` add (PG implementation; mirror its style — also add the methods to the repository interface and to every fake in tests):

```typescript
  public async probeCrossCurrencySessions(input: {
    merchantId: string;
    signalCurrency: string;
    amountMinor: number | undefined;
    referenceCode: string | undefined;
    observedAt: string;
  }): Promise<CrossCurrencyProbeHit | null> {
    if (input.amountMinor === undefined && !input.referenceCode) {
      return null;
    }
    const result = await this.pool.query(
      `SELECT
        o.id AS order_id,
        o.external_id,
        ps.id AS payment_session_id,
        ps.currency AS expected_currency,
        COALESCE(ps.payable_amount_minor, ps.expected_amount_minor) AS expected_amount_minor,
        (UPPER(COALESCE(ps.reference_code, '')) = UPPER(COALESCE($4, ''))) AS reference_matched
       FROM payment_sessions ps
       JOIN orders o ON o.id = ps.order_id AND o.merchant_id = ps.merchant_id
       WHERE ps.merchant_id = $1
         AND ps.currency <> $2
         AND $5::timestamptz BETWEEN ps.valid_from AND ps.valid_until
         AND ps.status NOT IN ('manual_confirmed', 'rejected', 'expired')
         AND o.status NOT IN ('manual_confirmed', 'fulfilled', 'rejected', 'expired')
         AND (
           ($4::text IS NOT NULL AND UPPER(ps.reference_code) = UPPER($4))
           OR ($3::bigint IS NOT NULL AND (
             COALESCE(ps.payable_amount_minor, ps.expected_amount_minor) = $3
             OR ps.display_amount_minor = $3
           ))
         )
       ORDER BY reference_matched DESC, ps.created_at ASC
       LIMIT 1`,
      [input.merchantId, input.signalCurrency, input.amountMinor ?? null, input.referenceCode ?? null, input.observedAt]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      orderId: String(row.order_id),
      externalId: String(row.external_id),
      paymentSessionId: String(row.payment_session_id),
      expectedCurrency: String(row.expected_currency),
      expectedAmountMinor: Number(row.expected_amount_minor),
      matchedOn: row.reference_matched === true ? 'reference' : 'amount'
    };
  }

  public async markCurrencyMismatchNotified(signalId: string, notifiedAt: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE notification_signals
       SET currency_mismatch_notified_at = $2
       WHERE id = $1 AND currency_mismatch_notified_at IS NULL`,
      [signalId, notifiedAt]
    );
    return result.rowCount === 1;
  }
```

with the type:

```typescript
export interface CrossCurrencyProbeHit {
  orderId: string;
  externalId: string;
  paymentSessionId: string;
  expectedCurrency: string;
  expectedAmountMinor: number;
  matchedOn: 'reference' | 'amount';
}
```

The `markCurrencyMismatchNotified` conditional-UPDATE doubles as the dedup gate (returns false when already notified — emit nothing then). ADAPT names/visibility to the actual repository interface.

- [ ] **Step 5: Runtime hook.** In the `wait && !match.selected` branch (~line 354), BEFORE `return this.ignoreUnrelatedSignal({...})`, insert:

```typescript
      await this.maybeNotifyCurrencyMismatch(hydratedSignal, parsed, now);
```

and add the private method (adapt field names to the actual signal/parsed shapes — `hydratedSignal.currency`, `hydratedSignal.amountMinor`, `parsed.referenceCode ?? hydratedSignal.referenceCode` if the hydrated signal carries one, `hydratedSignal.merchantId`, `hydratedSignal.observedAt`):

```typescript
  private async maybeNotifyCurrencyMismatch(
    signal: SignalRuntimeSignal,
    parsed: ParsedBankNotification,
    now: string
  ): Promise<void> {
    if (!signal.currency) {
      return;
    }
    const hit = await this.repository.probeCrossCurrencySessions({
      merchantId: signal.merchantId,
      signalCurrency: signal.currency,
      amountMinor: signal.amountMinor,
      referenceCode: parsed.referenceCode,
      observedAt: signal.observedAt
    });
    if (!hit) {
      return;
    }
    const marked = await this.repository.markCurrencyMismatchNotified(signal.id, now);
    if (!marked) {
      return; // already notified — at most one event per signal
    }
    await this.emitRuntimeEvent(EventTypes.SIGNAL_CURRENCY_MISMATCH, signal, now, {
      signal_id: signal.id,
      merchant_id: signal.merchantId,
      order_id: hit.orderId,
      external_id: hit.externalId,
      payment_session_id: hit.paymentSessionId,
      expected_currency: hit.expectedCurrency,
      signal_currency: signal.currency,
      signal_amount_minor: signal.amountMinor ?? null,
      expected_amount_minor: hit.expectedAmountMinor,
      matched_on: hit.matchedOn
    });
  }
```

Wrap the call defensively if the surrounding flow treats repository errors as fatal: a probe failure must NOT break signal processing — `try { ... } catch { log + continue }` matching the file's error-handling idiom (read how sibling emit/audit failures are handled and mirror it; if they propagate, propagate too and note it).

- [ ] **Step 6:** `npx vitest run apps/signal-worker/src` → ALL PASS. `npm run typecheck` clean (fakes updated).

- [ ] **Step 7: Commit** — `git commit -m "feat(signal-worker): cross-currency probe emits signal.currency_mismatch (deduped)"`

---

### Task 4: Public webhook handler (job-worker)

**Files:**
- Modify: `apps/job-worker/src/webhooks.ts:10-15`, `apps/job-worker/src/webhook-runtime.ts`, `apps/job-worker/src/consumers.ts:3-8`, `apps/job-worker/src/index.ts:~171`
- Test: `apps/job-worker/src/webhook-runtime.test.ts`, `apps/job-worker/src/consumers.test.ts`

- [ ] **Step 1: Failing test.** In `webhook-runtime.test.ts`, mirroring the confirmed-handler tests:

```typescript
  it('signal.currency_mismatch handler enqueues a payment.currency_mismatch webhook', async () => {
    const enqueuer = new RecordingEnqueuer(); // reuse the file's existing fake enqueuer pattern
    const handler = createCurrencyMismatchWebhookHandler(enqueuer);
    await handler({
      id: 'evt_cm_1',
      type: EventTypes.SIGNAL_CURRENCY_MISMATCH,
      created_at: '2026-06-06T10:00:00.000Z',
      source: 'signal-worker',
      data: {
        signal_id: 'sig_01',
        merchant_id: 'mch_01',
        order_id: 'ord_01',
        external_id: 'order_888',
        payment_session_id: 'ps_01',
        expected_currency: 'XOF',
        signal_currency: 'RUB',
        signal_amount_minor: 13700,
        expected_amount_minor: 1000,
        matched_on: 'reference'
      }
    });
    expect(enqueuer.events).toHaveLength(1);
    const event = enqueuer.events[0];
    expect(event.type).toBe('payment.currency_mismatch');
    expect(event.merchantId).toBe('mch_01');
    expect(event.data).toEqual({
      order_id: 'ord_01',
      external_id: 'order_888',
      payment_session_id: 'ps_01',
      expected_currency: 'XOF',
      signal_currency: 'RUB',
      expected_amount_minor: 1000,
      signal_amount_minor: 13700,
      matched_on: 'reference',
      official_bank_confirmation: false
    });
  });

  it('currency_mismatch handler rejects other event types', async () => {
    const handler = createCurrencyMismatchWebhookHandler(new RecordingEnqueuer());
    await expect(handler({ ...envelope, type: EventTypes.REVIEW_CONFIRMED })).rejects.toThrow();
  });
```

(ADAPT the fake-enqueuer construction and envelope helper to the file's actual patterns — read them first. NOTE: `signal_id` from the internal event must NOT appear in the public payload.)

- [ ] **Step 2:** Run → FAIL (handler missing).

- [ ] **Step 3: Implement.**

(a) `apps/job-worker/src/webhooks.ts` lines 10-15:
```typescript
export type PublicWebhookEventType =
  | 'payment.confirmed'
  | 'payment.rejected'
  | 'payment.expired'
  | 'payment.currency_mismatch';

const PUBLIC_WEBHOOK_EVENT_TYPES = new Set<string>(['payment.confirmed', 'payment.rejected', 'payment.expired', 'payment.currency_mismatch']);
```

(b) `webhook-runtime.ts` — new handler next to `createPaymentExpiredWebhookHandler`:
```typescript
export function createCurrencyMismatchWebhookHandler(enqueuer: PublicWebhookEnqueuer): DurableEventHandler {
  return async (event: InternalEventEnvelope): Promise<{ kind: 'ok' }> => {
    if (event.type !== EventTypes.SIGNAL_CURRENCY_MISMATCH) {
      throw new Error(`Unexpected currency mismatch webhook event type: ${event.type}`);
    }

    const merchantId = requireString(event.data.merchant_id, 'merchant_id');
    const orderId = requireString(event.data.order_id, 'order_id');
    const externalOrderId = readOptionalString(event.data.external_id);
    const paymentSessionId = requireString(event.data.payment_session_id, 'payment_session_id');
    const expectedCurrency = requireString(event.data.expected_currency, 'expected_currency');
    const signalCurrency = requireString(event.data.signal_currency, 'signal_currency');
    const expectedAmountMinor = requireInteger(event.data.expected_amount_minor, 'expected_amount_minor');
    const matchedOn = requireString(event.data.matched_on, 'matched_on');

    await enqueuer.enqueueEvent(
      createPaymentWebhookEvent({
        eventId: event.id,
        type: 'payment.currency_mismatch',
        createdAt: event.created_at,
        merchantId,
        data: stripUndefined({
          order_id: orderId,
          external_id: externalOrderId,
          payment_session_id: paymentSessionId,
          expected_currency: expectedCurrency,
          signal_currency: signalCurrency,
          expected_amount_minor: expectedAmountMinor,
          signal_amount_minor: Number.isInteger(event.data.signal_amount_minor) ? event.data.signal_amount_minor : undefined,
          matched_on: matchedOn,
          official_bank_confirmation: false
        })
      })
    );
    return { kind: 'ok' };
  };
}
```

(c) `consumers.ts`: add `EventTypes.SIGNAL_CURRENCY_MISMATCH` to the consumed list (read the file; mirror the existing entries — there may also be a durable-name mapping).

(d) `index.ts` ~line 171: add the dispatch branch:
```typescript
  if (consumer.eventType === EventTypes.SIGNAL_CURRENCY_MISMATCH && webhookProcessor) {
    return createCurrencyMismatchWebhookHandler(webhookProcessor);
  }
```
(adapt to the function's actual structure; import the handler).

- [ ] **Step 4:** `npx vitest run apps/job-worker/src` → ALL PASS (consumers.test.ts may assert the consumer list — update additively). `npm run typecheck`.

- [ ] **Step 5: Commit** — `git commit -m "feat(job-worker): payment.currency_mismatch public webhook from signal.currency_mismatch"`

---

### Task 5: API registration + SDK

**Files:**
- Modify: `apps/api/src/developer-integration.ts:8` (+ provisioning if needed), `packages/swimpay-node/src/types.ts:37`, `packages/swimpay-node/src/webhooks.ts:14-16`
- Test: `apps/api/src/developer-integration.test.ts`, `packages/swimpay-node/src/index.test.ts`

- [ ] **Step 1:** `PUBLIC_V1_WEBHOOK_EVENTS` (developer-integration.ts:8) gains `'payment.currency_mismatch'`. Since provisioning (line ~794-796) serializes this const into new endpoints' `enabled_events`, NEW integrations get it by default — exactly the spec. Existing endpoints' DB rows are untouched (opt-in). Grep `PUBLIC_V1_WEBHOOK_EVENTS` for every consumer (validation of PATCH enabled_events? response contract ~838? developer-wizard web tests asserting the export block — apps/web/src/developer-wizard.test.ts:225 asserts a comma-joined list!) and update each additively.
- [ ] **Step 2:** SDK: `types.ts:37` union gains `'payment.currency_mismatch'`; `webhooks.ts:14-16` PUBLIC_EVENT_TYPES set gains it. Check `packages/swimpay-node/src/types.ts` for a payload interface per event type — if a discriminated union of payloads exists, add a `SwimPayCurrencyMismatchEventData` interface ({ order_id, external_id?, payment_session_id, expected_currency, signal_currency, expected_amount_minor, signal_amount_minor?, matched_on, official_bank_confirmation: false }) wired into the union; if payloads are loosely typed, skip.
- [ ] **Step 3: Tests.** developer-integration.test.ts: find the provisioning test asserting `public_webhook_events` and extend the expected array. swimpay-node index.test.ts: add a verification test for a `payment.currency_mismatch` signed payload (mirror the payment.confirmed verification test at ~line 246). apps/web developer-wizard tests: update the joined-list assertions.
- [ ] **Step 4:** `npx vitest run apps/api/src/developer-integration.test.ts packages/swimpay-node/src apps/web/src` → PASS; `npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "feat(api,sdk): register payment.currency_mismatch public event (default for new provisioning)"`

---

### Task 6: Documentation

- [ ] `docs/12_WEBHOOKS.md`: new event section — payload example (the Task 4 shape), semantics (informational; matching unchanged; at most one per signal; reference beats amount), subscription note (default for NEW integrations, opt-in for existing endpoints via the endpoints API).
- [ ] `docs/06_API_SPEC.md`: webhook events list += the new type with the same notes.
- [ ] Commit: `git commit -m "docs: payment.currency_mismatch event"`

---

### Task 7: VERIFY

- [ ] `npm test` (full, expect ~860+), `npm run typecheck`, `npm run lint`, `npx vitest run tests` (durable e2e) — all green; `git diff --stat` confined to the listed files; final report (gates, migration 028 to apply with the deploy, breaking-changes: none — additive event).
