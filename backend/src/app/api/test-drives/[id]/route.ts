import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import {
  handleTestDriveError,
  readJsonBody,
  requestIp,
  testDriveActorFrom,
} from "@/lib/test-drives/http";
import { TestDriveError } from "@/lib/test-drives/errors";
import { getTestDrive, updateTestDrive } from "@/services/test-drive.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const actor = testDriveActorFrom(req);
    const { id } = await ctx.params;
    const data = await getTestDrive(actor, id);
    return ok({ data });
  } catch (e) {
    return handleTestDriveError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const actor = testDriveActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`test-drives:patch:${actor.userId}:${ip}`, 40, 15 * 60 * 1000)) {
      throw new TestDriveError("Too many updates. Please try again later.", 429, "RATE_LIMITED");
    }
    const { id } = await ctx.params;
    const body = await readJsonBody(req);
    const data = await updateTestDrive(actor, id, body);
    return ok({ data });
  } catch (e) {
    return handleTestDriveError(e);
  }
}
