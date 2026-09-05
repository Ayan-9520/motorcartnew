import { prisma } from "@/lib/prisma";
import { CommosError } from "./errors";
import { ALLOWED_TOOLS, BLOCKED_TOOLS } from "./constants";
import { getInventoryByPincode } from "@/services/inventory-by-pincode.service";
import { persistLeadQuality, createCrmActivity, createFollowUp } from "@/services/sales-crm.service";
import { requireLeadForDealer } from "@/lib/sales-os/access";
import { calculateLeadQuality } from "@/lib/sales-os/quality";
import type { CommActor } from "./http";
import { isDealerRole, isAdminRole } from "./http";

export type ToolCtx = {
  actor: CommActor;
  conversationUserId: string;
  conversationOrgId?: string | null;
  dealerId?: string | null;
};

export function assertToolAllowed(name: string) {
  if (BLOCKED_TOOLS.includes(name as (typeof BLOCKED_TOOLS)[number]) || name.includes("db/query")) {
    throw new CommosError("Tool not allowed", 403, "TOOL_BLOCKED");
  }
  if (!(ALLOWED_TOOLS as readonly string[]).includes(name) && name !== "create_quotation_draft") {
    throw new CommosError("Unknown tool", 400, "UNKNOWN_TOOL");
  }
}

export async function executeTool(ctx: ToolCtx, name: string, input: Record<string, unknown>) {
  assertToolAllowed(name);
  switch (name) {
    case "search_inventory": {
      const q = String(input.q ?? "").trim();
      const rows = await prisma.vehicle.findMany({
        where: {
          deletedAt: null,
          OR: [
            { brand: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 8,
        select: { id: true, title: true, brand: true, model: true, price: true, city: true, status: true },
      });
      return { vehicles: rows, stockClaim: false };
    }
    case "inventory_by_pin": {
      const pin = String(input.pincode ?? "");
      return getInventoryByPincode(pin);
    }
    case "vehicle_detail": {
      const id = String(input.id ?? "");
      const v = await prisma.vehicle.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, title: true, brand: true, model: true, price: true, city: true, status: true, dealerId: true },
      });
      return v ?? { error: "not_found" };
    }
    case "dealer_detail": {
      const id = String(input.id ?? "");
      return prisma.dealer.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, name: true, city: true, state: true, pincode: true },
      });
    }
    case "create_enquiry": {
      throw new CommosError("Use existing enquiry API", 400, "USE_ENQUIRY_API");
    }
    case "get_lead": {
      if (!ctx.dealerId) throw new CommosError("Dealer context required", 403, "FORBIDDEN");
      const leadId = String(input.leadId ?? "");
      const lead = await requireLeadForDealer(ctx.dealerId, leadId);
      return { id: lead.id, status: lead.status, quality: lead.quality, pincode: lead.pincode };
    }
    case "update_lead_authorized": {
      if (!ctx.dealerId || (!isDealerRole(ctx.actor.role) && !isAdminRole(ctx.actor.role))) {
        throw new CommosError("Forbidden", 403, "FORBIDDEN");
      }
      const leadId = String(input.leadId ?? "");
      await requireLeadForDealer(ctx.dealerId, leadId);
      await persistLeadQuality(leadId);
      return { ok: true, qualityServerOwned: true };
    }
    case "create_crm_activity": {
      if (!ctx.dealerId) throw new CommosError("Dealer context required", 403, "FORBIDDEN");
      return createCrmActivity(ctx.actor, {
        leadId: String(input.leadId ?? ""),
        activityType: "NOTE",
        subject: String(input.subject ?? "AI note"),
        notes: String(input.notes ?? ""),
      });
    }
    case "create_followup": {
      if (!ctx.dealerId) throw new CommosError("Dealer context required", 403, "FORBIDDEN");
      return createFollowUp(ctx.actor, {
        leadId: String(input.leadId ?? ""),
        title: String(input.title ?? "Follow up"),
        dueAt: String(input.dueAt ?? new Date(Date.now() + 86400000).toISOString()),
      });
    }
    case "get_quotation": {
      const id = String(input.id ?? "");
      const q = await prisma.quotation.findFirst({
        where: { id },
        select: { id: true, status: true, dealerId: true, customerUserId: true },
      });
      if (!q) return { error: "not_found" };
      if (isDealerRole(ctx.actor.role) && ctx.dealerId && q.dealerId !== ctx.dealerId) {
        throw new CommosError("Forbidden", 403, "CROSS_TENANT");
      }
      if (ctx.actor.role === "customer" && q.customerUserId !== ctx.conversationUserId) {
        throw new CommosError("Forbidden", 403, "CROSS_TENANT");
      }
      return q;
    }
    case "create_quotation_draft": {
      throw new CommosError("Quotation drafts must use quotation service", 403, "USE_QUOTATION_API");
    }
    case "request_test_drive": {
      throw new CommosError("Use test-drive API", 400, "USE_TEST_DRIVE_API");
    }
    case "get_finance_options": {
      return {
        indicative: true,
        note: "Pre-qualification / indicative only. Not a sanction.",
        applications: await prisma.financeApplication.findMany({
          where: ctx.actor.role === "customer" ? { userId: ctx.conversationUserId } : { id: "none" },
          take: 5,
          select: { id: true, status: true },
        }),
      };
    }
    case "get_insurance_context": {
      return {
        inventedQuote: false,
        note: "Only persisted quotes are shown. No invented premium.",
        applications: await prisma.insuranceApplication.findMany({
          where: ctx.actor.role === "customer" ? { userId: ctx.conversationUserId } : { id: "none" },
          take: 5,
          select: { id: true, status: true },
        }).catch(() => []),
      };
    }
    case "get_customer_preferences": {
      if (ctx.actor.role === "customer" && ctx.conversationUserId !== ctx.actor.userId) {
        throw new CommosError("Forbidden", 403, "PII");
      }
      if (ctx.actor.role === "customer") {
        return prisma.customerPreference.findUnique({ where: { userId: ctx.conversationUserId } });
      }
      throw new CommosError("Forbidden", 403, "FORBIDDEN");
    }
    case "get_saved_searches": {
      if (ctx.actor.role !== "customer") throw new CommosError("Forbidden", 403, "FORBIDDEN");
      return prisma.savedSearch.findMany({
        where: { userId: ctx.conversationUserId },
        take: 10,
        select: { id: true, name: true, criteria: true },
      });
    }
    default:
      throw new CommosError("Unknown tool", 400, "UNKNOWN_TOOL");
  }
}

export function qualityFromSignals(input: {
  hasVehicle: boolean;
  hasBudget: boolean;
  hasTimeline: boolean;
  hasPin: boolean;
  financeRequired: boolean;
  exchangeRequired: boolean;
}) {
  return calculateLeadQuality({
    hasVerifiedContact: true,
    hasVehicle: input.hasVehicle,
    hasBudget: input.hasBudget,
    hasTimeline: input.hasTimeline,
    financeRequired: input.financeRequired,
    exchangeRequired: input.exchangeRequired,
    hasValidPin: input.hasPin,
    repeatedEnquiry: false,
    quotationExists: false,
    testDriveExists: false,
  });
}
