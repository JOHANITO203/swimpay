# SwimPay Obsidian Brain

Point d'entree Obsidian pour naviguer dans toute la connaissance Markdown du repo SwimPay.

Ouvre `d:\Dev\Projects\swimpay` comme vault Obsidian, puis garde cette note comme Home.

## Cartes rapides

- [[README|README]]
- [[AGENTS|Regles agents]]
- [[CODEX_START_HERE|Codex start]]
- [[MANIFEST|Manifest]]
- [[docs/00_PROJECT_OVERVIEW|Vue projet]]
- [[docs/02_SYSTEM_ARCHITECTURE|Architecture]]
- [[docs/05_DATABASE_SCHEMA|Schema database]]
- [[docs/07_EVENT_CATALOG|Event catalog]]
- [[docs/10_MATCHING_AND_SCORING|Matching and scoring]]
- [[docs/11_SECURITY_AND_PRIVACY|Security and privacy]]
- [[docs/23_CODEX_TASK_PROTOCOL|Codex task protocol]]
- [[docs/24_ORDER_AND_SESSION_STATE_MACHINES|State machines]]
- [[packages/bank-templates/README|Bank templates actifs]]
- [[swimpay_bank_templates_pack/packages/bank-templates/README|Bank templates pack source]]

## Graphe mental

```text
Produit
  -> Requirements
  -> Architecture
  -> Services
  -> Runtime single-server

Fondation technique
  -> Database
  -> Events
  -> Contracts
  -> Security
  -> Local development

Paiement signal
  -> Android captures
  -> Backend decides
  -> Parser/templates
  -> Matching/scoring
  -> Review/webhooks/audit

Execution Codex
  -> AGENTS
  -> CODEX_START_HERE
  -> tasks/*
  -> docs/23_CODEX_TASK_PROTOCOL

Bank templates
  -> packages/bank-templates
  -> swimpay_bank_templates_pack
  -> DSL
  -> fixtures
  -> operations
```

## Root

- [[AGENTS]]
- [[CODEX_START_HERE]]
- [[CONTRIBUTING]]
- [[MANIFEST]]
- [[README]]
- [[SECURITY]]

## Documentation principale

- [[docs/00_PROJECT_OVERVIEW]]
- [[docs/01_PRODUCT_REQUIREMENTS]]
- [[docs/02_SYSTEM_ARCHITECTURE]]
- [[docs/03_REPO_STRUCTURE]]
- [[docs/04_SERVICES_SPEC]]
- [[docs/05_DATABASE_SCHEMA]]
- [[docs/06_API_SPEC]]
- [[docs/07_EVENT_CATALOG]]
- [[docs/08_ANDROID_RECEIVER_SPEC]]
- [[docs/09_BANK_TEMPLATE_LEARNING]]
- [[docs/10_MATCHING_AND_SCORING]]
- [[docs/11_SECURITY_AND_PRIVACY]]
- [[docs/12_WEBHOOKS]]
- [[docs/13_UX_CHECKOUT]]
- [[docs/14_UX_MERCHANT_DASHBOARD]]
- [[docs/15_DEPLOYMENT_SINGLE_SERVER]]
- [[docs/16_TESTING_STRATEGY]]
- [[docs/17_OPERATIONS_RUNBOOK]]
- [[docs/18_ROADMAP]]
- [[docs/19_BANK_PROFILES_V1]]
- [[docs/20_OBSERVABILITY_AND_METRICS]]
- [[docs/21_DATA_RETENTION_AND_PRIVACY]]
- [[docs/22_ADMIN_CONSOLE_SPEC]]
- [[docs/23_CODEX_TASK_PROTOCOL]]
- [[docs/24_ORDER_AND_SESSION_STATE_MACHINES]]
- [[docs/IMPLEMENTATION_NOTES]]
- [[docs/LOCAL_DEVELOPMENT]]

## ADR

- [[adr/0001-use-single-server-first]]
- [[adr/0002-use-postgresql-as-source-of-truth]]
- [[adr/0003-use-nats-jetstream]]
- [[adr/0004-use-valkey-for-cache-locks]]
- [[adr/0005-no-llm-in-payment-decision]]
- [[adr/0006-no-sbp-no-psp-v1]]
- [[adr/0007-android-captures-backend-decides]]
- [[adr/0008-microservice-ready-modular-monorepo]]
- [[adr/0009-official-bank-confirmation-is-not-supported]]
- [[adr/0010-use-review-on-ambiguity]]

## Apps

- [[apps/android-receiver/AGENTS]]
- [[apps/api/AGENTS]]
- [[apps/job-worker/AGENTS]]
- [[apps/signal-worker/AGENTS]]
- [[apps/web/AGENTS]]

## Packages actifs

- [[packages/bank-templates/AGENTS]]
- [[packages/bank-templates/BANK_TEMPLATE_SYSTEM]]
- [[packages/bank-templates/dsl/BANK_TEMPLATE_DSL]]
- [[packages/bank-templates/README]]
- [[packages/database/AGENTS]]
- [[packages/matching-core/AGENTS]]
- [[packages/security/AGENTS]]

## Tasks principales

- [[tasks/README]]
- [[tasks/001_setup_monorepo]]
- [[tasks/002_create_database_schema]]
- [[tasks/003_implement_order_api]]
- [[tasks/004_implement_payment_sessions]]
- [[tasks/005_receiver_device_registration]]
- [[tasks/006_android_receiver_core]]
- [[tasks/007_signal_ingestion_endpoint]]
- [[tasks/008_bank_profiles_and_parser]]
- [[tasks/009_matching_core]]
- [[tasks/010_review_queue]]
- [[tasks/011_hosted_checkout]]
- [[tasks/012_webhook_worker]]
- [[tasks/013_bank_template_learning]]
- [[tasks/014_deployment_docker_compose]]
- [[tasks/015_security_hardening]]
- [[tasks/016_end_to_end_tests]]
- [[tasks/017_admin_console_minimal]]

## Bank templates pack source

### Pack root

- [[swimpay_bank_templates_pack/MANIFEST]]

### Pack ADR

- [[swimpay_bank_templates_pack/adr/0011-bank-template-dsl]]
- [[swimpay_bank_templates_pack/adr/0012-bank-template-shadow-mode]]
- [[swimpay_bank_templates_pack/adr/0013-bank-template-redacted-dataset]]

### Pack docs

- [[swimpay_bank_templates_pack/docs/25_BANK_TEMPLATE_PACK_OVERVIEW]]
- [[swimpay_bank_templates_pack/docs/26_BANK_TEMPLATE_ADMIN_WORKFLOW]]
- [[swimpay_bank_templates_pack/docs/27_BANK_TEMPLATE_QA_AND_ADVERSARIAL_TESTING]]
- [[swimpay_bank_templates_pack/docs/28_BANK_TEMPLATE_DATASET_STRATEGY]]

### Pack package docs

- [[swimpay_bank_templates_pack/packages/bank-templates/AGENTS]]
- [[swimpay_bank_templates_pack/packages/bank-templates/BANK_TEMPLATE_SYSTEM]]
- [[swimpay_bank_templates_pack/packages/bank-templates/dsl/BANK_TEMPLATE_DSL]]
- [[swimpay_bank_templates_pack/packages/bank-templates/fixtures/TEST_MATRIX]]
- [[swimpay_bank_templates_pack/packages/bank-templates/INDEX]]
- [[swimpay_bank_templates_pack/packages/bank-templates/operations/DRIFT_INCIDENT_RUNBOOK]]
- [[swimpay_bank_templates_pack/packages/bank-templates/operations/PACKAGE_CERT_VERIFICATION]]
- [[swimpay_bank_templates_pack/packages/bank-templates/operations/TEMPLATE_REVIEW_RUNBOOK]]
- [[swimpay_bank_templates_pack/packages/bank-templates/README]]
- [[swimpay_bank_templates_pack/packages/bank-templates/src/README]]

### Pack bank operation notes

- [[swimpay_bank_templates_pack/packages/bank-templates/banks/alfa/operations/notes]]
- [[swimpay_bank_templates_pack/packages/bank-templates/banks/gazprombank/operations/notes]]
- [[swimpay_bank_templates_pack/packages/bank-templates/banks/sberbank/operations/notes]]
- [[swimpay_bank_templates_pack/packages/bank-templates/banks/tbank/operations/notes]]
- [[swimpay_bank_templates_pack/packages/bank-templates/banks/vtb/operations/notes]]

### Pack tasks

- [[swimpay_bank_templates_pack/tasks/018_bank_template_package_setup]]
- [[swimpay_bank_templates_pack/tasks/019_bank_profile_registry]]
- [[swimpay_bank_templates_pack/tasks/020_bank_template_parser_core]]
- [[swimpay_bank_templates_pack/tasks/021_bank_template_fixtures_tests]]
- [[swimpay_bank_templates_pack/tasks/022_bank_template_drift_radar]]
- [[swimpay_bank_templates_pack/tasks/023_bank_template_admin_console]]

## Tags utiles

- #swimpay
- #architecture
- #database
- #events
- #security
- #matching
- #bank-templates
- #codex
- #tasks
