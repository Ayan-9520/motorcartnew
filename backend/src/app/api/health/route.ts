import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const users = await prisma.user.count();
    const vehicles = await prisma.vehicle.count();
    return ok({
      status: "ok",
      database: "mysql",
      users,
      vehicles,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return ok({
      status: "degraded",
      database: "error",
      message: e instanceof Error ? e.message : "DB error",
    });
  }
}
