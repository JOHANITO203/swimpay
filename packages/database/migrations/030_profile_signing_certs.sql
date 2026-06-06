-- 030 — Seed harvested signing certs (V3 signer) for every receiving profile.
-- Source: operator-provided APKs, harvested 2026-06-06 (docs/APK_INTELLIGENCE.md).
-- These are the EXPECTED cert only; the bank_app_signatures pending->operator-approve
-- gate is unchanged (a sideloaded APK cert is never auto-trusted for production).
-- Idempotent: re-running sets the same value.
UPDATE bank_profiles SET package_cert_sha256 = '58bfa7d6fa3aa0d4e8de8a3e6ca8d5a33b376fc48b2176d37bbe58ea8cbc7a23', updated_at = now() WHERE id = 'alfa_ru';
UPDATE bank_profiles SET package_cert_sha256 = '38cbbeee52c94777f7ffd27ebb392009a00d574fa15895abf3bcd83e7f78cb69', updated_at = now() WHERE id = 'vtb_ru';
UPDATE bank_profiles SET package_cert_sha256 = '6178e775f87853fb4fd655695dc4cca50fe70577a527715789968f93741df89c', updated_at = now() WHERE id = 'gazprombank_ru';
UPDATE bank_profiles SET package_cert_sha256 = '5df281c2e6e94a80d769679a32c0318df6855c90f511785676ebfe892b40d9d8', updated_at = now() WHERE id = 'tbank_ru';
UPDATE bank_profiles SET package_cert_sha256 = 'fea43ebfc12201c7d860b1de28a0f8a330ecc4c30863dae7ce6cf4c98b99a2ea', updated_at = now() WHERE id = 'sber_ru';
UPDATE bank_profiles SET package_cert_sha256 = 'c8fe81752c60f867f7801e4059a9989c660351d459323f22d9bc949182fd6d61', updated_at = now() WHERE id = 'ozon_bank';
UPDATE bank_profiles SET package_cert_sha256 = 'd85ddd0752685c4205b6bedf035f62f8cc93025a44d1af982cfd6da85fd3ce26', updated_at = now() WHERE id = 'wave_ci';
UPDATE bank_profiles SET package_cert_sha256 = 'b67affcda89e3193b1595036d7c6cdbe22be5ca24c9f6cf93fc6b48f91d7310d', updated_at = now() WHERE id = 'orange_money_ci';
UPDATE bank_profiles SET package_cert_sha256 = '1835f1e22f5e24b014e0d7fe2506cf985e11cdf7500d2329be3308b6e964134c', updated_at = now() WHERE id = 'mtn_momo_ci';
UPDATE bank_profiles SET package_cert_sha256 = '149c4ea5825a81065589d27a60ea7e554df4b49e3c660cb65ba730025080dbd0', updated_at = now() WHERE id = 'wise_int';
UPDATE bank_profiles SET package_cert_sha256 = '9c9be07135e972780282c2e5d27da06ecb8ee3adfc75303917ddf66d6faaefa4', updated_at = now() WHERE id = 'revolut_int';
UPDATE bank_profiles SET package_cert_sha256 = '8d607e96c1e38c9f5150cedf27401e5fd636a8340845b2c04204c158892be58f', updated_at = now() WHERE id = 'payoneer_int';
