# Android Layout Defect Audit

Scope: Android Merchant premium UI only. No backend, API, database, payment runtime, webhook runtime, receiver runtime or SDK logic was changed.

## Dashboard
- currency_rendering_bug: dashboard design fixture rendered `85 920 ?` and `Hier 76 421 ?`.
- bad_accents_mojibake: fixture/copy still had downgraded French labels such as `Apercu`, `detectes`, `operationnelle`, `sante`.
- cramped_cards: metric cards clipped long values such as `Excellent` and short trends.
- bottom_nav_overlap: bottom nav visually covered lower content because the shell content area had no extra bottom separation.

## Review Queue
- bad_filters: filter row used tiny count/icon pills instead of readable filters.
- truncated_text: amounts were ellipsized or split badly after adding `RUB`.
- bad_accents_mojibake: labels used `A verifier`, `Priorite`, `Qualite`, `Elements`.
- cramped_cards: bank/logo, amount and action competed in one narrow row.

## Security Settings
- clipped_text: session/device rows were fixed too short and clipped metadata.
- bottom_nav_overlap: lower sections could be hidden behind the bottom navigation.
- bad_accents_mojibake: `Donnees protegees`, `controles`, `tracables`, `Apres`.

## Receiving Methods
- bad_accents_mojibake: fixture labels used `Validee`, `Telephone`, `Debit`, `Credit`, `A verifier`.
- bottom_nav_overlap: list needed larger bottom content padding.
- visual_grammar: status/check chip used a `?` placeholder in the privacy card.

## Integrations
- bad_accents_mojibake: fixture labels used `Integration active`, `Cree le`, `Cle API`, `Sante`.
- bottom_nav_overlap: long integration content needed nav-safe bottom padding.

## Review Detail
- bad_accents_mojibake: visible labels used `Detail a examiner`, `Priorite`, `signal detecte`, `Reference`.
- currency_rendering_bug: runtime fallbacks still used the ruble glyph.
- compressed_cards: summary/action content needed nav-safe bottom padding on smaller screens.

## Receiver Health
- bad_accents_mojibake: fixture labels used downgraded receiver/health strings.
- bottom_nav_overlap: diagnostic cards needed nav-safe bottom padding.
- cramped_cards: technical rows remain dense but are scrollable.
