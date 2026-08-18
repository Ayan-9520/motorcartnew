/**
 * robots.txt gate for controlled live scrapes (Phase 5F).
 * Fail closed on fetch errors or explicit Disallow matches.
 */
import https from "node:https";
import { GAADI_BAZAAR_LIVE_ORIGIN } from "./gaadi-bazaar-live-urls";

export type RobotsCheckResult =
  | { allowed: true; robotsUrl: string; raw: string }
  | { allowed: false; robotsUrl: string; reason: string; raw?: string };

function pathDisallowed(robotsTxt: string, userAgent: string, path: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
  let applies = false;
  const disallows: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const ua = line.match(/^user-agent:\s*(.+)$/i);
    if (ua) {
      const value = ua[1]!.trim();
      applies = value === "*" || value.toLowerCase() === userAgent.toLowerCase();
      continue;
    }
    if (!applies) continue;
    const disallow = line.match(/^disallow:\s*(.*)$/i);
    if (disallow) {
      disallows.push(disallow[1]!.trim());
    }
  }

  for (const rule of disallows) {
    if (rule === "") continue;
    if (rule === "/") return true;
    if (path.startsWith(rule)) return true;
  }
  return false;
}

function fetchText(url: string, userAgent: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const requestOptions: https.RequestOptions & { maxHeaderSize?: number } = {
      headers: { "User-Agent": userAgent, Accept: "text/plain,*/*" },
      maxHeaderSize: 128 * 1024,
    };
    const req = https.get(
      url,
      requestOptions,
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
  });
}

export async function checkGaadiBazaarRobots(options: {
  path: string;
  userAgent: string;
}): Promise<RobotsCheckResult> {
  const robotsUrl = `${GAADI_BAZAAR_LIVE_ORIGIN}/robots.txt`;
  try {
    const res = await fetchText(robotsUrl, options.userAgent);
    if (res.status < 200 || res.status >= 300) {
      return {
        allowed: false,
        robotsUrl,
        reason: `robots.txt HTTP ${res.status} — fail closed until readable`,
      };
    }
    const raw = res.body;
    if (pathDisallowed(raw, options.userAgent, options.path)) {
      return {
        allowed: false,
        robotsUrl,
        reason: `Path ${options.path} is disallowed for user-agent ${options.userAgent}`,
        raw,
      };
    }
    return { allowed: true, robotsUrl, raw };
  } catch (err) {
    return {
      allowed: false,
      robotsUrl,
      reason: `robots.txt fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
