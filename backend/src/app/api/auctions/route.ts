import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api-response";
import { toSnakeRow } from "@/lib/db/table-map";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const auctions = await prisma.auction.findMany({
    where: status ? { status: status as "live" | "upcoming" | "ended" | "cancelled" } : undefined,
    orderBy: { startsAt: "desc" },
    take: 50,
  });
  return ok({ data: auctions.map((a) => toSnakeRow(a as unknown as Record<string, unknown>)) });
}
