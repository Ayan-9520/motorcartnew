import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { featureFlags } from "@/config/feature-flags";

function configured(name: string) {
  const v = process.env[name]?.trim() ?? "";
  return Boolean(v) && !v.includes("change-me") && !v.startsWith("sk-your");
}

/** Readiness: required vs optional dependencies. Never returns secrets. */
export async function GET() {
  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const redisUrl = process.env.REDIS_URL?.trim() ?? "";
  const payload = {
    status: database ? "ready" : "not_ready",
    checks: {
      database,
      redisConfigured: Boolean(redisUrl),
      paymentGatewayFlag: featureFlags.paymentGateway,
      paymentGatewayConfigured: featureFlags.paymentGateway && Boolean(process.env.COMMERCIAL_WEBHOOK_SECRET?.trim()),
      communicationsFlag: featureFlags.communications,
      commWebhookConfigured: configured("COMM_WEBHOOK_SECRET"),
      aiKeyConfigured: configured("OPENAI_API_KEY"),
      dialerFlag: featureFlags.dialer,
      aiCallingFlag: featureFlags.aiCalling,
    },
    timestamp: new Date().toISOString(),
  };

  if (!database) return err("Database unavailable", 503);
  return ok(payload);
}
