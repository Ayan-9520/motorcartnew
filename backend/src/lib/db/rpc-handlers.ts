import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { JwtPayload } from "@/lib/auth/jwt";
import { loadUserAccess, isPendingBusinessAccess } from "@/lib/auth/account-access";
import { emitDbChange } from "@/lib/socket-emit";
import type { FinanceStatus } from "@prisma/client";
import { ensureCommissionOnDisbursement } from "@/services/finance-commission.service";

type RpcArgs = Record<string, unknown>;

export async function runRpc(fn: string, args: RpcArgs, auth: JwtPayload | null) {
  switch (fn) {
    case "register_device_session":
      return registerDeviceSession(args, auth);
    case "place_auction_bid":
      return placeAuctionBid(args, auth);
    case "finalize_auction":
      return finalizeAuction(args, auth);
    case "register_dealer_auction":
      return { ok: true, registered: true };
    case "set_auction_auto_bid":
      return { ok: true };
    case "create_part_order":
      return createPartOrder(args, auth);
    case "submit_finance_application":
      return submitFinanceApplication(args, auth);
    case "advance_finance_application":
      return advanceFinanceApplication(args, auth);
    case "distribute_finance_lead":
      return { ok: true };
    case "update_finance_verification":
      return updateFinanceVerification(args, auth);
    case "submit_insurance_application":
      return submitInsuranceApplication(args, auth);
    case "verify_booking_otp":
      return { ok: true, verified: true };
    case "update_booking_tracking":
      return updateBookingTracking(args, auth);
    case "assign_booking_mechanic":
      return { ok: true };
    case "generate_service_invoice":
      return { ok: true, invoice_number: `INV-${Date.now()}` };
    case "community_notify_post_like":
    case "community_notify_post_comment":
    case "community_notify_new_follower":
      return { ok: true };
    default:
      throw new Error(`Unknown RPC: ${fn}`);
  }
}

async function registerDeviceSession(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  const deviceId = String(args.p_device_id ?? args.device_id ?? "web");
  await prisma.deviceSession.upsert({
    where: { userId_deviceId: { userId: auth.sub, deviceId } },
    create: { userId: auth.sub, deviceId, userAgent: String(args.p_user_agent ?? args.user_agent ?? "") },
    update: { lastSeenAt: new Date() },
  });
  return { ok: true };
}

async function placeAuctionBid(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  const auctionId = String(args.p_auction_id ?? args.auction_id);
  const amount = Number(args.p_amount ?? args.amount);
  const bid = await prisma.auctionBid.create({
    data: {
      auctionId,
      bidderId: auth.sub,
      bidderName: String(args.p_bidder_name ?? args.bidder_name ?? "Bidder"),
      amount,
      isAutoBid: Boolean(args.p_is_auto_bid ?? args.is_auto_bid),
    },
  });
  await prisma.auction.update({
    where: { id: auctionId },
    data: { currentBid: amount, bidCount: { increment: 1 } },
  });
  emitDbChange("bids", "INSERT", { new: { id: bid.id, auction_id: auctionId, amount } });
  emitDbChange("auctions", "UPDATE", { new: { id: auctionId, current_bid: amount } });
  return { ok: true, bid_id: bid.id, amount };
}

async function finalizeAuction(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  const auctionId = String(args.p_auction_id ?? args.auction_id);
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new Error("Auction not found");
  const topBid = await prisma.auctionBid.findFirst({
    where: { auctionId },
    orderBy: { amount: "desc" },
  });
  await prisma.auction.update({
    where: { id: auctionId },
    data: { status: "ended", winnerId: topBid?.bidderId ?? null },
  });
  return { ok: true };
}

async function createPartOrder(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  const items = (args.p_items ?? args.items) as { part_id: string; qty: number }[];
  const shipping = (args.p_shipping ?? args.shipping ?? {}) as Record<string, unknown>;
  let total = 0;
  for (const it of items ?? []) {
    const part = await prisma.part.findUnique({ where: { id: it.part_id } });
    if (part) total += Number(part.price) * it.qty;
  }
  const order = await prisma.partOrder.create({
    data: {
      buyerId: auth.sub,
      status: "confirmed",
      total,
      metadata: {
        shipping,
        payment_method: args.p_payment_method,
        cod: args.p_cod,
      } as Prisma.InputJsonValue,
    },
  });
  for (const it of items ?? []) {
    const part = await prisma.part.findUnique({ where: { id: it.part_id } });
    if (!part) continue;
    await prisma.partOrderItem
      .create({
        data: {
          orderId: order.id,
          productId: part.id,
          qty: it.qty,
          price: Number(part.price),
        },
      })
      .catch(() => {});
  }
  return {
    ok: true,
    order_id: order.id,
    invoice_number: `INV-MC-${Date.now()}`,
    grand_total: total,
  };
}

async function submitFinanceApplication(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");

  const access = await loadUserAccess(auth.sub);
  if (access && isPendingBusinessAccess(access)) {
    throw new Error("ACCOUNT_PENDING_APPROVAL");
  }

  const amount = Number(args.p_loan_amount ?? args.p_amount ?? args.amount ?? 0);
  const tenure = Number(args.p_tenure_months ?? args.p_tenure ?? args.tenure ?? 60);
  const bankId = (args.p_bank_id ?? args.bank_id) as string | undefined;
  const vehicleId = (args.p_vehicle_id ?? args.vehicle_id) as string | undefined;
  const interestRate = args.p_interest_rate ?? args.interest_rate ?? null;
  const monthlyIncome = args.p_monthly_income ?? args.monthly_income ?? null;
  const cibilScore = args.p_cibil_score ?? args.cibil_score ?? null;
  const employmentType = String(args.p_employment_type ?? args.employment_type ?? "salaried");
  const applicationType = String(args.p_application_type ?? args.application_type ?? "new_loan");
  const applicantMetadata = (args.p_applicant_metadata ?? args.applicant_metadata ?? {}) as object;

  const app = await prisma.financeApplication.create({
    data: {
      userId: auth.sub,
      bankId: bankId || null,
      amount,
      tenure,
      loanAmount: amount,
      tenureMonths: tenure,
      status: "submitted",
      vehicleId: vehicleId || null,
      interestRate: interestRate != null ? Number(interestRate) : null,
      cibilScore: cibilScore != null ? Number(cibilScore) : null,
      monthlyIncome: monthlyIncome != null ? BigInt(Math.round(Number(monthlyIncome))) : null,
      employmentType,
      applicationType,
      applicantMetadata: applicantMetadata as Prisma.InputJsonValue,
      documents: [],
      metadata: {
        interest_rate: interestRate,
        monthly_income: monthlyIncome,
        cibil_score: cibilScore,
        employment_type: employmentType,
        application_type: applicationType,
        vehicle_id: vehicleId ?? null,
        applicant_metadata: applicantMetadata,
        submitted_at: new Date().toISOString(),
      },
    },
  });

  await prisma.financeStatusHistory.create({
    data: {
      applicationId: app.id,
      status: "submitted",
      fromStatus: "draft",
      toStatus: "submitted",
      changedBy: auth.sub,
      note: "Application submitted by customer",
    },
  });

  return { ok: true, application_id: app.id };
}

async function advanceFinanceApplication(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");

  const reviewer = await loadUserAccess(auth.sub);
  if (!reviewer || !["super_admin", "admin", "finance_manager", "bank_nbfc"].includes(reviewer.role)) {
    throw new Error("FORBIDDEN");
  }

  const id = String(args.p_application_id ?? args.application_id);
  const status = String(args.p_status ?? args.status ?? "processing") as FinanceStatus;
  const allowed: FinanceStatus[] = ["processing", "approved", "rejected", "disbursed"];
  if (!allowed.includes(status)) throw new Error("INVALID_STATUS");

  const app = await prisma.financeApplication.findUnique({ where: { id } });
  if (!app) throw new Error("APPLICATION_NOT_FOUND");

  await prisma.$transaction(async (tx) => {
    await tx.financeApplication.update({ where: { id }, data: { status } });
    await tx.financeStatusHistory.create({
      data: {
        applicationId: id,
        status,
        fromStatus: app.status,
        toStatus: status,
        changedBy: auth.sub,
        note: String(args.p_note ?? args.p_notes ?? `Status → ${status} (${reviewer.role})`),
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

  return { ok: true };
}

async function updateFinanceVerification(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  await prisma.financeVerification.create({
    data: {
      applicationId: String(args.p_application_id ?? args.application_id),
      status: String(args.p_status ?? "pending"),
      checkType: args.p_check_type ? String(args.p_check_type) : null,
      notes: args.p_notes != null ? String(args.p_notes) : null,
      metadata: args as object,
    },
  });
  return { ok: true };
}

async function submitInsuranceApplication(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  const app = await prisma.insuranceApplication.create({
    data: {
      userId: auth.sub,
      provider: String(args.p_provider ?? args.provider ?? ""),
      status: "submitted",
      metadata: args as object,
    },
  });
  return { ok: true, application_id: app.id };
}

async function updateBookingTracking(args: RpcArgs, auth: JwtPayload | null) {
  if (!auth) throw new Error("Unauthorized");
  const bookingId = String(args.p_booking_id ?? args.booking_id);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (booking) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        metadata: {
          ...(booking.metadata as object),
          tracking: args.p_status ?? args.status,
        } as Prisma.InputJsonValue,
      },
    });
  }
  return { ok: true };
}
