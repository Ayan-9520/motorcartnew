import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api-response";
import { requireDirectoryAuth } from "@/lib/directory/guard";
import {
  followDirectoryBusiness,
  unfollowDirectoryBusiness,
} from "@/services/directory-follow.service";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = await requireDirectoryAuth(_req);
  if ("response" in gate) return gate.response;

  const { slug } = await params;
  const business = await prisma.communityBusinessProfile.findFirst({ where: { slug } });
  if (!business) return err("Not found", 404);

  try {
    const result = await followDirectoryBusiness(gate.auth.sub, business.id);
    if (!result) return err("Not found", 404);
    return ok({ data: result }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "SELF_FOLLOW") {
      return err("Cannot follow your own business", 400);
    }
    return err("Could not follow", 400);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const gate = await requireDirectoryAuth(_req);
  if ("response" in gate) return gate.response;

  const { slug } = await params;
  const business = await prisma.communityBusinessProfile.findFirst({ where: { slug } });
  if (!business) return err("Not found", 404);

  const result = await unfollowDirectoryBusiness(gate.auth.sub, business.id);
  return ok({ data: result });
}
