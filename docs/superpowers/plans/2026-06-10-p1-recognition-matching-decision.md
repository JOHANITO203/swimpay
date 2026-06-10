# P1 — Reconnaissance + matching par rail + décision finale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task with two-stage review. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Donner au matching une précision par moyen de réception (rail + couplet cert+channel) et implémenter la décision finale d'auto-confirmation sous trigger marchand global + plancher strict.

**Architecture :** Tout le scoring/décision vit dans `packages/matching-core/src/index.ts` (pur, déterministe, testable). On enrichit le `MatchConfidenceVector` (dimension `channel`, rails `mobile_money`/`wallet`), le parser alimente ces éléments par rail, puis on lève `finalDecisionImplemented:false` en ajoutant l'issue `auto_confirm` gardée par un plancher ; le worker `apps/signal-worker/src/runtime.ts` exécute la confirmation **en dernier** (safety-critical).

**Tech Stack :** TypeScript, vitest, npm workspaces, Postgres (migrations SQL additives).

**Sécurité (ordre imposé) :** T1–T4 additifs/non-décisionnels (auto reste off). T5 introduit la décision (moteur seulement). T6 exécute la confirmation (dernier, double-revue renforcée). Chaque tâche garde `npx vitest run`, `npm run typecheck`, `npm run lint` verts.

---

## Fichiers touchés
- `packages/matching-core/src/index.ts` — vecteur de confiance (channel/rail), `autoConfirmMode`, plancher, issue `auto_confirm`, `finalDecisionImplemented`.
- `packages/matching-core/src/index.test.ts`, `payment-intent-gate.test.ts` — assertions vecteur + matrice de décision.
- `packages/bank-templates/src/parser.ts` (+ `parser.test.ts`) — extraction par rail (mobile_money WA, wallet USD).
- `packages/contracts/src/index.ts` — type `AutoConfirmMode`, champ `rail` étendu si exposé.
- `packages/database/migrations/032_merchant_auto_confirm_mode.sql` — colonne `merchants.auto_confirm_mode`.
- `apps/signal-worker/src/runtime.ts` (+ `runtime.test.ts`) — `toMatchingContext` (injecter `autoConfirmMode`), `confirmSignal` (T6).
- `apps/api/src/*` — lecture `auto_confirm_mode`, repository confirm (T6).

---

### Task 1 : Dimension `channel` au vecteur de confiance (additif, aucune décision changée)

**Files:**
- Modify: `packages/matching-core/src/index.ts` (`MatchConfidenceVector`, `MatchingSignal`, `buildMatchConfidenceVector`, `buildPaymentIntentGateConfidenceVector`)
- Test: `packages/matching-core/src/index.test.ts`

- [ ] **Step 1 — Test d'abord.** Ajouter dans `index.test.ts` :
```ts
it('expose la dimension channel du couplet de reconnaissance', () => {
  const out = evaluateSignalMatch({
    signal: { ...baseSignal(), channelRecognition: 'recognized' },
    sessions: [activeSession()],
    context: trustedContext()
  });
  expect(out.confidenceVector.channel).toBe('recognized');
});
it('channel = not_applicable par défaut quand non fourni', () => {
  const out = evaluateSignalMatch({ signal: baseSignal(), sessions: [activeSession()], context: trustedContext() });
  expect(out.confidenceVector.channel).toBe('not_applicable');
});
```
(Réutiliser/forger les helpers `baseSignal/activeSession/trustedContext` déjà présents dans le fichier de test ; sinon les définir au plus proche des fixtures existantes.)

- [ ] **Step 2 — Run, attendu FAIL** (`channel` inexistant) : `npx vitest run packages/matching-core/src/index.test.ts`

- [ ] **Step 3 — Implémentation.** Dans `index.ts` :
  - `MatchingSignal` : ajouter `channelRecognition?: 'recognized' | 'pending_unknown' | 'not_applicable' | undefined;`
  - `MatchConfidenceVector` : ajouter `channel: 'recognized' | 'pending_unknown' | 'not_applicable';`
  - Dans `buildMatchConfidenceVector(...)`, au retour de l'objet, ajouter : `channel: signal.channelRecognition ?? 'not_applicable',`
  - Dans `buildPaymentIntentGateConfidenceVector(...)`, ajouter `channel: 'not_applicable',` (le gate n'a pas le signal channel ; valeur neutre).

- [ ] **Step 4 — Mettre à jour les assertions de vecteur existantes** : tout `toEqual({...vector complet...})` dans `index.test.ts` / `payment-intent-gate.test.ts` reçoit `channel: 'not_applicable'`. Lancer les deux fichiers, corriger jusqu'au vert.

- [ ] **Step 5 — Run vert + commit** : `npx vitest run packages/matching-core && npm run typecheck`
```bash
git add packages/matching-core
git commit -m "feat(matching): add channel recognition dimension to confidence vector (additive)"
```

---

### Task 2 : Rails étendus `mobile_money` (WA) + `wallet` (USD)

**Files:**
- Modify: `packages/matching-core/src/index.ts` (`MatchConfidenceVector.rail`, dérivation du rail)
- Test: `packages/matching-core/src/index.test.ts`

- [ ] **Step 1 — Test.** 
```ts
it('classe le rail mobile_money et wallet (hors RU)', () => {
  expect(railFromSignal({ ...baseSignal(), railHint: 'mobile_money' })).toBe('mobile_money');
  expect(railFromSignal({ ...baseSignal(), railHint: 'wallet' })).toBe('wallet');
});
```
- [ ] **Step 2 — FAIL** : `npx vitest run packages/matching-core/src/index.test.ts`
- [ ] **Step 3 — Impl.** 
  - `MatchConfidenceVector.rail` : `'sbp' | 'card' | 'mobile_money' | 'wallet' | 'unknown'`.
  - `MatchingSignal` : ajouter `railHint?: 'sbp' | 'card' | 'mobile_money' | 'wallet' | undefined;`
  - Exporter `railFromSignal(signal): MatchConfidenceVector['rail']` (mappe `railHint`, défaut `unknown`) et l'utiliser dans `buildMatchConfidenceVector` pour le champ `rail` (en plus de la logique sbp/card existante).
- [ ] **Step 4 — Vert + assertions vecteur** (rail attendu) ; `npx vitest run packages/matching-core`
- [ ] **Step 5 — Commit** : `git commit -am "feat(matching): extend rail to mobile_money/wallet"`

---

### Task 3 : Parser par rail — alimente `railHint` + éléments WA/USD

**Files:**
- Modify: `packages/bank-templates/src/parser.ts` (sortie : ajouter `rail`/identifiants par méthode)
- Test: `packages/bank-templates/src/parser.test.ts`

- [ ] **Step 1 — Test.** WA mobile money : 
```ts
it('parse un reçu Wave mobile money avec rail + expéditeur', () => {
  const p = parseBankNotification({ bankProfileId: 'wave_ci', text: 'Vous avez recu 2 500 FCFA de +225 07 00 00 00 00. Ref SWP-A8K2' });
  expect(p.rail).toBe('mobile_money');
  expect(p.amountMinor).toBe(250000);
  expect(p.referenceCode).toBe('SWP-A8K2');
});
```
- [ ] **Step 2 — FAIL** : `npx vitest run packages/bank-templates/src/parser.test.ts`
- [ ] **Step 3 — Impl.** Dans `parseBankNotification`, pour les profils WA (`*_ci`) et INT (`*_int`), renseigner `rail` (`mobile_money` pour WA, `wallet` pour INT) sur l'objet `ParsedBankNotification` (ajouter le champ `rail?: 'sbp'|'card'|'mobile_money'|'wallet'` dans `types.ts` si absent), et garantir l'extraction `amountMinor`/`referenceCode`/expéditeur par format. RU inchangé.
- [ ] **Step 4 — Vert** : `npx vitest run packages/bank-templates`
- [ ] **Step 5 — Commit** : `git commit -am "feat(bank-templates): per-rail parsing (mobile_money/wallet) feeds matching"`

---

### Task 4 : Migration `merchants.auto_confirm_mode` + type contrat

**Files:**
- Create: `packages/database/migrations/032_merchant_auto_confirm_mode.sql`
- Modify: `packages/contracts/src/index.ts` (type)
- Test: `packages/contracts/src/*.test.ts` (si un test d'énum existe)

- [ ] **Step 1 — Migration (additive, idempotente)** :
```sql
-- 032 — Trigger d'auto-confirmation global par marchand (défaut: manuel = sûr).
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_confirm_mode TEXT NOT NULL DEFAULT 'manual'
  CHECK (auto_confirm_mode IN ('manual', 'auto'));
```
- [ ] **Step 2 — Contrat.** Dans `contracts/src/index.ts` : `export type AutoConfirmMode = 'manual' | 'auto';` (+ l'inclure dans le type marchand exposé s'il existe).
- [ ] **Step 3 — Vert** : `npm run typecheck && npx vitest run packages/contracts`
- [ ] **Step 4 — Commit** : `git add packages/database/migrations/032_merchant_auto_confirm_mode.sql packages/contracts && git commit -m "feat(db,contracts): merchant auto_confirm_mode trigger (default manual)"`

---

### Task 5 : Décision finale — plancher + issue `auto_confirm` (moteur seulement)

**Files:**
- Modify: `packages/matching-core/src/index.ts` (`MatchingDecision`, `MatchingContext`, plancher, `evaluateSignalMatch`, `MATCHING_CORE_FOUNDATION`)
- Test: `packages/matching-core/src/index.test.ts`

- [ ] **Step 1 — Tests (matrice).**
```ts
it('mode manual → needs_review même match parfait', () => {
  const out = evaluateSignalMatch({ signal: perfectSignal(), sessions: [perfectSession()], context: { ...trustedContext(), autoConfirmMode: 'manual' } });
  expect(out.decision).toBe('needs_review');
});
it('mode auto + plancher (référence exacte + cert + fenêtre + montant) → auto_confirm', () => {
  const out = evaluateSignalMatch({ signal: perfectSignal(), sessions: [perfectSession()], context: { ...trustedContext(), autoConfirmMode: 'auto' } });
  expect(out.decision).toBe('auto_confirm');
});
it('mode auto + collision → needs_review', () => { /* deux candidats identité → collision */ });
it('mode auto + amountOnly (ni référence ni identité) → needs_review (jamais auto)', () => { /* ... */ });
it('mode auto + rail à-channel mais channel != recognized → needs_review', () => { /* signal channelRecognition: pending_unknown + railHint sbp */ });
it('mode auto + channel not_applicable (rail sans channel) → auto_confirm si reste du plancher OK', () => { /* ... */ });
```
- [ ] **Step 2 — FAIL** : `npx vitest run packages/matching-core/src/index.test.ts`
- [ ] **Step 3 — Impl.**
  - `MatchingDecision` : `'auto_confirm' | 'needs_review' | 'rejected' | 'wait'`.
  - `MatchingContext` : ajouter `autoConfirmMode?: 'auto' | 'manual' | undefined;` (défaut traité comme `'manual'`).
  - Ajouter le prédicat :
```ts
export function meetsAutoConfirmFloor(v: MatchConfidenceVector): boolean {
  const strongKey = v.reference === 'exact' || v.sender_phone === 'hmac_match' || v.sender_card === 'hmac_match';
  const channelOk = v.channel === 'recognized' || v.channel === 'not_applicable'; // pending_unknown sur rail-à-channel = bloquant
  return (
    strongKey &&
    v.amount === 'exact' &&
    v.time_window === 'inside' &&
    v.bank_package === 'trusted_cert' &&
    channelOk &&
    v.collision_pressure === 0
  );
}
```
  - Dans `evaluateSignalMatch`, sur le chemin **sans collision** où `isStrongManualReviewCandidate(...)` est vrai : calculer le vecteur, puis
```ts
const vector = buildMatchConfidenceVector(input.signal, best.candidate, input.context, candidates.length);
if (input.context.autoConfirmMode === 'auto' && !collisionDetected && meetsAutoConfirmFloor(vector)) {
  return { decision: 'auto_confirm', score: best.score, collisionDetected: false, confidenceVector: vector,
           selected: best.candidate, candidates, reasonCodes: [...reasonCodes, 'auto_confirm_floor_met'] };
}
// sinon comportement actuel: manual_confirmation_required_v1 → needs_review
```
  - `MATCHING_CORE_FOUNDATION.finalDecisionImplemented` : `true`. `amountOnlyAutoConfirmAllowed` reste `false`.
- [ ] **Step 4 — Vert (toute la matrice) + tests existants** : `npx vitest run packages/matching-core && npm run typecheck`. Mettre à jour tout test asservi à `decision: 'needs_review'` qui devient `auto_confirm` UNIQUEMENT s'il passait `autoConfirmMode:'auto'` (sinon inchangé — défaut manual préserve le comportement).
- [ ] **Step 5 — Commit** : `git commit -am "feat(matching): final decision — auto_confirm under merchant trigger + strict floor"`

**⚠️ À ce stade, aucun consommateur n'exécute `auto_confirm` (le worker review toujours) → zéro impact prod. Revue renforcée du plancher avant T6.**

---

### Task 6 : Câblage worker — exécuter `auto_confirm` (SAFETY-CRITICAL, dernier)

**Files:**
- Modify: `apps/signal-worker/src/runtime.ts` (`toMatchingContext` injecte `autoConfirmMode` ; brancher `match.decision === 'auto_confirm'` → `confirmSignal`)
- Modify: `apps/api/src/*` (repository : méthode `confirmMatch` ; lecture `merchants.auto_confirm_mode`)
- Test: `apps/signal-worker/src/runtime.test.ts`

- [ ] **Step 1 — Test worker.**
```ts
it('auto_confirm → confirme l’ordre + émet PAYMENT_CONFIRMED, pas de review', async () => {
  // arrange: merchant auto_confirm_mode='auto', signal plancher-atteint, 1 candidat
  const res = await runtime.process(signal);
  expect(res.decision).toBe('auto_confirm');
  expect(repo.createReview).not.toHaveBeenCalled();
  expect(emitted).toContain(EventTypes.PAYMENT_CONFIRMED);
});
it('auto_confirm_mode=manual → toujours needs_review', async () => { /* ... */ });
```
- [ ] **Step 2 — FAIL** : `npx vitest run apps/signal-worker/src/runtime.test.ts`
- [ ] **Step 3 — Impl.**
  - `toMatchingContext` : lire `auto_confirm_mode` du marchand (hydraté en amont) → `autoConfirmMode`.
  - Après le bloc `match.decision === 'wait'`, ajouter avant `reviewSignal` :
```ts
if (match.decision === 'auto_confirm' && match.selected) {
  return this.confirmSignal({ signal: hydratedSignal, parsed, now,
    selected: match.selected as SignalRuntimeSessionCandidate, score: match.score,
    reasonCodes, confidenceVector: match.confidenceVector });
}
```
  - Ajouter `private async confirmSignal(input)` : `SignalRuntimeResult.decision = 'auto_confirm'`, appelle `repository.confirmMatch({...})` (maj ordre/session → confirmé), émet `EventTypes.PAYMENT_CONFIRMED` + audit, incrémente une métrique `SIGNALS_AUTO_CONFIRMED_TOTAL`. Idempotent (ordre déjà confirmé → no-op).
  - `SignalRuntimeResult['decision']` : ajouter `'auto_confirm'`. Repository interface + impl `apps/api` : `confirmMatch`. Ajouter `EventTypes.PAYMENT_CONFIRMED` si absent.
- [ ] **Step 4 — Vert** : `npx vitest run apps/signal-worker apps/api && npm run typecheck && npm run lint`
- [ ] **Step 5 — Commit** : `git commit -am "feat(worker,api): execute auto_confirm (merchant opt-in) — confirm order + PAYMENT_CONFIRMED"`

---

## Self-review (couverture spec)
- Rail par méthode (mobile_money/wallet) → T2+T3. ✅
- Couplet cert+channel (dimension channel) → T1 ; plancher l'exige sur rails à-channel → T5. ✅
- Décision finale + `finalDecisionImplemented` → T5. ✅
- Trigger global marchand + défaut manual → T4 (data) + T5 (logique) + T6 (lecture/exécution). ✅
- Plancher (référence/identité + montant + fenêtre + no collision + trusted_cert + channel) → `meetsAutoConfirmFloor` T5. ✅
- `amountOnly` jamais auto, collision → revue → T5 tests. ✅
- Exécution safety-critical en dernier, opt-in marchand, défaut sûr → ordre T1→T6. ✅

## Gates par tâche
`npx vitest run <packages touchés>` + `npm run typecheck` + `npm run lint` verts avant chaque commit. T5 et T6 : double-revue renforcée (plancher + exécution confirmation).
