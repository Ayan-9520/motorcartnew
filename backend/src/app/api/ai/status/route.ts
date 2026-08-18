import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";

/** Public: whether the server has an OpenAI key. Never returns the key. */
export async function GET(_req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return ok({
    configured: Boolean(apiKey && apiKey.length > 10 && !apiKey.startsWith("sk-your")),
  });
}
