# Android French Text Integrity Report

Root cause:
- Premium UI source had a mix of downgraded French (`A verifier`, `Priorite`, `Apercu`, `Apres`) and previously mojibake-prone strings.

Fix:
- Restored accents on active premium strings for dashboard, review queue/detail, receiving methods fixtures, integrations fixtures, receiver health, security settings and account/system messages touched by this sprint.
- Kept copy meaning stable; this was a rendering/content-integrity fix, not a compliance rewrite.

Guardrail:
- Existing mojibake guard remains active for replacement characters and common broken UTF-8 sequences.
- Added `premiumFrenchLabelsMustKeepAccents` to fail on downgraded labels such as `A verifier`, `Priorite`, `Qualite`, `Apres`, `Elements`, `Apercu`.

Result:
- Manual screenshots showed `Aperçu`, `Aujourd’hui`, `Éléments`, `À vérifier`, `Priorité`, `Qualité`, `Sécurité`, `Paramètres` correctly rendered.
