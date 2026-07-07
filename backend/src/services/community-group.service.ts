import type { CommunityGroup, CommunityMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseGroupMetadata } from "@/lib/community/map-group";
import { getOrCreateUserProfile } from "@/services/community-profile.service";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const CATEGORY_TYPES: Record<string, string[]> = {
  open: ["open", "trending"],
  dealer: ["dealer"],
  broker: ["broker"],
  dsa: ["dsa"],
  insurance: ["insurance"],
  ev: ["vehicle_topic"],
  parts: ["parts"],
  workshop: ["workshop"],
};

const ROLE_RANK: Record<string, number> = {
  member: 0,
  moderator: 1,
  group_moderator: 1,
  admin: 2,
  group_owner: 3,
};

const ASSIGNABLE_ROLES = new Set<CommunityMemberRole>([
  "member",
  "group_moderator",
  "admin",
]);

export function isGroupPrivate(group: CommunityGroup): boolean {
  return parseGroupMetadata(group.metadata).visibility === "private";
}

export function getGroupJoinPolicy(group: CommunityGroup): string {
  const policy = parseGroupMetadata(group.metadata).join_policy;
  return policy != null ? String(policy) : "open";
}

export async function getCommunityGroupBySlug(slug: string) {
  return prisma.communityGroup.findUnique({
    where: { slug: slug.toLowerCase() },
  });
}

export async function getGroupMembership(groupId: string, userId: string) {
  return prisma.communityGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

export async function listCommunityGroups(params: {
  category?: string | null;
  visibility?: string | null;
  q?: string | null;
  cursor?: string | null;
  limit?: number;
  viewerId?: string | null;
}) {
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursorDate = params.cursor ? new Date(params.cursor) : null;

  const where: Record<string, unknown> = {};

  const category = params.category?.toLowerCase();
  if (category && category !== "private" && category !== "open" && CATEGORY_TYPES[category]) {
    where.groupType = { in: CATEGORY_TYPES[category] };
  }

  if (params.q?.trim()) {
    where.OR = [
      { name: { contains: params.q.trim() } },
      { slug: { contains: params.q.trim().toLowerCase() } },
    ];
  }

  const rows = await prisma.communityGroup.findMany({
    where: {
      ...where,
      ...(cursorDate && !Number.isNaN(cursorDate.getTime())
        ? { createdAt: { lt: cursorDate } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 10,
  });

  let filtered = rows;
  if (params.visibility === "public" || params.visibility === "private") {
    filtered = rows.filter((g) => {
      const vis = isGroupPrivate(g) ? "private" : "public";
      return vis === params.visibility;
    });
  } else if (category === "private") {
    filtered = rows.filter((g) => isGroupPrivate(g));
  } else if (category === "open") {
    filtered = rows.filter((g) => !isGroupPrivate(g));
  }

  const page = filtered.slice(0, limit);
  const next =
    page.length === limit ? page[page.length - 1]?.createdAt.toISOString() ?? null : null;

  const memberMap = new Map<string, { is_member: boolean; role: string | null }>();
  if (params.viewerId && page.length > 0) {
    const memberships = await prisma.communityGroupMember.findMany({
      where: {
        userId: params.viewerId,
        groupId: { in: page.map((g) => g.id) },
      },
    });
    for (const m of memberships) {
      memberMap.set(m.groupId, { is_member: true, role: m.role });
    }
  }

  return {
    items: page.map((g) => {
      const m = memberMap.get(g.id);
      return { group: g, is_member: m?.is_member ?? false, viewer_role: m?.role ?? null };
    }),
    next_cursor: next,
  };
}

export async function getGroupDetail(slug: string, viewerId?: string | null) {
  const group = await getCommunityGroupBySlug(slug);
  if (!group) return null;

  let is_member = false;
  let viewer_role: string | null = null;
  if (viewerId) {
    const m = await getGroupMembership(group.id, viewerId);
    if (m) {
      is_member = true;
      viewer_role = m.role;
    }
  }

  const meta = parseGroupMetadata(group.metadata);
  return {
    group,
    is_member,
    viewer_role,
    rules: meta.rules != null ? String(meta.rules) : null,
  };
}

export async function joinCommunityGroup(slug: string, userId: string) {
  const group = await getCommunityGroupBySlug(slug);
  if (!group) return null;

  if (isGroupPrivate(group) && getGroupJoinPolicy(group) === "closed") {
    throw new Error("JOIN_CLOSED");
  }

  await getOrCreateUserProfile(userId);

  const existing = await getGroupMembership(group.id, userId);
  if (existing) return { group, membership: existing, joined: false };

  const membership = await prisma.$transaction(async (tx) => {
    const created = await tx.communityGroupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: "member",
      },
    });
    await tx.communityGroup.update({
      where: { id: group.id },
      data: { memberCount: { increment: 1 } },
    });
    return created;
  });

  return { group, membership, joined: true };
}

export async function leaveCommunityGroup(slug: string, userId: string) {
  const group = await getCommunityGroupBySlug(slug);
  if (!group) return null;

  const existing = await getGroupMembership(group.id, userId);
  if (!existing) return { group, left: false };

  await prisma.$transaction(async (tx) => {
    await tx.communityGroupMember.delete({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    await tx.communityGroup.update({
      where: { id: group.id },
      data: { memberCount: { decrement: 1 } },
    });
  });

  return { group, left: true };
}

export async function listGroupMembers(
  slug: string,
  params: { role?: string | null; limit?: number; cursor?: string | null }
) {
  const group = await getCommunityGroupBySlug(slug);
  if (!group) return null;

  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cursorDate = params.cursor ? new Date(params.cursor) : null;

  const where: Record<string, unknown> = { groupId: group.id };
  if (params.role) {
    const role = params.role === "moderator" ? "group_moderator" : params.role;
    where.role = role as CommunityMemberRole;
  }

  const members = await prisma.communityGroupMember.findMany({
    where: {
      ...where,
      ...(cursorDate && !Number.isNaN(cursorDate.getTime())
        ? { joinedAt: { lt: cursorDate } }
        : {}),
    },
    orderBy: { joinedAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          communityProfile: true,
        },
      },
    },
  });

  const next =
    members.length === limit
      ? members[members.length - 1]?.joinedAt.toISOString() ?? null
      : null;

  return { group, members, next_cursor: next };
}

function canManageRoles(actorRole: string): boolean {
  const rank = ROLE_RANK[actorRole] ?? 0;
  return rank >= ROLE_RANK.admin;
}

export async function setGroupMemberRole(
  slug: string,
  actorUserId: string,
  targetUserId: string,
  role: string
) {
  const normalized =
    role === "moderator"
      ? "group_moderator"
      : (role as CommunityMemberRole);

  if (!ASSIGNABLE_ROLES.has(normalized)) {
    throw new Error("INVALID_ROLE");
  }

  const group = await getCommunityGroupBySlug(slug);
  if (!group) return null;

  const actor = await getGroupMembership(group.id, actorUserId);
  if (!actor || !canManageRoles(actor.role)) {
    throw new Error("FORBIDDEN");
  }

  if (normalized === "admin" && actor.role !== "group_owner") {
    throw new Error("FORBIDDEN");
  }

  const target = await getGroupMembership(group.id, targetUserId);
  if (!target) return null;

  if (target.role === "group_owner") {
    throw new Error("FORBIDDEN");
  }

  const updated = await prisma.communityGroupMember.update({
    where: { groupId_userId: { groupId: group.id, userId: targetUserId } },
    data: { role: normalized },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          communityProfile: true,
        },
      },
    },
  });

  return { group, member: updated };
}

export async function assertCanViewGroupFeed(
  group: CommunityGroup,
  viewerId?: string | null
): Promise<boolean> {
  if (!isGroupPrivate(group)) return true;
  if (!viewerId) return false;
  const m = await getGroupMembership(group.id, viewerId);
  return !!m;
}

export async function assertCanPostToGroup(
  groupId: string,
  userId: string
): Promise<void> {
  const group = await prisma.communityGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("GROUP_NOT_FOUND");

  const m = await getGroupMembership(group.id, userId);
  if (!m) throw new Error("NOT_MEMBER");
}
