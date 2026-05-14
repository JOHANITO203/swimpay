# Android Merchant Future Updates

This file tracks accepted future work for Android Merchant that must not be
hidden behind fake runtime data.

## Runtime Wiring Follow-Ups

### Multi-Site Integrations List

- Current status: Android currently models integrations mostly as one connected
  site/detail surface.
- Future update: add a real multi-site integrations list model when the backend
  contract/repository exists.
- Runtime rule: do not show `merchant.example` or fake sites in normal runtime.
- Acceptable current behavior: show the existing connected-site/detail state or
  an honest empty/configuration state.

### Security Sessions And Remote Devices

- Current status: Android has local app-lock and Google linking state, but no
  real repository for remote sessions/devices.
- Future update: add a real device/session repository and endpoint before
  displaying active devices, IP addresses, locations or session history.
- Runtime rule: do not invent active sessions, fake devices or fake IP metadata.
- Acceptable current behavior: show an honest unavailable state.

