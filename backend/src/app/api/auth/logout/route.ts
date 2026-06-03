import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBearerToken } from "@/lib/auth/middleware";
import { verifyRefreshToken } from "@/lib/auth/jwt";
import { ok } from "@/lib/api-response";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { refreshToken?: string };
  const token = body.refreshToken;
  if (token) {
    const payload = verifyRefreshToken(token);
    if (payload) {
      const hash = createHash("sha256").update(token).digest("hex");
      await prisma.refreshToken.deleteMany({ where: { userId: payload.sub, tokenHash: hash } });
    }
  } else {
    const access = getBearerToken(req);
    if (access) {
      const { verifyAccessToken } = await import("@/lib/auth/jwt");
      const p = verifyAccessToken(access);
      if (p) await prisma.refreshToken.deleteMany({ where: { userId: p.sub } });
    }
  }
  return ok({ success: true });
}
