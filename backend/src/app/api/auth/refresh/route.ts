import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { ok, err, unauthorized } from "@/lib/api-response";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  const { refreshToken } = (await req.json()) as { refreshToken?: string };
  if (!refreshToken) return unauthorized();

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return unauthorized("Invalid refresh token");

  const hash = createHash("sha256").update(refreshToken).digest("hex");
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash: hash, expiresAt: { gt: new Date() } },
  });
  if (!stored) return unauthorized("Refresh token revoked");

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.deletedAt) return unauthorized();

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const newRefresh = signRefreshToken({ sub: user.id });

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: {
      tokenHash: createHash("sha256").update(newRefresh).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return ok({ accessToken, refreshToken: newRefresh });
}
