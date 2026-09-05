import { prisma } from "@/lib/prisma";
import { SalesOsError } from "@/lib/sales-os/errors";
import { ROUTING_MODES } from "@/lib/sales-os/constants";
import { publicBoardCard, acquiredLeadContact } from "@/lib/sales-os/serialize";
import {
  assertLeadBoardAccess,
  assertPaidLeadsAccess,
  notifyDealer,
  requireDealerContext,
  writeAudit,
} from "@/lib/sales-os/access";
import { isAdminRole, type SalesActor } from "@/lib/sales-os/http";
import { persistLeadQuality } from "@/services/sales-crm.service";

async function ensureAccount(dealerId: string) {
  return prisma.leadCreditAccount.upsert({
    where: { dealerId },
    create: { dealerId, balance: 0 },
    update: {},
  });
}

export async function grantCredits(actor: SalesActor, dealerId: string, amount: number, reason: string) {
  if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
  if (!Number.isInteger(amount) || amount === 0) throw new SalesOsError("Invalid amount", 400, "INVALID_AMOUNT");
  const entryType = amount > 0 ? "CREDIT" : "ADJUSTMENT";
  return prisma.$transaction(async (tx) => {
    const account = await tx.leadCreditAccount.upsert({
      where: { dealerId },
      create: { dealerId, balance: 0 },
      update: {},
    });
    const next = account.balance + amount;
    if (next < 0) throw new SalesOsError("Negative balance is not allowed", 400, "NEGATIVE_BALANCE");
    await tx.leadCreditAccount.update({ where: { id: account.id }, data: { balance: next } });
    const ledger = await tx.leadCreditLedger.create({
      data: {
        accountId: account.id,
        entryType,
        amount,
        balanceAfter: next,
        reason: reason.slice(0, 160),
        actorUserId: actor.userId,
      },
    });
    return { account: { ...account, balance: next }, ledger };
  }).then(async (result) => {
    await writeAudit(actor, "credits.grant", { dealerId, amount, reason });
    return result;
  });
}

export async function getCredits(actor: SalesActor) {
  const dealer = await requireDealerContext(actor);
  await assertLeadBoardAccess(dealer.id);
  const account = await ensureAccount(dealer.id);
  const ledger = await prisma.leadCreditLedger.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const used = ledger.filter((l) => l.entryType === "DEBIT").reduce((s, l) => s + Math.abs(l.amount), 0);
  return { available: account.balance, used, ledger };
}

export async function publishToBoard(
  actor: SalesActor,
  input: { leadId: string; creditCost: number; routingMode: string; sharedLimit?: number },
) {
  if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
  if (!Number.isInteger(input.creditCost) || input.creditCost < 0) {
    throw new SalesOsError("Invalid credit cost", 400, "INVALID_CREDIT_COST");
  }
  if (!(ROUTING_MODES as readonly string[]).includes(input.routingMode)) {
    throw new SalesOsError("Invalid sharing mode", 400, "INVALID_ROUTING_MODE");
  }
  const lead = await prisma.lead.findFirst({ where: { id: input.leadId } });
  if (!lead) throw new SalesOsError("Lead not found", 404, "LEAD_NOT_FOUND");
  const sharedLimit = input.routingMode === "EXCLUSIVE" ? 1 : Math.max(1, input.sharedLimit ?? 1);
  const meta = (lead.metadata ?? {}) as Record<string, unknown>;
  const listing = await prisma.leadBoardListing.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id,
      status: "AVAILABLE",
      routingMode: input.routingMode,
      creditCost: input.creditCost,
      sharedLimit,
      productCategory: typeof meta.category === "string" ? meta.category : null,
      city: typeof meta.location === "string" ? meta.location : null,
      pincode: lead.pincode,
      publishedBy: actor.userId,
    },
    update: {
      status: "AVAILABLE",
      routingMode: input.routingMode,
      creditCost: input.creditCost,
      sharedLimit,
      acquireCount: 0,
      withdrawnAt: null,
      publishedBy: actor.userId,
      publishedAt: new Date(),
    },
  });
  await writeAudit(actor, "lead_board.publish", { listingId: listing.id, leadId: lead.id, creditCost: input.creditCost });
  return listing;
}

export async function withdrawFromBoard(actor: SalesActor, listingId: string) {
  if (!isAdminRole(actor.role)) throw new SalesOsError("Forbidden", 403, "FORBIDDEN");
  const listing = await prisma.leadBoardListing.findFirst({ where: { id: listingId } });
  if (!listing) throw new SalesOsError("Listing not found", 404, "LISTING_NOT_FOUND");
  const updated = await prisma.leadBoardListing.update({
    where: { id: listing.id },
    data: { status: "WITHDRAWN", withdrawnAt: new Date() },
  });
  await writeAudit(actor, "lead_board.withdraw", { listingId });
  return updated;
}

export async function listBoard(actor: SalesActor) {
  const dealer = await requireDealerContext(actor);
  await assertLeadBoardAccess(dealer.id);
  const rows = await prisma.leadBoardListing.findMany({
    where: { status: "AVAILABLE" },
    include: { lead: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  return rows.map((r) => publicBoardCard(r));
}

export async function getBoardItem(actor: SalesActor, listingId: string) {
  const dealer = await requireDealerContext(actor);
  await assertLeadBoardAccess(dealer.id);
  const row = await prisma.leadBoardListing.findFirst({
    where: { id: listingId },
    include: { lead: true, acquisitions: true },
  });
  if (!row || row.status !== "AVAILABLE") throw new SalesOsError("Listing not available", 404, "NOT_AVAILABLE");
  const owned = row.acquisitions.some((a) => a.dealerId === dealer.id);
  const card = publicBoardCard(row);
  if (!owned) return { ...card, contact: null };
  return { ...card, contact: acquiredLeadContact(row.lead) };
}

export async function acquireBoardLead(actor: SalesActor, listingId: string) {
  const dealer = await requireDealerContext(actor);
  await assertPaidLeadsAccess(dealer.id);

  const result = await prisma.$transaction(async (tx) => {
    const listing = await tx.leadBoardListing.findFirst({
      where: { id: listingId },
      include: { lead: true },
    });
    if (!listing) {
      throw new SalesOsError("Listing not available", 409, "NOT_AVAILABLE");
    }
    const existing = await tx.leadAcquisition.findFirst({
      where: { listingId, dealerId: dealer.id },
    });
    if (existing) throw new SalesOsError("Already acquired", 409, "DUPLICATE_ACQUISITION");
    if (listing.status !== "AVAILABLE") {
      throw new SalesOsError("Listing not available", 409, "NOT_AVAILABLE");
    }
    if (listing.routingMode === "EXCLUSIVE" && listing.acquireCount >= 1) {
      throw new SalesOsError("Exclusive lead already acquired", 409, "EXCLUSIVE_TAKEN");
    }
    if (listing.acquireCount >= listing.sharedLimit) {
      throw new SalesOsError("No remaining slots", 409, "SOLD_OUT");
    }

    const account = await tx.leadCreditAccount.upsert({
      where: { dealerId: dealer.id },
      create: { dealerId: dealer.id, balance: 0 },
      update: {},
    });
    if (account.balance < listing.creditCost) {
      throw new SalesOsError("Insufficient credits", 402, "INSUFFICIENT_CREDITS");
    }
    const next = account.balance - listing.creditCost;
    if (next < 0) throw new SalesOsError("Negative balance is not allowed", 400, "NEGATIVE_BALANCE");

    await tx.leadCreditAccount.update({ where: { id: account.id }, data: { balance: next } });
    const ledger = await tx.leadCreditLedger.create({
      data: {
        accountId: account.id,
        entryType: "DEBIT",
        amount: -listing.creditCost,
        balanceAfter: next,
        reason: `acquire:${listing.id}`,
        actorUserId: actor.userId,
        metadata: { listingId, leadId: listing.leadId },
      },
    });

    const acquireCount = listing.acquireCount + 1;
    const fulfilled =
      listing.routingMode === "EXCLUSIVE" || acquireCount >= listing.sharedLimit ? "FULFILLED" : "AVAILABLE";
    const claimed = await tx.leadBoardListing.updateMany({
      where: {
        id: listing.id,
        status: "AVAILABLE",
        acquireCount: listing.acquireCount,
      },
      data: { acquireCount, status: fulfilled },
    });
    if (claimed.count !== 1) throw new SalesOsError("Listing not available", 409, "NOT_AVAILABLE");

    const acquisition = await tx.leadAcquisition.create({
      data: {
        listingId: listing.id,
        dealerId: dealer.id,
        acquiredBy: actor.userId,
        creditCost: listing.creditCost,
        ledgerId: ledger.id,
      },
    });

    await tx.lead.update({
      where: { id: listing.leadId },
      data: { dealerId: dealer.id },
    });
    await tx.leadAssignment.create({
      data: {
        leadId: listing.leadId,
        dealerId: dealer.id,
        assignedUserId: actor.userId,
        routingReason: `lead_board:${listing.routingMode}:credits:${listing.creditCost}`,
        routingMode: listing.routingMode,
        status: "ASSIGNED",
      },
    });

    return { listing, acquisition, contact: acquiredLeadContact(listing.lead), ledger };
  });

  await persistLeadQuality(result.listing.leadId);
  await writeAudit(actor, "lead_board.acquire", {
    listingId,
    dealerId: dealer.id,
    acquisitionId: result.acquisition.id,
  });
  await notifyDealer(dealer.ownerId, "Lead Board acquisition", "You acquired a Lead Board listing", {
    listingId,
    acquisitionId: result.acquisition.id,
    dedupe_key: `sales_os:acquire:${result.acquisition.id}`,
  });
  return result;
}

export async function adminListAcquisitions() {
  return prisma.leadAcquisition.findMany({
    include: { listing: { select: { leadId: true, routingMode: true, creditCost: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}
