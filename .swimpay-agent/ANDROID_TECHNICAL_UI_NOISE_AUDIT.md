# Android Technical UI Noise Audit

## Dashboard

Classification: `too_technical` before fix.

Findings:
- `Webhook santé`
- `100% livré`
- `merchant.example` fallback in recent activity

Action:
- Replaced dashboard card with `Intégration`.
- Replaced fake/technical recent activity with `Intégration à jour`.
- Restored `SwimPay Intelligence` as a central card.

## Review Queue

Classification: `merchant_friendly`.

Findings:
- Queue remains action-oriented.
- No raw signal or internal parser wording found in the active UI.

Action:
- No redesign performed.

## Review Detail

Classification: `mostly_merchant_friendly`.

Findings:
- Uses `Priorité moyenne`, `Signal détecté`, `Éléments/indices correspondants`, manual actions.
- No raw notification or evidence envelope displayed by default.

Action:
- No backend or action semantics changed.

## Receiving Methods

Classification: `too_technical` before fix.

Finding:
- Privacy text mentioned `payloads webhook`.

Action:
- Replaced with merchant-safe copy: values stay masked to protect customers.

## Integrations List / Detail

Classification: `too_technical` before fix.

Findings:
- Default surface showed developer/API/webhook delivery wording too prominently.
- Detail showed API keys, secret, delivery stats and technical rows by default.

Action:
- Default list now shows simple merchant status rows.
- Detail now shows simple status/test/health first.
- API key, masked secret and URL details are behind `Détails techniques`.

## Receiver Health

Classification: `too_technical` before fix.

Findings:
- `heartbeat`
- `SQLite`
- logs
- advanced settings wording

Action:
- Replaced with merchant-facing `Dernier contact`, `Accès notifications`, `Banques surveillées`, `File locale`.

## Security Settings

Classification: `too_technical` before fix.

Findings:
- Sessions/devices block exposed a repository gap in a technical way.

Action:
- Removed the prominent sessions/devices area from the default Security screen.
- Kept simple settings: lock, Google recovery, notifications, confidentiality, help/support.
