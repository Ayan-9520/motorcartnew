import { ok } from "@/lib/api-response";
import { directoryMonetizationOffResponse } from "@/lib/directory/guard";
import { getMonetizationConfig } from "@/services/directory-monetization.service";

export async function GET() {
  const off = directoryMonetizationOffResponse();
  if (off) return off;
  return ok({ data: getMonetizationConfig() });
}
