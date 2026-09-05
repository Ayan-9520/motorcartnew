import { ok } from "@/lib/api-response";
import { isSmtpConfigured } from "@/lib/mail/mail.service";
import { isSmsConfigured } from "@/lib/sms/sms.service";

export async function GET() {
  const autoConfirm = process.env.MAILER_AUTOCONFIRM === "true";
  return ok({
    emailEnabled: true,
    phoneEnabled: true,
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    signupDisabled: false,
    mailerAutoconfirm: autoConfirm,
    emailOtpEnabled: isSmtpConfigured() || process.env.NODE_ENV !== "production",
    smsConfigured: isSmsConfigured(),
  });
}
