function viteFlag(name: string, defaultOn = true): boolean {
  const v = import.meta.env[name] as string | undefined;
  if (v === undefined || v === "") return defaultOn;
  const lower = String(v).toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

/** Public marketplace shows only PostgreSQL rows — no mock catalog merge. */
export const realDataOnly = viteFlag("VITE_REAL_DATA_ONLY", true);

/** Admin dashboard mock fallback (off when real-data mode is on). */
export const adminDemoFallback =
  !realDataOnly && import.meta.env.VITE_ADMIN_DEMO_FALLBACK === "true";
