# Google OAuth Staging Report

generated_at: 2026-05-08T00:00:00+03:00

## Status

Blocked by missing staging OAuth credentials and unreachable staging domain.

## Required Values

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI=https://staging.swimpay.pro/auth/google/callback`

## Not Executed

- `GET /auth/google/start`
- Google hosted login
- callback token exchange
- `/v1/me`
- cookie flag verification
- active merchant context verification

## Blocker

Configure Google OAuth authorized origin and redirect for `https://staging.swimpay.pro`, then rerun this task through a browser against the real staging host.
