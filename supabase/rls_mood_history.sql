-- ─────────────────────────────────────────────────────────────────────────────
--  StayWithXavier — Row Level Security for mood_history
--
--  Run this entire file in:
--    Supabase Dashboard → SQL Editor → New Query → Paste → Run
--
--  Safe to run multiple times: all DROP IF EXISTS before CREATE.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.mood_history (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  space_id         uuid        DEFAULT NULL,
  source           text        NOT NULL CHECK (source IN ('mood_card', 'custom_input', 'ai_match')),
  original_input   text        DEFAULT NULL,
  matched_mood     text        NOT NULL,
  emotional_line   text        DEFAULT NULL,
  current_track_id text        DEFAULT NULL,
  current_track_title text     DEFAULT NULL,
  created_at       timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.mood_history ENABLE ROW LEVEL SECURITY;

-- 3. Index for fast latest-mood lookup
CREATE INDEX IF NOT EXISTS idx_mood_history_user_created
  ON public.mood_history (user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
--  Drop existing policies so we can recreate them cleanly.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "own_select"  ON public.mood_history;
DROP POLICY IF EXISTS "own_insert"  ON public.mood_history;
DROP POLICY IF EXISTS "own_delete"  ON public.mood_history;

-- ─────────────────────────────────────────────────────────────────────────────
--  SELECT — can read:
--    • Your own personal entries (space_id IS NULL, user_id = you)
--    • Any entry whose space_id is a space you belong to
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_select" ON public.mood_history
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND
    (
      (
        space_id IS NULL
        AND user_id = auth.uid()
      )
      OR
      (
        space_id IS NOT NULL
        AND public.is_space_member(space_id)
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  INSERT — can write:
--    • Personal entries only for yourself when space_id IS NULL
--    • Space entries only for yourself AND only into spaces you belong to
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_insert" ON public.mood_history
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
--  DELETE — only your own entries.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "own_delete" ON public.mood_history
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  GRANTs
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, DELETE ON public.mood_history TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
--  Verify
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'mood_history'
ORDER BY cmd;
