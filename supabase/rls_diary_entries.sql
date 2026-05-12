-- ─────────────────────────────────────────────────────────────────────────────
--  StayWithXavier — Row Level Security for diary_entries
--
--  Run this entire file in:
--    Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
--  Safe to run multiple times: all DROP IF EXISTS before CREATE.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable RLS (idempotent — no-op if already enabled)
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
--  Helper: membership check used by policies below.
--
--  SECURITY DEFINER avoids depending on whatever SELECT policy exists on
--  space_members. The function only returns a boolean for auth.uid().
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_space_member(p_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members sm
    WHERE sm.space_id = p_space_id
      AND sm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_space_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
--  Drop existing policies so we can recreate them cleanly.
--  Change the names here if yours are named differently.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "space_members_select"   ON diary_entries;
DROP POLICY IF EXISTS "own_insert"             ON diary_entries;
DROP POLICY IF EXISTS "own_update"             ON diary_entries;
DROP POLICY IF EXISTS "own_delete"             ON diary_entries;

-- ─────────────────────────────────────────────────────────────────────────────
--  SELECT — can read:
--    • Any entry whose space_id is a space you belong to
--    • Or your own personal entries (space_id IS NULL, user_id = you)
--
--  Important: space access is validated by membership, not by trusting the
--  frontend-supplied current space.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "space_members_select" ON diary_entries
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND
    (
      (
        space_id IS NOT NULL
        AND public.is_space_member(space_id)
      )
      OR
      (
        space_id IS NULL
        AND user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  INSERT — can write:
--    • Personal entries only for yourself when space_id IS NULL
--    • Space entries only for yourself AND only into spaces you belong to
--
--  This closes the old gap where a malicious client could submit an arbitrary
--  space_id while setting user_id = auth.uid().
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_insert" ON diary_entries
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND
    (
      space_id IS NULL
      OR public.is_space_member(space_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  UPDATE — only your own entries, and rows cannot be moved into a space you
--  do not belong to.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_update" ON diary_entries
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND
    (
      space_id IS NULL
      OR public.is_space_member(space_id)
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND
    (
      space_id IS NULL
      OR public.is_space_member(space_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  DELETE — only your own entries, scoped to personal rows or spaces you belong to.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_delete" ON diary_entries
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND
    (
      space_id IS NULL
      OR public.is_space_member(space_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  Verify: list all policies on diary_entries and confirm membership storage.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'diary_entries'
ORDER BY cmd;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'space_members'
  AND column_name IN ('user_id', 'space_id')
ORDER BY column_name;
