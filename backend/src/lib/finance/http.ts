import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { FinanceError } from "./errors";
import { isFinanceMarketplaceEnabled } from "./flags";
import { actorFromJwt, type FinanceActor } from "./access";

export function financeMarketplaceOff() {
  if (!isFinanceMarketplaceEnabled()) return err("Not found", 404);
  return null;
}

export function financeActorFrom(req: NextRequest): FinanceActor {
  const auth = getAuthUser(req);
  if (!auth) throw new FinanceError("Unauthorized", 401, "UNAUTHORIZED");
  return actorFromJwt(auth);
}

export function handleFinanceError(error: unknown) {
  if (error instanceof FinanceError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Finance request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
