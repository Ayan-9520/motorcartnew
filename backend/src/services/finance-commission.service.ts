import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Create at most one commission row per application when status becomes disbursed. */
export async function ensureCommissionOnDisbursement(
  applicationId: string,
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;
  const existing = await db.financeCommission.findFirst({ where: { applicationId } });
  if (existing) return { created: false, commission: existing };

  const app = await db.financeApplication.findUnique({ where: { id: applicationId } });
  if (!app) return { created: false, commission: null };

  const loanAmount = Math.round(Number(app.loanAmount ?? app.amount));
  let rate = 0;
  let dsaUserId = app.userId;
  if (app.dsaAgentId) {
    const dsa = await db.dsaAgent.findUnique({ where: { id: app.dsaAgentId } });
    if (dsa) {
      rate = Number(dsa.commissionRate);
      dsaUserId = dsa.userId;
      await db.dsaAgent.update({
        where: { id: dsa.id },
        data: { totalDisbursed: { increment: BigInt(loanAmount) } },
      });
    }
  }

  const commissionAmount = Math.round(loanAmount * (rate / 100));
  try {
    const commission = await db.financeCommission.create({
      data: {
        userId: dsaUserId,
        amount: commissionAmount,
        status: "pending",
        applicationId: app.id,
        dsaAgentId: app.dsaAgentId,
        loanAmount: BigInt(loanAmount),
        commissionRate: rate,
        commissionAmount: BigInt(commissionAmount),
        metadata: { source: "disbursement" },
      },
    });
    return { created: true, commission };
  } catch (error) {
    const again = await db.financeCommission.findFirst({ where: { applicationId } });
    if (again) return { created: false, commission: again };
    throw error;
  }
}

export async function listCommissionsForManager() {
  return prisma.financeCommission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function listCommissionsForDsa(dsaAgentId: string) {
  return prisma.financeCommission.findMany({
    where: { dsaAgentId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
