/** Empty = same-origin when served behind nginx (Docker mobile :8090 or motorcart.in). */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const WEB_SITE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://motorcart.in").replace(/\/$/, "");

/**
 * Demo account picker — OFF by default (production).
 * Only enable explicitly: EXPO_PUBLIC_SHOW_DEMO_LOGINS=true or EXPO_PUBLIC_SHOW_DEMO=1
 */
const demoFlag =
  process.env.EXPO_PUBLIC_SHOW_DEMO_LOGINS ?? process.env.EXPO_PUBLIC_SHOW_DEMO ?? "false";
export const SHOW_DEMO_LOGINS = ["1", "true", "yes"].includes(String(demoFlag).toLowerCase());

export { BRAND, CRM } from "./theme";
