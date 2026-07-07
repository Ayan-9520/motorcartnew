import { ok } from "@/lib/api-response";
import { DIRECTORY_MONETIZATION_PLACEHOLDERS } from "@/lib/directory/constants";
import { isDirectoryMonetizationEnabled, requireDirectoryPublic } from "@/lib/directory/guard";
import { getDirectoryHubStats } from "@/services/directory-profile.service";
import { getMonetizationConfig } from "@/services/directory-monetization.service";

export async function GET() {
  const gate = requireDirectoryPublic();
  if ("response" in gate) return gate.response;

  const stats = await getDirectoryHubStats();
  return ok({
    data: {
      categories: stats,
      monetization: DIRECTORY_MONETIZATION_PLACEHOLDERS,
      monetization_k1: isDirectoryMonetizationEnabled()
        ? { enabled: true, config: getMonetizationConfig() }
        : { enabled: false },
    },
  });
}
