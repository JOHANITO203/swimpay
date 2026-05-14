# SwimPay AGENTS.md

This file gives mandatory instructions to Codex and all AI/code agents working in this repository.

## Project identity

SwimPay is a Payment Signal Engine.

It transforms authorized merchant-side bank notifications into operational payment signals usable by API.

SwimPay is not:

- a bank;
- a PSP;
- an official bank confirmation system;
- an SBP integration;
- a payment initiator;
- a wallet;
- a system that reads the buyer phone;
- a system that reads SMS;
- a system that scrapes banking apps.

## Non-negotiable rule

Never implement logic, text, events or statuses that claim an official bank confirmation.

Use:

- `notification_signal`;
- `payment_signal`;
- `operational_confirmation`;
- `swimpay_recognized`.

Never use:

- `bank_confirmed`;
- truthy official bank confirmation flags;
- `guaranteed_payment`;
- `psp_confirmed`.

All public events must include:

```json
{
  "confirmation_type": "notification_signal",
  "official_bank_confirmation": false
}
```

## V1 scope

Supported banks:

- Sberbank;
- Tinkoff / T-Bank;
- VTB;
- Alfa-Bank;
- Gazprombank.

Deployment:

- one Ubuntu server;
- Docker Compose;
- PostgreSQL;
- Valkey;
- NATS JetStream;
- Caddy or Nginx.

V1 forbidden items:

- no Kubernetes;
- no Kafka;
- no LLM in payment decisions;
- no SBP integration, API calls or payment initiation;
- no PSP;
- no SMS reading;
- no bank app scraping;
- no hidden data collection;
- no iOS Receiver App.

SBP wording is allowed only as user-facing copy for the `phone_transfer`
receiving method, because Russian users recognize phone-number transfers by
that habit. This wording never means SwimPay integrates with SBP, initiates
payments, receives official bank confirmation or auto-confirms orders.

## Architecture style

Use microservice-ready modular design.

Initial deployable services:

- `swimpay-api`;
- `swimpay-signal-worker`;
- `swimpay-job-worker`;
- `swimpay-web`;
- `android-receiver`.

Logical services may exist inside these deployables, but do not create unnecessary runtime containers in V1.

PostgreSQL is the source of truth.

Valkey is only for:

- cache;
- short locks;
- rate limits;
- temporary reservations;
- heartbeat cache.

NATS JetStream is used for durable internal events.

Payment decisions must be protected by PostgreSQL transactions and unique constraints. Do not rely on Valkey locks alone for final payment decisions.

## Required order states

Orders must follow explicit states. Never move directly from `created` to `confirmed`.

Allowed order states:

- `created`;
- `awaiting_buyer_identity`;
- `payment_session_created`;
- `receiver_arming`;
- `receiver_armed`;
- `payment_instructions_shown`;
- `awaiting_payment`;
- `buyer_claimed_paid`;
- `signal_detected`;
- `matching`;
- `needs_review`;
- `manual_confirmed`;
- `rejected`;
- `expired`;
- `fulfilled`.

Every state transition must create an audit event.

## V1 confirmation rules

V1 is manual-confirmation-only.

Strong matches create `needs_review` for the merchant. They never confirm a payment automatically.

Always create `needs_review` or `rejected`.

Never confirm automatically on:

- amount alone;
- cashback;
- refund;
- promo;
- failed transfer;
- outgoing payment;
- unknown direction;
- ambiguous notification;
- untrusted bank app;
- untrusted device.

## Privacy rules

Do not store raw notification text unless explicitly required for short-lived debugging and redacted.

Phone numbers must be:

- normalized;
- HMACed for matching;
- masked in dashboard.

Use redacted placeholders:

- `<AMOUNT>`;
- `<CURRENCY>`;
- `<PHONE>`;
- `<PERSON>`;
- `<REFERENCE>`;
- `<CARD_MASK>`.

Never upload notifications from non-allowed apps.

## Android rule

Android captures, filters, extracts, redacts, signs and uploads.

Backend decides.

Never implement final payment confirmation on Android.

## Android build rule

For operator/device testing, prefer staging-connected debug-signed builds.

Use:

- `npm run android:assemble:staging` for the standard debug-signed staging APK;
- `npm run android:assemble:debug-vps` only when an actual `debug` build must point to `https://staging.swimpay.pro`.

Do not hand off a plain local debug APK for VPS/staging tests unless the user explicitly asks for a local-backend build.

## Android merchant account truth

The current Android merchant app account flow is:

- show login/create-account before onboarding when no valid mobile merchant session exists;
- `Créer un compte` starts onboarding and creates a lightweight merchant account;
- `Se connecter` recovers an existing account, including through Google when linked;
- Google is optional recovery/linking only, exposed in login and `Paramètres > Sécurité`, not as a required onboarding step;
- account creation supports personal and business/commerce profiles with the same app rights;
- Android UX must not present these profiles as admin personas;
- do not collect merchant user first names or last names during Android account creation;
- generate a pseudonym/display handle instead;
- use privacy-safe device proof for known/new-device detection, never raw device identifiers or broad fingerprint collection;
- Step 5 `Site ou application` branches: `Configurer plus tard` enters the app after a brief success state, while `Ajouter maintenant` continues to a webhook-test-only path;
- the onboarding test path is a backend-owned webhook test only and must not confirm payment or send webhooks directly from Android.

See `docs/ANDROID_ACCOUNT_AND_ONBOARDING_TRUTH.md`.

## Testing rules

Every feature must include tests.

Minimum required tests:

- unit tests for pure logic;
- integration tests for API endpoints;
- matching tests for payment decisions;
- parser tests for bank notification formats;
- anti-replay tests;
- webhook idempotency tests;
- state machine transition tests.

Before finalizing a task, run the relevant commands:

- typecheck;
- lint;
- tests;
- build.

If a command cannot be run, explain why in the final response.

## Coding rules

- Use explicit types.
- Do not silently swallow errors.
- Do not use magic strings for statuses or event names; use enums/constants.
- Do not duplicate matching logic across services.
- Keep payment decision logic deterministic and auditable.
- Emit reason codes for every decision.
- Update docs when changing major behavior.

## Root-cause fix rule

Do not apply symptom-only minimal patches.

A fix is acceptable only if it:
- identifies the root cause;
- updates the relevant contract, enum, state machine or schema if the bug comes from a contract mismatch;
- preserves auditability instead of stripping or hiding data;
- adds a regression test that fails before the fix and passes after;
- documents why the fix is correct in the task report.

Forbidden:
- neutralizing invalid values without explaining why they existed;
- silently dropping actor, state, payment, review or audit metadata;
- converting contract bugs into generic fallback behavior;
- patching UI labels while backend states remain inconsistent;
- making tests pass by weakening assertions;
- adding compatibility shims without a migration or deprecation plan.

If a temporary hotfix is unavoidable, label it `TEMPORARY_HOTFIX`, create a root-cause follow-up task in `.swimpay-agent/BLOCKERS.md`, and do not close the sprint until the permanent fix is implemented or explicitly approved.

## Design-only mode

When the user says the session is design-only or asks only for visual polish:

- change only visual/UI files, design docs, `AGENTS.md`, `docs/ai/*` or `.swimpay-agent/*` files in scope;
- do not change backend, API contracts, database, payment runtime, webhook logic, receiver runtime, SDK behavior or notification processing;
- preserve existing UI copy unless the user explicitly asks for copy changes;
- do not add product-safety lectures to normal UI copy during visual polish;
- do not use Roborazzi/golden tests as a blocking gate during active polish;
- use compile/manual screenshots first, then freeze visual baselines only when requested or approved.

## Full visual rebuild mode

When the user says screens do not match mockups, asks for a full visual rebuild,
or says the old theme is wrong:

- treat the old visual layer as wrong for the surfaces in scope;
- rebuild the active visual layer from the mockups or reference screens;
- remove mixed-theme residue instead of layering new tokens over old structure;
- preserve existing text unless the user explicitly requests copy work;
- do not let product-safety review become a rewrite of normal design copy;
- keep backend, payment runtime and receiver behavior untouched unless the user explicitly changes scope.

## Multi-agent workflow

For multi-agent work, use an orchestrator and disjoint specialist ownership:

- orchestrator: scope, task split, integration, validation and final closeout;
- design system agent: tokens, visual grammar, component rules and old-theme residue;
- asset agent: registered assets, logos, icons and forbidden/generated asset checks;
- screen-group agents: non-overlapping UI surfaces;
- QA agent: evidence, screenshots, validation and forbidden-scope check;
- product truth agent: blocks dangerous claims, raw notification exposure and raw secrets.

Each agent must produce one `.swimpay-agent` report for its surface or role.
Do not give two agents overlapping write ownership.

## Skill conflict resolution

- SwimPay product truth and this `AGENTS.md` override external skill or workflow rules.
- The current user request scope overrides generic skill behavior.
- Design-only tasks must not become backend, API, database, webhook, receiver or SDK refactors.
- External skills cannot disable repository safety, privacy, product or testing rules.
- Claude-specific instructions from imported repositories must be adapted to Codex or rejected.

## Required files to read before coding

Before implementing a task, read:

- `AGENTS.md`;
- relevant `tasks/*.md` file;
- `docs/02_SYSTEM_ARCHITECTURE.md`;
- `docs/05_DATABASE_SCHEMA.md` if DB is touched;
- `docs/10_MATCHING_AND_SCORING.md` if matching/decision logic is touched;
- `docs/11_SECURITY_AND_PRIVACY.md` if sensitive data/auth/security is touched.
