function envFlag(name: string, defaultOn: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultOn;
  const lower = v.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes";
}

export function isCommercialEnabled() {
  return envFlag("FEATURE_COMMERCIAL_ENGINE", true);
}

/** Live payment providers stay off unless explicitly configured. */
export function isPaymentGatewayEnabled() {
  return envFlag("FEATURE_PAYMENT_GATEWAY", false);
}

export function paymentWebhookSecret() {
  return process.env.COMMERCIAL_WEBHOOK_SECRET?.trim() || "";
}
