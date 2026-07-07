import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";

function databaseProvider(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres")) return "postgresql";
  return "unknown";
}

export async function GET() {
  const provider = databaseProvider();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    const vehicles = await prisma.vehicle.count();
    return ok({
      status: "ok",
      database: provider,
      users,
      vehicles,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return ok({
      status: "degraded",
      database: provider,
      message: e instanceof Error ? e.message : "DB error",
      timestamp: new Date().toISOString(),
    });
  }
}
