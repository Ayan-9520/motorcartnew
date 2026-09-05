import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveLenderBank, type FinanceActor } from "@/lib/finance/access";
import { FinanceError, isFinanceStaffRole } from "@/lib/finance/errors";
import { applySoftApproval } from "./finance-marketplace.service";

export async function requireLenderActor(actor: FinanceActor) {
  if (actor.role !== "bank_nbfc" && !isFinanceStaffRole(actor.role)) {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
  if (actor.role === "bank_nbfc") return resolveLenderBank(actor);
  throw new FinanceError("Lender scope required", 403, "FORBIDDEN");
}

export async function lenderOverview(actor: FinanceActor) {
  const bank = await resolveLenderBank(actor);
  const applications = await prisma.financeApplication.findMany({ where: { bankId: bank.bankId } });
  return {
    bank_id: bank.bankId,
    bank_slug: bank.slug,
    applications: applications.length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    processing: applications.filter((a) => a.status === "processing").length,
    approved: applications.filter((a) => a.status === "approved").length,
    disbursed: applications.filter((a) => a.status === "disbursed").length,
    soft_pre_approved: applications.filter((a) => a.softApprovalStatus === "pre_approved").length,
  };
}

export async function lenderApplications(actor: FinanceActor) {
  const bank = await resolveLenderBank(actor);
  return prisma.financeApplication.findMany({
    where: { bankId: bank.bankId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function patchLenderApplication(
  actor: FinanceActor,
  id: string,
  patch: {
    notes?: string;
    interestRate?: number;
    emiAmount?: number;
    decision?: string;
    note?: string;
  },
) {
  const bank = await resolveLenderBank(actor);
  const app = await prisma.financeApplication.findUnique({ where: { id } });
  if (!app) throw new FinanceError("Application not found", 404, "NOT_FOUND");
  if (app.bankId !== bank.bankId) throw new FinanceError("Forbidden", 403, "FORBIDDEN");

  if (patch.decision) {
    return applySoftApproval(actor, id, patch.decision, patch.note ?? patch.notes);
  }

  const data: Prisma.FinanceApplicationUpdateInput = {};
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.interestRate !== undefined) data.interestRate = patch.interestRate;
  if (patch.emiAmount !== undefined) data.emiAmount = patch.emiAmount;

  return prisma.financeApplication.update({ where: { id }, data });
}
