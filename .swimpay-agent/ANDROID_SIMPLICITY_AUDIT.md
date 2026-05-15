# Android Simplicity Audit

Rule: a merchant should understand each entry in under 3 seconds.

| Screen | Compréhensible | Trop technique | Action principale claire | Anciennes features accessibles |
|---|---|---|---|---|
| Login | yes | no | yes | yes |
| Onboarding | yes | no | yes | yes |
| Dashboard | mostly | no | mostly | yes |
| Review Queue | yes | no | yes | yes |
| Review Detail | yes | medium | yes | yes |
| Orders/Ventes | no | no | no | no, hidden |
| Settings/Menu | yes after restoration | no | yes | mostly |
| Receiving Methods | yes | no | yes | yes |
| Banks | yes | no | yes | yes |
| Integrations/Connected Site | medium | medium | yes | yes for single-site detail |
| Receiver Health | medium | yes | medium | partial |
| Security | medium | medium | yes | partial |
| Language | yes | no | yes | yes |
| Appearance | yes | no | yes | yes |
| Help Center | yes | no | yes | yes |
| Support | yes | no | yes | yes |

Findings:
- The biggest simplicity regression is not visual: `Orders/Ventes` disappeared from primary access.
- The second regression was Settings being replaced by Security; that has been restored.
- Receiver Health and Security still risk looking like technical consoles if remote-session/diagnostic areas are shown without real user value.
- Integrations must stay framed as the existing connected site/developer integration unless multi-site contracts are added later.
