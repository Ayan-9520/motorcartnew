import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/api-response";
import { randomBytes } from "crypto";
import { siteBaseUrl } from "@/lib/auth/otp-helpers";
import { sendMail } from "@/lib/mail/mail.service";
import { passwordResetEmail } from "@/lib/mail/templates";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email) return err("Email required");

  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({ where: { email: normalized } });

  if (user) {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        email: normalized,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const resetUrl = `${siteBaseUrl()}/reset-password?token=${token}`;
    const tpl = passwordResetEmail({ fullName: user.fullName, resetUrl });
    await sendMail({ to: normalized, subject: tpl.subject, html: tpl.html, text: tpl.text }).catch(
      (mailErr) => {
        console.error("[forgot-password] mail failed", mailErr);
        if (process.env.NODE_ENV !== "production") {
          console.info(`[auth] Password reset token for ${normalized}: ${token}`);
        }
      },
    );
  }

  return ok({ message: "If the email exists, a reset link was sent." });
}
