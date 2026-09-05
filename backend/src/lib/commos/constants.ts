export const COMMOS_NEVER_ALLOW_TABLES = [
  "communication_providers",
  "communication_policies",
  "communication_threads",
  "communication_messages",
  "communication_webhook_events",
  "call_sessions",
  "call_recordings",
  "call_transcripts",
  "ai_call_summaries",
  "ai_agent_configs",
  "ai_conversations",
  "ai_messages",
  "ai_tool_executions",
  "ai_usage_records",
] as const;

export const CHANNELS = ["WHATSAPP", "SMS", "EMAIL", "TELEPHONY", "IN_APP"] as const;
export const AGENT_TYPES = [
  "VEHICLE_SALES",
  "USED_VEHICLE",
  "FINANCE",
  "INSURANCE",
  "SERVICE",
  "PARTS",
  "LEAD_QUALIFICATION",
  "CUSTOMER_SUPPORT",
] as const;

export const ALLOWED_TOOLS = [
  "search_inventory",
  "inventory_by_pin",
  "vehicle_detail",
  "dealer_detail",
  "create_enquiry",
  "get_lead",
  "update_lead_authorized",
  "create_crm_activity",
  "create_followup",
  "get_quotation",
  "request_test_drive",
  "get_finance_options",
  "get_insurance_context",
  "get_customer_preferences",
  "get_saved_searches",
] as const;

export const BLOCKED_TOOLS = ["db_query", "generic_sql", "/api/db/query"] as const;
