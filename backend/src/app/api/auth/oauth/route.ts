import { NextRequest } from "next/server";
import { err, ok } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const { provider } = (await req.json()) as { provider?: string };
  if (provider !== "google") return err("Provider not supported", 400);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return err("Google OAuth not configured", 503);

  const redirectUri = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/auth/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`;

  return ok({ url });
}
