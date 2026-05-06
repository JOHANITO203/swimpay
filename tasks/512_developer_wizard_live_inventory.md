# Task 512 - Developer Wizard Live Inventory

Sprint: 9F - Developer Integration Wizard Live UX Wiring

## Goal

Audit the current web Developer Integration Wizard and Sprint 9E backend lifecycle endpoints before wiring live data.

## Scope

- Web frontend only.
- Read existing `/merchant/developer-integration` route and renderer.
- Read Sprint 9E backend endpoint contracts only as needed.

## Requirements

- Identify static fields currently rendered by the wizard.
- Identify live backend fields available from Sprint 9E.
- Identify web client/repository patterns to reuse.
- Identify safe fallback behavior when backend is unavailable.
- Create `.swimpay-agent/DEVELOPER_WIZARD_LIVE_INVENTORY.md`.

## Safety

- Do not expose secret keys or webhook secrets.
- Do not put secret keys in Android/browser snippets.
- Do not add internal fulfillment webhooks.
- Do not change payment behavior.
