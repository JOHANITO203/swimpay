# Android Receiver Health Runtime Wiring Report

generated_at: 2026-05-14T00:00:00+03:00

## Scope

Screen: Receiver Health / Sante recepteur.

## Result

- Status: wired_to_existing_runtime.
- Source reused:
  - local notification-access state;
  - local receiver runtime state;
  - backend heartbeat/receiver state already mapped in `PremiumMerchantRuntime`.

## Changes

- Removed `debug`/`staging` forced receiver-health preview fixture.
- Runtime no longer shows fake `Sain` / heartbeat / `187 ms` values unless supplied by the actual state.

## States

- Loading, offline/error and content states are rendered from `PremiumScreenState`.

## Fake Runtime Data Removed

- Static healthy receiver fixture no longer replaces staging runtime.

