-- 035 — Certify EVERY receiver-supported bank for checkout so a merchant's configured route
-- always surfaces to buyers: RU (sbp/card), WA mobile money, and international wallets.
--
-- WHY: the checkout certification gate (listReceiverBanksForCheckout /
-- listReceivingRoutesForCheckoutBank / isReceivingRouteCertifiedForCheckout) requires an
-- EXISTS row in bank_route_certifications. Earlier seeds (016/018/021) only covered RU banks,
-- so mobile_money + wallet routes were SILENTLY excluded at checkout — never intended. Paired
-- with the code fix that maps rail_type -> buyer method via buyerMethodTypeForRail (4 rails,
-- not the old phone->sbp/else->card 2-way), a configured route now always shows.
--
-- rail_supported uses the buyer-method domain (sbp/card/mobile_money/wallet) to match the
-- existing RU rows and buyerMethodTypeForRail. Package-less WA rails (wave/orange) are
-- account-addressed (no app package) so package_name carries the bank_id as a unique-key
-- filler — the gate matches on bank_id + runtime_status + rail_supported, never package_name.
-- runtime_status 'observed' mirrors the operator-attested precedent (021). Idempotent.
INSERT INTO bank_route_certifications (bank_id, package_name, rail_supported, runtime_status)
VALUES
  ('sber_ru',         'ru.sberbankmobile',                     ARRAY['sbp','card'],   'observed'),
  ('tbank_ru',        'com.idamob.tinkoff.android',            ARRAY['sbp','card'],   'observed'),
  ('vtb_ru',          'ru.vtb24.mobilebanking.android',        ARRAY['sbp','card'],   'observed'),
  ('alfa_ru',         'ru.alfabank.mobile.android',            ARRAY['sbp','card'],   'observed'),
  ('gazprombank_ru',  'ru.gazprombank.android.mobilebank.app', ARRAY['sbp','card'],   'observed'),
  ('ozon_bank',       'ru.ozon.fintech.finance',               ARRAY['sbp','card'],   'observed'),
  ('mtn_momo_ci',     'mtnft.momo.consumer',                   ARRAY['mobile_money'], 'observed'),
  ('wave_ci',         'wave_ci',                               ARRAY['mobile_money'], 'observed'),
  ('orange_money_ci', 'orange_money_ci',                       ARRAY['mobile_money'], 'observed'),
  ('wise_int',        'com.transferwise.android',              ARRAY['wallet'],       'observed'),
  ('revolut_int',     'com.revolut.revolut',                   ARRAY['wallet'],       'observed'),
  ('payoneer_int',    'com.payoneer.android',                  ARRAY['wallet'],       'observed')
ON CONFLICT (bank_id, package_name) DO UPDATE SET
  rail_supported = EXCLUDED.rail_supported,
  runtime_status = EXCLUDED.runtime_status,
  updated_at = now();
