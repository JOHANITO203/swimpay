# Android No New Features Guardrail Report

| Change | Existed before design | Restored | New concept |
|---|---:|---:|---:|
| Dashboard `SwimPay Intelligence` card | yes | yes | no |
| Receiver `SwimPay Intelligence` wording | yes | yes | no |
| Simple `Site connecté` integration label | yes, as connected site | yes | no |
| Technical integration details hidden by default | yes, details existed | yes | no |
| Language in settings | yes | preserved | no |
| Appearance/theme in settings | yes | preserved | no |
| App lock/security | yes | preserved | no |
| Help/support | yes | preserved | no |
| Remote sessions repository | no | no | refused |
| True multi-site integrations | no | no | refused |
| Developer console mode | no | no | refused |

## Static guardrail added

`AndroidRuntimeWiringGuardrailTest.merchantScreensMustSurfaceIntelligenceAndHideTechnicalNoiseByDefault`

Checks:
- `SwimPay Intelligence` is visible in merchant UI.
- old technical labels do not appear by default.
- `Integration developpeur` / `Developer integration` are not the visible settings labels.
- forbidden technical terms are not present in default merchant sections.
