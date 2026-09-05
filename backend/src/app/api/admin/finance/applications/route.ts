import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceDesk } from "@/lib/auth/require-finance-desk";
import { ok, unauthorized, forbidden } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

export async function GET(req: NextRequest) {
  try {
    requireFinanceDesk(req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Forbidden";
    if (msg === "UNAUTHORIZED") return unauthorized();
    return forbidden();
  }

  const rows = await prisma.financeApplication.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({ data: rows.map((r) => toSnakeRow(r as unknown as Record<string, unknown>)) });
}
