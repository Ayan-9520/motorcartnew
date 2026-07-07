import type {
  GrowthWhatsappTemplateStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TEMPLATE_STATUSES = new Set<GrowthWhatsappTemplateStatus>([
  "draft",
  "pending_approval",
  "approved",
  "rejected",
]);

export function parseTemplateStatus(raw: unknown): GrowthWhatsappTemplateStatus | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase() as GrowthWhatsappTemplateStatus;
  return TEMPLATE_STATUSES.has(s) ? s : null;
}

export function listWhatsappTemplates(workspaceId: string) {
  return prisma.growthWhatsappTemplate.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export function getWhatsappTemplate(workspaceId: string, id: string) {
  return prisma.growthWhatsappTemplate.findFirst({ where: { id, workspaceId } });
}

export function createWhatsappTemplate(
  workspaceId: string,
  data: {
    templateKey: string;
    name: string;
    body: string;
    category?: string;
    language?: string;
    variablesSchema?: Prisma.InputJsonValue;
    metadata?: Prisma.InputJsonValue;
  }
) {
  return prisma.growthWhatsappTemplate.create({
    data: {
      workspaceId,
      templateKey: data.templateKey,
      name: data.name,
      body: data.body,
      category: data.category ?? "marketing",
      language: data.language ?? "en",
      variablesSchema: data.variablesSchema ?? [],
      metadata: data.metadata ?? {},
    },
  });
}

export async function updateWhatsappTemplate(
  workspaceId: string,
  id: string,
  data: Prisma.GrowthWhatsappTemplateUpdateInput
) {
  const row = await getWhatsappTemplate(workspaceId, id);
  if (!row) return null;
  return prisma.growthWhatsappTemplate.update({ where: { id }, data });
}

export async function deleteWhatsappTemplate(workspaceId: string, id: string) {
  const row = await getWhatsappTemplate(workspaceId, id);
  if (!row) return false;
  await prisma.growthWhatsappTemplate.delete({ where: { id } });
  return true;
}

export function listContactLists(workspaceId: string) {
  return prisma.growthContactList.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });
}

export function getContactList(workspaceId: string, id: string) {
  return prisma.growthContactList.findFirst({
    where: { id, workspaceId },
    include: { members: { take: 500, orderBy: { createdAt: "desc" } } },
  });
}

export function createContactList(
  workspaceId: string,
  data: { name: string; description?: string | null; metadata?: Prisma.InputJsonValue }
) {
  return prisma.growthContactList.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description ?? null,
      metadata: data.metadata ?? {},
    },
  });
}

export async function updateContactList(
  workspaceId: string,
  id: string,
  data: Prisma.GrowthContactListUpdateInput
) {
  const row = await prisma.growthContactList.findFirst({ where: { id, workspaceId } });
  if (!row) return null;
  return prisma.growthContactList.update({ where: { id }, data });
}

export async function deleteContactList(workspaceId: string, id: string) {
  const row = await prisma.growthContactList.findFirst({ where: { id, workspaceId } });
  if (!row) return false;
  await prisma.growthContactList.delete({ where: { id } });
  return true;
}

export async function addContactListMembers(
  listId: string,
  workspaceId: string,
  members: { phone: string; fullName?: string | null; metadata?: Prisma.InputJsonValue }[]
) {
  const list = await prisma.growthContactList.findFirst({ where: { id: listId, workspaceId } });
  if (!list) return null;

  const created = [];
  for (const m of members) {
    const phone = m.phone.replace(/\s+/g, "").trim();
    if (!phone) continue;
    const row = await prisma.growthContactListMember.upsert({
      where: { listId_phone: { listId, phone } },
      create: {
        listId,
        phone,
        fullName: m.fullName ?? null,
        optInAt: new Date(),
        metadata: m.metadata ?? {},
      },
      update: {
        fullName: m.fullName ?? undefined,
        optInAt: new Date(),
        optOutAt: null,
      },
    });
    created.push(row);
  }
  return created;
}

export async function removeContactListMember(
  workspaceId: string,
  listId: string,
  memberId: string
) {
  const list = await prisma.growthContactList.findFirst({ where: { id: listId, workspaceId } });
  if (!list) return false;
  const r = await prisma.growthContactListMember.deleteMany({
    where: { id: memberId, listId },
  });
  return r.count > 0;
}
