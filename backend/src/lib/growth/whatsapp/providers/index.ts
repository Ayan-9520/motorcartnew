import type { WhatsappProviderId } from "../types";
import { gupshupWhatsappProvider } from "./gupshup";
import { metaWhatsappProvider } from "./meta";
import { twilioWhatsappProvider } from "./twilio";
import type { WhatsappProviderAdapter } from "./types";

const mockProvider: WhatsappProviderAdapter = {
  id: "mock",
  displayName: "MotorCart Mock (J1)",
  capabilities: { templates: true, media: false, read_receipts: false },
  async send(input) {
    void input;
    return {
      provider: "mock" as const,
      external_id: `mock_${Date.now()}`,
      status: "delivered" as const,
      stub: true as const,
    };
  },
};

const REGISTRY: Record<WhatsappProviderId, WhatsappProviderAdapter> = {
  meta_cloud: metaWhatsappProvider,
  gupshup: gupshupWhatsappProvider,
  twilio: twilioWhatsappProvider,
  mock: mockProvider,
};

export function getWhatsappProvider(id: WhatsappProviderId): WhatsappProviderAdapter {
  return REGISTRY[id] ?? mockProvider;
}

export function listWhatsappProviders() {
  return Object.values(REGISTRY).map((p) => ({
    id: p.id,
    display_name: p.displayName,
    capabilities: p.capabilities,
    live_api: false,
  }));
}

export async function sendViaProvider(
  providerId: WhatsappProviderId,
  input: { phone: string; body: string; templateKey?: string | null }
) {
  const provider = getWhatsappProvider(providerId);
  return provider.send(input);
}
