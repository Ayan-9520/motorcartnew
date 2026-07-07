import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listBrokerLeads(brokerId: string, status?: string) {
  return prisma.brokerLead.findMany({
    where: { brokerId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export function getBrokerLead(brokerId: string, id: string) {
  return prisma.brokerLead.findFirst({ where: { id, brokerId } });
}

export function createBrokerLead(
  brokerId: string,
  data: Omit<Prisma.BrokerLeadUncheckedCreateInput, "brokerId">
) {
  return prisma.brokerLead.create({
    data: { ...data, brokerId },
  });
}

export function updateBrokerLead(
  brokerId: string,
  id: string,
  data: Prisma.BrokerLeadUpdateInput
) {
  return prisma.brokerLead.updateMany({
    where: { id, brokerId },
    data,
  });
}

export async function deleteBrokerLead(brokerId: string, id: string) {
  const r = await prisma.brokerLead.deleteMany({ where: { id, brokerId } });
  return r.count > 0;
}
