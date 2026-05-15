# Android Pre-Design Feature Inventory

Baseline inspected: `2149c8e` (`feat(database): add Ozon Bank runtime verification fields and initial data`), the last commit before `2026-05-13 00:00`.

Scope inspected:
- `PremiumNavigationState.kt`
- `PremiumMerchantApp.kt`
- `PremiumDashboardScreens.kt`
- `PremiumReviewScreens.kt`
- tasks `687` to `705`
- previous `.swimpay-agent` Android reports

## Pre-design navigation model

Before the design pass, the active Android Merchant shell exposed four main tabs:

| Tab | Label | Main screen | Runtime source |
|---|---|---|---|
| Home | Accueil | Dashboard | `activeRuntime.loadDashboard(notificationAccessEnabled)` |
| Reviews | Revue | Review queue | `activeRuntime.loadReviews()` |
| Orders | Ventes | Sales/orders | `activeRuntime.loadOrders()` |
| Menu | MENU | Settings/menu | `loadConnectedSite()` + `runConfigurationTest()` |

Current navigation has five tabs: `Accueil`, `En attente`, `Récepteurs`, `Intégrations`, `Paramètres`.

## Feature inventory by screen

### Account / Login

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Login/create account gate before onboarding | `PremiumNavigation.initialRoute` | mobile merchant session validity | present |
| Create account | `PremiumAccountEntryScreen` -> `AccountProfileChoice` | `accountAuthRepository.createAccount` | present |
| Personal/business profile choice | `PremiumAccountProfileChoiceScreen` | `AndroidMerchantAccountProfileType` | present |
| Google recovery | `PremiumAccountLoginProviderScreen` | `accountAuthRepository.googleRecover` + local session save | present, needs device retest |
| Language switch before login | task 691, `PremiumAccountEntryScreen` | `merchantSettingsStore.saveLanguage` | present |
| Local session persistence | `mobileSessionStore.save` | local session store | present, Google restoration under test |

### Onboarding

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Notification access step | `PremiumOnboardingFlow` | Android notification permission/settings | present |
| Bank setup/selection | `PremiumOnboardingFlow`, `loadBanks` | receiver runtime config | present |
| Receiving method setup | `PremiumOnboardingFlow` | receiving method draft/config | present |
| Site/app setup branch | account/onboarding truth doc | local onboarding route | present |
| Webhook-test-only path | onboarding truth doc | backend-owned test path | present/partial, not payment-confirming |
| Finish onboarding to app | `PremiumNavigation.afterOnboarding()` | local onboarding completion | present |

### Dashboard / Accueil

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Dashboard metrics summary | tasks 698-701 | backend merchant metrics summary | present |
| Compact chart | task 702 | backend metrics timeseries | present |
| Review counts/metrics | `PremiumDashboardScreen` | dashboard state | present |
| Webhook/receiver health cards | dashboard state | runtime metrics/state | present/partial |
| Recent activity | dashboard state | backend/runtime state | present |
| Quick action to Reviews | dashboard callback | navigation to `Reviews` | restored |
| Quick action to Receiving Methods | dashboard callback | navigation to `Receivers`/receiving route | restored |
| Quick action to Integration | dashboard callback | navigation to `Integrations` | restored |

### Review Queue / File d'examen

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Review list | `PremiumReviewsScreen` | `activeRuntime.loadReviews()` | present |
| Filters | `PremiumReviewFilter.TO_CONFIRM/CONFIRMED/REJECTED` | local UI filter over runtime list | present, redesigned labels |
| Open review detail | `onOpenReview` | `PremiumNavigation.openReview(reviewId)` | present |
| Review item amount/status/bank/reference | `PremiumReviewUiItem` | review repository/backend | present |

### Review Detail

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Review detail load | `PaymentDetail` route | `activeRuntime.loadPaymentDetail(reviewId)` | present |
| Redacted evidence/details | `PremiumPaymentDetailScreen` | review detail state | present |
| Confirm manually | `onConfirmReceived` | `activeRuntime.confirmReceived(reviewId)` | present |
| Reject signal | `onRejectSignal` | `activeRuntime.rejectSignal(reviewId)` | present |
| Reject order | `onRejectOrder` | `activeRuntime.rejectOrder(reviewId)` | present |
| Action enabled/message state | `state.actionsEnabled/actionMessage` | backend review state | present |

### Orders / Ventes

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Orders tab | `PremiumMainTab.Orders` | main nav | missing from current bottom nav |
| Orders screen | `PremiumOrdersScreen` | `PremiumOrdersUiState` | code still present |
| Orders load | `activeRuntime.loadOrders()` | orders repository/backend | hidden/not loaded by nav |
| Sales metrics/list | `PremiumOrdersScreen` | runtime order state | hidden |
| Order detail route | `PremiumRoute.OrderDetail` | intended order detail | present but empty placeholder in current app |
| Settings "Ventes" entry | pre-design Settings business group | navigated to Orders tab | currently misroutes to `Receivers` |

### Settings / Paramètres Menu

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Connected site summary | `PremiumConnectedSiteSummary` | `activeRuntime.loadConnectedSite()` | present |
| Configuration summary | `PremiumConfigurationSummary` | `runConfigurationTest()` | present |
| Banks entry | `PremiumNavigation.openBanks()` | bank runtime config | present |
| Receiving methods entry | `PremiumNavigation.openReceivingMethods()` | receiving methods runtime | present |
| Confirmation mode entry | `PremiumNavigation.openConfirmationMode()` | V1 manual mode screen | restored |
| Developer integration entry | `PremiumNavigation.openConnectedSite()` | integration runtime | present |
| Sales/orders entry | `PremiumRoute.Main(PremiumMainTab.Orders)` | orders runtime | broken/currently misroutes |
| Notifications/receiver health entry | `PremiumNavigation.openReceiverHealth()` | receiver runtime state | present |
| Appearance entry | `PremiumNavigation.openAppearance()` | settings store | restored |
| Language entry | `PremiumNavigation.openLanguage()` | settings store | restored |
| Security entry | `PremiumNavigation.openSecurity()` | settings store/auth repo | restored |
| Support entry | `PremiumNavigation.openSupportContact()` | support ticket repo/API | restored |
| Help center entry | `PremiumNavigation.openHelpCenter()` | local static help | restored |

### Receiving Methods / Récepteurs

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| List receiving methods | `loadReceivingMethods()` | receiving routes repository/backend/local state | present |
| Add card method | `createReceivingMethod` | runtime route creation | restored |
| Add phone/SBP method | `createReceivingMethod` | runtime route creation | restored |
| Edit label | `updateReceivingMethodLabel` | runtime update | restored |
| Disable method | `disableReceivingMethod` | runtime update | restored |
| Mark recommended/default | `markReceivingMethodRecommended` | runtime update | restored |
| Delete method | `deleteReceivingMethod` | runtime update | restored |
| Bank/logo/masked destination | `PremiumReceivingMethodUiItem` | receiving state | present |

### Banks

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Bank state screen | `PremiumBanksStateScreen` | `activeRuntime.loadBanks(...)` | present |
| Supported/active banks | bank runtime config | receiver runtime config store | present |

### Integrations / Connected Site

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Connected site summary/detail | `PremiumConnectedSiteStateScreen` | `activeRuntime.loadConnectedSite()` | present |
| API key creation | `createDeveloperApiKey()` | backend developer integration repo/API | present |
| API key rotation | `rotateDeveloperApiKey()` | backend | present |
| Webhook secret rotation | `rotateDeveloperWebhookSecret()` | backend | present |
| Webhook URL update | `updateDeveloperWebhookUrl(webhookUrl)` | backend | present |
| Test webhook | `testDeveloperWebhook()` | backend test endpoint | present |
| Developer export/copy | `consumeDeveloperExportText` gated by unlock | local secure display/export | present |
| True multi-site integrations list | not present pre-design | missing backend/repository | not an old feature |

### Configuration Test

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Checklist/run configuration test | `PremiumConfigurationStateScreen` | `runConfigurationTest(currentConfigurationChecklist())` | present |
| Settings summary card | `PremiumConfigurationSummary` | configuration state | present |

### Receiver Health

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Notification access state | `PremiumReceiverHealthStateScreen` | Android notification settings | present |
| Listener connection state | `loadReceiverHealth(... listenerConnected ...)` | local runtime signal | present |
| Heartbeat/outbox/diagnostic rows | `PremiumReceiverHealthUiState.rows` | receiver runtime state | present/partial |
| Open notification settings | `onOpenNotificationSettings` | Android system settings | present |
| Technical action tiles | not in pre-design inventory | no old contract found | current extra/too technical |

### Confirmation Mode

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Manual confirmation mode screen | task 693, `PremiumConfirmationModeScreen` | static V1 truth/settings | restored |
| Auto-confirm disabled | task 693 | V1 invariant | present |
| Strict/manual messaging | task 693 | UI only, no backend auto-confirm | present |

### Security

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| App lock toggle | `PremiumSecurityScreen` | `merchantSettingsStore.saveAppLock` | present |
| Android biometric/device credential prompt | `onRequestUnlock` | Android credential flow | present |
| Lock timeout choices | `saveAppLock(timeout)` | settings store | present |
| Google optional link | `accountAuthRepository.googleLink` | auth repo + local setting | present |
| Remote sessions/devices | not present pre-design as real repo | no repository | should show unavailable only |

### Language

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Language screen | task 691, `PremiumLanguageScreen` | `merchantSettingsStore.saveLanguage` | restored |
| FR/EN/RU options | `PremiumLanguageOption` | local settings | present |
| Login language switch | task 691 | local settings | present |

### Appearance / Theme

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Appearance screen | task 692, `PremiumAppearanceScreen` | `merchantSettingsStore.saveThemeMode` | restored |
| System/light/dark modes | `PremiumThemeMode` | local settings/theme tokens | present |

### Help Center

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Help center screen | task 688, `PremiumHelpCenterScreen` | local static merchant-safe help | restored |
| Search/help topics | help UI | local static content | present |

### Contact Support

| Feature | Source before design | Runtime/source | Current status |
|---|---|---|---|
| Support form | task 689, `PremiumContactSupportScreen` | UI form state | restored |
| Category/subject/message | support UI | local form state | present |
| Submit ticket | `activeRuntime.createSupportTicket` | backend support endpoint/repo | present |
| Safe technical context only | task 689 | redacted context | present |
