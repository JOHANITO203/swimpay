# APK Intelligence & Channel-ID Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Pin every receiving profile's real signing cert, recognise payment notifications by package+cert+channelId (text demoted to amount/sender extraction), ship the neobank parser with detection enabled, register the MTN-CI alternate package + Tap Tap Send as a WA payer launcher.

**Spec:** `docs/superpowers/specs/2026-06-06-apk-intelligence-channel-detection-design.md` ; data: `docs/APK_INTELLIGENCE.md` (all certs/channels/deeplinks).

**Architecture:** Migrations seed harvested certs into `bank_profiles.package_cert_sha256` and add a learning `bank_notification_channels` table + `notification_signals.channel_id`; the device uploads `channelId`; the backend marks a signal `channel_recognized` when the channel is known and records unknown channels as `pending`. The neobank text path (already committed) gets the OTP/3-decimal fixes and becomes extraction-only. Android registers MTN-CI alternates + Tap Tap Send launcher.

**Tech Stack:** TypeScript, Kotlin, PostgreSQL, vitest + gradle. Windows PowerShell (no `&&`). Certs/channels/deeplinks are in `docs/APK_INTELLIGENCE.md` — copy values from there, do not re-harvest.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `packages/database/migrations/030_profile_signing_certs.sql` | Create | seed harvested certs for all 12 profiles |
| `packages/database/migrations/031_notification_channel_learning.sql` | Create | `notification_signals.channel_id` + `bank_notification_channels` table + RU channel seeds |
| `apps/api/src/signals.ts` | Modify | accept + persist `channel_id`; record unknown channels `pending`; `channel_recognized` |
| `apps/api/src/signals.test.ts` | Modify | channel known/unknown tests |
| `apps/android-receiver/.../work/SignalUploadWorker.kt` | Modify | include `channelId` in the uploaded payload |
| `apps/android-receiver/.../BankTargetLock.kt` | Modify | MTN-CI alternates (com.consumerug + mtnft.momo.consumer); neobank packages |
| `packages/contracts/src/index.ts` | Modify | `detection_supported: true` for 3 INT profiles; Tap Tap Send WA payer launcher |
| `packages/contracts/src/west-africa-launchers.test.ts` | Modify | Tap Tap Send launcher assertion |
| `packages/bank-templates/src/parser.ts` | Modify | OTP/3-decimal fixes (text now extraction-only) |
| `packages/bank-templates/src/parser.test.ts` | Modify | OTP + 3-decimal regression |
| `apps/landing/public/downloads/swimpay-merchant.apk` | Replace | republish |
| docs | Modify | endpoints/schema notes |

---

### Task 1: Fix the neobank text parser (OTP + 3-decimal), text = extraction-only

**Files:** `packages/bank-templates/src/parser.ts`, `parser.test.ts`

- [ ] **Step 1: Failing tests** — append to the `international neobank parsing (USD)` describe:

```typescript
  it('does not classify OTP/security messages as incoming', () => {
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'We sent you a verification code' }).directionLabel).toBe('unknown');
    expect(parseBankNotification({ bankProfileId: 'revolut_int', text: 'Your one-time passcode is 123456' }).directionLabel).toBe('unknown');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'Reminder: complete your profile' }).directionLabel).toBe('unknown');
  });
  it('requires an amount for the "sent you" phrasing to be incoming', () => {
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'John sent you $20.00' }).directionLabel).toBe('incoming_customer_transfer');
    expect(parseBankNotification({ bankProfileId: 'wise_int', text: 'We sent you details' }).directionLabel).toBe('unknown');
  });
  it('rejects malformed 3-decimal USD amounts', () => {
    expect(extractUsdAmountMinor('10.999 USD')).toBeNull();
    expect(extractUsdAmountMinor('$10.99')).toBe(1099);
  });
```

- [ ] **Step 2:** `npx vitest run packages/bank-templates/src/parser.test.ts` → FAIL.

- [ ] **Step 3: Implement.** In `parser.ts`:
  - `INTL_NOISE_KEYWORDS` += `'verification'`, `'verify'`, `'one-time'`, `'passcode'`, `'code'`, `'otp'`, `'reminder'`.
  - In `classifyIntlDirection`, gate the `'sent you'`/`'paid you'` incoming keywords on the presence of a money token: compute `const hasAmount = extractUsdAmountMinor(text) !== null;` and only treat `sent you`/`paid you` as incoming when `hasAmount`. Keep `received`/`payment from`/`from … received` as before. (Noise check stays FIRST → OTP returns unknown.)
  - `extractUsdAmountMinor`: anchor the trailing-USD regex so a 3+-decimal mantissa fails — change the second pattern to require a word boundary that rejects a 3rd decimal digit: `/(?<![\d.])(\d[\d,]*(?:\.\d{1,2})?)\s?(?:US\$|USD)(?=$|[\s.,;:])/iu` AND reject if the char before the matched number is a digit/dot, OR simpler: after matching, verify `!/\.\d{3}/.test(matchedNumber)`. Implement by rejecting when the captured group is immediately followed by another digit in the source.

- [ ] **Step 4:** `npx vitest run packages/bank-templates/src` → ALL PASS (RU + INT). `npm run typecheck`; `npm run lint`.
- [ ] **Step 5: Commit** — `git commit -m "fix(bank-templates): demote text to extraction-only — OTP guard + 3-decimal rejection"`

---

### Task 2: Migration 030 — seed all profile certs

**Files:** `packages/database/migrations/030_profile_signing_certs.sql`

- [ ] **Step 1: Write** (values from `docs/APK_INTELLIGENCE.md`):

```sql
-- 030 — Seed harvested signing certs (V3 signer) for every receiving profile.
-- EXPECTED cert only; the bank_app_signatures pending->operator-approve gate is
-- unchanged (operator-provided APK, not auto-trusted). Idempotent.
UPDATE bank_profiles SET package_cert_sha256 = $$58bfa7d6fa3aa0d4e8de8a3e6ca8d5a33b376fc48b2176d37bbe58ea8cbc7a23$$, updated_at = now() WHERE id = 'alfa_ru';
UPDATE bank_profiles SET package_cert_sha256 = $$38cbbeee52c94777f7ffd27ebb392009a00d574fa15895abf3bcd83e7f78cb69$$, updated_at = now() WHERE id = 'vtb_ru';
UPDATE bank_profiles SET package_cert_sha256 = $$6178e775f87853fb4fd655695dc4cca50fe70577a527715789968f93741df89c$$, updated_at = now() WHERE id = 'gazprombank_ru';
UPDATE bank_profiles SET package_cert_sha256 = $$5df281c2e6e94a80d769679a32c0318df6855c90f511785676ebfe892b40d9d8$$, updated_at = now() WHERE id = 'tbank_ru';
UPDATE bank_profiles SET package_cert_sha256 = $$fea43ebfc12201c7d860b1de28a0f8a330ecc4c30863dae7ce6cf4c98b99a2ea$$, updated_at = now() WHERE id = 'sber_ru';
UPDATE bank_profiles SET package_cert_sha256 = $$c8fe81752c60f867f7801e4059a9989c660351d459323f22d9bc949182fd6d61$$, updated_at = now() WHERE id = 'ozon_bank';
UPDATE bank_profiles SET package_cert_sha256 = $$d85ddd0752685c4205b6bedf035f62f8cc93025a44d1af982cfd6da85fd3ce26$$, updated_at = now() WHERE id = 'wave_ci';
UPDATE bank_profiles SET package_cert_sha256 = $$b67affcda89e3193b1595036d7c6cdbe22be5ca24c9f6cf93fc6b48f91d7310d$$, updated_at = now() WHERE id = 'orange_money_ci';
UPDATE bank_profiles SET package_cert_sha256 = $$1835f1e22f5e24b014e0d7fe2506cf985e11cdf7500d2329be3308b6e964134c$$, updated_at = now() WHERE id = 'mtn_momo_ci';
UPDATE bank_profiles SET package_cert_sha256 = $$149c4ea5825a81065589d27a60ea7e554df4b49e3c660cb65ba730025080dbd0$$, updated_at = now() WHERE id = 'wise_int';
UPDATE bank_profiles SET package_cert_sha256 = $$9c9be07135e972780282c2e5d27da06ecb8ee3adfc75303917ddf66d6faaefa4$$, updated_at = now() WHERE id = 'revolut_int';
UPDATE bank_profiles SET package_cert_sha256 = $$8d607e96c1e38c9f5150cedf27401e5fd636a8340845b2c04204c158892be58f$$, updated_at = now() WHERE id = 'payoneer_int';
```

- [ ] **Step 2: Commit** — `git commit -m "feat(db): seed harvested signing certs for all receiving profiles (migration 030)"`

---

### Task 3: Migration 031 + channel-ID wiring (signals.ts)

**Files:** `packages/database/migrations/031_notification_channel_learning.sql`, `apps/api/src/signals.ts`, `signals.test.ts`

- [ ] **Step 1: Migration**

```sql
-- 031 — Notification channel learning. Device captures channelId; recognised
-- channels raise confidence, unknown ones are recorded pending for operator review.
ALTER TABLE notification_signals ADD COLUMN IF NOT EXISTS channel_id TEXT;

CREATE TABLE IF NOT EXISTS bank_notification_channels (
  bank_profile_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  sample_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bank_profile_id, channel_id)
);

-- Seed the RU channel IDs surfaced by the harvest (confirmed).
INSERT INTO bank_notification_channels (bank_profile_id, channel_id, status, confirmed_at) VALUES
  ('alfa_ru', 'notifications_channel', 'confirmed', now()),
  ('vtb_ru', 'communicationChannel1', 'confirmed', now()),
  ('vtb_ru', 'communicationChannel2', 'confirmed', now()),
  ('vtb_ru', 'communicationChannel3', 'confirmed', now()),
  ('gazprombank_ru', 'default_push_channel', 'confirmed', now())
ON CONFLICT (bank_profile_id, channel_id) DO NOTHING;
```

- [ ] **Step 2: Failing tests** (`signals.test.ts`, mirror existing signal-ingest harness): a signal with `channel_id` matching a confirmed row → result carries `channel_recognized: true`; a signal with an unknown `channel_id` → a `bank_notification_channels` row is upserted `pending` (sample_count increments on repeat) and the signal still processes; a signal with no channel_id → behaves as today.

- [ ] **Step 3: Implement** in `signals.ts`: `ReceiverSignalRequestBody` += `channel_id?: string`; persist to `notification_signals.channel_id`; after bank_profile validation, look up `bank_notification_channels` — if confirmed, set a `channel_recognized` flag (thread into the signal record / scoring reason); if absent, `INSERT ... ON CONFLICT DO UPDATE SET sample_count = sample_count + 1`. Never block on channel.

- [ ] **Step 4:** `npx vitest run apps/api/src/signals.test.ts apps/api/src` → PASS; `npm run typecheck`; `npm run lint`.
- [ ] **Step 5: Commit** — `git commit -m "feat(api,db): notification channel-id capture + learning table (migration 031)"`

---

### Task 4: Android — upload channelId + register packages

**Files:** `SignalUploadWorker.kt` (+ the payload builder it uses), `BankTargetLock.kt`, the BankTargetLock test

- [ ] **Step 1: Failing test** — BankTargetLock test asserts: `bankProfileIdForPackage("com.transferwise.android")=="wise_int"`, `"com.revolut.revolut"=="revolut_int"`, `"com.payoneer.android"=="payoneer_int"`, `"com.consumerug"=="mtn_momo_ci"`, `"mtnft.momo.consumer"=="mtn_momo_ci"` (both map), unknown→null, RU unchanged.
- [ ] **Step 2:** `npm run android:test` → FAIL.
- [ ] **Step 3:** `BankTargetLock.supportedTargets` += `wise_int`/`revolut_int`/`payoneer_int` (neobank packages) and add `mtn_momo_ci → com.consumerug` as an additional target row (so `bankProfileIdForPackage` resolves both `com.consumerug` and the existing `mtnft.momo.consumer` to `mtn_momo_ci` — keep both rows). Thread `channelId` (already on `NotificationSnapshot`) into the uploaded payload in `SignalUploadWorker` (find where the snapshot maps to the request body; add `channel_id = snapshot.channelId`).
- [ ] **Step 4:** `npm run android:test` → PASS; re-record goldens if a bank-list screen changed (`npm run android:visual:accept`, confirm only bank-list screens).
- [ ] **Step 5: Commit** — `git commit -m "feat(android): upload channelId + register neobank/MTN-CI packages"`

---

### Task 5: Contracts — detection_supported + Tap Tap Send WA launcher

**Files:** `packages/contracts/src/index.ts`, `west-africa-launchers.test.ts`, `checkout.test.ts`

- [ ] **Step 1: Failing tests** — INT profiles `detection_supported: true` (status `review_required_beta` unchanged); WA payer launcher registry includes a `taptapsend` entry (deeplink schemes `taptapsend`,`taptapsendmoney`, `package_hint_only`, `not_validated`, country... — Tap Tap Send is multi-country; use the WA registry with country `'CI'` since it reinforces CI rails, or a generic marker — pick `'CI'` and note it).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Drop `detectionSupported: false` from the 3 `receiverBank(...)` INT calls (default true); update the doc comment. Add `payerLauncher('taptapsend', 'Tap Tap Send', ['com.taptapsend'], { country: 'CI', deeplinkSchemes: ['taptapsend','taptapsendmoney'], launchStrategy: 'deeplink_then_package', enabled: true })` to `WestAfricaPayerBankLauncherRegistry`; add its logo case in `bankLogoAssetKey` (`ic_bank_taptapsend` or reuse a generic). Update the WA launcher test's id-list expectation.
- [ ] **Step 4:** `npx vitest run packages/contracts/src apps/api/src apps/web/src` → PASS (update any snapshot asserting INT `detection_supported:false` or the WA launcher count); `npm run typecheck`; `npm run lint`.
- [ ] **Step 5: Commit** — `git commit -m "feat(contracts): enable INT detection + Tap Tap Send WA payer launcher"`

---

### Task 6: APK rebuild + docs + VERIFY + final review + merge

- [ ] **Step 1:** `npm run android:assemble:release`; verify dex contains `wise_int`/`revolut_int`/`payoneer_int`/`com.consumerug` + signer cert unchanged; publish to `apps/landing/public/downloads/swimpay-merchant.apk`; commit.
- [ ] **Step 2: Docs** — `docs/06_API_SPEC.md`/`docs/05_DATABASE_SCHEMA.md`: channel_id field, bank_notification_channels table, detection now active on INT, cert pinning generalized. No mojibake.
- [ ] **Step 3: VERIFY** — `npm test`, `npm run typecheck`, `npm run lint`, `npx vitest run tests`, `npm run android:test` — all green; `git diff --stat main..HEAD`; final cross-cutting subagent review (channel-recognized flow, cert-seeding-vs-operator-review boundary, MTN dual-package mapping doesn't break the WA launcher, OTP guard, deploy order migrations 030/031 before push). Report.
- [ ] **Step 4: Commit docs**, then merge to main (operator applies migrations 030/031 before push).
