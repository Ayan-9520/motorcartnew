import type { AppRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FinanceError, isFinanceDeskRole, isFinanceStaffRole } from "./errors";

export type FinanceActor = {
  userId: string;
  role: string;
};

export type BankScope = { bankId: string; slug: string };

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function resolveLenderBank(actor: FinanceActor): Promise<BankScope> {
  if (actor.role !== "bank_nbfc" && !isFinanceDeskRole(actor.role)) {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
  const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { metadata: true, role: true } });
  if (!user) throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  const meta = asRecord(user.metadata);
  const bankId = typeof meta.bank_id === "string" ? meta.bank_id : null;
  const bankSlug = typeof meta.bank_slug === "string" ? meta.bank_slug : null;

  if (bankId) {
    const bank = await prisma.bank.findFirst({ where: { id: bankId, isActive: true } });
    if (bank) return { bankId: bank.id, slug: bank.slug };
  }
  if (bankSlug) {
    const bank = await prisma.bank.findFirst({ where: { slug: bankSlug, isActive: true } });
    if (bank) return { bankId: bank.id, slug: bank.slug };
  }
  throw new FinanceError("Lender bank is not configured on this account", 403, "LENDER_BANK_UNRESOLVED");
}

export async function resolveDsaAgent(userId: string) {
  const agent = await prisma.dsaAgent.findUnique({ where: { userId } });
  if (!agent || !agent.isActive) {
    throw new FinanceError("DSA profile not found", 403, "DSA_NOT_FOUND");
  }
  return agent;
}

export async function pickRoundRobinDsaId(): Promise<string | null> {
  const agent = await prisma.dsaAgent.findFirst({
    where: { isActive: true },
    orderBy: [{ totalDisbursed: "asc" }, { createdAt: "asc" }],
  });
  return agent?.id ?? null;
}

export function canReadApplication(
  actor: FinanceActor,
  app: { userId: string; bankId: string | null; dsaAgentId: string | null },
  ctx: { bankId?: string | null; dsaAgentId?: string | null },
): boolean {
  if (isFinanceStaffRole(actor.role)) return true;
  if (app.userId === actor.userId) return true;
  if (actor.role === "bank_nbfc" && ctx.bankId && app.bankId === ctx.bankId) return true;
  if (actor.role === "dsa_agent" && ctx.dsaAgentId && app.dsaAgentId === ctx.dsaAgentId) return true;
  return false;
}

export async function assertCanReadApplication(
  actor: FinanceActor,
  app: { userId: string; bankId: string | null; dsaAgentId: string | null },
) {
  let bankId: string | null = null;
  let dsaAgentId: string | null = null;
  if (actor.role === "bank_nbfc") {
    bankId = (await resolveLenderBank(actor)).bankId;
  }
  if (actor.role === "dsa_agent") {
    dsaAgentId = (await resolveDsaAgent(actor.userId)).id;
  }
  if (!canReadApplication(actor, app, { bankId, dsaAgentId })) {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
}

export function actorFromJwt(auth: { sub: string; role: AppRole | string }): FinanceActor {
  return { userId: auth.sub, role: auth.role };
}
