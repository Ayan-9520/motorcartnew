import type { NextRequest } from "next/server";
import { featureFlags } from "@/config/feature-flags";
import { getAuthUser } from "@/lib/auth/middleware";
import type { JwtPayload } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { err, unauthorized, forbidden } from "@/lib/api-response";
import { assertWorkspaceAccess, isPendingBusinessAccess } from "@/lib/auth/account-access";
import type { Broker } from "@prisma/client";

export type BrokerApiFlag = "crm" | "contacts" | "leads" | "marketplaceBridge";

const FLAG_CHECKS: Record<BrokerApiFlag, () => boolean> = {
  crm: () => featureFlags.brokerCrm,
  contacts: () => featureFlags.brokerContacts,
  leads: () => featureFlags.brokerLeads,
  marketplaceBridge: () => featureFlags.brokerMarketplaceBridge,
};

const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export type BrokerContext = {
  auth: JwtPayload;
  broker: Broker;
};

export async function requireBrokerContext(
  req: NextRequest,
  flag: BrokerApiFlag
): Promise<{ ctx: BrokerContext } | { response: Response }> {
  if (!FLAG_CHECKS[flag]()) {
    return { response: err("Not found", 404) };
  }

  const auth = getAuthUser(req);
  if (!auth) return { response: unauthorized() };

  try {
    const access = await assertWorkspaceAccess(auth);
    if (isPendingBusinessAccess(access)) {
      return { response: forbidden("Account pending admin approval.") };
    }
  } catch {
    return { response: unauthorized() };
  }

  if (auth.role !== "broker" && !ADMIN_ROLES.has(auth.role)) {
    return { response: forbidden("Broker workspace only") };
  }

  const broker =
    auth.role === "broker"
      ? await prisma.broker.findFirst({ where: { ownerId: auth.sub } })
      : null;

  if (!broker) {
    return { response: forbidden("Broker profile not found") };
  }

  return { ctx: { auth, broker } };
}
