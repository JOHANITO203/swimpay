# Bank Templates Real-World Variants Report

Status: completed.

Added concrete Russian-language variants as fixtures, not as universal bank truth.

SBP incoming fixture:
- pattern: `Пополнение через СБП на {amount} ₽. {sender_name_hint}. {sender_bank}. Баланс {balance} ₽`;
- extracted rail: `sbp`;
- extracted amount;
- extracted sender name and sender bank hints;
- balance is stored only as diagnostic parser output.

Card incoming fixture:
- pattern: `Зачисление {source_label} +{amount} ₽ — Баланс: {balance} ₽ Счёт карты {card_network} •• {receiver_card_last4}`;
- extracted rail: `card`;
- extracted amount;
- extracted receiver card last4;
- extracted card network;
- sender hints are not required.

Safety:
- neither variant confirms payment;
- both variants keep review-only/manual-confirmation semantics;
- balance is not proof;
- missing sender hints do not auto-reject card transfers.

Validation:
- parser tests cover SBP extraction and card extraction.
- fixture, drift and registry corpus tests passed after adding Ozon Bank assets.
