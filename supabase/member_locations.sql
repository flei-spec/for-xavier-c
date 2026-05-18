-- ─────────────────────────────────────────────────────────────────────────────
--  StayWithXavier — member_locations
--
--  Stores each user's last known location (city + coordinates) per space.
--  Space members can read each other's locations; users can only write their own.
--
--  Run once in:
--    Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
--  Depends on: public.is_space_member(uuid) — already present in the DB.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table
CREATE TABLE IF NOT EXISTS public.member_locations (
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id   uuid        NOT NULL,
  city       text        DEFAULT NULL,
  latitude   float8      NOT NULL,
  longitude  float8      NOT NULL,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, space_id)
);

-- 2. Enable RLS
ALTER TABLE public.member_locations ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
--  Drop existing policies before recreating.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "space_select"  ON public.member_locations;
DROP POLICY IF EXISTS "own_insert"    ON public.member_locations;
DROP POLICY IF EXISTS "own_update"    ON public.member_locations;

-- ─────────────────────────────────────────────────────────────────────────────
--  SELECT — any member of the space can read all locations for that space.
--  This lets both partners see each other's city + distance.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "space_select" ON public.member_locations
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_space_member(space_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  INSERT — users can only insert their own location into their own space.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_insert" ON public.member_locations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_space_member(space_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  UPDATE — users can only update their own row.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_update" ON public.member_locations
  FOR UPDATE
  USING  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
--  GRANTs
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.member_locations TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
--  Verify
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'member_locations'
ORDER BY cmd;
