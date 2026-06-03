import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { ok, err } from "@/lib/api-response";
import { createHash } from "crypto";

/** Exchange Google OAuth code for JWT session */
export async function POST(req: NextRequest) {
  const { code } = (await req.json()) as { code?: string };
  if (!code) return err("Code required");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return err("OAuth not configured", 503);

  const redirectUri = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/auth/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) return err("OAuth token exchange failed", 400);
  const tokens = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) return err("Failed to fetch profile", 400);
  const profile = (await profileRes.json()) as { id: string; email: string; name?: string };

  let user = await prisma.user.findFirst({ where: { email: profile.email.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email.toLowerCase(),
        fullName: profile.name ?? profile.email.split("@")[0] ?? "User",
        role: "customer",
        emailVerified: true,
        isVerified: true,
      },
    });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(refreshToken).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return ok({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      metadata: { full_name: user.fullName, role: user.role },
    },
  });
}
