# Android Mojibake Fix Report

Date: 2026-05-14

Root cause:
- Several premium Kotlin/test files contained mojibake literals from UTF-8 text decoded as Windows-1252, such as `Ã©`, `Ã¨`, `â‚½`, `â€¢`, `â€™`.
- One dashboard source file needed to be rewritten as UTF-8 before patching.

Fixed:
- Premium runtime copy and fallback states.
- Premium bottom nav labels.
- Premium component status copy.
- Affected premium unit/static tests.

Verification:
- `rg -n "Ã|â|�|PremiumMainTab\\.Menu|PremiumMainTab\\.Orders" ...` returned no matches for premium UI source/tests after the fix.
- Connected-device dashboard screenshot renders `Aperçu`, `aujourd’hui`, `Aujourd’hui`, `Récepteurs`, `Intégrations`, and `Paramètres` correctly.

