import type { NextRequest } from "next/server";
import { err, forbidden, unauthorized } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth/middleware";
import { TestDriveError } from "./errors";

export type TestDriveActor = { userId: string; role: string };

export const DEALER_TEST_DRIVE_ROLES = new Set([
  "dealer",
  "used_car_dealer",
  "preowned_dealer",
  "new_car_dealer",
  "bike_dealer",
  "truck_dealer",
]);

export const ADMIN_ROLES = new Set(["admin", "super_admin"]);

export function testDriveActorFrom(req: NextRequest): TestDriveActor {
  const auth = getAuthUser(req);
  if (!auth) throw new TestDriveError("Unauthorized", 401, "UNAUTHORIZED");
  return { userId: auth.sub, role: auth.role };
}

export function isDealerTestDriveRole(role: string): boolean {
  return DEALER_TEST_DRIVE_ROLES.has(role);
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function handleTestDriveError(error: unknown) {
  if (error instanceof TestDriveError) {
    if (error.status === 401) return unauthorized(error.message);
    if (error.status === 403) return forbidden(error.message);
    return err(error.message, error.status);
  }
  const msg = error instanceof Error ? error.message : "Test-drive request failed";
  if (msg === "UNAUTHORIZED") return unauthorized();
  if (msg === "FORBIDDEN") return forbidden();
  return err(msg, 400);
}
