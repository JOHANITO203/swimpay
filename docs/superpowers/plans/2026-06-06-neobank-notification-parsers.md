# Neobank Notification Parsers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse Wise/Revolut/Payoneer USD payment notifications on the Android receiver so they assist manual review (never auto-confirm), flipping `detection_supported` on the international profiles.

**Spec:** `docs/superpowers/specs/2026-06-06-neobank-notification-parsers-design.md` + harvest `docs/NEOBANK_NOTIFICATION_TEMPLATES.md` (READ both).

**Architecture:** `bank-templates` gains an English INT parsing path (keyed by the `*_int` profile suffix) — locale-neutral normalization, USD amount extraction, an English money-received matcher — alongside the untouched RU path. Three `learning` INT profiles are registered. Android `BankTargetLock` maps the 3 packages. Migration 030 seeds the harvested signing certs. Contracts flip `detection_supported: true`.

**Tech Stack:** TypeScript (bank-templates, contracts), Kotlin/Compose (Android), PostgreSQL, vitest + gradle. Windows PowerShell (no `&&`). The INT branch keys on `bankProfileId.endsWith('_int')` to avoid changing `parseBankNotification`'s signature (its caller is the signal-worker).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `packages/bank-templates/src/types.ts:34` | Modify | `BankProfile.country: 'RU' \| 'INT'` |
| `packages/bank-templates/src/parser.ts` | Modify | `createInternationalLearningProfile`, `V1_BANK_PROFILES += 3`, `normalizeIntlText`, `extractUsdAmountMinor`, English incoming/outgoing keyword sets, `classifyIntlDirection`, INT branch in `parseBankNotification` |
| `packages/bank-templates/src/parser.test.ts` | Modify | EN golden cases + RU non-regression |
| `apps/android-receiver/.../BankTargetLock.kt:62-69` | Modify | +3 supported targets |
| `apps/android-receiver/.../BankTargetLockTest.kt` (or existing test) | Modify | mapping + unknown-package non-regression |
| `packages/database/migrations/030_neobank_signing_certs.sql` | Create | seed harvested certs |
| `packages/contracts/src/index.ts:360-364` | Modify | `detectionSupported: true` ×3 |
| `packages/contracts/src/checkout.test.ts` | Modify | assert the flip |
| `apps/landing/public/downloads/swimpay-merchant.apk` | Replace | republish |
| `docs/12_WEBHOOKS.md` or relevant doc | Modify (optional) | note detection now active on USD |

---

### Task 1: International parsing path (bank-templates)

**Files:**
- Modify: `packages/bank-templates/src/types.ts:34`
- Modify: `packages/bank-templates/src/parser.ts` (profiles ~31-37, ~417; new helpers; `parseBankNotification` ~67-121)
- Test: `packages/bank-templates/src/parser.test.ts`

- [ ] **Step 1: Failing tests.** Append to `parser.test.ts`:

```typescript
describe('international neobank parsing (USD)', () => {
  it('extracts USD amount in common notification formats', () => {
    expect(extractUsdAmountMinor('You received $50.00 from John Doe')).toBe(5000);
    expect(extractUsdAmountMinor('1,234.56 USD received')).toBe(123456);
    expect(extractUsdAmountMinor('Received US$ 9.99')).toBe(999);
    expect(extractUsdAmountMinor('Payment of $1,000 from Acme')).toBe(100000);
    expect(extractUsdAmountMinor('CA$ 10.00 received')).toBeNull(); // prefixed dollar, not USD
    expect(extractUsdAmountMinor('no money here')).toBeNull();
  });

  it('parses a Wise money-received notification as incoming USD', () => {
    const parsed = parseBankNotification({ bankProfileId: 'wise_int', text: 'You received $50.00 from John Doe' });
    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.currency).toBe('USD');
    expect(parsed.amountMinor).toBe(5000);
    expect(parsed.allowAutoConfirmCandidate).toBe(false); // neobanks never auto-confirm
    expect(parsed.signalQuality).toBeGreaterThan(0);
  });

  it('parses Revolut-style fragments as incoming USD', () => {
    const parsed = parseBankNotification({ bankProfileId: 'revolut_int', text: '$25.00 from Alice — Received on the 6th' });
    expect(parsed.directionLabel).toBe('incoming_customer_transfer');
    expect(parsed.amountMinor).toBe(2500);
    expect(parsed.currency).toBe('USD');
  });

  it('classifies outgoing and noise as non-incoming on INT profiles', () => {
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'You sent $50.00 to Bob' }).directionLabel).not.toBe('incoming_customer_transfer');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'You paid $12.00 at Store' }).directionLabel).not.toBe('incoming_customer_transfer');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'Add money instantly to your account' }).directionLabel).toBe('unknown');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'Incoming call from +1...' }).directionLabel).toBe('unknown');
    expect(parseBankNotification({ bankProfileId: 'payoneer_int', text: 'Confirm your email address' }).directionLabel).toBe('unknown');
  });

  it('registers the three INT learning profiles (country INT, autoconfirm disabled)', () => {
    for (const id of ['wise_int', 'revolut_int', 'payoneer_int']) {
      const p = V1_BANK_PROFILES.find((x) => x.bankProfileId === id);
      expect(p).toBeDefined();
      expect(p!.country).toBe('INT');
      expect(p!.status).toBe('learning');
      expect(p!.autoConfirmStatus).toBe('disabled');
      expect(p!.supportedLocales).toEqual(['en']);
    }
  });
});
```

Add `extractUsdAmountMinor` and `V1_BANK_PROFILES` to the test imports if not present.

- [ ] **Step 2:** `npx vitest run packages/bank-templates/src/parser.test.ts` → new FAIL, all RU tests PASS.

- [ ] **Step 3: types.ts** — line 34: `country: 'RU' | 'INT';`.

- [ ] **Step 4: parser.ts — profiles.** After the 6 RU `createLearningProfile` lines (~36), add to the `V1_BANK_PROFILES` array:

```typescript
  createInternationalLearningProfile('wise_int', 'Wise'),
  createInternationalLearningProfile('revolut_int', 'Revolut'),
  createInternationalLearningProfile('payoneer_int', 'Payoneer')
```

and add the builder next to `createLearningProfile` (~417):

```typescript
function createInternationalLearningProfile(bankProfileId: string, displayName: string): BankProfile {
  return {
    bankProfileId,
    displayName,
    country: 'INT',
    status: 'learning',
    autoConfirmStatus: 'disabled',
    trustedApps: [],
    supportedLocales: ['en'],
    fieldPriority: ['EXTRA_TITLE', 'EXTRA_TEXT', 'EXTRA_BIG_TEXT', 'EXTRA_TEXT_LINES', 'EXTRA_SUB_TEXT', 'tickerText']
  };
}
```

- [ ] **Step 5: parser.ts — INT helpers.** Add near the RU helpers:

```typescript
/** Locale-neutral normalization for international (English) notifications. */
export function normalizeIntlText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** USD amount from neobank notifications: $1,234.56 / 1234.56 USD / US$ 9.99. */
export function extractUsdAmountMinor(text: string): number | null {
  const t = text.normalize('NFKC');
  // $-prefixed (reject letter-prefixed like CA$) or trailing USD/US$.
  const match =
    t.match(/(?<![A-Za-z])(?:US\$|\$)\s?(\d[\d,]*(?:\.\d{1,2})?)/u) ??
    t.match(/(\d[\d,]*(?:\.\d{1,2})?)\s?(?:US\$|USD)(?=$|[\s.,;:])/iu);
  if (!match?.[1]) {
    return null;
  }
  const normalized = match[1].replace(/,/g, '');
  const [major = '0', minor = ''] = normalized.split('.');
  const amount = Number.parseInt(major, 10) * 100 + (minor ? Number.parseInt(minor.padEnd(2, '0').slice(0, 2), 10) : 0);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

const INTL_INCOMING_KEYWORDS = [
  'you received', 'received $', 'received us$', 'received usd', '%1$s received', 'received from',
  'got paid', 'payment from', 'sent you', 'paid you', 'money from', 'you got'
];
const INTL_OUTGOING_KEYWORDS = [
  'you sent', 'you paid', 'payment sent', 'sent to', 'you transferred', 'transfer sent', 'withdrawal', 'you withdrew'
];
const INTL_NOISE_KEYWORDS = [
  'incoming call', 'add money', 'top up', 'confirm your email', 'verify', 'passcode', 'log in', 'login',
  'security', 'card delivered', 'statement', 'reward', 'cashback', 'promo', 'offer'
];

/** English money-received direction for INT profiles. Conservative: unknown unless clearly incoming. */
export function classifyIntlDirection(text: string): DirectionLabel {
  const n = normalizeIntlText(text);
  if (INTL_NOISE_KEYWORDS.some((k) => n.includes(k))) {
    return 'unknown';
  }
  if (INTL_OUTGOING_KEYWORDS.some((k) => n.includes(k))) {
    return 'outgoing_payment';
  }
  // 'received'/'from' with a money token, or explicit received phrasing.
  const incoming = INTL_INCOMING_KEYWORDS.some((k) => n.includes(k)) || (/\breceived\b/u.test(n) && /\bfrom\b/u.test(n));
  return incoming ? 'incoming_customer_transfer' : 'unknown';
}
```

- [ ] **Step 6: parser.ts — INT branch.** At the top of `parseBankNotification` (after destructuring `input`), add:

```typescript
  if (input.bankProfileId.endsWith('_int')) {
    return parseInternationalNotification(input);
  }
```

and implement `parseInternationalNotification` just below `parseBankNotification`:

```typescript
function parseInternationalNotification(input: ParseBankNotificationInput): ParsedBankNotification {
  const normalizedText = normalizeIntlText(input.text);
  const directionLabel = classifyIntlDirection(input.text);
  const amountMinor = extractUsdAmountMinor(input.text) ?? undefined;
  const currency = extractCurrency(input.text) ?? undefined;
  const referenceCode = extractReferenceCode(normalizedText) ?? undefined;
  const reasonCodes: string[] = [];
  if (directionLabel === 'incoming_customer_transfer') reasonCodes.push('intl_incoming_detected');
  if (amountMinor !== undefined) reasonCodes.push('amount_extracted');
  if (currency === 'USD') reasonCodes.push('currency_usd');
  if (referenceCode) reasonCodes.push('reference_extracted');
  reasonCodes.push('intl_review_only_never_auto_confirm');

  return {
    bankProfileId: input.bankProfileId,
    normalizedText,
    directionLabel,
    rail: undefined,
    amountMinor,
    currency,
    senderNameHint: undefined,
    senderBankHint: undefined,
    sourceLabel: undefined,
    cardNetwork: undefined,
    receiverCardLast4: undefined,
    balanceAfterMinor: undefined,
    senderPhoneNormalized: undefined,
    maskedPhoneDetected: false,
    referenceCode,
    signalQuality: scoreParsedSignal({ directionLabel, amountMinor, currency, referenceCode }),
    allowAutoConfirmCandidate: false, // neobanks never auto-confirm in v1
    reasonCodes
  };
}
```

(`extractReferenceCode`/`extractCurrency`/`scoreParsedSignal` already exist and are currency-aware after sub-project 3. `scoreParsedSignal` gives 0 for USD currency bonus by design — non-RUB — but +25 amount +25 incoming keeps quality > 0.)

- [ ] **Step 7:** `npx vitest run packages/bank-templates/src` → ALL PASS (RU byte-identical). `npm run typecheck` (the `country: 'INT'` widen may surface readers — grep `.country` in packages; fix additively). `npm run lint`.

- [ ] **Step 8: Commit** — `git add packages/bank-templates ; git commit -m "feat(bank-templates): English USD parsing path + Wise/Revolut/Payoneer learning profiles"`

---

### Task 2: Android BankTargetLock — register the 3 packages

**Files:**
- Modify: `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/BankTargetLock.kt:62-69`
- Test: the existing BankTargetLock unit test (search `BankTargetLock` under `apps/android-receiver/android/app/src/test`)

- [ ] **Step 1: Read** the existing BankTargetLock test to mirror its harness. **Failing test** — add:

```kotlin
@Test
fun `maps neobank packages to international profile ids`() {
    assertEquals("wise_int", BankTargetLock.bankProfileIdForPackage("com.transferwise.android"))
    assertEquals("revolut_int", BankTargetLock.bankProfileIdForPackage("com.revolut.revolut"))
    assertEquals("payoneer_int", BankTargetLock.bankProfileIdForPackage("com.payoneer.android"))
    assertNull(BankTargetLock.bankProfileIdForPackage("com.unknown.app"))
    assertEquals("sber_ru", BankTargetLock.bankProfileIdForPackage("ru.sberbankmobile"))
}
```

- [ ] **Step 2:** `npm run android:test` → FAIL on the new assertions.

- [ ] **Step 3:** `BankTargetLock.kt` — append to `supportedTargets` (after `ozon_bank`):

```kotlin
        SupportedBankTarget("wise_int", "Wise", "com.transferwise.android"),
        SupportedBankTarget("revolut_int", "Revolut", "com.revolut.revolut"),
        SupportedBankTarget("payoneer_int", "Payoneer", "com.payoneer.android")
```

- [ ] **Step 4:** `npm run android:test` → PASS. If Roborazzi goldens that render the supported-bank list change, re-record with `npm run android:visual:accept` and confirm only bank-list screens changed (STOP+report if unrelated screens differ).

- [ ] **Step 5: Commit** — `git add apps/android-receiver ; git commit -m "feat(android): register Wise/Revolut/Payoneer packages for notification capture"`

---

### Task 3: Migration 030 — seed harvested signing certs

**Files:**
- Create: `packages/database/migrations/030_neobank_signing_certs.sql`

- [ ] **Step 1: Write the migration** (certs from `docs/NEOBANK_NOTIFICATION_TEMPLATES.md`):

```sql
-- 030 — Seed the expected signing certificate (SHA-256) for the neobank
-- receiving profiles, harvested from the apkpure mirror (V3 signer). This is
-- the EXPECTED cert the first real on-device signal is matched against; the
-- bank_app_signatures pending_verification -> operator-approve flow is
-- unchanged (a mirror cert is never auto-trusted for production). Payoneer was
-- not on the mirror, so it keeps documented_unknown. Additive, idempotent.
UPDATE bank_profiles SET package_cert_sha256 = '149c4ea5825a81065589d27a60ea7e554df4b49e3c660cb65ba730025080dbd0', updated_at = now()
  WHERE id = 'wise_int';
UPDATE bank_profiles SET package_cert_sha256 = '9c9be07135e972780282c2e5d27da06ecb8ee3adfc75303917ddf66d6faaefa4', updated_at = now()
  WHERE id = 'revolut_int';
```

- [ ] **Step 2: Verify** the column exists: `Select-String -Pattern "package_cert_sha256" packages\database\migrations\*.sql` — confirm it is a `bank_profiles` column (added in migration 021/025). If the profiles `wise_int`/`revolut_int` are only inserted by migration 027, this UPDATE is a no-op until 027 ran — that's fine in prod (027 is applied). The migration is idempotent (re-running sets the same value).

- [ ] **Step 3: Commit** — `git add packages/database/migrations/030_neobank_signing_certs.sql ; git commit -m "feat(db): seed harvested Wise/Revolut signing certs (migration 030)"`

---

### Task 4: Flip detection_supported on the international profiles

**Files:**
- Modify: `packages/contracts/src/index.ts` (`InternationalReceiverBankProfiles` ~360-364)
- Test: `packages/contracts/src/checkout.test.ts`

- [ ] **Step 1: Failing test** — in the existing `international USD rail` describe, change/extend the detection assertion:

```typescript
  it('now supports detection on the international neobank profiles', () => {
    for (const profile of InternationalReceiverBankProfiles) {
      expect(profile.detection_supported).toBe(true);
      expect(profile.status).toBe('review_required_beta'); // status unchanged: assist review, not auto-confirm
    }
  });
```

(Update the prior test that asserted `detection_supported === false` — it is now intentionally `true`; do not leave a contradicting assertion.)

- [ ] **Step 2:** `npx vitest run packages/contracts/src/checkout.test.ts` → FAIL.

- [ ] **Step 3:** In `InternationalReceiverBankProfiles`, drop the `detectionSupported: false` option from the three `receiverBank(...)` calls (the builder defaults `detection_supported` to `true`). Keep `packageName`. Update the doc comment above the registry: detection is now active (review-assist; never auto-confirm).

- [ ] **Step 4:** `npx vitest run packages/contracts/src apps/api/src apps/web/src` → ALL PASS (a checkout/api test may have asserted the old `false` in a response snapshot — update additively to `true`; list any). `npm run typecheck`; `npm run lint`.

- [ ] **Step 5: Commit** — `git add packages/contracts/src apps/api/src apps/web/src ; git commit -m "feat(contracts): enable detection on Wise/Revolut/Payoneer profiles (review-assist)"`

---

### Task 5: Rebuild & republish the APK

**Files:**
- Replace: `apps/landing/public/downloads/swimpay-merchant.apk`

- [ ] **Step 1: Build** — `npm run android:assemble:release` (10-min timeout). BUILD SUCCESSFUL → `apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk`. If signing secrets are missing → STOP, report BLOCKED (never publish a debug build).
- [ ] **Step 2: Verify** the new APK contains the 3 packages: extract the dex and grep for `wise_int`/`revolut_int`/`payoneer_int` (mirror the verification used when the WA-trio APK was published), and confirm the signer cert matches the previously published APK (`apksigner verify --print-certs`).
- [ ] **Step 3: Publish** — `Copy-Item apps/android-receiver/android/app/build/outputs/apk/release/app-release.apk apps/landing/public/downloads/swimpay-merchant.apk -Force`.
- [ ] **Step 4: Commit** — `git add apps/landing/public/downloads/swimpay-merchant.apk ; git commit -m "chore(landing): publish receiver APK with neobank notification capture"`

---

### Task 6: Docs + VERIFY + final review + merge

- [ ] **Step 1: Docs.** `docs/06_API_SPEC.md` (or the receiving-methods section): note that the USD neobank profiles now support detection (signals assist review; no auto-confirm). No raw mojibake (repo guardrail).
- [ ] **Step 2: Commit docs** — `git commit -m "docs: neobank detection now active (review-assist)"`.
- [ ] **Step 3: VERIFY** — `npm test` (full), `npm run typecheck`, `npm run lint`, `npx vitest run tests`, `npm run android:test` — all green; `git diff --stat main..HEAD` confined to the listed files; final cross-cutting review (a fresh subagent): English matcher false-positive surface, the `_int` suffix branch coverage, cert-seeding-vs-operator-review boundary, deploy order (migration 030 cosmetic, APK + code together). Report.
