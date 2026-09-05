import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDeviceKey } from "@/lib/auth-device";

export type AuthActivityAction =
  | "sign_in"
  | "sign_out"
  | "sign_up"
  | "password_reset_requested"
  | "password_updated"
  | "oauth_callback"
  | "phone_otp"
  | "email_otp"
  | "email_verify";

let deviceSessionUsesRpc = true;

function isMissingRpcError(message: string): boolean {
  return (
    message.includes("Could not find the function") ||
    message.includes("register_device_session") ||
    message.includes("PGRST202")
  );
}

/** Direct upsert when RPC is not deployed yet (migration 00010 / 00017). */
async function registerDeviceSessionFallback(
  userId: string,
  deviceKey: string,
  userAgent: string
): Promise<void> {
  const { error } = await supabase.from("device_sessions").upsert(
    {
      user_id: userId,
      device_key: deviceKey.slice(0, 128),
      user_agent: userAgent.slice(0, 512),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_key" }
  );
  if (error && import.meta.env.DEV) {
    console.warn("[motorcart:device_session] fallback", error.message);
  }
}

/** Best-effort audit row — never throws to callers. */
export async function logAuthActivity(
  action: AuthActivityAction,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;
    const { error } = await supabase.from("activity_logs").insert({
      user_id: user.id,
      action,
      metadata,
    });
    if (error && import.meta.env.DEV) {
      console.warn("[motorcart:activity_logs]", error.message);
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[motorcart:activity_logs]", e);
  }
}

export async function registerDeviceTouch(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const key = getOrCreateDeviceKey();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

    if (deviceSessionUsesRpc) {
      const { error } = await supabase.rpc("register_device_session", {
        p_device_key: key,
        p_user_agent: userAgent,
      });

      if (!error) return;

      if (isMissingRpcError(error.message)) {
        deviceSessionUsesRpc = false;
        await registerDeviceSessionFallback(user.id, key, userAgent);
        return;
      }

      if (import.meta.env.DEV) {
        console.warn("[motorcart:device_session]", error.message);
      }
      return;
    }

    await registerDeviceSessionFallback(user.id, key, userAgent);
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[motorcart:device_session]", e);
  }
}
