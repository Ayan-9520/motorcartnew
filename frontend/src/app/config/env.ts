import { z } from "zod";

/**
 * Public (Vite) environment — safe to ship to the browser.
 */
const publicEnvSchema = z.object({
  MODE: z.string().default("development"),
  VITE_API_URL: z.string().optional(),
  VITE_SOCKET_URL: z.string().optional(),
  VITE_SITE_URL: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

let cached: PublicEnv | null = null;

export function parsePublicEnv(): PublicEnv {
  if (cached) return cached;
  const raw = {
    MODE: import.meta.env.MODE,
    VITE_API_URL: import.meta.env.VITE_API_URL as string | undefined,
    VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL as string | undefined,
    VITE_SITE_URL: import.meta.env.VITE_SITE_URL as string | undefined,
  };
  const result = publicEnvSchema.safeParse(raw);
  if (!result.success) {
    console.warn("[motorcart:env] Invalid public environment", result.error.flatten().fieldErrors);
    cached = { MODE: String(raw.MODE ?? "development") };
    return cached;
  }
  cached = result.data;
  return cached;
}

export function hasApiConfig(env: PublicEnv = parsePublicEnv()): boolean {
  const url = env.VITE_API_URL ?? "";
  if (url && !url.includes("placeholder")) return true;
  return true;
}

/** @deprecated Use hasApiConfig */
export function hasSupabaseConfig(env: PublicEnv = parsePublicEnv()): boolean {
  return hasApiConfig(env);
}
