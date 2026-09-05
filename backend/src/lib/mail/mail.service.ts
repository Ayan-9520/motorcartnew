import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getMailFrom(): string {
  return process.env.MAIL_FROM?.trim() || process.env.SMTP_USER || "noreply@motorcart.in";
}

function getTransporter(): Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || "465");
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; skipped?: boolean }> {
  const tx = getTransporter();
  if (!tx) {
    console.warn(
      `[mail] SMTP not configured — skipping send to ${input.to} (${input.subject})`,
    );
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:dev] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`);
    }
    return { sent: false, skipped: true };
  }

  await tx.sendMail({
    from: getMailFrom(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { sent: true };
}
