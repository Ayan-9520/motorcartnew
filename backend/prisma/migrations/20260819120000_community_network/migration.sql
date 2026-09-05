-- Batch 6 — Community & Professional Automotive Network (additive).
-- Extends SocialPost / CommunityUserProfile. Does not rewrite User/Dealer/Organization.

ALTER TABLE "community_user_profiles" ADD COLUMN "headline" VARCHAR(160);
ALTER TABLE "community_user_profiles" ADD COLUMN "location_state" VARCHAR(64);
ALTER TABLE "community_user_profiles" ADD COLUMN "profile_type" VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER';
ALTER TABLE "community_user_profiles" ADD COLUMN "dealer_id" TEXT;
ALTER TABLE "community_user_profiles" ADD COLUMN "organization_id" TEXT;

CREATE INDEX "community_user_profiles_location_city_idx" ON "community_user_profiles"("location_city");
CREATE INDEX "community_user_profiles_profile_type_idx" ON "community_user_profiles"("profile_type");
CREATE INDEX "community_user_profiles_dealer_id_idx" ON "community_user_profiles"("dealer_id");

ALTER TABLE "social_posts" ADD COLUMN "visibility" VARCHAR(16) NOT NULL DEFAULT 'public';
ALTER TABLE "social_posts" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "social_posts" ADD COLUMN "inventory_id" TEXT;

CREATE INDEX "social_posts_visibility_created_at_idx" ON "social_posts"("visibility", "created_at");
CREATE INDEX "social_posts_organization_id_idx" ON "social_posts"("organization_id");

DELETE FROM "post_shares" a USING "post_shares" b
 WHERE a.ctid < b.ctid AND a.post_id = b.post_id AND a.user_id = b.user_id;

CREATE UNIQUE INDEX "post_shares_post_id_user_id_key" ON "post_shares"("post_id", "user_id");

CREATE TABLE "community_saves" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_saves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "community_saves_post_id_user_id_key" ON "community_saves"("post_id", "user_id");
CREATE INDEX "community_saves_user_id_idx" ON "community_saves"("user_id");
CREATE INDEX "community_saves_post_id_idx" ON "community_saves"("post_id");

ALTER TABLE "community_saves" ADD CONSTRAINT "community_saves_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "community_saves" ADD CONSTRAINT "community_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "community_reports" (
    "id" TEXT NOT NULL,
    "reporter_user_id" TEXT NOT NULL,
    "target_type" VARCHAR(16) NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "community_reports_reporter_user_id_idx" ON "community_reports"("reporter_user_id");
CREATE INDEX "community_reports_target_type_target_id_idx" ON "community_reports"("target_type", "target_id");
CREATE INDEX "community_reports_status_idx" ON "community_reports"("status");

ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
