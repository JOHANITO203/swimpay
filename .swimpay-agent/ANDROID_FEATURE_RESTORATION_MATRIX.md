# Android Feature Restoration Matrix

Baseline: pre-design commit `2149c8e`, before `2026-05-13`.

| Feature | Existait avant design ? | Source avant | État actuel | Problème | Action |
|---|---:|---|---|---|---|
| Login/create account gate | yes | `PremiumNavigation.initialRoute` | present | none | keep |
| Google recovery login | yes | `accountAuthRepository.googleRecover` | present | device retest needed | keep/test |
| Google link in Security | yes | `accountAuthRepository.googleLink` | present | session restoration still under test | keep/test |
| Language switch on login | yes | task 691 | present | none | keep |
| Language settings | yes | `PremiumLanguageScreen` | restored | was hidden when Settings showed Security directly | restored |
| Appearance/theme settings | yes | `PremiumAppearanceScreen` | restored | was hidden when Settings showed Security directly | restored |
| App lock/security | yes | `PremiumSecurityScreen` | present | none | keep |
| Help center | yes | task 688 | restored | was hidden by broken Settings menu | restored |
| Contact support | yes | task 689 | restored | was hidden by broken Settings menu | restored |
| Confirmation mode | yes | task 693 | restored | was hidden by broken Settings menu | restored |
| Dashboard metrics | yes | tasks 698-702 | present | layout changed, data source present | keep |
| Dashboard quick actions | yes | pre-design dashboard/settings nav | restored | design pass had visual-only actions | restored |
| Review queue | yes | `loadReviews` | present | none | keep |
| Review detail actions | yes | `confirmReceived`, `rejectSignal`, `rejectOrder` | present | none | keep |
| Orders/Ventes tab | yes | `PremiumMainTab.Orders` | missing/hidden | bottom nav no longer exposes Orders | restore route/access in next patch |
| Sales row in Settings | yes | `PremiumRoute.Main(PremiumMainTab.Orders)` | broken | currently routes to `Receivers` | fix to orders access |
| Order detail | partial | `PremiumRoute.OrderDetail` | placeholder | no detail load visible | contract/code review required |
| Receiving methods list | yes | `loadReceivingMethods` | present | none | keep |
| Add receiving method | yes | `createReceivingMethod` | restored | callback was at risk after visual pass | restored |
| Edit receiving method | yes | `updateReceivingMethodLabel` | restored | callback was at risk after visual pass | restored |
| Disable receiving method | yes | `disableReceivingMethod` | restored | callback was at risk after visual pass | restored |
| Mark recommended/default | yes | `markReceivingMethodRecommended` | restored | callback was at risk after visual pass | restored |
| Delete receiving method | yes | `deleteReceivingMethod` | restored | callback was at risk after visual pass | restored |
| Banks screen | yes | `loadBanks` | present | none | keep |
| Connected site detail | yes | `loadConnectedSite` | present | current label became Integrations | keep, clarify single-site truth |
| Multi-site integration list | no | none found | visually present-ish | not an old feature, backend gap | do not invent |
| API key create/rotate | yes | `createDeveloperApiKey`, `rotateDeveloperApiKey` | present | none | keep |
| Webhook URL/secret/test | yes | connected site runtime | present | none | keep |
| Configuration test | yes | `runConfigurationTest` | present | access via Settings | keep |
| Receiver health | yes | `loadReceiverHealth` | present | extra technical tiles not pre-design | simplify later |
| Remote sessions/devices | no real repo found | none | unavailable/visual only | no repository | show unavailable honestly |
| Privacy/data settings | not proven | no task/source found | visible in current design surfaces | may be new/unwired | do not treat as restored feature |
| Notification preferences | not proven as settings repo | task mentions receiver health, not prefs repo | visible/partial | may be new/unwired | audit before exposing |
