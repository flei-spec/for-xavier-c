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
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "space_members_select" ON diary_entries
  FOR SELECT
  USING (
    (
      space_id IS NOT NULL
      AND space_id IN (
        SELECT space_id FROM space_members WHERE user_id = auth.uid()
      )
    )
    OR
    (
      space_id IS NULL
      AND user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  INSERT — you can only insert rows where user_id is yourself
--  (space_id is validated by the client, but user_id is enforced by the DB)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_insert" ON diary_entries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
--  UPDATE — only your own entries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_update" ON diary_entries
  FOR UPDATE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
--  DELETE — only your own entries
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_delete" ON diary_entries
  FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
--  Verify: list all policies on diary_entries
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'diary_entries'
ORDER BY cmd;
