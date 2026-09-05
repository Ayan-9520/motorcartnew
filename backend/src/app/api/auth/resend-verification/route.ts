import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { generateOtpCode, invalidateOtps, siteBaseUrl } from "@/lib/auth/otp-helpers";
import { sendMail } from "@/lib/mail/mail.service";
import { signupVerifyEmail } from "@/lib/mail/templates";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email) return err("Email required");
  const normalized = email.trim().toLowerCase();

  if (process.env.MAILER_AUTOCONFIRM === "true") {
    await prisma.user.updateMany({
      where: { email: normalized },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
    return ok({ sent: true, verified: true });
  }

  const user = await prisma.user.findFirst({ where: { email: normalized, deletedAt: null } });
  if (!user) {
    return ok({ sent: true });
  }
  if (user.emailVerified) {
    return ok({ sent: true, verified: true });
  }

  const recent = await prisma.otpCode.findFirst({
    where: {
      email: normalized,
      purpose: "signup_verify",
      createdAt: { gt: new Date(Date.now() - 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    return err("Please wait a minute before requesting another code", 429);
  }

  const code = generateOtpCode(6);
  await invalidateOtps({ purpose: "signup_verify", email: normalized });
  await prisma.otpCode.create({
    data: {
      email: normalized,
      purpose: "signup_verify",
      code,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const business = user.status === "pending_verification" || Boolean(user.approvalStatus);
  const verifyUrl = `${siteBaseUrl()}/verify-email?email=${encodeURIComponent(normalized)}&code=${code}`;
  const tpl = signupVerifyEmail({
    fullName: user.fullName,
    code,
    verifyUrl,
    business,
  });
  try {
    const result = await sendMail({ to: normalized, subject: tpl.subject, html: tpl.html, text: tpl.text });
    if (!result.sent) {
      console.error("[resend-verification] SMTP skipped — mail not delivered to", normalized);
      return err("Email service is not configured. Contact support or try again later.", 503);
    }
  } catch (mailErr) {
    console.error("[resend-verification] send failed", mailErr);
    return err("Could not send verification email. Check spam later or try again.", 502);
  }

  return ok({ sent: true });
}
