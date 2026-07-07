export type WhatsappProviderId = "meta_cloud" | "gupshup" | "twilio" | "mock";

export type WhatsappMessageStatus =
  | "queued"
  | "submitted"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsappQueueItem = {
  id: string;
  workspace_id: string;
  provider: WhatsappProviderId;
  phone: string;
  template_key?: string | null;
  body?: string | null;
  status: WhatsappMessageStatus;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
};

export type WhatsappOptInRecord = {
  phone: string;
  opted_in_at: string;
  source: string;
  revoked_at?: string | null;
};

export type WhatsappDeliveryRecord = {
  message_id: string;
  provider: WhatsappProviderId;
  status: WhatsappMessageStatus;
  events: Array<{ status: WhatsappMessageStatus; at: string; note?: string }>;
};

export type WhatsappTemplateApproval = {
  template_id: string;
  provider: WhatsappProviderId;
  status: "draft" | "pending_provider" | "approved" | "rejected";
  external_ref: string | null;
  submitted_at: string | null;
  approved_at: string | null;
};
