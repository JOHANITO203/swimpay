-- 034 — Trust anchor: mark the operator-vetted signing certs (030) as 'verified' in
-- bank_app_signatures, the table the signal-worker actually JOINs to derive
-- bankAppVerificationStatus → bankAppTrusted → 'trusted_cert' (the auto-confirm floor).
--
-- WHY THIS EXISTS: 030 seeded the EXPECTED cert into bank_profiles.package_cert_sha256
-- only; bank_app_signatures stayed empty, so trusted_cert was unreachable and auto-confirm
-- could never fire. This migration is the operator (LO) approving their own vetted certs.
--
-- This DELIBERATELY lifts the pending->operator-approve gate noted in 030 for these known
-- profiles. It is SAFE because the model fails CLOSED: the signal carries the REAL signing
-- cert read on-device (PackageSigningCertResolver); the JOIN matches only when that real
-- cert equals the seeded expected one. A wrong/stale seed simply never matches a real
-- device — it yields no trust, never false trust.
--
-- Certs are REUSED from bank_profiles (030) — never re-hardcoded here. Package names are the
-- canonical notification packages from BankTargetLock (the Android source of truth). Only
-- profiles that actually carry a notification package are seeded (package-less WA wallets
-- like wave_ci/orange_money_ci produce no signal, so they need no cert anchor).
-- Idempotent: re-running flips any matching row to 'verified'.
INSERT INTO bank_app_signatures (bank_profile_id, package_name, cert_sha256, status, last_seen_at)
SELECT pkg.profile_id, pkg.package_name, bp.package_cert_sha256, 'verified', now()
  FROM (VALUES
    ('sber_ru',        'ru.sberbankmobile'),
    ('tbank_ru',       'com.idamob.tinkoff.android'),
    ('vtb_ru',         'ru.vtb24.mobilebanking.android'),
    ('alfa_ru',        'ru.alfabank.mobile.android'),
    ('gazprombank_ru', 'ru.gazprombank.android.mobilebank.app'),
    ('ozon_bank',      'ru.ozon.fintech.finance'),
    ('mtn_momo_ci',    'mtnft.momo.consumer'),
    ('wise_int',       'com.transferwise.android'),
    ('revolut_int',    'com.revolut.revolut'),
    ('payoneer_int',   'com.payoneer.android')
  ) AS pkg(profile_id, package_name)
  JOIN bank_profiles bp ON bp.id = pkg.profile_id
 WHERE bp.package_cert_sha256 IS NOT NULL
   AND length(bp.package_cert_sha256) = 64
ON CONFLICT (package_name, cert_sha256)
  DO UPDATE SET status = 'verified', last_seen_at = now();
