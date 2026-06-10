-- 032 — Trigger d'auto-confirmation global par marchand.
-- Défaut 'manual' = sûr : aucune auto-confirmation tant que le marchand n'a pas opté.
-- Additif et idempotent.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS auto_confirm_mode TEXT NOT NULL DEFAULT 'manual'
  CHECK (auto_confirm_mode IN ('manual', 'auto'));
