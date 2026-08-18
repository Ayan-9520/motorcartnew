import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized } from "@/lib/api-response";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_PROMPT = 8000;
const MAX_TOKENS = 1024;

type CompleteBody = {
  system?: unknown;
  user?: unknown;
  maxTokens?: unknown;
  temperature?: unknown;
};

function clip(value: unknown, max: number): string {
  return String(value ?? "").slice(0, max);
}

/** Server-side OpenAI proxy. Never expose OPENAI_API_KEY to the browser. */
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith("sk-your")) {
    return ok({ text: "", source: "rules" as const });
  }

  let body: CompleteBody;
  try {
    body = (await req.json()) as CompleteBody;
  } catch {
    return err("Invalid JSON", 400);
  }

  const system = clip(body.system, MAX_PROMPT);
  const user = clip(body.user, MAX_PROMPT);
  if (!system || !user) return err("system and user are required", 400);

  const maxTokensRaw = typeof body.maxTokens === "number" ? body.maxTokens : 512;
  const maxTokens = Math.min(Math.max(1, Math.floor(maxTokensRaw)), MAX_TOKENS);
  const temperatureRaw = typeof body.temperature === "number" ? body.temperature : 0.4;
  const temperature = Math.min(Math.max(0, temperatureRaw), 1);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return ok({ text: "", source: "rules" as const });
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content?.trim() ?? "";
    return ok({
      text,
      source: text ? ("openai" as const) : ("rules" as const),
      tokensUsed: json.usage?.total_tokens,
    });
  } catch {
    return ok({ text: "", source: "rules" as const });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return ok({
    configured: Boolean(apiKey && apiKey.length > 10 && !apiKey.startsWith("sk-your")),
  });
}
