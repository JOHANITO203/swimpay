# Task 427 - Android Bank Target Lock probe for onboarding

Status: completed

Use only exact supported V1 bank package probes for onboarding:
- `ru.sberbankmobile`
- `com.idamob.tinkoff.android`
- `ru.vtb24.mobilebanking.android`
- `ru.alfabank.mobile.android`
- `ru.gazprombank.android.mobilebank.app`

Forbidden:
- `QUERY_ALL_PACKAGES`
- broad installed app enumeration
- SMS
- Accessibility scraping
- real notification processing
