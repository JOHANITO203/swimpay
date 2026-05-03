# Task 345 - Bank Launcher Open App Fallback

## Goal

Implement a safe launcher strategy model for buyer-side bank app opening.

## Requirements

- Provide `launch_url` only when known and explicitly supported.
- Provide `android_package_hint` only when known from existing evidence.
- Provide fallback copy details and manual transfer instructions.
- Do not require installed-app detection from web checkout.
- Unknown or unverified launchers must fall back to manual copy instructions.
- Add tests proving unknown launcher fallback behavior.

## Safety Notes

- Do not invent or guarantee real bank deep links.
- Do not inspect installed apps from web checkout.
- Opening a payer bank app does not prove payment.
