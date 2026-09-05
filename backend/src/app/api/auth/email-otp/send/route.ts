import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { z } from "zod";
import { generateOtpCode, invalidateOtps } from "@/lib/auth/otp-helpers";
import { sendMail, isSmtpConfigured } from "@/lib/mail/mail.service";
import { emailLoginOtpEmail } from "@/lib/mail/templates";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    // Always return ok to avoid email enumeration
    if (!user) {
      return ok({ sent: true });
    }

    if (user.status === "suspended" || user.status === "closed") {
      return err("Account suspended", 403);
    }

    if (!isSmtpConfigured() && process.env.NODE_ENV === "production") {
      return err("Email login is temporarily unavailable", 503);
    }

    const code = generateOtpCode(6);
    await invalidateOtps({ purpose: "email_login", email });
    await prisma.otpCode.create({
      data: {
        email,
        purpose: "email_login",
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const tpl = emailLoginOtpEmail({ fullName: user.fullName, code });
    await sendMail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text });

    return ok({ sent: true });
  } catch (e) {
    if (e instanceof z.ZodError) return err(e.errors[0]?.message ?? "Invalid input");
    console.error("[auth/email-otp/send]", e);
    return err("Failed to send login code", 500);
  }
}
