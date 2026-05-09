# Ozon Bank Manager Integration Report

Status: completed with device validation pending.

Ozon Bank is now represented through the bank manager/profile registry instead of being added as parser-only text.

Implemented:
- `bank_profile_id=ozon_bank`;
- display name: `Ozon Банк`;
- registry profile YAML;
- review-only fixture corpus and YAML template assets;
- API/database seed migration for `bank_profiles`;
- registry tests.

Runtime status:
- package name is unknown and set to `TO_VERIFY`;
- package source is `package_unknown_needs_device_validation`;
- profile remains `review_only`;
- runtime capture is not enabled for Ozon Bank.

Safety:
- no broad package enumeration;
- no `QUERY_ALL_PACKAGES`;
- no auto-confirmation;
- no official bank confirmation claim.

Blocker before Ozon runtime capture:
- exact Android package name and certificate metadata must be validated on a consenting device through the explicit package evidence flow.
