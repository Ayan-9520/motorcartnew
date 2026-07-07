import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { err } from "@/lib/api-response";

export function isFounderDashboardEnabled(): boolean {
  return featureFlags.founderDashboard;
}

export function founderDashboardOffResponse(): Response | null {
  if (!isFounderDashboardEnabled()) return err("Not found", 404);
  return null;
}

export function requireFounderDashboardPublic(): { ok: true } | { response: Response } {
  const off = founderDashboardOffResponse();
  if (off) return { response: off };
  return { ok: true };
}
