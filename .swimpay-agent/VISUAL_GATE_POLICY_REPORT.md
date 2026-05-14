# Visual Gate Policy Report

Date: 2026-05-14

## Policy File

Created `design/VISUAL_GATE_POLICY.md`.

## Modes

### Design Polish Mode

- Roborazzi is not blocking.
- Compile, non-screenshot Android tests and APK builds remain active.
- Manual/emulator screenshots are used for fast iteration.
- Legacy visual-structure assertions are also outside the default path while screens are being refactored toward the mockups.

### Visual Freeze Mode

- Roborazzi record and verify are explicit.
- Visual diff reporting is updated when comparing against reference PNGs.
- Goldens are accepted intentionally.

### Release Mode

- Roborazzi verify becomes required again.
- Product/security/privacy/runtime guardrails remain required.
- Visual baselines must be stable and approved.

## Preserved Product Boundaries

This policy does not allow raw notification text, official bank confirmation claims, auto-confirmation, Android-owned webhook delivery, exposed secrets, fake runtime data, or changes to payment/webhook semantics.
