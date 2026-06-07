-- 031 — Notification channel learning. Device captures channelId; a signal from a
-- confirmed (bank_profile_id, channel_id) pair is flagged channel_recognized at
-- ingestion (forward hook for confidence weighting), and unknown channels are
-- recorded pending (sample_count accrues) for operator review. Never blocks
-- ingestion and never auto-confirms.
ALTER TABLE notification_signals ADD COLUMN IF NOT EXISTS channel_id TEXT;

CREATE TABLE IF NOT EXISTS bank_notification_channels (
  bank_profile_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  sample_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (bank_profile_id, channel_id)
);

-- Seed the RU channel IDs surfaced by the harvest (confirmed).
INSERT INTO bank_notification_channels (bank_profile_id, channel_id, status, confirmed_at) VALUES
  ('alfa_ru', 'notifications_channel', 'confirmed', now()),
  ('vtb_ru', 'communicationChannel1', 'confirmed', now()),
  ('vtb_ru', 'communicationChannel2', 'confirmed', now()),
  ('vtb_ru', 'communicationChannel3', 'confirmed', now()),
  ('gazprombank_ru', 'default_push_channel', 'confirmed', now())
ON CONFLICT (bank_profile_id, channel_id) DO NOTHING;
