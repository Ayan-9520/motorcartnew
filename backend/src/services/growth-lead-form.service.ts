import type { GrowthLeadCaptureStatus, Prisma } from "@prisma/client";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  assertQuota,
  incrementUsage,
} from "@/lib/growth/entitlements";
import { randomSuffix, slugifyBase } from "@/lib/growth/slug";

const LEAD_STATUSES = new Set<GrowthLeadCaptureStatus>([
  "new",
  "qualified",
  "spam",
  "archived",
]);

export function parseLeadStatus(raw: unknown): GrowthLeadCaptureStatus | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase() as GrowthLeadCaptureStatus;
  return LEAD_STATUSES.has(s) ? s : null;
}

async function uniqueFormSlug(workspaceId: string, base: string): Promise<string> {
  let slug = slugifyBase(base);
  for (let i = 0; i < 8; i++) {
    const exists = await prisma.growthLeadCaptureForm.findFirst({
      where: { workspaceId, slug },
    });
    if (!exists) return slug;
    slug = `${slugifyBase(base)}-${randomSuffix(4)}`;
  }
  return `${slugifyBase(base)}-${randomSuffix(8)}`;
}

export function listLeadForms(workspaceId: string) {
  return prisma.growthLeadCaptureForm.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { events: true } } },
  });
}

export function getLeadForm(workspaceId: string, id: string) {
  return prisma.growthLeadCaptureForm.findFirst({
    where: { id, workspaceId },
  });
}

export async function createLeadForm(
  workspaceId: string,
  data: {
    name: string;
    slug?: string;
    fieldsSchema?: Prisma.InputJsonValue;
    thankYouUrl?: string | null;
    isActive?: boolean;
    metadata?: Prisma.InputJsonValue;
  }
) {
  const slug = data.slug
    ? slugifyBase(data.slug)
    : await uniqueFormSlug(workspaceId, data.name);

  return prisma.growthLeadCaptureForm.create({
    data: {
      workspaceId,
      name: data.name,
      slug,
      fieldsSchema: data.fieldsSchema ?? [],
      thankYouUrl: data.thankYouUrl ?? null,
      isActive: data.isActive ?? true,
      metadata: data.metadata ?? {},
    },
  });
}

export async function updateLeadForm(
  workspaceId: string,
  id: string,
  data: Prisma.GrowthLeadCaptureFormUpdateInput
) {
  const row = await getLeadForm(workspaceId, id);
  if (!row) return null;
  return prisma.growthLeadCaptureForm.update({ where: { id }, data });
}

export async function updateLeadEventStatus(
  formId: string,
  workspaceId: string,
  eventId: string,
  status: GrowthLeadCaptureStatus
) {
  const form = await getLeadForm(workspaceId, formId);
  if (!form) return null;
  const existing = await prisma.growthLeadCaptureEvent.findFirst({
    where: { id: eventId, formId },
  });
  if (!existing) return null;
  return prisma.growthLeadCaptureEvent.update({
    where: { id: eventId },
    data: { status },
  });
}

export function listLeadEvents(
  formId: string,
  workspaceId: string,
  opts: { status?: GrowthLeadCaptureStatus; limit?: number }
) {
  return prisma.growthLeadCaptureEvent.findMany({
    where: {
      formId,
      form: { workspaceId },
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(opts.limit ?? 100, 200),
  });
}

export async function getPublicLeadForm(workspaceSlug: string, formSlug: string) {
  const workspace = await prisma.growthWorkspace.findFirst({
    where: { slug: workspaceSlug, status: "active" },
  });
  if (!workspace) return null;

  const form = await prisma.growthLeadCaptureForm.findFirst({
    where: {
      workspaceId: workspace.id,
      slug: formSlug,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      fieldsSchema: true,
      thankYouUrl: true,
      workspaceId: true,
    },
  });

  if (!form) return null;
  return { workspace, form };
}

export async function submitPublicLead(
  workspaceSlug: string,
  formSlug: string,
  payload: Prisma.InputJsonValue,
  meta: { ip?: string; userAgent?: string | null }
) {
  const pub = await getPublicLeadForm(workspaceSlug, formSlug);
  if (!pub) return null;

  await assertQuota(pub.workspace.id, "lead_events_monthly", "lead_events", 1);

  const ipHash = meta.ip
    ? createHash("sha256").update(meta.ip).digest("hex").slice(0, 64)
    : null;

  const event = await prisma.growthLeadCaptureEvent.create({
    data: {
      formId: pub.form.id,
      status: "new",
      payload,
      ipHash,
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
    },
  });

  await incrementUsage(pub.workspace.id, "lead_events", 1);
  return event;
}

/** Simple in-memory rate limit for public submits (per IP hash, per minute) */
const publicSubmitBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkPublicSubmitRate(ip: string, maxPerMinute = 10): boolean {
  const key = createHash("sha256").update(ip).digest("hex").slice(0, 16);
  const now = Date.now();
  const bucket = publicSubmitBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    publicSubmitBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= maxPerMinute) return false;
  bucket.count += 1;
  return true;
}
