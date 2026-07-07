import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireDirectoryPublic } from "@/lib/directory/guard";
import { getDirectoryBusinessFeed } from "@/services/directory-feed.service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = requireDirectoryPublic();
  if ("response" in gate) return gate.response;

  const { slug } = await params;
  const business = await prisma.communityBusinessProfile.findFirst({ where: { slug } });
  if (!business) return err("Not found", 404);

  const feed = await getDirectoryBusinessFeed(business.ownerUserId);
  return ok({ data: feed });
}
