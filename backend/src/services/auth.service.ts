import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import type { AppRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), deletedAt: null },
  });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Invalid login credentials");
  }
  if (user.status === "suspended" || user.status === "closed") {
    throw new Error("Account suspended");
  }
  return issueTokens(user);
}

export async function registerUser(input: {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  phone?: string;
  businessSignup?: boolean;
  companyName?: string;
  city?: string;
  state?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (await prisma.user.findFirst({ where: { email } })) {
    throw new Error("User already registered");
  }

  const role = mapRole(input.role);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName?.trim() || email.split("@")[0] || "User",
      phone: input.phone?.replace(/\D/g, "").slice(-10) || null,
      role,
      status: input.businessSignup ? "pending_verification" : "active",
      companyName: input.companyName,
      city: input.city,
      state: input.state,
    },
  });

  if (input.businessSignup) {
    const slug = `${(input.companyName ?? user.fullName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${user.id.slice(0, 6)}`;
    await prisma.dealer.create({
      data: {
        ownerId: user.id,
        name: input.companyName ?? user.fullName,
        slug,
        city: input.city ?? "Mumbai",
        state: input.state ?? "Maharashtra",
        dealerType: role,
      },
    }).catch(() => {});
  }

  if (process.env.MAILER_AUTOCONFIRM === "true") {
    return { user, ...issueTokens(user), needsEmailConfirmation: false };
  }
  return { user, needsEmailConfirmation: true };
}

function mapRole(role?: string): AppRole {
  const map: Record<string, AppRole> = {
    preowned_dealer: "used_car_dealer",
    service_partner: "service_center",
    parts_supplier: "parts_seller",
    finance_partner: "dsa_agent",
  };
  return map[role ?? ""] ?? ((role as AppRole) || "customer");
}

export function issueTokens(user: { id: string; role: AppRole; email: string | null }) {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });
  void prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(refreshToken).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken };
}

export async function requestPasswordReset(email: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: {
      email: email.trim().toLowerCase(),
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return token;
}
