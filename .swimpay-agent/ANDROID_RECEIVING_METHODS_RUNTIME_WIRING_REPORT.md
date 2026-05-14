# Android Receiving Methods Runtime Wiring Report

generated_at: 2026-05-14T00:00:00+03:00

## Scope

Screen: Receiving Methods / Methodes de reception.

## Result

- Status: wired_to_existing_runtime.
- Repository reused: `MerchantReceivingMethodsApiRepository`.
- Endpoint reused: `GET /v1/merchant/receiving-methods`.

## Changes

- Removed `debug`/`staging` forced receiving-methods preview fixture.
- Runtime rows now use the supplied backend/local repository state.
- Empty state remains honest: no fake cards or phone routes are displayed when the repository returns no items.

## States

- Loading: existing state panel.
- Empty: existing empty receiving-methods card.
- Error/offline: existing state panel.
- Content: repository route list.

## Fake Runtime Data Removed

- Static Sberbank/T-Bank/VTB/Alfa/Gazprombank route fixtures no longer replace staging runtime.

