# Task 635 - REAL-CAPTURE-2 Intelligence tool inventory

Status: pending

Goal: inventory every active SwimPay Intelligence tool that must work before a real notification capture can safely prove SDK -> checkout -> Receiver -> manual review -> webhook.

Tools to inventory:
- Android Bank Target Lock;
- Android Notification Listener access state;
- Android snapshot extraction boundary;
- Android redaction pipeline;
- Android encrypted outbox;
- Android signed signal upload flusher;
- receiver device registration;
- receiver heartbeat;
- backend signed signal ingestion;
- anti-replay checks;
- Payment Intent Gate;
- manual review queue;
- manual confirmation path;
- public webhook worker;
- SDK order creation and webhook verification.

Output:
- `.swimpay-agent/REAL_CAPTURE_2_INTELLIGENCE_TOOL_INVENTORY.md`

Guardrails:
- No real bank notification capture during inventory.
- No raw notification text, raw phone/card, account data or secrets in reports.
- No Android-side payment confirmation.
- No Android developer webhook.
- No auto-confirmation.
