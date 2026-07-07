import type { WhatsappProviderAdapter } from "./types";

/** Gupshup — stub only (no HTTP). */
export const gupshupWhatsappProvider: WhatsappProviderAdapter = {
  id: "gupshup",
  displayName: "Gupshup",
  capabilities: { templates: true, media: true, read_receipts: false },
  async send(input) {
    void input;
    return {
      provider: "gupshup" as const,
      external_id: `gupshup_stub_${Date.now()}`,
      status: "submitted" as const,
      stub: true as const,
    };
  },
};
