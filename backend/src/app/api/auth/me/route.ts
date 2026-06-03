import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, unauthorized } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return unauthorized();

  return ok({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      approvalStatus: user.approvalStatus,
      kycStatus: user.kycStatus,
      companyName: user.companyName,
      city: user.city,
      state: user.state,
      createdAt: user.createdAt.toISOString(),
      emailVerified: user.emailVerified,
      metadata: user.metadata,
    },
  });
}
