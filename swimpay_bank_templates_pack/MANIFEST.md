# SwimPay Bank Templates Pack

Generated for SwimPay V1 on 2026-05-01.

This pack is designed to be copied into the SwimPay repository. It defines the bank template system for the V1 bank scope:

- Sberbank
- Tinkoff / T-Bank
- VTB Bank
- Alfa-Bank
- Gazprombank

The pack contains:

```text
packages/bank-templates/
  AGENTS.md
  README.md
  BANK_TEMPLATE_SYSTEM.md
  dsl/
  schemas/
  shared/
  policies/
  banks/
  fixtures/
  operations/
  src/

docs/
  25_BANK_TEMPLATE_PACK_OVERVIEW.md
  26_BANK_TEMPLATE_ADMIN_WORKFLOW.md
  27_BANK_TEMPLATE_QA_AND_ADVERSARIAL_TESTING.md
  28_BANK_TEMPLATE_DATASET_STRATEGY.md

tasks/
  018_bank_template_package_setup.md
  019_bank_profile_registry.md
  020_bank_template_parser_core.md
  021_bank_template_fixtures_tests.md
  022_bank_template_drift_radar.md
  023_bank_template_admin_console.md

adr/
  0011-bank-template-dsl.md
  0012-bank-template-shadow-mode.md
  0013-bank-template-redacted-dataset.md
```

## Non-negotiable rules

- Do not use LLMs in payment decisions.
- Do not claim official bank confirmation.
- Do not invent bank app package names or signing certificate fingerprints.
- Do not store raw notification text by default.
- Do not auto-confirm on amount only.
- Do not classify cashback, refund, promo, failed transfer or outgoing payment as customer transfer.
- Android captures and signs. Backend decides.

## Placement

Copy the contents of this pack into the root of the SwimPay repo:

```bash
cp -R swimpay_bank_templates_pack/. /path/to/swimpay/
```

After copying, ask Codex to read:

```text
AGENTS.md
packages/bank-templates/AGENTS.md
packages/bank-templates/README.md
packages/bank-templates/BANK_TEMPLATE_SYSTEM.md
tasks/018_bank_template_package_setup.md
```
