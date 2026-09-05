export const COMMUNITY_PII_KEYS = [
  "phone",
  "email",
  "contact_email",
  "gst",
  "gst_number",
  "pan",
  "pan_number",
  "password",
  "password_hash",
  "passwordHash",
] as const;

export const COMMUNITY_PROFILE_TYPES = [
  "CUSTOMER",
  "DEALER",
  "SALES_PROFESSIONAL",
  "WORKSHOP",
  "SERVICE_PROFESSIONAL",
  "PARTS_PROFESSIONAL",
  "FINANCE_PROFESSIONAL",
  "INSURANCE_PROFESSIONAL",
  "CREATOR",
  "AUTOMOTIVE_EXPERT",
  "BUSINESS",
] as const;

export type CommunityProfileType = (typeof COMMUNITY_PROFILE_TYPES)[number];

export const COMMUNITY_VISIBILITIES = ["public", "followers", "private"] as const;
export type CommunityVisibility = (typeof COMMUNITY_VISIBILITIES)[number];

export const COMMUNITY_REPORT_STATUSES = ["OPEN", "REVIEWED", "DISMISSED", "ACTIONED"] as const;
export const COMMUNITY_REPORT_TARGETS = ["post", "comment", "profile"] as const;

export const COMMUNITY_NEVER_ALLOW_TABLES = [
  "social_posts",
  "community_posts",
  "community_user_profiles",
  "community_business_profiles",
  "community_follows",
  "community_saves",
  "community_reports",
  "community_groups",
  "community_group_members",
  "community_role_assignments",
  "community_moderation_flags",
  "post_likes",
  "post_comments",
  "post_shares",
  "post_hashtags",
  "poll_votes",
  "user_follows",
] as const;

export const FORBIDDEN_POST_METADATA_KEYS = [
  "quotation_id",
  "quotationId",
  "test_drive_id",
  "testDriveId",
  "test_drive_booking_id",
  "customer_phone",
  "customerPhone",
  "email",
  "phone",
  "gst",
  "pan",
  "password",
];
