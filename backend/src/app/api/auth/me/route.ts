import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized } from "@/lib/api-response";

const patchSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z
    .string()
    .min(10)
    .max(15)
    .optional()
    .transform((v) => v?.replace(/\D/g, "").slice(-10)),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
});

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

export async function PATCH(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = patchSchema.parse(await req.json());
    if (body.phone != null && body.phone.length < 10) {
      return err("Valid 10-digit phone required", 400);
    }

    const data: Record<string, string> = {};
    if (body.fullName !== undefined) data.fullName = body.fullName.trim();
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.city !== undefined) data.city = body.city.trim();
    if (body.state !== undefined) data.state = body.state.trim();
    if (!Object.keys(data).length) return err("Nothing to update", 400);

    const user = await prisma.user.update({
      where: { id: auth.sub },
      data,
    });

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
  } catch (e) {
    if (e instanceof z.ZodError) return err(e.errors[0]?.message ?? "Invalid input", 400);
    return err("Update failed", 500);
  }
}
