import { api } from "@/lib/api/axios";
import { completeWithOpenAI } from "@/ai/services/openai.service";
import { fetchDealerLeads, fetchDealerVehiclesByDealerId } from "@/features/dealer-crm/services/dealer.service";
import { addLeadNote } from "@/features/dealer-crm/services/dealer-enterprise.service";
import { fetchVehiclesFromDb, mapDbToListing, updateVehicle } from "@/services/vehicle.service";
import { uploadFile } from "@/services/storage.service";
import { isPhotoAngle, type PhotoAngleMap } from "@/lib/photo-angles";
import type { DbVehicle } from "@/types/database";
import type { VehicleListing } from "@/types/vehicle";
import type { BrochureTemplateId, BrochureVehicle } from "../types";

export async function fetchStudioVehicles(dealerId: string, ownerId?: string): Promise<VehicleListing[]> {
  const rows = await fetchDealerVehiclesByDealerId(dealerId, ownerId);
  return rows.map((r) => mapDbToListing(r as DbVehicle));
}

let marketCache: Promise<VehicleListing[]> | null = null;

/** Marketplace cars for "compare with" (any brand, so a Tata dealer can compare against a Maruti). */
export async function searchCompareVehicles(q: string, excludeId?: string): Promise<VehicleListing[]> {
  marketCache ??= fetchVehiclesFromDb(500).catch(() => []);
  const pool = await marketCache;
  const needle = q.trim().toLowerCase();
  return pool
    .filter((v) => v.id !== excludeId)
    .filter((v) => !needle || `${v.brand} ${v.model} ${v.variant ?? ""}`.toLowerCase().includes(needle))
    .slice(0, 30);
}

function factsFor(v: BrochureVehicle): string {
  return [
    `${v.year} ${v.brand} ${v.model} ${v.variant}`.trim(),
    `Condition: ${v.condition}`,
    v.fuel && `Fuel: ${v.fuel}`,
    v.transmission && `Transmission: ${v.transmission}`,
    v.bodyType && `Body: ${v.bodyType}`,
    v.condition === "used" && v.kms ? `Km driven: ${v.kms}` : "",
    v.condition === "used" && v.owners ? `Owners: ${v.owners}` : "",
    ...v.specs.map((s) => `${s.label}: ${s.value}`),
    v.features.length ? `Features: ${v.features.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseJson<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

/** AI: up to 10 short poster highlights, strictly from listing facts. Returns null when AI is unavailable. */
export async function aiHighlights(v: BrochureVehicle, count = 10): Promise<string[] | null> {
  const res = await completeWithOpenAI({
    system:
      "You write short, punchy Indian car-dealer poster highlights. Use ONLY the facts given — never invent specs, awards or 'first in India' claims. " +
      `Return a JSON array of at most ${count} strings, each 2–6 words, Title Case.`,
    user: factsFor(v),
    maxTokens: 300,
    temperature: 0.5,
  });
  if (!res.text) return null;
  const list = parseJson<string[]>(res.text);
  return Array.isArray(list) ? list.map((s) => String(s).trim()).filter(Boolean).slice(0, count) : null;
}

/** AI: headline + tagline for the chosen template. */
export async function aiCopy(v: BrochureVehicle, template: BrochureTemplateId): Promise<{ headline: string; tagline: string } | null> {
  const res = await completeWithOpenAI({
    system:
      "You write Indian car-dealer poster copy. Use ONLY the facts given; no invented claims, awards or prices. " +
      'Return JSON {"headline": "max 7 words", "tagline": "max 12 words"}.',
    user: `Poster type: ${template.replace(/_/g, " ")}\n${factsFor(v)}`,
    maxTokens: 160,
    temperature: 0.6,
  });
  if (!res.text) return null;
  const out = parseJson<{ headline?: string; tagline?: string }>(res.text);
  if (!out?.headline) return null;
  return { headline: String(out.headline).trim(), tagline: String(out.tagline ?? "").trim() };
}

/** AI vision photo angle labelling (front / side / rear / interior…). */
export async function detectPhotoAngles(urls: string[]): Promise<{ source: "openai" | "rules"; angles: PhotoAngleMap }> {
  try {
    const { data } = await api.post<{ source: "openai" | "rules"; angles: Record<string, string> }>(
      "/api/brochure/photo-angles",
      { urls },
      { timeout: 60_000 }
    );
    const angles: PhotoAngleMap = {};
    for (const [url, angle] of Object.entries(data.angles ?? {})) if (isPhotoAngle(angle)) angles[url] = angle;
    return { source: data.source, angles };
  } catch {
    return { source: "rules", angles: {} };
  }
}

export async function savePhotoAngles(listing: VehicleListing, angles: PhotoAngleMap) {
  return updateVehicle(listing.id, { metadata: { ...(listing.metadata ?? {}), photoAngles: angles } });
}

export async function uploadPoster(blob: Blob, dealerId: string, name: string): Promise<string> {
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "poster";
  const file = new File([blob], `${safe}.png`, { type: blob.type || "image/png" });
  const { publicUrl } = await uploadFile("brochures", `${dealerId}-${safe}-${Date.now()}.png`, file);
  return publicUrl;
}

export function absoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export type StudioLead = { id: string; name: string; phone: string; vehicleInterest: string; createdAt: string };

export async function fetchStudioLeads(dealerId: string): Promise<StudioLead[]> {
  const rows = (await fetchDealerLeads(dealerId)) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? "Customer"),
    phone: String(r.phone ?? ""),
    vehicleInterest: String(r.vehicle_interest ?? ""),
    createdAt: String(r.created_at ?? ""),
  }));
}

export const POSTER_NOTE_PREFIX = "[Poster]";

/** Saves the poster into the lead's notes ("lead folder") so the whole team sees what was sent. */
export async function attachPosterToLead(input: {
  leadId: string;
  dealerId: string;
  authorId: string;
  title: string;
  posterUrl: string;
  listingUrl: string;
  sentVia?: string;
}) {
  const body = [
    `${POSTER_NOTE_PREFIX} ${input.title}${input.sentVia ? ` — sent via ${input.sentVia}` : ""}`,
    absoluteUrl(input.posterUrl),
    `Listing: ${input.listingUrl}`,
  ].join("\n");
  return addLeadNote({ leadId: input.leadId, dealerId: input.dealerId, authorId: input.authorId, body });
}

export function whatsappLink(phone: string | null, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const intl = digits.length === 10 ? `91${digits}` : digits.length === 12 && digits.startsWith("91") ? digits : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export type RecentPoster = { url: string; title: string; template: BrochureTemplateId; at: string };

export function loadRecentPosters(dealerId: string): RecentPoster[] {
  try {
    const raw = localStorage.getItem(`mc-brochures-${dealerId}`);
    const list = raw ? (JSON.parse(raw) as RecentPoster[]) : [];
    return Array.isArray(list) ? list.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function pushRecentPoster(dealerId: string, poster: RecentPoster) {
  const next = [poster, ...loadRecentPosters(dealerId).filter((p) => p.url !== poster.url)].slice(0, 12);
  try {
    localStorage.setItem(`mc-brochures-${dealerId}`, JSON.stringify(next));
  } catch {
    /* storage full / private mode */
  }
  return next;
}
