# Frontend UI Audit — SwimPay

## 1. Current State Assessment
The frontend is currently implemented as a Server-Side Rendering (SSR) system within `apps/web/src/index.ts` using Fastify and raw string template literals.

### Key Observations:
- **Monolithic Rendering**: UI components are not separated. Screens and sub-components are functions returning large HTML strings (e.g., `renderCheckoutPage`, `renderStep`, `renderReceiverBankOptions`).
- **Mixed Concerns**: Business logic (Fastify routes), data fetching, and UI rendering are all in the same file (`index.ts`).
- **CSS Management**: Styles are embedded in strings (`baseStyles`, `evidenceStyles`). No CSS framework or preprocessor is used.
- **Client-side Logic**: Interactivity is handled via a single large `<script>` tag (`checkoutScript`) injected into the HTML.
- **Design Consistency**: The current UI uses basic CSS with some "teal" accents, but does not follow the "premium fintech" visual grammar described in the requirements (soft shadows, large radii, specific palette).

## 2. Screen Mapping

| Required Screen (Prompt) | Current Implementation in `apps/web` | Status |
| :--- | :--- | :--- |
| **Merchant Onboarding** | None | **Missing** |
| **Merchant Dashboard** | Basic `/` route | **Placeholder only** |
| **Receiving Methods** | `renderMerchantReceivingRoutesPage` | **Rudimentary** |
| **Review Queue** | `renderEvidenceReviewPage` | **Functional but needs redesign** |
| **Payment Detail** | Partial in Evidence Review | **Needs dedicated screen** |
| **Connected Site** | None | **Missing** |
| **Buyer Checkout** | `renderCheckoutPage` / `V2` | **Functional, needs visual pass** |

## 3. Component Extraction Plan
To move away from monolithic strings, we will introduce a more structured approach. Since the project currently uses SSR with Fastify, we will maintain this but move to a component-based architecture.

### Base Components to Create:
- `AppShell`: Common wrapper for merchant/admin pages.
- `CheckoutShell`: Specific wrapper for the buyer flow.
- `Button`: Primary, secondary, danger variants.
- `Card`: Soft shadows, 24px-32px radius.
- `StatusChip`: Semantic badges for states.
- `StepProgress`: For multi-step onboarding and checkout.
- `MetricCard`: For dashboard highlights.
- `CopyField`: Secure copy-to-clipboard component.

## 4. Technical Debt & Risks
- **No Build Step for Frontend**: Currently just `tsc` for the backend. Moving to a modern framework (React/Vue) would require significant changes to the build pipeline, which might conflict with the "don't break anything" rule.
- **SSR vs SPA**: The current logic relies on SSR. We should keep the SSR approach to avoid breaking existing state machines and data flows, but clean up the code by separating templates into dedicated files or a template engine (like EJS or simply separate TSX-like functions).
- **Security**: Must maintain `no-store` headers and ensure PII masking remains intact during refactoring.

## 5. Next Steps
1. Create a `ui/` directory in `apps/web/src` to house the new component-based structure.
2. Implement design tokens (CSS variables) in a central `Styles.ts` or `Theme.ts`.
3. Progressively replace monolithic `render` functions with the new component hierarchy.
