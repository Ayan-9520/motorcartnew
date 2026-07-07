import { ok } from "@/lib/api-response";
import { growthFlagOffResponse } from "@/lib/growth/guard";
import { getSocialSchedulerConfig } from "@/services/growth-social-scheduler.service";

export async function GET() {
  const off = growthFlagOffResponse("socialScheduler");
  if (off) return off;
  return ok({ data: getSocialSchedulerConfig() });
}
