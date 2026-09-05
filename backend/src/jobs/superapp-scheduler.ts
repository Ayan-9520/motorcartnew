/**
 * Batch 9 scheduler entry points (in-app only).
 * Wire to an existing worker/cron if one is deployed. Do not poll inventory on a high-frequency loop.
 */
import { runSavedSearchNotifications } from "@/services/saved-search.service";
import { notifyDueReminders, syncSystemReminders } from "@/services/reminder.service";
import { expireStaleOffers } from "@/services/sale-request.service";
import { prisma } from "@/lib/prisma";

export async function runSuperAppJobs() {
  await expireStaleOffers();
  const users = await prisma.scheduledReminder.findMany({ distinct: ["userId"], select: { userId: true } });
  for (const u of users) await syncSystemReminders(u.userId);
  const reminders = await notifyDueReminders();
  const matches = await runSavedSearchNotifications();
  return { reminders, matches };
}
