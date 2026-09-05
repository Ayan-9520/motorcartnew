import { prisma } from "@/lib/prisma";
import { resolveDsaAgent, type FinanceActor } from "@/lib/finance/access";
import { FinanceError } from "@/lib/finance/errors";
import { listCommissionsForDsa } from "./finance-commission.service";

export async function requireDsaActor(actor: FinanceActor) {
  if (actor.role !== "dsa_agent" && actor.role !== "admin" && actor.role !== "super_admin" && actor.role !== "finance_manager") {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
  if (actor.role === "dsa_agent") return resolveDsaAgent(actor.userId);
  throw new FinanceError("DSA agent id required", 400, "DSA_REQUIRED");
}

export async function dsaOverview(actor: FinanceActor) {
  const dsa = await resolveScopedDsa(actor);
  const [applications, leads, commissions] = await Promise.all([
    prisma.financeApplication.findMany({ where: { dsaAgentId: dsa.id } }),
    prisma.financeLead.findMany({
      where: { OR: [{ assignedDsaId: dsa.id }, { dsaId: dsa.id }] },
    }),
    listCommissionsForDsa(dsa.id),
  ]);
  return {
    dsa_agent_id: dsa.id,
    applications: applications.length,
    leads: leads.length,
    commissions: commissions.length,
    pending_commissions: commissions.filter((c) => c.status === "pending").length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    processing: applications.filter((a) => a.status === "processing").length,
    approved: applications.filter((a) => a.status === "approved").length,
    disbursed: applications.filter((a) => a.status === "disbursed").length,
  };
}

export async function dsaApplications(actor: FinanceActor) {
  const dsa = await resolveScopedDsa(actor);
  return prisma.financeApplication.findMany({
    where: { dsaAgentId: dsa.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function dsaLeads(actor: FinanceActor) {
  const dsa = await resolveScopedDsa(actor);
  return prisma.financeLead.findMany({
    where: { OR: [{ assignedDsaId: dsa.id }, { dsaId: dsa.id }] },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function dsaCommissions(actor: FinanceActor) {
  const dsa = await resolveScopedDsa(actor);
  return listCommissionsForDsa(dsa.id);
}

async function resolveScopedDsa(actor: FinanceActor) {
  if (actor.role === "dsa_agent") return resolveDsaAgent(actor.userId);
  throw new FinanceError("Forbidden", 403, "FORBIDDEN");
}
