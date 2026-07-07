/** Race a promise against a timeout — prevents pages hanging on slow/unreachable API. */
export function withApiTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("API_TIMEOUT")), ms);
    }),
  ]);
}

export function isApiTimeout(err: unknown): boolean {
  return err instanceof Error && err.message === "API_TIMEOUT";
}

/** `fetch` with AbortController timeout — for services that don't use axios. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  ms = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}
