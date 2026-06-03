import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { ok, err } from "@/lib/api-response";
import { formatAuthUser } from "@/lib/auth/format-user";
import { z } from "zod";
import { createHash } from "crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });

    if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      return err("Invalid login credentials", 401);
    }

    if (user.status === "suspended" || user.status === "closed") {
      return err("Account suspended", 403);
    }

    if (!user.emailVerified && process.env.NODE_ENV !== "production") {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      });
      user.emailVerified = true;
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ sub: user.id });

    try {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash("sha256").update(refreshToken).digest("hex"),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (tokenErr) {
      console.error("[auth/login] refresh token", tokenErr);
      if (process.env.NODE_ENV === "production") {
        return err("Login failed — session storage error", 500);
      }
    }

    return ok({
      accessToken,
      refreshToken,
      user: formatAuthUser(user),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return err(e.errors[0]?.message ?? "Invalid input");
    console.error("[auth/login]", e);
    const msg = e instanceof Error ? e.message : "Login failed";
    return err(msg, 500);
  }
}
