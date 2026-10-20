import { NextRequest } from "next/server";
import { err, forbidden, ok, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { loadListingImage } from "@/lib/brochure/remote-image";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_IMAGES = 12;
const ANGLES = ["front", "side", "rear", "interior", "dashboard", "odometer", "engine", "tyres", "boot", "rear_seat"] as const;
const DEALER_ROLES = new Set([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
  "admin",
  "super_admin",
]);

/** AI vision: label each listing photo with its angle (front, side, rear, interior…). */
export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (!DEALER_ROLES.has(auth.role)) return forbidden("Dealer access required");

  const body = (await req.json().catch(() => ({}))) as { urls?: unknown };
  const urls = Array.isArray(body.urls)
    ? body.urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0 && u.length <= 2048).slice(0, MAX_IMAGES)
    : [];
  if (!urls.length) return err("Send at least one photo URL");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith("sk-your")) return ok({ source: "rules" as const, angles: {} });

  const images: { index: number; dataUrl: string }[] = [];
  await Promise.all(
    urls.map(async (url, index) => {
      try {
        const { buffer } = await loadListingImage(url, { maxEdge: 512, format: "jpeg" });
        images.push({ index, dataUrl: `data:image/jpeg;base64,${buffer.toString("base64")}` });
      } catch {
        /* unreadable photo — left untagged */
      }
    })
  );
  if (!images.length) return ok({ source: "rules" as const, angles: {} });
  images.sort((a, b) => a.index - b.index);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40_000);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You label vehicle listing photos. For each photo return the single best angle from: ${ANGLES.join(", ")}, or "other". ` +
              `front = exterior from the front or front 3/4; side = exterior profile; rear = exterior from the back or rear 3/4; ` +
              `interior = cabin / front seats; dashboard = steering, instrument cluster or infotainment; odometer = close-up of km reading; ` +
              `engine = engine bay; tyres = wheel or tyre close-up; boot = open boot / trunk; rear_seat = back seats. ` +
              `Reply as JSON: {"results":[{"photo":1,"angle":"front"}]}.`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Label these ${images.length} photos in order.` },
              ...images.flatMap((img, i) => [
                { type: "text", text: `Photo ${i + 1}:` },
                { type: "image_url", image_url: { url: img.dataUrl, detail: "low" } },
              ]),
            ],
          },
        ],
      }),
    });
    if (!res.ok) return ok({ source: "rules" as const, angles: {} });
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as { results?: { photo?: number; angle?: string }[] };
    const angles: Record<string, string> = {};
    const used = new Set<string>();
    for (const r of parsed.results ?? []) {
      const img = images[(Number(r.photo) || 0) - 1];
      const angle = String(r.angle ?? "");
      if (!img || !(ANGLES as readonly string[]).includes(angle) || used.has(angle)) continue;
      used.add(angle);
      angles[urls[img.index]!] = angle;
    }
    return ok({ source: "openai" as const, angles });
  } catch {
    return ok({ source: "rules" as const, angles: {} });
  } finally {
    clearTimeout(timeout);
  }
}
