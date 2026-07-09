import { lazy, type ComponentType } from "react";

const CHUNK_RELOAD_KEY = "motorcart_chunk_reload";

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("importing a module script failed")
  );
}

/** One automatic hard-reload per session when a stale chunk hash is requested after deploy. */
export function recoverFromChunkError(err: unknown): never {
  if (isChunkLoadError(err) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
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
