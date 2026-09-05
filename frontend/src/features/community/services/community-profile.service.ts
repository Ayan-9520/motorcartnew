import type { SocialProfile, SocialProfileUpdate } from "../types";
import {
  fetchCommunityProfileByUserId,
  fetchFollowersApi,
  fetchFollowingApi,
  fetchMyCommunityProfile,
  patchMyCommunityProfile,
} from "./community-api.service";

function slugifyHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24);
}

export function suggestCommunityHandle(fullName: string, userId: string): string {
  const base = slugifyHandle(fullName) || "member";
  return `${base}_${userId.slice(0, 6)}`;
}

export function mapApiProfile(r: Record<string, unknown>, extras?: Partial<SocialProfile>): SocialProfile {
  const userId = String(r.user_id ?? r.id ?? "");
  return {
    id: userId,
    fullName: String(r.display_name ?? r.full_name ?? "Member"),
    email: null,
    avatarUrl: r.avatar_url != null ? String(r.avatar_url) : null,
    coverUrl: r.cover_url != null ? String(r.cover_url) : null,
    bio: r.bio != null ? String(r.bio) : null,
    headline: r.headline != null ? String(r.headline) : null,
    handle: r.handle != null ? String(r.handle) : null,
    role: String(r.profile_type ?? r.persona ?? "CUSTOMER"),
    city: r.location_city != null ? String(r.location_city) : null,
    state: r.location_state != null ? String(r.location_state) : null,
    profileType: r.profile_type != null ? String(r.profile_type) : null,
    isVerified: Boolean(r.is_verified),
    postCount: Number(r.post_count ?? 0),
    followerCount: Number(r.follower_count ?? 0),
    followingCount: Number(r.following_count ?? 0),
    isFollowing: extras?.isFollowing ?? Boolean(r.is_following),
    isSelf: extras?.isSelf ?? Boolean(r.is_self),
  };
}

export async function fetchSocialProfile(
  profileUserId: string,
  viewerId?: string | null
): Promise<SocialProfile | null> {
  const api = await fetchCommunityProfileByUserId(profileUserId);
  if (!api?.data) return null;
  return mapApiProfile(api.data, {
    isSelf: viewerId === profileUserId || Boolean(api.data.is_self),
  });
}

export async function updateSocialProfile(_userId: string, patch: SocialProfileUpdate): Promise<SocialProfile | null> {
  const updated = await patchMyCommunityProfile({
    display_name: patch.fullName,
    bio: patch.bio,
    headline: patch.headline,
    avatar_url: patch.avatarUrl,
    cover_url: patch.coverUrl,
    location_city: patch.city,
    location_state: patch.state,
    profile_type: patch.profileType,
  });
  return mapApiProfile(updated.data, { isSelf: true });
}

export async function fetchMyProfile(): Promise<SocialProfile | null> {
  const api = await fetchMyCommunityProfile();
  if (!api?.data) return null;
  return mapApiProfile(api.data, { isSelf: true });
}

export async function fetchFollowingUserIds(userId: string): Promise<string[]> {
  const rows = (await fetchFollowingApi(userId))?.data ?? [];
  return rows.map((r) => String(r.user_id)).filter(Boolean);
}

export async function fetchFollowersList(userId: string, _limit = 30): Promise<SocialProfile[]> {
  const rows = (await fetchFollowersApi(userId))?.data ?? [];
  return rows.map((r) => mapApiProfile(r));
}

export async function fetchFollowingList(userId: string, _limit = 30): Promise<SocialProfile[]> {
  const rows = (await fetchFollowingApi(userId))?.data ?? [];
  return rows.map((r) => mapApiProfile(r));
}

export async function enrichAuthors<T extends { authorId: string; authorName?: string; authorAvatar?: string | null }>(
  items: T[]
): Promise<T[]> {
  return items;
}
