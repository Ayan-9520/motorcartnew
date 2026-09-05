/**
 * SMS helper — MSG91 (default) when SMS_API_KEY is set.
 * Hostinger provides email SMTP only; mobile OTP needs an SMS gateway.
 */
export function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_API_KEY?.trim());
}

export async function sendSmsOtp(phone10: string, code: string): Promise<{ sent: boolean; skipped?: boolean }> {
  const digits = phone10.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    throw new Error("Invalid phone number");
  }

  if (!isSmsConfigured()) {
    console.warn(`[sms] SMS_API_KEY not set — OTP for +91${digits} not sent via SMS`);
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms:dev] +91${digits} OTP: ${code}`);
    }
    return { sent: false, skipped: true };
  }

  const provider = (process.env.SMS_PROVIDER || "msg91").toLowerCase();
  const sender = process.env.SMS_SENDER_ID || "MTRCRT";
  const message = `Your MotorCart OTP is ${code}. Valid for 10 minutes. Do not share.`;

  if (provider === "msg91") {
    const url = new URL("https://control.msg91.com/api/v5/flow/");
    // Fallback simple SMS API if flow id not set
    const authKey = process.env.SMS_API_KEY!;
    const templateId = process.env.SMS_TEMPLATE_ID;

    if (templateId) {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          short_url: "0",
          recipients: [{ mobiles: `91${digits}`, otp: code }],
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`MSG91 flow failed: ${res.status} ${body}`);
      }
      return { sent: true };
    }

    const qs = new URLSearchParams({
      authkey: authKey,
      mobiles: `91${digits}`,
      message,
      sender,
      route: "4",
    });
    void url;
    const res = await fetch(`https://api.msg91.com/api/sendhttp.php?${qs.toString()}`);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MSG91 send failed: ${res.status} ${body}`);
    }
    return { sent: true };
  }

  throw new Error(`Unsupported SMS_PROVIDER: ${provider}`);
}
