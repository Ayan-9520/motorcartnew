import { randomUUID } from "node:crypto";
import type { FinanceStatus, Prisma, SoftApprovalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadUserAccess, isPendingBusinessAccess } from "@/lib/auth/account-access";
import {
  assertCanReadApplication,
  pickRoundRobinDsaId,
  resolveDsaAgent,
  resolveLenderBank,
  type FinanceActor,
} from "@/lib/finance/access";
import { cibilBand, incomeBand, stripRawPii } from "@/lib/finance/bands";
import { checkEligibility } from "@/lib/finance/eligibility";
import { calculateEmi, validateEmiParams } from "@/lib/finance/emi";
import { FinanceError, isFinanceStaffRole } from "@/lib/finance/errors";
import { buildLoanOffers, type LenderSnapshot } from "@/lib/finance/matching";
import { ensureCommissionOnDisbursement } from "./finance-commission.service";

const ALLOWED_STATUS: FinanceStatus[] = ["processing", "approved", "rejected", "disbursed"];
const SOFT_DECISIONS = new Set(["pre_approved", "declined"]);

function asJson(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export type SubmitApplicationInput = {
  bankId?: string | null;
  loanAmount: number;
  tenureMonths: number;
  interestRate?: number | null;
  monthlyIncome?: number | null;
  cibilScore?: number | null;
  employmentType?: string | null;
  applicationType?: string | null;
  vehicleId?: string | null;
  dsaAgentId?: string | null;
  comparisonSessionId?: string | null;
  applicantMetadata?: Record<string, unknown>;
  notes?: string | null;
};

async function resolveAssignedDsa(actor: FinanceActor, requested?: string | null): Promise<string | null> {
  if (actor.role === "dsa_agent") {
    const self = await resolveDsaAgent(actor.userId);
    if (requested && requested !== self.id) {
      throw new FinanceError("Cannot assign another DSA", 403, "FORBIDDEN");
    }
    return self.id;
  }
  if (requested) {
    if (!isFinanceStaffRole(actor.role)) {
      throw new FinanceError("DSA assignment is not allowed", 403, "FORBIDDEN");
    }
    const agent = await prisma.dsaAgent.findUnique({ where: { id: requested } });
    if (!agent?.isActive) throw new FinanceError("DSA agent not found", 400, "DSA_NOT_FOUND");
    return agent.id;
  }
  return pickRoundRobinDsaId();
}

export async function listActiveLenders() {
  return prisma.bank.findMany({
    where: { isActive: true },
    orderBy: [{ rankingScore: "desc" }, { name: "asc" }],
  });
}

export async function calculateEmiQuote(principal: number, rate: number, tenureMonths: number) {
  const invalid = validateEmiParams(principal, rate, tenureMonths);
  if (invalid) throw new FinanceError(invalid, 400, "INVALID_EMI");
  const emi = calculateEmi(principal, rate, tenureMonths);
  return {
    principal,
    rate,
    tenure_months: tenureMonths,
    emi,
    total_interest: Math.max(0, emi * tenureMonths - principal),
  };
}

export async function runEligibility(
  actor: FinanceActor | null,
  input: {
    monthlyIncome: number;
    existingEmi?: number;
    loanAmount: number;
    tenureMonths: number;
    cibilScore: number;
    employmentType?: string;
  },
) {
  const monthlyIncome = num(input.monthlyIncome);
  const existingEmi = num(input.existingEmi);
  const loanAmount = num(input.loanAmount);
  const tenureMonths = Math.round(num(input.tenureMonths, 60));
  const cibilScore = Math.round(num(input.cibilScore));
  const employmentType = input.employmentType || "salaried";

  if (monthlyIncome < 0 || loanAmount <= 0 || tenureMonths < 1 || cibilScore < 0) {
    throw new FinanceError("Invalid eligibility input", 400, "INVALID_ELIGIBILITY");
  }

  const result = checkEligibility({
    monthlyIncome,
    existingEmi,
    loanAmount,
    tenureMonths,
    cibilScore,
    employmentType,
  });

  const row = await prisma.financeEligibilityCheck.create({
    data: {
      userId: actor?.userId ?? null,
      monthlyIncomeBand: incomeBand(monthlyIncome),
      existingEmi: BigInt(Math.round(existingEmi)),
      loanAmount,
      tenureMonths,
      cibilBand: cibilBand(cibilScore),
      employmentType,
      eligible: result.eligible,
      maxLoan: BigInt(result.maxLoan),
      maxEmi: BigInt(result.maxEmi),
      message: result.message.slice(0, 512),
      recommendedTenure: result.recommendedTenure,
      engineVersion: "v1",
      metadata: { per_lender: false },
    },
  });

  return {
    ...result,
    check_id: row.id,
    monthly_income_band: row.monthlyIncomeBand,
    cibil_band: row.cibilBand,
    engine_version: row.engineVersion,
  };
}

function toLenderSnapshot(row: {
  id: string;
  rankingScore: number;
  minCibil: number;
  interestRateMin: Prisma.Decimal;
  interestRateMax: Prisma.Decimal;
  maxTenureMonths: number;
  maxLoanAmount: bigint;
}): LenderSnapshot {
  return {
    id: row.id,
    rankingScore: row.rankingScore,
    minCibil: row.minCibil,
    interestRateMin: Number(row.interestRateMin),
    interestRateMax: Number(row.interestRateMax),
    maxTenureMonths: row.maxTenureMonths,
    maxLoanAmount: Number(row.maxLoanAmount),
  };
}

export async function compareLenders(
  actor: FinanceActor,
  input: {
    loanAmount: number;
    tenureMonths: number;
    monthlyIncome?: number;
    existingEmi?: number;
    cibilScore?: number;
    employmentType?: string;
  },
) {
  const loanAmount = num(input.loanAmount);
  const tenureMonths = Math.round(num(input.tenureMonths, 60));
  if (loanAmount <= 0 || tenureMonths < 1) {
    throw new FinanceError("loanAmount and tenureMonths are required", 400, "INVALID_COMPARE");
  }
  const eligibilityInput = {
    monthlyIncome: num(input.monthlyIncome, 50000),
    existingEmi: num(input.existingEmi),
    loanAmount,
    tenureMonths,
    cibilScore: Math.round(num(input.cibilScore, 700)),
    employmentType: input.employmentType || "salaried",
  };
  const banks = await prisma.bank.findMany({ where: { isActive: true } });
  const offers = buildLoanOffers(banks.map(toLenderSnapshot), loanAmount, tenureMonths, eligibilityInput);
  const sessionId = randomUUID();

  if (offers.length) {
    await prisma.financeLenderOffer.createMany({
      data: offers.map((o) => ({
        comparisonSessionId: sessionId,
        bankId: o.id,
        userId: actor.userId,
        loanAmount,
        tenureMonths,
        effectiveRate: o.effectiveRate,
        emiAmount: o.emi,
        totalInterest: o.totalInterest,
        approvalProbability: o.approvalProbability,
        rank: o.rank,
        metadata: {},
      })),
    });
  }

  return { comparison_session_id: sessionId, offers };
}

export async function submitApplication(actor: FinanceActor, input: SubmitApplicationInput) {
  const access = await loadUserAccess(actor.userId);
  if (access && isPendingBusinessAccess(access)) {
    throw new FinanceError("Account pending approval", 403, "ACCOUNT_PENDING_APPROVAL");
  }

  const loanAmount = num(input.loanAmount);
  const tenureMonths = Math.round(num(input.tenureMonths, 60));
  if (loanAmount <= 0 || tenureMonths < 1) {
    throw new FinanceError("loanAmount and tenureMonths are required", 400, "INVALID_APPLICATION");
  }

  const dsaAgentId = await resolveAssignedDsa(actor, input.dsaAgentId);
  const interestRate = input.interestRate != null ? num(input.interestRate) : null;
  const emiAmount = interestRate != null ? calculateEmi(loanAmount, interestRate, tenureMonths) : null;
  const applicantMetadata = stripRawPii(input.applicantMetadata);

  const app = await prisma.financeApplication.create({
    data: {
      userId: actor.userId,
      bankId: input.bankId || null,
      amount: loanAmount,
      tenure: tenureMonths,
      loanAmount,
      tenureMonths,
      status: "submitted",
      vehicleId: input.vehicleId || null,
      dsaAgentId,
      interestRate,
      emiAmount,
      cibilScore: input.cibilScore != null ? Math.round(num(input.cibilScore)) : null,
      monthlyIncome: input.monthlyIncome != null ? BigInt(Math.round(num(input.monthlyIncome))) : null,
      employmentType: input.employmentType || "salaried",
      applicationType: input.applicationType || "new_loan",
      applicantMetadata: asJson(applicantMetadata),
      documents: [],
      notes: input.notes ?? null,
      comparisonSessionId: input.comparisonSessionId || null,
      metadata: asJson({
        interest_rate: interestRate,
        monthly_income: input.monthlyIncome ?? null,
        cibil_score: input.cibilScore ?? null,
        employment_type: input.employmentType || "salaried",
        application_type: input.applicationType || "new_loan",
        vehicle_id: input.vehicleId ?? null,
        applicant_metadata: applicantMetadata,
        submitted_at: new Date().toISOString(),
      }),
    },
  });

  await prisma.financeStatusHistory.create({
    data: {
      applicationId: app.id,
      status: "submitted",
      fromStatus: "draft",
      toStatus: "submitted",
      changedBy: actor.userId,
      note: "Application submitted by customer",
    },
  });

  if (input.comparisonSessionId) {
    await prisma.financeLenderOffer.updateMany({
      where: { comparisonSessionId: input.comparisonSessionId, userId: actor.userId },
      data: { applicationId: app.id },
    });
    if (app.bankId) {
      await prisma.financeLenderOffer.updateMany({
        where: {
          comparisonSessionId: input.comparisonSessionId,
          userId: actor.userId,
          bankId: app.bankId,
        },
        data: { isSelected: true },
      });
    }
  }

  return app;
}

export async function listApplications(actor: FinanceActor) {
  if (isFinanceStaffRole(actor.role)) {
    return prisma.financeApplication.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }
  if (actor.role === "bank_nbfc") {
    const bank = await resolveLenderBank(actor);
    return prisma.financeApplication.findMany({
      where: { bankId: bank.bankId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
  if (actor.role === "dsa_agent") {
    const dsa = await resolveDsaAgent(actor.userId);
    return prisma.financeApplication.findMany({
      where: { dsaAgentId: dsa.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }
  return prisma.financeApplication.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getApplication(actor: FinanceActor, id: string) {
  const app = await prisma.financeApplication.findUnique({ where: { id } });
  if (!app) throw new FinanceError("Application not found", 404, "NOT_FOUND");
  await assertCanReadApplication(actor, app);
  return app;
}

export async function getTimeline(actor: FinanceActor, id: string) {
  await getApplication(actor, id);
  return prisma.financeStatusHistory.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  });
}

export async function getApplicationOffers(actor: FinanceActor, id: string) {
  const app = await getApplication(actor, id);
  return prisma.financeLenderOffer.findMany({
    where: {
      OR: [
        { applicationId: id },
        app.comparisonSessionId ? { comparisonSessionId: app.comparisonSessionId } : { applicationId: id },
      ],
    },
    orderBy: { rank: "asc" },
  });
}

export async function addApplicationDocument(
  actor: FinanceActor,
  id: string,
  input: { docType?: string; fileName: string; fileUrl: string; status?: string; metadata?: Record<string, unknown> },
) {
  const app = await getApplication(actor, id);
  const isOwner = app.userId === actor.userId;
  const isStaff = isFinanceStaffRole(actor.role);
  let isDsa = false;
  if (actor.role === "dsa_agent") {
    const dsa = await resolveDsaAgent(actor.userId);
    isDsa = app.dsaAgentId === dsa.id;
  }
  if (!isOwner && !isStaff && !isDsa) {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
  if (!input.fileName || !input.fileUrl) {
    throw new FinanceError("fileName and fileUrl are required", 400, "INVALID_DOCUMENT");
  }

  const doc = await prisma.financeApplicationDocument.create({
    data: {
      applicationId: id,
      userId: actor.userId,
      docType: (input.docType || "other").slice(0, 32),
      fileName: input.fileName.slice(0, 255),
      fileUrl: input.fileUrl.slice(0, 512),
      status: input.status || "uploaded",
      metadata: asJson(input.metadata ?? {}),
    },
  });

  const existing = Array.isArray(app.documents) ? (app.documents as Record<string, unknown>[]) : [];
  const jsonDoc = {
    name: input.fileName,
    path: input.fileUrl,
    type: input.docType || "other",
    uploadedAt: new Date().toISOString(),
  };
  await prisma.financeApplication.update({
    where: { id },
    data: { documents: [...existing, jsonDoc] as Prisma.InputJsonValue },
  });

  return doc;
}

export async function advanceApplicationStatus(
  actor: FinanceActor,
  id: string,
  status: FinanceStatus,
  note?: string,
) {
  if (!isFinanceStaffRole(actor.role) && actor.role !== "bank_nbfc") {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
  if (!ALLOWED_STATUS.includes(status)) {
    throw new FinanceError("Invalid status", 400, "INVALID_STATUS");
  }
  const app = await prisma.financeApplication.findUnique({ where: { id } });
  if (!app) throw new FinanceError("Application not found", 404, "NOT_FOUND");

  if (actor.role === "bank_nbfc") {
    const bank = await resolveLenderBank(actor);
    if (app.bankId !== bank.bankId) throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }

  await prisma.$transaction(async (tx) => {
    await tx.financeApplication.update({ where: { id }, data: { status } });
    await tx.financeStatusHistory.create({
      data: {
        applicationId: id,
        status,
        fromStatus: app.status,
        toStatus: status,
        changedBy: actor.userId,
        note: note?.trim() || `Status → ${status} (${actor.role})`,
      },
    });
    if (status === "processing") {
      const existing = await tx.financeVerification.count({ where: { applicationId: id } });
      if (existing === 0) {
        await tx.financeVerification.createMany({
          data: ["identity", "income", "cibil", "bank_statement"].map((checkType) => ({
            applicationId: id,
            checkType,
            status: "pending",
            metadata: {},
          })),
        });
      }
    }
    if (status === "disbursed") {
      await ensureCommissionOnDisbursement(id, tx);
    }
  });

  return prisma.financeApplication.findUniqueOrThrow({ where: { id } });
}

export async function applySoftApproval(
  actor: FinanceActor,
  id: string,
  decision: string,
  note?: string,
) {
  if (actor.role !== "bank_nbfc" && !isFinanceStaffRole(actor.role)) {
    throw new FinanceError("Forbidden", 403, "FORBIDDEN");
  }
  if (!SOFT_DECISIONS.has(decision)) {
    throw new FinanceError("decision must be pre_approved or declined", 400, "INVALID_SOFT_APPROVAL");
  }
  const app = await prisma.financeApplication.findUnique({ where: { id } });
  if (!app) throw new FinanceError("Application not found", 404, "NOT_FOUND");

  let bankId = app.bankId;
  if (actor.role === "bank_nbfc") {
    const bank = await resolveLenderBank(actor);
    if (app.bankId && app.bankId !== bank.bankId) {
      throw new FinanceError("Forbidden", 403, "FORBIDDEN");
    }
    bankId = bank.bankId;
  }
  if (!bankId) throw new FinanceError("Application has no lender", 400, "NO_BANK");

  const softStatus = decision as SoftApprovalStatus;
  const expiresAt = decision === "pre_approved" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null;

  await prisma.$transaction(async (tx) => {
    await tx.financeApplication.update({
      where: { id },
      data: {
        softApprovalStatus: softStatus,
        softApprovedAt: decision === "pre_approved" ? new Date() : app.softApprovedAt,
        bankId,
      },
    });
    await tx.financeSoftApproval.create({
      data: {
        applicationId: id,
        bankId,
        actedBy: actor.userId,
        decision,
        note: note ?? null,
        expiresAt,
      },
    });
  });

  const updated = await prisma.financeApplication.findUniqueOrThrow({ where: { id } });
  return updated;
}
