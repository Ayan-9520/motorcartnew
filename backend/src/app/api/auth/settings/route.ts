import { ok } from "@/lib/api-response";

export async function GET() {
  return ok({
    emailEnabled: true,
    phoneEnabled: true,
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    signupDisabled: false,
    mailerAutoconfirm:
      process.env.MAILER_AUTOCONFIRM === "true" || process.env.NODE_ENV !== "production",
  });
}
