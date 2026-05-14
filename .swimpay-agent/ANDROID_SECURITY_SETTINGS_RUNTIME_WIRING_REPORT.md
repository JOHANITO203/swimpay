# Android Security Settings Runtime Wiring Report

generated_at: 2026-05-14T00:00:00+03:00

## Scope

Screen: Security Settings / Securite & parametres.

## Result

- Status: partially_wired_with_honest_fallbacks.
- Sources reused:
  - local app-lock state;
  - local Google/recovery link state already passed to the screen.

## Changes

- Removed fake active-device count.
- Removed fake Android Pixel / Windows Chrome devices.
- Removed fake Moscow/IP session metadata.
- Replaced fake multi-session action with an honest unavailable state.

## States

- App lock remains wired to local state.
- Multi-device/session repository is not present in the current Android runtime.

## Remaining Gap

- A real device/session repository or endpoint is needed before displaying remote sessions. See `ANDROID_RUNTIME_CONTRACT_GAPS.md`.

