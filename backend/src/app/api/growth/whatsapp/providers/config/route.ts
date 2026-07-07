import { ok } from "@/lib/api-response";
import { growthFlagOffResponse } from "@/lib/growth/guard";
import { getWhatsappArchitectureConfig } from "@/services/growth-whatsapp-architecture.service";

export async function GET() {
  const off = growthFlagOffResponse("whatsappProviders");
  if (off) return off;
  return ok({ data: getWhatsappArchitectureConfig() });
}
