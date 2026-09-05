const BRAND = "MotorCart";
const ACCENT = "#16a34a";

function shell(title: string, bodyHtml: string, bodyText: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0b1220;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1220;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #1f2937;">
          <div style="font-size:20px;font-weight:700;color:${ACCENT};">${BRAND}</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">India's AI-powered automotive ecosystem</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#f9fafb;">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px 24px;border-top:1px solid #1f2937;font-size:11px;color:#6b7280;">
          © ${new Date().getFullYear()} ${BRAND}. This is an automated message — please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `${BRAND} — ${title}\n\n${bodyText}\n\n© ${new Date().getFullYear()} ${BRAND}`;
  return { html, text };
}

function codeBox(code: string) {
  return `<div style="margin:20px 0;padding:16px 20px;background:#0b1220;border:1px dashed ${ACCENT};border-radius:12px;text-align:center;font-size:28px;letter-spacing:8px;font-weight:700;color:#f9fafb;">${code}</div>`;
}

export function signupVerifyEmail(opts: {
  fullName: string;
  code: string;
  verifyUrl: string;
  business?: boolean;
}) {
  const hoursNote = "This verification code and link expire in <strong>48 hours</strong>.";
  const businessNote = opts.business
    ? `<p style="color:#d1d5db;line-height:1.55;">We received your business / DSA application. Our team typically reviews applications within <strong>48 hours</strong> after email verification.</p>`
    : "";
  const bodyHtml = `
    <p style="color:#d1d5db;line-height:1.55;">Hi ${escapeHtml(opts.fullName)},</p>
    <p style="color:#d1d5db;line-height:1.55;">Welcome to ${BRAND}. Confirm your email to activate your account.</p>
    ${businessNote}
    ${codeBox(opts.code)}
    <p style="color:#9ca3af;font-size:13px;">${hoursNote}</p>
    <p style="margin:24px 0;">
      <a href="${opts.verifyUrl}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Verify email</a>
    </p>
    <p style="color:#6b7280;font-size:12px;word-break:break-all;">Or open: ${opts.verifyUrl}</p>
  `;
  const bodyText = `Hi ${opts.fullName},\n\nWelcome to ${BRAND}. Your verification code is ${opts.code}.\nValid for 48 hours.\n\nVerify: ${opts.verifyUrl}${
    opts.business
      ? "\n\nBusiness/DSA applications are typically reviewed within 48 hours after email verification."
      : ""
  }`;
  return {
    subject: `${BRAND}: Verify your email (valid 48 hours)`,
    ...shell("Verify your email", bodyHtml, bodyText),
  };
}

export function emailLoginOtpEmail(opts: { fullName: string; code: string }) {
  const bodyHtml = `
    <p style="color:#d1d5db;line-height:1.55;">Hi ${escapeHtml(opts.fullName)},</p>
    <p style="color:#d1d5db;line-height:1.55;">Use this one-time code to sign in to ${BRAND}. It expires in <strong>10 minutes</strong>.</p>
    ${codeBox(opts.code)}
    <p style="color:#9ca3af;font-size:13px;">If you did not request this, you can ignore this email.</p>
  `;
  const bodyText = `Hi ${opts.fullName},\n\nYour ${BRAND} login code is ${opts.code}. Valid for 10 minutes.`;
  return {
    subject: `${BRAND}: Your login code ${opts.code}`,
    ...shell("Sign-in code", bodyHtml, bodyText),
  };
}

export function passwordResetEmail(opts: { fullName: string; resetUrl: string }) {
  const bodyHtml = `
    <p style="color:#d1d5db;line-height:1.55;">Hi ${escapeHtml(opts.fullName)},</p>
    <p style="color:#d1d5db;line-height:1.55;">We received a request to reset your ${BRAND} password. This link expires in <strong>1 hour</strong>.</p>
    <p style="margin:24px 0;">
      <a href="${opts.resetUrl}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Reset password</a>
    </p>
    <p style="color:#6b7280;font-size:12px;word-break:break-all;">${opts.resetUrl}</p>
  `;
  const bodyText = `Hi ${opts.fullName},\n\nReset your password (valid 1 hour):\n${opts.resetUrl}`;
  return {
    subject: `${BRAND}: Reset your password`,
    ...shell("Reset password", bodyHtml, bodyText),
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
