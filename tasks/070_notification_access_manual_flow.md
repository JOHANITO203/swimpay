# 070 - Notification Access Manual Flow

## Goal

Document and statically verify the Notification Access flow.

## Scope

- Verify manifest contains `NotificationListenerService`.
- Verify SMS permissions are absent.
- Verify accessibility scraping service is absent.
- Document expected user-visible wording and manual settings path.

## Acceptance Criteria

- Notification Access flow is documented.
- Static tests cover no-SMS/no-scraping and listener declaration.

## Forbidden Work

- Do not add SMS permissions.
- Do not add accessibility scraping behavior.
- Do not claim official bank confirmation.
