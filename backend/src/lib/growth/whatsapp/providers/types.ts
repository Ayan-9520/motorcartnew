import type { WhatsappMessageStatus, WhatsappProviderId } from "../types";

export type ProviderSendInput = {
  phone: string;
  body: string;
  templateKey?: string | null;
};

export type ProviderSendResult = {
  provider: WhatsappProviderId;
  external_id: string | null;
  status: WhatsappMessageStatus;
  stub: true;
};

export interface WhatsappProviderAdapter {
  id: WhatsappProviderId;
  displayName: string;
  capabilities: {
    templates: boolean;
    media: boolean;
    read_receipts: boolean;
  };
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}
