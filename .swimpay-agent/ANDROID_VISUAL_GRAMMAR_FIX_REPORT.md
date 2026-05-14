# Android Visual Grammar Fix Report

Rules applied:
- Use one premium glass/dark surface treatment for active cards.
- Keep card radii in the mockup family instead of mixing old tiny cards.
- Use readable pill/chip treatment for status labels.
- Keep bank logo zone, identity zone, amount zone and action zone distinct in review cards.
- Use `RUB` consistently for amounts.
- Use nav-safe bottom padding across active dashboard/settings/integration/receiver screens.

Implemented:
- Review cards rebuilt from a single compressed row into clear zones: logo + bank/status, amount/action, reference.
- Review filters changed to readable pills: `Tous`, `À vérifier`, `Aujourd’hui`, `Filtrer`.
- Dashboard metric cards gained safer value sizing and smaller action affordances.
- Security session rows gained taller readable zones.
- Bottom nav became a solid premium shell component with smaller selected state.

Not changed:
- Runtime/backend/business logic.
- Product semantics.
- Roborazzi goldens.
