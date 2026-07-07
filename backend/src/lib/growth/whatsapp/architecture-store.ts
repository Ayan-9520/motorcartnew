import { randomUUID } from "crypto";
import type {
  WhatsappDeliveryRecord,
  WhatsappOptInRecord,
  WhatsappQueueItem,
  WhatsappProviderId,
  WhatsappTemplateApproval,
} from "./types";

export type WhatsappArchitectureState = {
  active_provider: WhatsappProviderId;
  queue: WhatsappQueueItem[];
  opt_ins: WhatsappOptInRecord[];
  deliveries: Record<string, WhatsappDeliveryRecord>;
  template_approvals: Record<string, WhatsappTemplateApproval>;
};

const DEFAULT_STATE: WhatsappArchitectureState = {
  active_provider: "mock",
  queue: [],
  opt_ins: [],
  deliveries: {},
  template_approvals: {},
};

export function readWhatsappArchitecture(metadata: unknown): WhatsappArchitectureState {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { ...DEFAULT_STATE, queue: [], opt_ins: [], deliveries: {}, template_approvals: {} };
  }
  const root = metadata as Record<string, unknown>;
  const arch = root.whatsapp_architecture;
  if (!arch || typeof arch !== "object" || Array.isArray(arch)) {
    return { ...DEFAULT_STATE };
  }
  const a = arch as Partial<WhatsappArchitectureState>;
  return {
    active_provider: (a.active_provider as WhatsappProviderId) ?? "mock",
    queue: Array.isArray(a.queue) ? a.queue : [],
    opt_ins: Array.isArray(a.opt_ins) ? a.opt_ins : [],
    deliveries: a.deliveries && typeof a.deliveries === "object" ? a.deliveries : {},
    template_approvals:
      a.template_approvals && typeof a.template_approvals === "object"
        ? a.template_approvals
        : {},
  };
}

export function mergeWhatsappArchitecture(
  metadata: unknown,
  patch: Partial<WhatsappArchitectureState>
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const current = readWhatsappArchitecture(base);
  return {
    ...base,
    whatsapp_architecture: { ...current, ...patch },
  };
}

export function enqueueMessage(
  state: WhatsappArchitectureState,
  item: Omit<WhatsappQueueItem, "id" | "created_at" | "updated_at" | "status"> & {
    status?: WhatsappQueueItem["status"];
  }
): WhatsappArchitectureState {
  const now = new Date().toISOString();
  const row: WhatsappQueueItem = {
    id: randomUUID(),
    status: item.status ?? "queued",
    created_at: now,
    updated_at: now,
    workspace_id: item.workspace_id,
    provider: item.provider,
    phone: item.phone,
    template_key: item.template_key ?? null,
    body: item.body ?? null,
    metadata: item.metadata,
  };
  return { ...state, queue: [row, ...state.queue].slice(0, 500) };
}
