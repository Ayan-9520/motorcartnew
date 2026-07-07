import type { WhatsappProviderAdapter } from "./types";

/** Twilio WhatsApp — stub only (no HTTP). */
export const twilioWhatsappProvider: WhatsappProviderAdapter = {
  id: "twilio",
  displayName: "Twilio",
  capabilities: { templates: true, media: true, read_receipts: true },
  async send(input) {
    void input;
    return {
      provider: "twilio" as const,
      external_id: `twilio_stub_${Date.now()}`,
      status: "submitted" as const,
      stub: true as const,
    };
  },
};
