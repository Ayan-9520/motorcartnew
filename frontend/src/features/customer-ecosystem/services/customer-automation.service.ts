/**
 * Backend-ready automation for reminders, loyalty & CRM engagement.
 * Wire to Supabase cron / Edge Functions when tables are migrated.
 */
import { supabase } from "@/shared/api/client";
import type { CustomerEcosystemSnapshot, EngagementCampaign } from "../types";

export type ReminderKind = "insurance_expiry" | "service_due" | "emi_due" | "puc_expiry" | "document_expiry";

export type ScheduledReminder = {
  kind: ReminderKind;
  userId: string;
  vehicleId?: string;
  dueAt: string;
  title: string;
  channel: "push" | "email" | "in_app";
};

/** Derive reminders from ownership snapshot (client or edge function) */
export function deriveRemindersFromSnapshot(
  userId: string,
  snap: CustomerEcosystemSnapshot
): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  const now = new Date();

  for (const v of snap.vehicles) {
    if (v.insuranceDaysLeft != null && v.insuranceDaysLeft <= 30) {
      out.push({
        kind: "insurance_expiry",
        userId,
        vehicleId: v.id,
        dueAt: new Date(now.getTime() + v.insuranceDaysLeft * 86400000).toISOString(),
        title: `${v.brand} ${v.model} insurance expires in ${v.insuranceDaysLeft} days`,
        channel: "in_app",
      });
    }
    if (v.serviceDueDays != null && v.serviceDueDays <= 21) {
      out.push({
        kind: "service_due",
        userId,
        vehicleId: v.id,
        dueAt: new Date(now.getTime() + v.serviceDueDays * 86400000).toISOString(),
        title: `Service due for ${v.brand} ${v.model}`,
        channel: "push",
      });
    }
    if (v.emiDueDate) {
      out.push({
        kind: "emi_due",
        userId,
        vehicleId: v.id,
        dueAt: v.emiDueDate,
        title: `EMI due · ${v.loanLender ?? "Lender"}`,
        channel: "in_app",
      });
    }
    if (v.pucDaysLeft != null && v.pucDaysLeft <= 45) {
      out.push({
        kind: "puc_expiry",
        userId,
        vehicleId: v.id,
        dueAt: new Date(now.getTime() + v.pucDaysLeft * 86400000).toISOString(),
        title: `PUC renewal for ${v.brand} ${v.model}`,
        channel: "email",
      });
    }
  }

  for (const d of snap.documents) {
    if (d.daysUntilExpiry != null && d.daysUntilExpiry <= 30) {
      out.push({
        kind: "document_expiry",
        userId,
        dueAt: new Date(now.getTime() + d.daysUntilExpiry * 86400000).toISOString(),
        title: `${d.title} expiring soon`,
        channel: "in_app",
      });
    }
  }

  return out;
}

/** Active CRM campaigns for dashboard strip */
export function resolveEngagementCampaigns(snap: CustomerEcosystemSnapshot): EngagementCampaign[] {
  return snap.campaigns;
}

/** Persist reminder queue — no-op until `scheduled_reminders` table exists */
export async function enqueueReminders(userId: string, reminders: ScheduledReminder[]): Promise<void> {
  if (!userId || !reminders.length) return;
  const rows = reminders.map((r) => ({
    user_id: userId,
    kind: r.kind,
    vehicle_id: r.vehicleId ?? null,
    due_at: r.dueAt,
    title: r.title,
    channel: r.channel,
    status: "pending",
  }));
  const { error } = await supabase.from("scheduled_reminders").insert(rows);
  if (error?.code === "42P01" || error?.code === "PGRST205") return;
}

/** Demo automation preview */
export async function previewAutomationForUser(userId: string | undefined): Promise<{
  reminders: ScheduledReminder[];
  campaigns: EngagementCampaign[];
}> {
  const snap = userId
    ? ((await import("./customer-ecosystem.service")).fetchCustomerEcosystemSnapshot(userId))
    : null;
  const resolved = snap ? await snap : {
    vehicles: [],
    campaigns: [],
    insurance: [],
    serviceRecords: [],
    documents: [],
    notifications: [],
    insights: [],
    preferences: { profileCompletion: 0, loyaltyTier: "Bronze", rewardPointsBalance: 0 },
    widgets: [],
    timeline: [],
    insuranceClaims: [],
    unreadNotifications: 0,
    enquiries: [],
    wishlistVehicleIds: [],
    financeApplications: [],
    availability: {
      rewardsLedger: false,
      insuranceClaims: false,
      aiInsights: false,
      fastagProvider: false,
      savedSearches: false,
      documentScan: false,
    },
  } satisfies CustomerEcosystemSnapshot;
  const uid = userId ?? "anonymous";
  return {
    reminders: deriveRemindersFromSnapshot(uid, resolved),
    campaigns: resolveEngagementCampaigns(resolved),
  };
}
