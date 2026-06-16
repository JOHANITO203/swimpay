-- 033 — Cœur de règlement programmable : ledger en partie double + ordres + réconciliation.
-- Durabilité du nouveau modèle (ordre de paiement programmable). Additif et idempotent ;
-- aucune table existante n'est touchée. Le runtime receive-only historique est intact.

-- Comptes : un solde n'est jamais stocké ici — il est dérivé = somme des écritures.
CREATE TABLE IF NOT EXISTS settlement_accounts (
  id          TEXT PRIMARY KEY,
  owner       TEXT NOT NULL,
  currency    TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('payer','escrow','beneficiary','fee','fx_bridge','ramp_in','ramp_out')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions : un groupe d'écritures qui s'équilibre à zéro par devise.
-- idempotency_key UNIQUE → rejouer la même transition ne double jamais.
CREATE TABLE IF NOT EXISTS settlement_transactions (
  id               TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL,
  transition       TEXT NOT NULL,
  idempotency_key  TEXT NOT NULL UNIQUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_transactions_order ON settlement_transactions (order_id);

-- Écritures : append-only. amount_minor signé (+ crédit / − débit).
CREATE TABLE IF NOT EXISTS settlement_entries (
  id           TEXT PRIMARY KEY,
  txn_id       TEXT NOT NULL REFERENCES settlement_transactions (id),
  account_id   TEXT NOT NULL REFERENCES settlement_accounts (id),
  amount_minor BIGINT NOT NULL,
  currency     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_entries_account ON settlement_entries (account_id);
CREATE INDEX IF NOT EXISTS idx_settlement_entries_txn ON settlement_entries (txn_id);

-- Ordres : état durable de la machine à états (reprise après crash / HELD).
CREATE TABLE IF NOT EXISTS settlement_orders (
  id              TEXT PRIMARY KEY,
  merchant_id     TEXT NOT NULL,
  state           TEXT NOT NULL,
  payer_id        TEXT NOT NULL,
  payer_type      TEXT NOT NULL CHECK (payer_type IN ('human','agent_ai','peer')),
  amount_in_minor BIGINT NOT NULL,
  currency_in     TEXT NOT NULL,
  currency_out    TEXT NOT NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('direct','bridge')),
  beneficiaries   JSONB NOT NULL,
  rules           JSONB NOT NULL DEFAULT '{}'::jsonb,
  quote           JSONB,
  version         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_orders_merchant ON settlement_orders (merchant_id);

-- Réconciliation : jambes attendues + statut (confirmé seulement sur preuve autoritaire).
CREATE TABLE IF NOT EXISTS settlement_recon_legs (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('on_chain','fiat')),
  amount_minor BIGINT NOT NULL,
  currency     TEXT NOT NULL,
  destination  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('expected','confirmed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_recon_legs_order ON settlement_recon_legs (order_id);

-- Preuves : référence UNIQUE (tx hash / id callback) → idempotence de la confirmation.
CREATE TABLE IF NOT EXISTS settlement_proofs (
  reference   TEXT PRIMARY KEY,
  leg_id      TEXT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('chain','ramp','notification')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
