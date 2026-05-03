# Task 340 - Checkout Receiver Bank Selection Model

## Goal

Define the checkout receiver bank selection model for merchant-side receiving banks.

Receiver banks represent where the merchant can receive a manual transfer and where SwimPay can search for merchant-side notification signals. Receiver bank selection must not imply official bank confirmation or automatic confirmation.

## Requirements

- Add a typed receiver bank option model with:
  - `receiver_bank_id`
  - `bank_profile_id`
  - `display_name`
  - `status`
  - `review_only`
  - `detection_supported`
  - `merchant_receiver_account_id` when available
  - `beta_ready`
  - `disabled_reason`
- Include the V1 receiver banks:
  - `sber_ru` / Sberbank
  - `tbank_ru` / Tinkoff / T-Bank
  - `vtb_ru` / VTB
  - `alfa_ru` / Alfa-Bank
  - `gazprombank_ru` / Gazprombank
- Mark real-bank receiver paths as review-only for Sprint 7A.
- Do not enable auto-confirmation.
- Do not expose production trust internals in buyer-facing API responses.
- Add unit tests for model shape, five-bank coverage and review-only behavior.

## Safety Notes

- Receiver bank means merchant-side receiving bank.
- Review-only banks must route to review/controlled release policy.
- No wording or status may claim official bank confirmation.
