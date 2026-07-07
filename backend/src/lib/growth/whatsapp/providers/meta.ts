import type { WhatsappProviderAdapter } from "./types";

/** Meta WhatsApp Cloud API — stub only (no HTTP). */
export const metaWhatsappProvider: WhatsappProviderAdapter = {
  id: "meta_cloud",
  displayName: "Meta WhatsApp Cloud API",
  capabilities: { templates: true, media: true, read_receipts: true },
  async send(input) {
    void input;
    return {
      provider: "meta_cloud" as const,
      external_id: `meta_stub_${Date.now()}`,
      status: "submitted" as const,
      stub: true as const,
    };
  },
};
