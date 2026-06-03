-- Full social layer: profiles, community media bucket, enriched indexes

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS community_bio TEXT,
  ADD COLUMN IF NOT EXISTS community_handle TEXT,
  ADD COLUMN IF NOT EXISTS community_cover_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_community_handle
  ON public.users (LOWER(community_handle))
  WHERE community_handle IS NOT NULL AND TRIM(community_handle) <> '';

CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);

-- Post media storage (public read, auth upload to own folder)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-media',
  'community-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS community_media_public ON storage.objects;
CREATE POLICY community_media_public ON storage.objects
  FOR SELECT USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS community_media_auth_insert ON storage.objects;
CREATE POLICY community_media_auth_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'community-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS community_media_auth_update ON storage.objects;
CREATE POLICY community_media_auth_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'community-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS community_media_auth_delete ON storage.objects;
CREATE POLICY community_media_auth_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'community-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
