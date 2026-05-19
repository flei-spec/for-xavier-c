-- ─────────────────────────────────────────────────────────────────────────────
--  StayWithXavier — profile seen-flags columns
--
--  Adds two nullable columns to profiles so weekly recap and monthly letter
--  seen-states are synced across devices (not only stored in localStorage).
--
--  Safe to run multiple times: ADD COLUMN IF NOT EXISTS is idempotent.
--
--  Run in:  Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_recap_week    text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_letter_month text DEFAULT NULL;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('weekly_recap_week', 'monthly_letter_month');
