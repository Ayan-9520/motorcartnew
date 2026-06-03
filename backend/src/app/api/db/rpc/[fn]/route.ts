import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth/middleware";
import {
  isPendingBusinessAccess,
  loadUserAccess,
} from "@/lib/auth/account-access";
import { ok, err, unauthorized, forbidden } from "@/lib/api-response";
import { runRpc } from "@/lib/db/rpc-handlers";

const PENDING_ALLOWED_RPC = new Set(["register_device_session"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ fn: string }> }) {
  const { fn } = await ctx.params;
  const auth = getAuthUser(req);
  const args = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const publicRpc = new Set<string>();
  if (!auth && !publicRpc.has(fn)) {
    const needsAuth = !["community_notify_post_like", "community_notify_post_comment"].includes(fn);
    if (needsAuth) return unauthorized();
  }

  try {
    if (auth) {
      const access = await loadUserAccess(auth.sub);
      if (access && isPendingBusinessAccess(access) && !PENDING_ALLOWED_RPC.has(fn)) {
        return forbidden("Account pending admin approval. Workspace unlocks after approval.");
      }
    }

    const data = await runRpc(fn, args, auth);
    return ok({ data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "RPC failed";
    if (msg === "Unauthorized") return unauthorized();
    if (msg === "ACCOUNT_PENDING_APPROVAL") return forbidden(msg);
    if (msg.startsWith("Unknown RPC")) return err(msg, 404);
    return err(msg, 500);
  }
}
