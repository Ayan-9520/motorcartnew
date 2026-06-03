import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return ok({ session: null, user: null });

  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return ok({ session: null, user: null });

  return ok({
    session: {
      access_token: req.headers.get("authorization")?.replace("Bearer ", "") ?? "",
      refresh_token: "",
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        created_at: user.createdAt.toISOString(),
        email_confirmed_at: user.emailVerified ? user.emailVerifiedAt?.toISOString() : null,
        user_metadata: { full_name: user.fullName, role: user.role },
      },
    },
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
}
