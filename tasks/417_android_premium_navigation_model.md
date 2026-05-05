# Task 417 - Android premium navigation model

Sprint 7K - Android Premium Navigation and State Foundation.

Define a typed premium navigation model for the Android merchant app.

Requirements:

- Add a typed route model for premium merchant screens.
- Add typed bottom-tab values for:
  - HOME
  - REVUES
  - VENTES
  - MENU
- Keep onboarding routes separate from merchant app routes.
- Keep payment detail as an explicit typed destination with `reviewId`.
- Do not change backend APIs, payment logic, review logic or notification processing.
- Do not reintroduce `ui/screens`.
- Add tests proving the app no longer relies on fragile raw route/tab magic values for the premium shell.

