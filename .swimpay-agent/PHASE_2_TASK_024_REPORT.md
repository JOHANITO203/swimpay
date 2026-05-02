# Rapport Phase 2 - Task 024 Operator Auth And Admin RBAC

Date: 2026-05-02
Branche: `agent-autonomous-run`
Commit de la phase: `16d18e3 task 024: operator auth and admin rbac`

## Resume Executif

La Phase 2 de SwimPay a ete initialisee avec une nouvelle queue dediee a l'integration durable du runtime.

La premiere tache de cette phase, `024_operator_auth_and_admin_rbac`, a ete implementee et validee. Elle remplace le placeholder admin `Bearer admin_<operator_id>` par une fondation d'authentification operateur et de RBAC centralisee, utilisable en developpement local et compatible avec une future mise en production plus stricte.

Le repo reste safe pour le developpement local garde. Il n'est pas encore pret pour une exposition production publique.

## Objectif De La Phase

La Phase 2 vise a faire passer SwimPay de la fondation technique validee vers une integration runtime durable:

- consommateurs NATS JetStream;
- boucle webhook persistante PostgreSQL;
- pipeline signal parser/matching/review/webhook;
- clarification des semantiques de rejet review;
- tests E2E durables;
- observabilite runtime;
- validation contractuelle Android Receiver.

Cette session a seulement cree la queue Phase 2 et implemente la tache 024.

## Queue Phase 2 Creee

La queue active dans `.swimpay-agent/TASK_QUEUE.md` est maintenant:

1. `024_operator_auth_and_admin_rbac` - completed
2. `025_nats_jetstream_consumers` - pending
3. `026_postgres_webhook_delivery_loop` - pending
4. `027_signal_runtime_pipeline` - pending
5. `028_review_rejection_semantics` - pending
6. `029_durable_worker_e2e_tests` - pending
7. `030_runtime_observability` - pending
8. `031_android_receiver_contract_validation` - pending

Les fichiers de taches `024` a `031` ont ete crees dans `tasks/`.

## Perimetre De La Tache 024

La tache 024 avait pour objectif de durcir l'authentification des endpoints admin/operator.

Le travail effectue couvre:

- roles operateur centralises;
- permissions centralisees;
- mapping role -> permissions;
- mode auth local `dev_token`;
- mode auth futur production `signed_token`;
- rejet des tokens placeholder `Bearer admin_<operator_id>`;
- permissions explicites sur les endpoints admin;
- audit conserve pour les actions dangereuses;
- non-exposition des donnees sensibles dans les reponses admin.

Le travail ne couvre pas:

- fournisseur d'identite complet;
- rotation de tokens;
- gestion UI des utilisateurs operateurs;
- sessions navigateur;
- MFA;
- deploiement production;
- taches 025 a 031.

## Roles Definis

Les roles sont definis dans `@swimpay/security`:

- `owner`
- `admin`
- `operator`
- `support`
- `read_only`

`owner` et `admin` ont toutes les permissions.

`operator` peut consulter les vues operationnelles et degrader/review-only certains templates, mais ne peut pas promouvoir ou desactiver des templates.

`support` et `read_only` sont limites aux permissions de lecture.

## Permissions Definies

Les permissions centralisees sont:

- `view_admin_dashboard`
- `view_merchants`
- `view_orders`
- `view_signals`
- `view_reviews`
- `act_on_reviews`
- `view_bank_templates`
- `promote_bank_templates`
- `degrade_bank_templates`
- `disable_bank_templates`
- `view_webhooks`
- `replay_webhooks`
- `view_audit_logs`

## Comportement Auth/RBAC

### Developpement local

Le mode local utilise:

```text
ADMIN_AUTH_MODE=dev_token
DEV_ADMIN_TOKEN=<token local configure>
DEV_ADMIN_OPERATOR_ID=<operator id local>
DEV_ADMIN_ROLE=<role local>
```

Le token doit etre explicitement configure. Sans `DEV_ADMIN_TOKEN`, les endpoints admin rejettent la requete.

### Production/futur durcissement

Le mode signe utilise:

```text
ADMIN_AUTH_MODE=signed_token
ADMIN_TOKEN_HMAC_SECRET=<secret hors repo>
```

Le format supporte par la fondation est:

```text
op_<operator_id>.<role>.<signature>
```

La signature est un HMAC-SHA256 sur:

```text
<operator_id>.<role>
```

En production, le serveur rejette:

- absence de bearer token;
- `Bearer admin_<operator_id>`;
- mode `dev_token`;
- token signe invalide;
- secret HMAC non configure;
- role inconnu.

## Garde-Fous Admin

Les endpoints admin exigent maintenant:

- operateur authentifie;
- role connu;
- permission requise;
- audit pour les actions dangereuses autorisees.

Les actions dangereuses sont protegees par permission:

- promotion template: `promote_bank_templates`;
- degradation/review-only template: `degrade_bank_templates`;
- disable/false-positive template: `disable_bank_templates`;

Les actions autorisees utilisent l'operator id authentifie pour l'audit. Le body ne peut plus remplacer l'acteur via `actor_id`.

## Securite Et Vie Privee

Verifications respectees:

- pas de stockage de raw phone;
- pas de stockage de raw notification text par defaut;
- pas d'exposition raw PII dans les reponses admin;
- pas de PSP/SBP;
- pas de lecture SMS;
- pas de scraping app bancaire;
- pas de claim d'official bank confirmation;
- pas de valeurs reelles de package/cert bancaire inventees.

Les reponses admin restent basees sur:

- champs operationnels;
- valeurs masquees;
- templates canoniques rediges;
- payloads d'audit rediges.

## Fichiers Principaux Modifies

- `packages/security/src/index.ts`
- `packages/security/src/index.test.ts`
- `apps/api/src/server.ts`
- `apps/api/src/admin.ts`
- `apps/api/src/admin.test.ts`
- `tests/agent-framework.test.ts`
- `.env.example`
- `.swimpay-agent/TASK_QUEUE.md`
- `.swimpay-agent/CURRENT_TASK.md`
- `.swimpay-agent/NEXT_ACTION.md`
- `.swimpay-agent/PROGRESS_LOG.md`
- `.swimpay-agent/PHASE_2_RUNTIME_PLAN.md`
- `docs/ADMIN_AUTH_AND_RBAC.md`
- `docs/IMPLEMENTATION_NOTES.md`
- `docs/LOCAL_DEVELOPMENT.md`

## Tests Ajoutes Ou Mis A Jour

Tests RBAC/security:

- roles et permissions centralises;
- permissions role -> action;
- token dev configure accepte;
- token dev non configure rejete;
- placeholder admin rejete en production;
- token signe HMAC accepte;
- token invalide rejete.

Tests API admin:

- auth manquante rejetee;
- auth dev fonctionne uniquement si configuree;
- production rejette `Bearer admin_ops_01`;
- `read_only` ne peut pas effectuer d'action dangereuse;
- `operator` ne peut pas promouvoir de bank template;
- actions autorisees ecrivent un audit event;
- reponses admin sans raw PII.

Test orchestration:

- la queue agent verifie maintenant l'ordre Phase 2.

## Validation

Validation finale:

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- `npm test`: PASS, 22 fichiers de tests, 123 tests
- `npm run build`: PASS
- `docker compose --env-file .env.example -f infra/docker-compose.yml config`: PASS

Un premier `npm test` complet a echoue car `tests/agent-framework.test.ts` verifiait encore l'ancienne queue 003-023. Le test a ete corrige pour la queue Phase 2, puis la suite complete est passee.

## Blockers

Aucun blocker actif.

`.swimpay-agent/BLOCKERS.md` indique:

```text
No current blockers.
```

## Limites Restantes

Cette fondation RBAC ne remplace pas encore un vrai systeme d'identite operateur.

Avant exposition production, il faudra encore:

- remplacer ou completer les tokens manuels par un vrai identity provider;
- gerer rotation/revocation des secrets;
- definir lifecycle operateur;
- ajouter MFA ou controle equivalent;
- verifier la politique reverse proxy/reseau;
- eviter toute exposition publique d'admin avant durcissement complet.

## Prochaine Tache Recommandee

Prochaine tache:

```text
025_nats_jetstream_consumers
```

Objectif:

Creer les fondations de consommateurs NATS JetStream durables pour les services runtime, sans implementer encore le pipeline signal complet ni la boucle webhook PostgreSQL.

## Interdits Pour La Suite

- Ne pas skip la queue Phase 2.
- Ne pas reintroduire `Bearer admin_<operator_id>`.
- Ne pas exposer admin publiquement sans identite operateur production-grade.
- Ne pas implementer PSP/SBP.
- Ne pas lire SMS.
- Ne pas scraper d'app bancaire.
- Ne pas stocker raw phone.
- Ne pas stocker raw notification text par defaut.
- Ne pas affaiblir les regles d'auto-confirmation.
- Ne pas deployer en production.
