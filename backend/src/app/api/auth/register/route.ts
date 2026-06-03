import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { ok, err } from "@/lib/api-response";
import { formatAuthUser } from "@/lib/auth/format-user";
import { z } from "zod";
import { Prisma, type AppRole } from "@prisma/client";
import { createHash } from "crypto";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  business_signup: z.boolean().optional(),
  company_name: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  business: z.record(z.unknown()).optional(),
});

const VALID_ROLES = new Set<AppRole>([
  "customer",
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "dsa_agent",
  "bank_nbfc",
  "finance_manager",
  "service_center",
  "service_partner",
  "service_technician",
  "parts_seller",
  "admin",
  "super_admin",
  "auction_partner",
  "employee",
  "finance_partner",
]);

const DEALER_STUB_ROLES = new Set<AppRole>([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "parts_seller",
  "service_center",
  "service_partner",
]);

function mapRole(role?: string): AppRole {
  const map: Record<string, AppRole> = {
    preowned_dealer: "used_car_dealer",
    service_partner: "service_center",
  };
  const raw = (role ?? "customer") as AppRole;
  const mapped = map[raw] ?? raw;
  return VALID_ROLES.has(mapped) ? mapped : "customer";
}

function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? digits : null;
}

function buildUserMetadata(body: z.infer<typeof schema>, business: boolean) {
  const { password: _pw, email: _em, ...rest } = body;
  return {
    ...rest,
    business_signup: business,
    ...(body.business ? { business: body.business } : {}),
    onboarding_status: business ? "submitted" : undefined,
    approval_status: business ? "pending" : undefined,
  };
}

function duplicateMessage(target: unknown): string {
  const fields = Array.isArray(target) ? target.join(",") : String(target ?? "");
  if (fields.includes("phone")) {
    return "This mobile number is already registered. Sign in or use a different number.";
  }
  if (fields.includes("email")) {
    return "An account with this email already exists. Sign in instead.";
  }
  return "User already registered";
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();
    const phone = normalizePhone(body.phone);

    const existingEmail = await prisma.user.findFirst({ where: { email } });
    if (existingEmail) return err("An account with this email already exists. Sign in instead.", 409);

    if (phone) {
      const existingPhone = await prisma.user.findFirst({ where: { phone } });
      if (existingPhone) {
        return err("This mobile number is already registered. Sign in or use a different number.", 409);
      }
    }

    const business = body.business_signup === true;
    const autoConfirm = process.env.MAILER_AUTOCONFIRM === "true";
    const role = mapRole(body.role);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(body.password),
        fullName: body.full_name?.trim() || email.split("@")[0] || "User",
        phone,
        role,
        status: business ? "pending_verification" : "active",
        emailVerified: autoConfirm,
        emailVerifiedAt: autoConfirm ? new Date() : null,
        isVerified: autoConfirm && !business,
        companyName: body.company_name?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        onboardingStatus: business ? "submitted" : null,
        approvalStatus: business ? "pending" : null,
        profileCompletion: business ? 65 : 0,
        metadata: buildUserMetadata(body, business),
      },
    });

    if (business && DEALER_STUB_ROLES.has(user.role)) {
      const slug = (body.company_name ?? user.fullName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 48);
      await prisma.dealer
        .create({
          data: {
            ownerId: user.id,
            name: body.company_name ?? user.fullName,
            slug: `${slug}-${user.id.slice(0, 6)}`,
            city: body.city ?? "Mumbai",
            state: body.state ?? "Maharashtra",
            phone,
            email,
            dealerType: user.role,
            verificationStatus: "pending",
          },
        })
        .catch((dealerErr) => {
          console.warn("[register] dealer stub skipped", dealerErr);
        });
    }

    const needsEmailConfirmation = !autoConfirm;
    if (needsEmailConfirmation) {
      return ok({ user: formatAuthUser(user), needsEmailConfirmation: true });
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
      user: formatAuthUser(user),
      needsEmailConfirmation: false,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return err(e.errors[0]?.message ?? "Invalid input", 400);

    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return err(duplicateMessage(e.meta?.target), 409);
    }

    console.error("[register]", e);
    return err("Registration failed. Check backend logs and try again.", 500);
  }
}
