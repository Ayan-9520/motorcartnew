import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listBrokerBuyers(brokerId: string, status?: string) {
  return prisma.brokerBuyer.findMany({
    where: { brokerId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export function getBrokerBuyer(brokerId: string, id: string) {
  return prisma.brokerBuyer.findFirst({ where: { id, brokerId } });
}

export function createBrokerBuyer(
  brokerId: string,
  data: Omit<Prisma.BrokerBuyerCreateInput, "broker" | "brokerId">
) {
  return prisma.brokerBuyer.create({
    data: { ...data, brokerId },
  });
}

export function updateBrokerBuyer(
  brokerId: string,
  id: string,
  data: Prisma.BrokerBuyerUpdateInput
) {
  return prisma.brokerBuyer.updateMany({
    where: { id, brokerId },
    data,
  });
}

export async function deleteBrokerBuyer(brokerId: string, id: string) {
  const r = await prisma.brokerBuyer.deleteMany({ where: { id, brokerId } });
  return r.count > 0;
}
