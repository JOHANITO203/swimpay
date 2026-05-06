# Developer Integration Wizard Audit

generated_at: 2026-05-06

## Result

Status: prototype / incomplete for V1 production.

Several pieces exist, but there is no complete production integration wizard focused on Web and Android.

## Present

- Merchant connected-site UI exists in Android premium surfaces.
- Web merchant connected-site and admin-like surfaces exist.
- Backend Android merchant connected-site endpoint exists.
- Connected-site test endpoint exists.
- Webhook delivery history concepts exist in worker/tests.
- Security helpers support webhook secret hashing.
- Docs describe webhook URL, signature and event handling.

## Missing

- Wizard step to choose integration type: Web or Android.
- API key creation lifecycle:
  - create;
  - show once;
  - mask later;
  - regenerate;
  - revoke.
- Webhook secret lifecycle with show-once semantics.
- Production webhook URL configuration screen.
- Code snippets for:
  - Web backend order creation;
  - webhook verification;
  - Android app opens checkout URL via merchant backend.
- Explicit "secret never in Android APK" warning inside the wizard.
- Delivery history wired as production data rather than static/demo UI.
- Mode developer details clearly separated from merchant-friendly default view in every surface.
- Removal of non-V1 integration scopes; expected V1 is Web and Android only.

## Production Recommendation

Build the wizard after SDK Web/Android boundaries are clarified. The wizard should generate safe snippets from the same SDK contracts, not duplicate integration logic.

