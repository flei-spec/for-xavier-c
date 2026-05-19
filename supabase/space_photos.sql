-- ─────────────────────────────────────────────────────────────────────────────
--  StayWithXavier — space_photos
--
--  Stores photo memories for a couple space.
--  Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Table
CREATE TABLE IF NOT EXISTS public.space_photos (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id     uuid        NOT NULL,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  photo_url    text        NOT NULL,
  caption      text        DEFAULT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.space_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "space_select" ON public.space_photos;
DROP POLICY IF EXISTS "own_insert"   ON public.space_photos;
DROP POLICY IF EXISTS "own_delete"   ON public.space_photos;

-- Space members can view all photos in their space
CREATE POLICY "space_select" ON public.space_photos
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND public.is_space_member(space_id));

-- Users can only upload into spaces they belong to
CREATE POLICY "own_insert" ON public.space_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND public.is_space_member(space_id)
  );

-- Users can only delete their own photos
CREATE POLICY "own_delete" ON public.space_photos
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.space_photos TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
--  2. Storage bucket  (public — URLs are UUID-based and unguessable)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-photos', 'space-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "space_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "space_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "space_photos_delete" ON storage.objects;

CREATE POLICY "space_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'space-photos');

CREATE POLICY "space_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'space-photos'
    AND auth.uid() IS NOT NULL
  );

-- Delete allowed only by the uploader (userId is the 2nd folder segment)
CREATE POLICY "space_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'space-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ─────────────────────────────────────────────────────────────────────────────
--  Verify
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'space_photos' ORDER BY cmd;
