# Checkout Edge Case Matrix

Date: 2026-05-13

| Scenario | Expected backend state | Expected buyer UI | Expected webhook | Expected return |
|---|---|---|---|---|
| 1. card-only + sender T-Bank | route card only | Carte only | none before manual decision | N/A pre-final |
| 2. sbp-only + sender Ozon | route sbp only | SBP only | none before manual decision | N/A pre-final |
| 3. card+sbp + sender Alfa | method selected persisted | method selector + sender selector | none before manual decision | N/A pre-final |
| 4. sender != receiver | both persisted separately | both banks shown separately | unchanged | launcher uses sender |
| 5. receiver != sender | same as #4 | same as #4 | unchanged | same as #4 |
| 6. merchant confirms before buyer claim, buyer claims later | already_confirmed | confirmed, no crash | payment.confirmed final-only | return CTA available |
| 7. buyer claim after rejected | already_rejected | rejected, no reopen | no confirmed webhook | return/fallback |
| 8. buyer claim after expired | already_expired | expired, no revive | payment.expired only | retry/return |
| 9. merchant confirms while buyer waiting open | manual_confirmed | auto reconcile to confirmed on poll | payment.confirmed final-only | return CTA |
| 10. no-notification fallback then merchant confirms | needs_review -> manual_confirmed | waiting -> confirmed | payment.confirmed final-only | return CTA |
| 11. signal detected then merchant confirms | signal_detected/needs_review -> manual_confirmed | waiting/signal -> confirmed | payment.confirmed final-only | return CTA |
| 12. android return scheme present | return_url overridden by scheme | return button deep-link | none extra | android scheme first |
| 13. only web_return_url present | return_url used | return button web URL | none extra | web URL |
| 14. no return target | unchanged | safe fallback | none extra | history fallback |
| 15. invalid return_url | rejected as unsafe | fallback, no raw API page | none extra | fallback |
| 16. webhook signature invalid (consumer side) | external consumer rejects | buyer UI unaffected | delivery attempted signed | return unaffected |
| 17. external_id missing | still final state valid | confirmed/rejected/expired | payload with order/payment ids | return works without external_id |
| 18. checkout_edit=1 on final | final remains final | confirmed/rejected/expired shown | unchanged | unchanged |
| 19. duplicate “J’ai payé” | idempotent claim | stable waiting/final | no duplicate final webhook | unchanged |
| 20. duplicate “Retourner au marchand” | no backend mutation | repeated nav only | none | deterministic link/fallback |

## Gaps

- E2E coverage for #16/#17 with real webhook receiver remains `missing_test`.
- Multi-tab stale session replay remains `missing_test`.

