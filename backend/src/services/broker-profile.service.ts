import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

function slugify(name: string, suffix: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "broker"}-${suffix.slice(0, 6)}`;
}

export async function createBrokerStubForOwner(input: {
  ownerId: string;
  name: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const slug = slugify(input.name, input.ownerId);
  return prisma.broker.create({
    data: {
      ownerId: input.ownerId,
      name: input.name,
      slug,
      city: input.city?.trim() || "Mumbai",
      state: input.state?.trim() || "Maharashtra",
      phone: input.phone ?? null,
      email: input.email ?? null,
    },
  });
}

export async function getBrokerByOwnerId(ownerId: string) {
  return prisma.broker.findFirst({ where: { ownerId } });
}

export async function updateBrokerProfile(
  brokerId: string,
  data: Prisma.BrokerUpdateInput
) {
  return prisma.broker.update({ where: { id: brokerId }, data });
}
