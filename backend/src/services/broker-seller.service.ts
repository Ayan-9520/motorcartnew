import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function listBrokerSellers(brokerId: string) {
  return prisma.brokerSeller.findMany({
    where: { brokerId },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export function getBrokerSeller(brokerId: string, id: string) {
  return prisma.brokerSeller.findFirst({ where: { id, brokerId } });
}

export function createBrokerSeller(
  brokerId: string,
  data: Omit<Prisma.BrokerSellerCreateInput, "broker" | "brokerId">
) {
  return prisma.brokerSeller.create({
    data: { ...data, brokerId },
  });
}

export function updateBrokerSeller(
  brokerId: string,
  id: string,
  data: Prisma.BrokerSellerUpdateInput
) {
  return prisma.brokerSeller.updateMany({
    where: { id, brokerId },
    data,
  });
}

export async function deleteBrokerSeller(brokerId: string, id: string) {
  const r = await prisma.brokerSeller.deleteMany({ where: { id, brokerId } });
  return r.count > 0;
}
