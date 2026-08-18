import type { Lead, LeadStatus } from "@prisma/client";

export const UNASSIGNED_DEALER_SLUG = "motorcart-unassigned";
export const ENQUIRY_DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

/** UI / pipeline labels. Persist using existing LeadStatus + metadata — no enum change. */
export const ENQUIRY_PIPELINE_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "QUALIFIED",
  "CONVERTED",
  "LOST",
  "CLOSED",
] as const;

export type EnquiryPipelineStatus = (typeof ENQUIRY_PIPELINE_STATUSES)[number];
export type EnquiryAssignment = "assigned" | "unassigned";

export type CustomerEnquiryInput = {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  notes?: string;
  message?: string;
  vehicle_id?: string;
  vehicle_title?: string;
  vehicle_slug?: string;
  dealer_id?: string;
  dealer_slug?: string;
  category?: string;
  location?: string;
  preferred_contact?: string;
  consent?: boolean;
  metadata?: Record<string, unknown>;
};

export type CustomerEnquiryResult = {
  lead: Lead;
  assignment: EnquiryAssignment;
  duplicate: boolean;
  pipelineStatus: EnquiryPipelineStatus;
};

export function pickEnquiryDealer<T extends { slug: string }>(args: {
  vehicleDealer: T | null;
  requestDealer: T | null;
  unassigned: T;
}): { dealer: T; assignment: EnquiryAssignment } {
  if (args.vehicleDealer && args.vehicleDealer.slug !== UNASSIGNED_DEALER_SLUG) {
    return { dealer: args.vehicleDealer, assignment: "assigned" };
  }
  if (args.requestDealer && args.requestDealer.slug !== UNASSIGNED_DEALER_SLUG) {
    return { dealer: args.requestDealer, assignment: "assigned" };
  }
  return { dealer: args.unassigned, assignment: "unassigned" };
}

export function isWithinDuplicateWindow(
  createdAt: Date,
  now: Date,
  windowMs = ENQUIRY_DUPLICATE_WINDOW_MS,
): boolean {
  const delta = now.getTime() - createdAt.getTime();
  return delta >= 0 && delta < windowMs;
}

export function mapLeadToPipelineStatus(
  status: LeadStatus,
  metadata: Record<string, unknown> | null | undefined,
): EnquiryPipelineStatus {
  const assignment = metadata?.assignment === "unassigned" ? "unassigned" : metadata?.assignment === "assigned" ? "assigned" : null;
  if (metadata?.closed === true || metadata?.pipeline_status === "CLOSED") return "CLOSED";
  switch (status) {
    case "contacted":
      return "CONTACTED";
    case "qualified":
      return "QUALIFIED";
    case "converted":
      return "CONVERTED";
    case "lost":
      return "LOST";
    case "new":
    default:
      if (assignment === "assigned") return "ASSIGNED";
      return "NEW";
  }
}
