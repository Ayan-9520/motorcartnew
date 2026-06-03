import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, unauthorized } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const rows = await prisma.notification.findMany({
    where: { userId: auth.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)) });
}
