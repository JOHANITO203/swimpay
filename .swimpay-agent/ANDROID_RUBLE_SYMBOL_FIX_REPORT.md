# Android Ruble Symbol Fix Report

Root cause:
- The active premium fixtures contained literal broken currency text (`85 920 ?`, `76 421 ?`, `9 450,00 ?`, `14 200,00 ?`).
- Some runtime fallbacks still emitted the `₽` glyph, which is fragile on the current Android/font path.

Fix:
- Premium UI now uses `RUB` intentionally for merchant amounts in the affected premium screens.
- `confirmedAmountLabel()` maps RUB to `RUB` instead of `₽`.
- Dashboard/review/detail fallback values use `RUB`.
- Recent activity fallback values no longer contain `?`.

Guardrail:
- `AndroidPremiumTextIntegrityTest.premiumCurrencyFixturesMustNotRenderBrokenRubleSymbol` fails if premium UI source contains `₽` or digit-prefixed `?` currency fixtures.

Result:
- Manual dashboard and review queue screenshots showed `RUB`, not `?`.
