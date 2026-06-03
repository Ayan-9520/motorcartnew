import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };
  if (!phone) return err("Phone required");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const normalized = phone.replace(/\D/g, "").slice(-10);

  await prisma.otpCode.create({
    data: {
      phone: normalized,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  console.info(`[otp] Code for +91${normalized}: ${code}`);
  return ok({ sent: true });
}
