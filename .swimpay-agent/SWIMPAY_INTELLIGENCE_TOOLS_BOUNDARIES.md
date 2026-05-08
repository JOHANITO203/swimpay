# SwimPay Intelligence Tools And Boundaries

Date: 2026-05-08

SwimPay Intelligence is a set of deterministic tools. No single tool may exceed its layer authority.

| Tool | Owner | Purpose | Input | Output | Data class | Can create review? | Can emit public webhook? | Can mutate runtime rules? | Forbidden actions |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bank Target Lock | Android | Allow only activated supported bank packages | Package name, enabled target set | allow/deny | package id, safe config | No | No | No | Broad package enumeration, SMS, Accessibility, bank scraping. |
| Notification Listener | Android | Receive notification callbacks from Android OS | Notification object from allowed package | temporary snapshot | raw in memory only | No | No | No | Store/upload raw title/body/text; act on unsupported packages. |
| Redaction Pipeline | Android | Extract safe signal hints | Temporary snapshot | redacted payload, hashes, counters | redacted/masked/hash | No | No | No | Let raw text leave boundary. |
| Encrypted Outbox | Android | Durable retry buffer | Redacted envelope | encrypted redacted record | redacted/hash/signature | No | No | No | Persist unsafe payload or duplicate unsafe retry data. |
| Receiver Device Registration | API | Bind receiver to merchant | Merchant context, device public key | device id/status | safe identity/public key | No | No | No | Accept anonymous production device identity. |
| Heartbeat | API/Android | Report receiver health | device state, safe counters | warnings/actions | safe metrics | No | No | No | Upload raw notification data. |
| Signal Upload | API | Accept signed redacted signals | Signed redacted envelope | stored signal + internal event | redacted/hash/masked | No directly | No | No | Accept raw fields, replay, stale/future production timestamps, revoked devices. |
| Deterministic Parser | Android / worker | Parse redacted bank signal shape | redacted shape and metadata | category/hints | redacted/hash | No | No | No | LLM decisioning, bank scraping, raw text storage. |
| Shape Hasher | Android / worker | Create non-PII shape keys | normalized redacted tokens | hash | hash | No | No | No | Include phone/card/raw text in canonical shape. |
| Classifier | Android / worker | Categorize signal | deterministic features | category/confidence | safe metric | No | No | No | Confirm payments or mutate rules automatically. |
| Payment Intent Gate | worker | Require active payment intent | signal + active intents | candidates/no candidates | safe operational data | Gates review only | No | No | Create review without active intent. |
| Review Queue | API/web | Merchant manual review | gated match | `needs_review` row | redacted/masked | Yes | No | No | Fulfill merchant order automatically. |
| Manual Confirmation | API/web | Merchant final action | review action + permission | `manual_confirmed`, final event request | safe final state | No new review | Yes, via worker | No | Fire before manual merchant action. |
| Feedback Logger | API/admin | Supervised input | operator feedback | durable redacted observation | redacted/hash/safe metric | No | No | No | Mutate runtime rules or promote profiles. |
| Unknown Shape Monitor | API/admin | Monitor unknown shapes | redacted shape hash | read-only monitoring row | hash/redacted metric | No | No | No | Create payment review or profile automatically. |
| Operator Intelligence Surfaces | web/API | Observe safe Intelligence state | read models | redacted UI/API | redacted/masked | No | No | No | Show raw title/body/text, secrets, raw phone/card. |
| Webhook Worker | job-worker | Deliver final public webhooks | queued public final event | signed webhook | safe public event | No | Yes | No | Deliver internal signal/review events as fulfillment. |
| SDK Web | package | Merchant server integration | secret key server-side, raw webhook body | order + verification helpers | secret server-only | No | Receives only | No | Expose secret to browser; parse internal events as fulfillment. |
| SDK Android | package | Merchant app checkout helper | checkout URL / return URL | open/parse helper | public URL only | No | No | No | Store secret key, handle webhooks, confirm payment. |

## Boundary Rules

- Android captures, filters, extracts, redacts, signs and uploads.
- Backend decides.
- Merchant manual confirmation is mandatory in V1.
- SDKs integrate with backend contracts only; they do not decide payment status.
- Operator/admin surfaces observe and configure; they do not create hidden automatic learning behavior.

