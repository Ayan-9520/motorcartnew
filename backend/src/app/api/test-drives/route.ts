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
import { createTestDrive, listTestDrives } from "@/services/test-drive.service";

export async function GET(req: NextRequest) {
  try {
    const actor = testDriveActorFrom(req);
    const data = await listTestDrives(actor);
    return ok({ data });
  } catch (e) {
    return handleTestDriveError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = testDriveActorFrom(req);
    const ip = requestIp(req);
    if (!allowSlidingWindow(`test-drives:post:${actor.userId}:${ip}`, 20, 15 * 60 * 1000)) {
      throw new TestDriveError("Too many test-drive requests. Please try again later.", 429, "RATE_LIMITED");
    }
    const body = await readJsonBody(req);
    const data = await createTestDrive(actor, body);
    return ok({ data }, 201);
  } catch (e) {
    return handleTestDriveError(e);
  }
}
