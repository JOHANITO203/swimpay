# External P0 Recommendations Audit

generated_at: 2026-05-09T23:10:00+03:00

Scope: delta audit against current SwimPay code after Buyer Checkout 4-Step, Active Intent Sweep, no-notification fallback and HARDEN-REAL-1.

Product decision preserved: no PAN Kill Switch in this sprint. PAN remains accepted only in hosted checkout Step 1 and is treated as strict sensitive data.

| # | Recommendation | Classification | Finding |
|---:|---|---|---|
| 1 | PAN Kill Switch / PAN Sensitive Boundary | conflicts_with_current_product_direction + partially_implemented | Kill Switch rejected by product decision. Boundary existed for Expected Payment Profile; log/webhook/SDK guardrails were incomplete and were hardened. |
| 2 | Final-Only Webhook Firewall | already_implemented | Public events remain `payment.confirmed`, `payment.rejected`, `payment.expired`; unsafe field markers were strengthened. |
| 3 | Payment Intent Gate renforcé | partially_implemented | Gate exists and blocks no-intent review. Confidence vector/collision pressure added; display-amount-only runtime review path remains a future refinement. |
| 4 | Evidence Envelope | partially_implemented | Base redacted evidence envelope now built and persisted for receiver uploads; review-level enrichment can grow later. |
| 5 | Receiver Health Gate | partially_implemented | Receiver state and upload eligibility exist. Checkout adaptive UX remains next. |
| 6 | Confidence Vector | partially_implemented | Core deterministic vector added to matching/gate and persisted for new signal matches. Merchant UI can consume later. |
| 7 | Amount Lease Engine | partially_implemented | PostgreSQL lease table and active uniqueness constraint added. Allocation service remains next before heavy concurrency tests. |
| 8 | Collision Pressure Meter | partially_implemented | Deterministic `collision_pressure = compatible_intents - 1` added to matching-core/vector. |
| 9 | Bank Route Certification Matrix | partially_implemented | Runtime table seeded for V1 banks and Ozon `package_validation_pending`. Checkout/matching gate consumption remains next. |
| 10 | No-Notification Fallback UX | already_implemented | Existing 120s manual fallback creates manual review only, no webhook/confirmation. |
| 11 | Review Risk UI | partially_implemented | Backend vector exists; Android/admin risk rendering is future UI work. |
| 12 | Deterministic Replay Lab | partially_implemented | `test:replay`, `test:matching`, `test:privacy`, `test:webhooks` scripts added around deterministic suites. |
| 13 | Worker Idempotency Ledger | partially_implemented | PostgreSQL ledger table added; worker claim wrapper remains next. |
| 14 | Anti-replay renforcé | already_implemented | Signatures, event id, notification hash, local counter and timestamp tolerance exist. |
| 15 | Tenant Isolation Hardening | already_implemented | Merchant context is enforced in current critical APIs; no client-controlled merchant id was added. |
| 16 | Raw Notification Zero Policy | partially_implemented | Raw notification boundary already exists; PAN/card credential redaction was strengthened. |
| 17 | Webhook signing + retry + DLQ | already_implemented | Signing, retry, dead status and replay exist; unsafe public payload guard strengthened. |
| 18 | Bank Capability Fingerprint | V2_backlog | Partly represented by launcher/certification metadata; fuller capability fingerprint is V2. |
| 19 | Template Drift Detector | partially_implemented | Drift primitives exist; scheduled persisted workflow remains V2/next hardening. |
| 20 | Supervised Template Registry | partially_implemented | Feedback is non-mutating; supervised promotion workflow remains V2. |
| 21 | Observability Spine | partially_implemented | Safe logger/metrics exist; PAN redaction strengthened. Full trace spine remains next. |
| 22 | Privacy Budget Dashboard | V2_backlog | Not required before first real notification testing. |
| 23 | Statement Upload Assist | V2_backlog | Out of V1 runtime scope. |
| 24 | Dispute Timeline V2 | V2_backlog | Out of this sprint. |
| 25 | Sandbox développeur | V2_backlog | Developer Link Verification remains the planned next sprint. |

No real bank notification was processed. No auto-confirmation or public webhook semantic change was introduced.
