import { ok } from "@/lib/api-response";

const VERSION = process.env.npm_package_version ?? "1.0.0";

export async function GET() {
  return ok({
    name: "motorcart-api",
    version: VERSION,
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  });
}
