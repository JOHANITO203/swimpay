# 143 — Bank Selection Onboarding UI Debug

## Goal

Add a safe debug/onboarding UI model for bank selection and review-only warnings.

## Scope

- Show selected banks, verification status, review-only status, and untrusted warning.
- Required wording:
  "Cette banque peut être utilisée pour détecter des signaux et les envoyer en review. Elle n’est pas encore vérifiée pour l’auto-confirmation."
- Do not imply official bank confirmation.
- Do not imply a bank app is trusted before verification.

## Validation

- Add model-based tests for the UI/status strings.
