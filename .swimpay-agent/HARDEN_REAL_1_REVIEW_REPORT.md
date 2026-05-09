# HARDEN-REAL-1 Review Report

generated_at: 2026-05-09T12:43:40+03:00
commit: `afec2e7 hardening: prepare real notification readiness`
branch: `main`
remote: `origin/main`

## Objectif du review

Ce review a ete lance apres l'analyse qualite des dernieres implementations Android, backend, runtime, webhooks et Developer Integration.

L'objectif etait de corriger les points qui pouvaient bloquer ou fausser les tests de notifications bancaires reelles.

Ce sprint ne devait pas:

- traiter de vraies notifications bancaires;
- activer une auto-confirmation;
- changer la semantique de `payment.confirmed`;
- ajouter LLM, SMS, Accessibility, scraping bancaire, `QUERY_ALL_PACKAGES` ou enumeration large;
- exposer du texte brut de notification, des numeros carte/telephone bruts ou des secrets.

## Perimetre analyse

Le review a porte sur quatre surfaces principales:

1. Runtime SwimPay Intelligence et Payment Intent Gate.
2. Backend production: auth, secrets, scopes API et webhook URL.
3. Android Receiver / Merchant app: preuve device, redaction, verrouillage, export developpeur.
4. Webhook worker, reprise apres crash et hygiene CI/deploiement.

## Constats principaux

### 1. Runtime / decision paiement

Constat:

- Le runtime durable devait appliquer plus strictement la verite produit: pas d'intention de paiement active, pas de review marchand.
- Certains signaux pouvaient etre parses ou audites avant que les garde-fous de confiance soient appliques.
- La confiance bank app devait etre exacte sur package + certificat, pas seulement large au niveau du profil banque.

Correction:

- Rejet avant parsing des signatures invalides.
- Rejet avant review des devices non fiables.
- Verification stricte package/certificat bancaire.
- Application du Payment Intent Gate avant creation de review.
- Ajout de la notion de mismatch route de reception.

Impact produit:

- Les signaux de fond ou hors intention active ne declenchent pas une review marchand.
- Un mauvais package, mauvais certificat, mauvaise banque ou mauvaise route ne peut pas creer une review exploitable.
- V1 reste strictement manuelle.

### 2. Backend production

Constat:

- Certaines routes acceptaient encore des raccourcis `Bearer test_*` selon le contexte.
- Certains secrets critiques pouvaient retomber sur des valeurs locales.
- Les cles API SDK avaient besoin de scopes plus explicites.
- Les URLs webhook devaient etre durcies contre localhost, IP privees et hosts internes.

Correction:

- Blocage des shortcuts dev en mode production.
- Fail-fast si `PHONE_HMAC_SECRET` ou `WEBHOOK_SECRET_ENCRYPTION_KEY` manque en production.
- Scopes API explicites pour lecture/creation de commandes.
- Validation webhook HTTPS stricte, sans credentials, sans host local/interne/prive/reserve.

Impact produit:

- Le staging prod devient plus strict.
- Les cles SDK ne peuvent plus agir hors scope.
- Le webhook marchand reste public, verifiable et plus sur.

### 3. Android

Constat:

- La preuve device devait etre plus proche d'un vrai modele asymetrique.
- La redaction devait intervenir avant tout usage durable de texte notification.
- L'export developpeur show-once devait etre mieux controle.
- Le verrouillage app devait bloquer les chargements sensibles lorsque l'UI est verrouillee.

Correction:

- Ajout d'un modele Android Keystore / signature asymetrique cote Android.
- La cle privee ne sort pas du telephone.
- Ajout d'un signer JVM uniquement pour tests.
- Canonicalisation/redaction avant hash notification.
- Export developpeur: action protegee par deblocage appareil, valeurs show-once nettoyees apres copie/navigation/expiration.
- Guardrail: l'app lock empeche les chargements runtime sensibles pendant le verrouillage.

Impact produit:

- Android reste un outil de capture, redaction, signature et upload.
- Android ne confirme toujours jamais un paiement.
- Les infos developpeur restent copiables, mais l'action est protegee par l'utilisateur via securite appareil.

### 4. Webhooks et CI

Constat:

- Un webhook reste en risque si une livraison reste bloquee en statut `delivering` apres crash worker.
- Le repo avait besoin d'une CI versionnee.
- Des artefacts build Android etaient encore suivis.

Correction:

- Reprise des deliveries `delivering` devenues stale.
- Ajout de tests de recovery webhook.
- Ajout de `.github/workflows/ci.yml`.
- Ajout de `.dockerignore`.
- Suppression du rapport Gradle genere du suivi Git.

Impact produit:

- Les webhooks finaux sont plus resilients.
- Les validations sont reproductibles sur GitHub.
- Le repo est plus propre pour build/deploiement.

## Fichiers principaux touches

Runtime:

- `apps/signal-worker/src/runtime.ts`
- `apps/signal-worker/src/runtime.test.ts`
- `packages/matching-core/src/index.ts`
- `packages/matching-core/src/payment-intent-gate.test.ts`

Backend:

- `apps/api/src/server.ts`
- `apps/api/src/developer-integration.ts`
- `apps/api/src/orders.ts`
- `apps/api/src/*test.ts`

Android:

- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/AndroidMerchantDeviceProofProvider.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ReceiverNotificationPipeline.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantApp.kt`
- `apps/android-receiver/android/app/src/main/java/com/swimpay/receiver/ui/premium/PremiumMerchantRuntime.kt`
- `apps/android-receiver/android/app/src/test/java/com/swimpay/receiver/AndroidMerchantDeviceProofHardeningTest.kt`

Webhooks / CI:

- `apps/job-worker/src/webhooks.ts`
- `apps/job-worker/src/webhooks.test.ts`
- `.github/workflows/ci.yml`
- `.dockerignore`
- `.gitignore`
- `docs/WEBHOOK_DELIVERY_LOOP.md`

Rapports / tasks:

- `.swimpay-agent/HARDEN_REAL_1_PLAN.md`
- `.swimpay-agent/HARDEN_REAL_1_CLOSEOUT_REPORT.md`
- `.swimpay-agent/RECENT_IMPLEMENTATIONS_TO_CODE_QUALITY_REPORT.md`
- `tasks/706_harden_real_signal_runtime.md`
- `tasks/707_harden_backend_prod_auth_and_secrets.md`
- `tasks/708_harden_android_device_redaction_and_exports.md`
- `tasks/709_harden_webhook_delivery_and_ci.md`

## Validations executees

Passees:

- `npm run android:doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:testDebugUnitTest --no-daemon --stacktrace --max-workers=1`
- `apps/android-receiver/android/gradlew.bat -p apps/android-receiver/android :app:assembleStaging --no-daemon --stacktrace --max-workers=1`

Resultats:

- Vitest: 75 fichiers, 554 tests passes.
- Android JVM: 196 tests passes.
- Android staging APK: build OK.
- Lint/typecheck/build: OK.
- Compose config: OK.

## Commit et push

Commit cree:

```text
afec2e7 hardening: prepare real notification readiness
```

Push:

```text
origin/main
```

Etat apres push:

```text
main...origin/main
```

## Sante staging

Endpoint verifie:

```text
https://staging.swimpay.pro/api-health
```

Reponse observee:

- service: `swimpay-api`
- environment: `production`
- database: `ok`
- nats: `ok`
- valkey: `ok`

Note:

- L'API etait saine au moment du check.
- L'uptime indiquait que le redeploiement Dokploy pouvait ne pas encore avoir redemarre le service au moment exact de la verification.

## Risques restants

Aucun blocker local HARDEN-REAL-1 ne reste.

Les tests reels restent bloques volontairement par la procedure produit:

1. Attendre le redeploiement staging du commit.
2. Verifier staging apres redeploiement.
3. Rejouer le rehearsal SDK:
   - creation commande SDK;
   - ouverture checkout hosted sans Authorization;
   - selection route/moyen de reception actif;
   - action acheteur;
   - review manuelle marchand;
   - webhook final uniquement apres confirmation manuelle.
4. Installer/tester l'APK staging si necessaire.
5. Lancer la capture notification reelle seulement apres commande explicite operateur.

## Conclusion

Le review a transforme les points partiels ou dangereux en garde-fous testables.

SwimPay reste aligne avec la verite V1:

- payment-intent-bound;
- pas d'intention active = pas de review marchand;
- Android ne confirme jamais;
- confirmation manuelle obligatoire;
- `payment.confirmed` uniquement apres confirmation marchand;
- webhooks publics limites aux evenements finaux;
- pas de preuve officielle banque;
- pas d'auto-confirmation.
