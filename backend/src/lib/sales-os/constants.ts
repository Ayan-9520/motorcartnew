export const SALES_NEVER_ALLOW_TABLES = [
  "customer_consents",
  "crm_activities",
  "opportunities",
  "opportunity_links",
  "partner_coverages",
  "lead_assignments",
  "lead_board_listings",
  "lead_acquisitions",
  "lead_credit_accounts",
  "lead_credit_ledger",
  "lead_calls",
  "crm_tasks",
  "dealer_lead_notes",
] as const;

export const LEAD_QUALITIES = ["HOT", "WARM", "COLD", "UNQUALIFIED"] as const;
export type LeadQuality = (typeof LEAD_QUALITIES)[number];

export const CALL_DISPOSITIONS = [
  "CONNECTED",
  "NO_ANSWER",
  "BUSY",
  "CALL_BACK",
  "NOT_INTERESTED",
  "WRONG_NUMBER",
] as const;
export type CallDisposition = (typeof CALL_DISPOSITIONS)[number];

export const CRM_ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "WHATSAPP",
  "EMAIL",
  "FOLLOW_UP",
  "MEETING",
  "TEST_DRIVE",
  "QUOTATION",
  "STATUS_CHANGE",
] as const;

export const OPPORTUNITY_STAGES = [
  "OPEN",
  "QUALIFIED",
  "QUOTATION",
  "TEST_DRIVE",
  "NEGOTIATION",
  "WON",
  "LOST",
  "CLOSED",
] as const;
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];

export const TERMINAL_OPPORTUNITY_STAGES = new Set(["WON", "LOST", "CLOSED"]);

export const CONSENT_CHANNELS = ["PHONE", "WHATSAPP", "SMS", "EMAIL"] as const;
export const CONSENT_PURPOSES = ["ENQUIRY_FOLLOWUP", "MARKETING", "SERVICE_UPDATES"] as const;

export const COVERAGE_DOMAINS = ["VEHICLE", "FINANCE", "INSURANCE", "PARTS", "SERVICE"] as const;
export const ROUTING_MODES = ["STANDARD", "SHARED", "EXCLUSIVE"] as const;
export const ASSIGNMENT_STATUSES = ["ASSIGNED", "ACCEPTED", "DECLINED", "RELEASED", "EXPIRED"] as const;

export const TASK_OPEN = "pending";
export const TASK_DONE = "completed";
export const TASK_CANCELLED = "cancelled";

export const SALES_PII_KEYS = [
  "phone",
  "email",
  "gst_number",
  "pan",
  "pan_number",
  "documents",
  "finance_history",
] as const;
