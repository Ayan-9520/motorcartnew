-- Community & social: groups, posts, engagement, follows, polls, moderation, notifications helpers

CREATE TABLE IF NOT EXISTS community_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  group_type TEXT NOT NULL DEFAULT 'open' CHECK (group_type IN ('city', 'vehicle_topic', 'dealer', 'influencer', 'open', 'trending')),
  rule_key TEXT,
  rule_value TEXT,
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  cover_url TEXT,
  member_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_groups_type ON community_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_community_groups_dealer ON community_groups(dealer_id);

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
  group_id UUID REFERENCES community_groups(id) ON DELETE SET NULL,
  post_kind TEXT NOT NULL DEFAULT 'discussion' CHECK (post_kind IN ('discussion', 'review', 'poll', 'embed')),
  embed_provider TEXT CHECK (embed_provider IS NULL OR embed_provider IN ('youtube', 'linkedin', 'reel')),
  embed_url TEXT,
  poll_options JSONB,
  poll_ends_at TIMESTAMPTZ,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  share_count INT NOT NULL DEFAULT 0,
  spam_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'hidden')),
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_group ON social_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_vehicle ON social_posts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_dealer ON social_posts(dealer_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_moderation ON social_posts(moderation_status, needs_review);

CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  hashtag TEXT NOT NULL,
  PRIMARY KEY (post_id, hashtag)
);

CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(hashtag);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spam_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS post_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_shares_post ON post_shares(post_id);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INT NOT NULL CHECK (option_index >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS community_post_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_moderation_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  ai_spam_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'action_taken')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_flags_status ON community_moderation_flags(status, created_at DESC);

-- Notify post author (SECURITY DEFINER; only when actor is not author)
CREATE OR REPLACE FUNCTION public.community_notify_post_like(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aid UUID;
BEGIN
  SELECT author_id INTO aid FROM social_posts WHERE id = p_post_id;
  IF aid IS NULL OR aid = auth.uid() THEN RETURN; END IF;
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (aid, 'New like on your post', 'Someone liked your community post.', 'community_like', '/community/post/' || p_post_id::TEXT);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_notify_post_comment(p_post_id UUID, p_preview TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  aid UUID;
BEGIN
  SELECT author_id INTO aid FROM social_posts WHERE id = p_post_id;
  IF aid IS NULL OR aid = auth.uid() THEN RETURN; END IF;
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (aid, 'New comment', LEFT(COALESCE(p_preview, ''), 120), 'community_comment', '/community/post/' || p_post_id::TEXT);
END;
$$;

CREATE OR REPLACE FUNCTION public.community_notify_new_follower(p_target UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_target IS NULL OR p_target = auth.uid() THEN RETURN; END IF;
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_target, 'New follower', 'Someone started following you on Motorcart.', 'community_follow', '/community');
END;
$$;

GRANT EXECUTE ON FUNCTION public.community_notify_post_like TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_notify_post_comment TO authenticated;
GRANT EXECUTE ON FUNCTION public.community_notify_new_follower TO authenticated;

ALTER TABLE community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_moderation_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_groups_read ON community_groups;
CREATE POLICY community_groups_read ON community_groups FOR SELECT USING (true);

DROP POLICY IF EXISTS community_groups_write ON community_groups;
CREATE POLICY community_groups_write ON community_groups FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS social_posts_read ON social_posts;
CREATE POLICY social_posts_read ON social_posts FOR SELECT USING (
  moderation_status = 'approved'
  OR author_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS social_posts_insert ON social_posts;
CREATE POLICY social_posts_insert ON social_posts FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS social_posts_update ON social_posts;
CREATE POLICY social_posts_update ON social_posts FOR UPDATE USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS social_posts_delete ON social_posts;
CREATE POLICY social_posts_delete ON social_posts FOR DELETE USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS post_hashtags_read ON post_hashtags;
CREATE POLICY post_hashtags_read ON post_hashtags FOR SELECT USING (true);

DROP POLICY IF EXISTS post_hashtags_write ON post_hashtags;
DROP POLICY IF EXISTS post_hashtags_insert ON post_hashtags;
CREATE POLICY post_hashtags_insert ON post_hashtags FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = post_id AND (p.author_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS post_hashtags_delete ON post_hashtags;
CREATE POLICY post_hashtags_delete ON post_hashtags FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = post_id AND (p.author_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS post_likes_read ON post_likes;
CREATE POLICY post_likes_read ON post_likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = post_likes.post_id
    AND (p.moderation_status = 'approved' OR p.author_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS post_likes_write ON post_likes;
CREATE POLICY post_likes_write ON post_likes FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS post_comments_read ON post_comments;
CREATE POLICY post_comments_read ON post_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = post_comments.post_id
    AND (p.moderation_status = 'approved' OR p.author_id = auth.uid() OR public.is_admin())
  )
  AND (NOT post_comments.hidden OR post_comments.author_id = auth.uid() OR public.is_admin())
);

DROP POLICY IF EXISTS post_comments_insert ON post_comments;
CREATE POLICY post_comments_insert ON post_comments FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS post_comments_update ON post_comments;
CREATE POLICY post_comments_update ON post_comments FOR UPDATE USING (author_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS post_shares_insert ON post_shares;
CREATE POLICY post_shares_insert ON post_shares FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS post_shares_read ON post_shares;
CREATE POLICY post_shares_read ON post_shares FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = post_shares.post_id
    AND (p.moderation_status = 'approved' OR p.author_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS poll_votes_read ON poll_votes;
CREATE POLICY poll_votes_read ON poll_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = poll_votes.post_id
    AND (p.moderation_status = 'approved' OR p.author_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS poll_votes_write ON poll_votes;
CREATE POLICY poll_votes_write ON poll_votes FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_follows_read ON user_follows;
CREATE POLICY user_follows_read ON user_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS user_follows_write ON user_follows;
CREATE POLICY user_follows_write ON user_follows FOR ALL USING (follower_id = auth.uid());

DROP POLICY IF EXISTS community_post_reviews_read ON community_post_reviews;
CREATE POLICY community_post_reviews_read ON community_post_reviews FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM social_posts p
    WHERE p.id = community_post_reviews.post_id
    AND (p.moderation_status = 'approved' OR p.author_id = auth.uid() OR public.is_admin())
  )
);

DROP POLICY IF EXISTS community_post_reviews_write ON community_post_reviews;
CREATE POLICY community_post_reviews_write ON community_post_reviews FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS mod_flags_read ON community_moderation_flags;
CREATE POLICY mod_flags_read ON community_moderation_flags FOR SELECT USING (public.is_admin() OR reporter_id = auth.uid());

DROP POLICY IF EXISTS mod_flags_insert ON community_moderation_flags;
CREATE POLICY mod_flags_insert ON community_moderation_flags FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS mod_flags_update ON community_moderation_flags;
CREATE POLICY mod_flags_update ON community_moderation_flags FOR UPDATE USING (public.is_admin());

INSERT INTO community_groups (slug, name, description, group_type, rule_key, rule_value)
VALUES
  ('bangalore-drivers', 'Bangalore drivers', 'City meetups, tips & drives', 'city', 'city', 'Bangalore'),
  ('ev-owners-india', 'EV owners India', 'Range, charging & policy', 'vehicle_topic', 'topic', 'ev'),
  ('performance-builds', 'Performance builds', 'Mods, tunes & track days', 'vehicle_topic', 'topic', 'performance'),
  ('motorcart-trending', 'Trending on Motorcart', 'Hot posts this week', 'trending', NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

