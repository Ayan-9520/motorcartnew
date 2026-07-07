import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { BILLING_PLANS, getPlanBySlug } from "@/lib/billing/plans-catalog";
import { resolveEntitlements } from "@/lib/billing/entitlements-resolver";
import {
  createBillingAccount,
  currentBillingPeriod,
  findBillingAccountForUser,
  getActiveSubscription,
  listInvoices,
  listUsageRecords,
  saveInvoices,
  saveUsageRecords,
  upsertSubscription,
} from "@/lib/billing/store";
import type {
  BillingAccount,
  BillingCycle,
  MockInvoice,
  PlanSlug,
  SubscriptionRecord,
  UsageRecord,
} from "@/lib/billing/types";
import { listStoredLeads } from "@/lib/lead-router/store";

const ROLE_ENTITY_MAP: Record<string, string> = {
  dealer: "dealer",
  used_car_dealer: "dealer",
  new_car_dealer: "dealer",
  bike_dealer: "dealer",
  truck_dealer: "dealer",
  broker: "broker",
  dsa_agent: "dsa",
  insurance_agent: "insurance_agent",
  service_center: "workshop",
  service_partner: "workshop",
  parts_seller: "parts_seller",
  influencer: "influencer",
};

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
}

async function loadBusinessProfile(businessProfileId: string) {
  return prisma.communityBusinessProfile.findFirst({
    where: { id: businessProfileId },
  });
}

export async function ensureBillingAccount(
  userId: string,
  opts?: { business_profile_id?: string | null; user_role?: string | null }
): Promise<BillingAccount> {
  const bpId = opts?.business_profile_id ?? null;
  let existing = await findBillingAccountForUser(userId, bpId);
  if (existing) return existing;

  let entityType: string | null = null;
  let entityId: string | null = null;
  let ownerId = userId;

  if (bpId) {
    const profile = await loadBusinessProfile(bpId);
    if (profile) {
      entityType = profile.entityType;
      entityId = profile.entityId;
      ownerId = profile.ownerUserId;
    }
  } else if (opts?.user_role) {
    entityType = ROLE_ENTITY_MAP[opts.user_role] ?? null;
  }

  const account = await createBillingAccount({
    owner_user_id: ownerId,
    entity_type: entityType,
    entity_id: entityId,
    business_profile_id: bpId,
  });

  const now = new Date().toISOString();
  const sub: SubscriptionRecord = {
    id: randomUUID(),
    billing_account_id: account.id,
    plan_slug: "free",
    status: "active",
    billing_cycle: "monthly",
    current_period_start: now,
    current_period_end: addMonths(now, 1),
    cancel_at_period_end: false,
    mock_payment_status: "none",
    created_at: now,
    updated_at: now,
  };
  await upsertSubscription(sub);
  return account;
}

export function listBillingPlans() {
  return BILLING_PLANS.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    tier_rank: p.tier_rank,
    price_monthly_inr: p.price_monthly_inr,
    price_annual_inr: p.price_annual_inr,
    module_entitlements: p.module_entitlements,
  }));
}

export async function getBillingEntitlements(
  userId: string,
  query: { business_profile_id?: string | null; user_role?: string | null }
) {
  const account = await ensureBillingAccount(userId, {
    business_profile_id: query.business_profile_id,
    user_role: query.user_role,
  });
  const sub = await getActiveSubscription(account.id);
  const planSlug = (sub?.plan_slug ?? "free") as PlanSlug;
  const resolved = resolveEntitlements(planSlug, account);
  return {
    billing_account_id: account.id,
    subscription_id: sub?.id ?? null,
    ...resolved,
  };
}

export async function getBillingSubscription(
  userId: string,
  query: { business_profile_id?: string | null; user_role?: string | null }
) {
  const account = await ensureBillingAccount(userId, query);
  const sub = await getActiveSubscription(account.id);
  const plan = getPlanBySlug(sub?.plan_slug ?? "free");
  return {
    billing_account: account,
    subscription: sub,
    plan: plan
      ? {
          slug: plan.slug,
          name: plan.name,
          tier_rank: plan.tier_rank,
          price_monthly_inr: plan.price_monthly_inr,
          price_annual_inr: plan.price_annual_inr,
        }
      : null,
    payments_note:
      "Mock subscription only. Razorpay, Stripe, GST invoices, and auto-renew are not enabled (N2.1).",
  };
}

export async function changeBillingSubscription(
  userId: string,
  body: {
    plan_slug: string;
    billing_cycle?: BillingCycle;
    business_profile_id?: string | null;
    user_role?: string | null;
  }
) {
  const plan = getPlanBySlug(body.plan_slug);
  if (!plan) throw new Error("INVALID_PLAN");

  const account = await ensureBillingAccount(userId, {
    business_profile_id: body.business_profile_id,
    user_role: body.user_role,
  });

  const existing = await getActiveSubscription(account.id);
  const now = new Date().toISOString();
  const cycle = body.billing_cycle === "annual" ? "annual" : "monthly";

  if (existing) {
    existing.plan_slug = plan.slug;
    existing.billing_cycle = cycle;
    existing.status = "active";
    existing.mock_payment_status = "mock_paid";
    existing.current_period_start = now;
    existing.current_period_end = addMonths(now, cycle === "annual" ? 12 : 1);
    existing.updated_at = now;
    await upsertSubscription(existing);
  } else {
    const sub: SubscriptionRecord = {
      id: randomUUID(),
      billing_account_id: account.id,
      plan_slug: plan.slug,
      status: "active",
      billing_cycle: cycle,
      current_period_start: now,
      current_period_end: addMonths(now, cycle === "annual" ? 12 : 1),
      cancel_at_period_end: false,
      mock_payment_status: "mock_paid",
      created_at: now,
      updated_at: now,
    };
    await upsertSubscription(sub);
  }

  const sub = await getActiveSubscription(account.id);
  if (sub) {
    const invoices = await listInvoices();
    const inv: MockInvoice = {
      id: randomUUID(),
      subscription_id: sub.id,
      invoice_number: `MOCK-INV-${Date.now()}`,
      status: "draft",
      total_inr: cycle === "annual" ? plan.price_annual_inr : plan.price_monthly_inr,
      period_start: sub.current_period_start,
      period_end: sub.current_period_end,
      created_at: now,
    };
    invoices.unshift(inv);
    if (invoices.length > 50) invoices.length = 50;
    await saveInvoices(invoices);
  }

  return getBillingSubscription(userId, body);
}

async function countListings(entityType: string | null, entityId: string | null): Promise<number> {
  if (!entityId) return 0;
  if (entityType === "dealer") {
    return prisma.vehicle.count({ where: { dealerId: entityId } }).catch(() => 0);
  }
  return 0;
}

async function countLeadRouterForUser(userId: string): Promise<number> {
  try {
    const leads = await listStoredLeads(5000, 0);
    const period = currentBillingPeriod();
    return leads.filter(
      (l) =>
        l.ownership?.owner_user_id === userId &&
        l.created_at.startsWith(period.slice(0, 7))
    ).length;
  } catch {
    return 0;
  }
}

async function readGrowthUsageReadonly(
  ownerUserId: string
): Promise<Record<string, number>> {
  const ws = await prisma.growthWorkspace.findFirst({
    where: { ownerUserId },
    include: { entitlements: true },
  });
  if (!ws?.entitlements?.usage) return {};
  const usage = ws.entitlements.usage;
  if (usage && typeof usage === "object" && !Array.isArray(usage)) {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(usage as Record<string, unknown>)) {
      if (typeof v === "number") out[k] = v;
    }
    return out;
  }
  return {};
}

export async function getBillingUsage(
  userId: string,
  query: { business_profile_id?: string | null; user_role?: string | null }
) {
  const account = await ensureBillingAccount(userId, query);
  const sub = await getActiveSubscription(account.id);
  const planSlug = (sub?.plan_slug ?? "free") as PlanSlug;
  const ent = resolveEntitlements(planSlug, account);
  const period = currentBillingPeriod();

  const listings = await countListings(account.entity_type, account.entity_id);
  const leadRouter = await countLeadRouterForUser(account.owner_user_id);
  const growthUsage = await readGrowthUsageReadonly(account.owner_user_id);

  const meters: Array<{ key: string; used: number; limit: number | null }> = [
    {
      key: "marketplace.active_listings",
      used: listings,
      limit: ent.limits["marketplace.active_listings"] ?? null,
    },
    {
      key: "growth.broadcasts_monthly",
      used: growthUsage.broadcasts_sent ?? growthUsage.broadcasts ?? 0,
      limit: ent.limits["growth.broadcasts_monthly"] ?? null,
    },
    {
      key: "growth.lead_events_monthly",
      used: growthUsage.lead_events ?? growthUsage.leads ?? 0,
      limit: ent.limits["growth.lead_events_monthly"] ?? null,
    },
    {
      key: "lead_router.ingress_monthly",
      used: leadRouter,
      limit: ent.limits["lead_router.ingress_monthly"] ?? null,
    },
  ];

  const storeRecords = await listUsageRecords();
  const overlay = storeRecords.filter(
    (r) => r.billing_account_id === account.id && r.period === period
  );

  const records: UsageRecord[] = meters.map((m) => {
    const stored = overlay.find((r) => r.meter_key === m.key);
    return {
      billing_account_id: account.id,
      period,
      meter_key: m.key,
      used: stored?.used ?? m.used,
      limit_snapshot: m.limit ?? stored?.limit_snapshot ?? 0,
      updated_at: new Date().toISOString(),
    };
  });

  await saveUsageRecords([
    ...storeRecords.filter(
      (r) => !(r.billing_account_id === account.id && r.period === period)
    ),
    ...records,
  ]);

  return {
    billing_account_id: account.id,
    period,
    plan_slug: planSlug,
    meters: records.map((r) => ({
      key: r.meter_key,
      used: r.used,
      limit: r.limit_snapshot,
      percent:
        r.limit_snapshot > 0
          ? Math.min(100, Math.round((r.used / r.limit_snapshot) * 100))
          : null,
    })),
    growth_usage_readonly: growthUsage,
    note: "Usage aggregates read-only sources plus mock store. No payment gateway.",
  };
}

export async function getBillingOverview(
  userId: string,
  query: { business_profile_id?: string | null; user_role?: string | null }
) {
  const [subscription, entitlements, usage, invoices] = await Promise.all([
    getBillingSubscription(userId, query),
    getBillingEntitlements(userId, query),
    getBillingUsage(userId, query),
    listInvoices(),
  ]);

  const subId = subscription.subscription?.id;
  const accountInvoices = subId
    ? invoices.filter((i) => i.subscription_id === subId).slice(0, 5)
    : [];

  return {
    subscription,
    entitlements,
    usage,
    invoices: accountInvoices,
    feature_flags: {
      payments: false,
      gst_invoices: false,
      auto_renew: false,
    },
  };
}
