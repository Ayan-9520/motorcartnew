import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";

/** Liveness only — process is up. Does not prove PostgreSQL is reachable. */
export async function GET() {
  return ok({
    status: "ok",
    service: "motorcart-api",
    timestamp: new Date().toISOString(),
  });
}
