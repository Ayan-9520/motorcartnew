function envFlag(name: string, defaultOn = false): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultOn;
  const lower = v.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

/** Sales OS CRM/routing (default on in local/dev). */
export function isSalesOsEnabled(): boolean {
  return envFlag("FEATURE_SALES_OS", true);
}

/** Lead Board listing/browse — default OFF; entitlement still required. */
export function isLeadBoardEnabled(): boolean {
  return envFlag("FEATURE_LEAD_BOARD", false);
}

/** Paid acquisition / credit debit — default OFF; entitlement still required. */
export function isPaidLeadsEnabled(): boolean {
  return envFlag("FEATURE_PAID_LEADS", false);
}

export function isDialerEnabled(): boolean {
  return envFlag("FEATURE_DIALER", false);
}

export function isAiCallingEnabled(): boolean {
  return envFlag("FEATURE_AI_CALLING", false);
}
