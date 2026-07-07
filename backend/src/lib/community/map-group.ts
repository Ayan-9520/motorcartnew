import type { CommunityGroup, CommunityGroupMember } from "@prisma/client";

export function parseGroupMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

export function mapCommunityGroup(
  g: CommunityGroup,
  extras?: {
    is_member?: boolean;
    viewer_role?: string | null;
    rules?: string | null;
  }
) {
  const meta = parseGroupMetadata(g.metadata);
  const visibility =
    meta.visibility === "private" ? "private" : ("public" as const);

  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    description: g.description,
    group_type: g.groupType,
    rule_key: g.ruleKey,
    rule_value: g.ruleValue,
    dealer_id: g.dealerId,
    cover_url: g.coverUrl,
    member_count: g.memberCount,
    visibility,
    rules: extras?.rules ?? (meta.rules != null ? String(meta.rules) : null),
    join_policy: meta.join_policy != null ? String(meta.join_policy) : "open",
    created_at: g.createdAt.toISOString(),
    updated_at: g.updatedAt.toISOString(),
    is_member: extras?.is_member,
    viewer_role: extras?.viewer_role ?? null,
  };
}

export function mapGroupMember(
  m: CommunityGroupMember & {
    user: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      communityProfile: {
        handle: string;
        displayName: string;
        avatarUrl: string | null;
      } | null;
    };
  }
) {
  const p = m.user.communityProfile;
  return {
    user_id: m.userId,
    role: m.role,
    joined_at: m.joinedAt.toISOString(),
    display_name: p?.displayName ?? m.user.fullName,
    handle: p?.handle ?? null,
    avatar_url: p?.avatarUrl ?? m.user.avatarUrl,
  };
}
