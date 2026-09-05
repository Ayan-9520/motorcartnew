import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { generateOtpCode, invalidateOtps } from "@/lib/auth/otp-helpers";
import { sendSmsOtp } from "@/lib/sms/sms.service";

export async function POST(req: NextRequest) {
  const { phone } = (await req.json()) as { phone?: string };
  if (!phone) return err("Phone required");

  const normalized = phone.replace(/\D/g, "").slice(-10);
  if (normalized.length !== 10) return err("Enter a valid 10-digit mobile number");

  const code = generateOtpCode(6);
  await invalidateOtps({ purpose: "phone_login", phone: normalized });
  await prisma.otpCode.create({
    data: {
      phone: normalized,
      purpose: "phone_login",
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    const result = await sendSmsOtp(normalized, code);
    if (result.skipped && process.env.NODE_ENV === "production") {
      return err("SMS gateway is not configured. Use email login or contact support.", 503);
    }
  } catch (smsErr) {
    console.error("[otp/send] SMS failed", smsErr);
    return err("Failed to send OTP SMS", 502);
  }

  return ok({ sent: true });
}
