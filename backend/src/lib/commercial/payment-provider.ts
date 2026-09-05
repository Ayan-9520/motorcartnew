import { createHmac, timingSafeEqual } from "node:crypto";
import { CommercialError } from "./errors";
import { isPaymentGatewayEnabled, paymentWebhookSecret } from "./flags";

export type CreateOrderInput = {
  amount: number;
  currency: string;
  purpose: string;
  referenceId?: string | null;
};

export type PaymentProvider = {
  name: string;
  createOrder: (input: CreateOrderInput) => Promise<{ providerRef: string; status: string }>;
  verifyPayment: (input: { providerRef: string }) => Promise<{ paid: boolean }>;
  processWebhook: (rawBody: string, signature: string | null) => Promise<{
    eventId: string;
    providerRef: string;
    status: string;
    eventType: string;
    payload: Record<string, unknown>;
  }>;
  refund: (input: { providerRef: string; amount: number }) => Promise<{ refunded: boolean }>;
  getPaymentStatus: (providerRef: string) => Promise<string>;
};

export class ManualPaymentProvider implements PaymentProvider {
  name = "manual";

  async createOrder(input: CreateOrderInput) {
    if (!(input.amount > 0)) throw new CommercialError("Amount must be positive", 400, "INVALID_AMOUNT");
    return { providerRef: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`, status: "CREATED" };
  }

  async verifyPayment() {
    return { paid: false };
  }

  async processWebhook(rawBody: string, signature: string | null) {
    const secret = paymentWebhookSecret();
    if (!secret) throw new CommercialError("Webhook secret is not configured", 403, "WEBHOOK_SECRET_MISSING");
    if (!signature) throw new CommercialError("Missing webhook signature", 401, "WEBHOOK_SIGNATURE");
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new CommercialError("Invalid webhook signature", 401, "WEBHOOK_SIGNATURE");
    }
    const body = JSON.parse(rawBody) as {
      eventId?: string;
      providerRef?: string;
      status?: string;
      eventType?: string;
    };
    if (!body.eventId || !body.providerRef) throw new CommercialError("Invalid webhook payload", 400, "WEBHOOK_PAYLOAD");
    return {
      eventId: body.eventId,
      providerRef: body.providerRef,
      status: String(body.status ?? ""),
      eventType: String(body.eventType ?? "payment"),
      payload: body as Record<string, unknown>,
    };
  }

  async refund(_input: { providerRef: string; amount: number }): Promise<{ refunded: boolean }> {
    throw new CommercialError("Live refunds are disabled", 403, "GATEWAY_DISABLED");
  }

  async getPaymentStatus() {
    return "CREATED";
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (isPaymentGatewayEnabled()) {
    throw new CommercialError("No live payment provider adapter is configured", 403, "GATEWAY_UNCONFIGURED");
  }
  return new ManualPaymentProvider();
}
