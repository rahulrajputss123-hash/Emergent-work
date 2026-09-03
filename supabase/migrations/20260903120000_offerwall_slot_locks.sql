-- Offerwall slot lock system
-- Adds two independent lock mechanisms to sdk_offerwall_providers:
--   1. time_lock_until     — slot is locked for ALL users until this UTC timestamp
--   2. min_lifetime_earned — slot is locked for users whose lifetime_earned < this amount (USD)
-- Both are optional (null = no lock of that type).
-- A slot is LOCKED for a user if EITHER condition is unmet.
-- Hard-disable still works via the existing `enabled` column (hides the card entirely).

ALTER TABLE public.sdk_offerwall_providers
  ADD COLUMN IF NOT EXISTS time_lock_until     timestamptz    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS min_lifetime_earned numeric(12,2)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS lock_label          text           NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lock_description    text           NOT NULL DEFAULT '';

COMMENT ON COLUMN public.sdk_offerwall_providers.time_lock_until IS
  'If set, the offerwall slot is locked for all users until this UTC timestamp.';
COMMENT ON COLUMN public.sdk_offerwall_providers.min_lifetime_earned IS
  'If set, the slot is locked for users whose lifetime_earned is below this USD amount.';
COMMENT ON COLUMN public.sdk_offerwall_providers.lock_label IS
  'Short label shown on the locked card, e.g. "Earn $5 to unlock".';
COMMENT ON COLUMN public.sdk_offerwall_providers.lock_description IS
  'Longer description shown in the locked card tooltip/modal.';
