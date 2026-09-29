import { lazy, type ComponentType } from "react";

const CHUNK_RELOAD_KEY = "motorcart_chunk_reload_at";
/** Minimum gap between automatic reloads — stops a reload loop if a chunk is truly missing. */
const RELOAD_COOLDOWN_MS = 30_000;

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("unable to preload css")
  );
}

/** Hard-reload to pick up the new build; returns false when a reload happened too recently. */
export function reloadForNewBuild(): boolean {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  } catch {
    /* storage blocked */
  }
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked */
  }
  window.location.reload();
  return true;
}

/** Stale chunk hash after a deploy → reload once (per cooldown window), otherwise rethrow. */
export function recoverFromChunkError(err: unknown): never {
  if (isChunkLoadError(err)) reloadForNewBuild();
  throw err;
}

export function lazyNamedWithRetry<T extends Record<string, unknown>, K extends keyof T>(
  factory: () => Promise<T>,
  name: K
) {
  return lazy(() =>
    factory()
      .then((m) => ({ default: m[name] as ComponentType<object> }))
      .catch((err) => recoverFromChunkError(err))
  );
}
