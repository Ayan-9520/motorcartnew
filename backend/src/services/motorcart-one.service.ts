import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SuperAppError } from "@/lib/superapp/errors";
import { generateMotorCartPublicId, publicIdEncodesPii } from "@/lib/superapp/public-id";
import { allowSlidingWindow } from "@/lib/http/sliding-window";
import type { SuperActor } from "@/lib/superapp/http";
import { isAdminRole, assertCustomer } from "@/lib/superapp/http";

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function ensureIdentity(userId: string) {
  const existing = await prisma.motorCartIdentity.findUnique({ where: { userId } });
  if (existing) return existing;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new SuperAppError("User not found", 404, "USER_NOT_FOUND");
  for (let i = 0; i < 8; i++) {
    const publicId = generateMotorCartPublicId();
    if (publicIdEncodesPii(publicId, user.phone, user.email)) continue;
    try {
      return await prisma.motorCartIdentity.create({ data: { userId, publicId, status: "ACTIVE" } });
    } catch {
      /* collision retry */
    }
  }
  throw new SuperAppError("Could not issue MotorCart ID", 500, "ID_ISSUE_FAILED");
}

export async function getMotorCartOne(actor: SuperActor, userId?: string) {
  assertCustomer(actor);
  const uid = isAdminRole(actor.role) && userId ? userId : actor.userId;
  if (uid !== actor.userId && !isAdminRole(actor.role)) throw new SuperAppError("Forbidden", 403, "CROSS_TENANT");
  const identity = await ensureIdentity(uid);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid } });
  const rewards = await prisma.rewardAccount.findUnique({ where: { userId: uid } });
  return {
    brand: "MotorCart One",
    fullName: user.fullName,
    publicId: identity.publicId,
    status: identity.status,
    memberSince: identity.issuedAt.toISOString(),
    avatarUrl: user.avatarUrl,
    rewardBalance: rewards?.balance ?? 0,
    isPaymentCard: false,
    disclaimers: [
      "NOT A PAYMENT CARD",
      "NOT A BANK CARD",
      "NOT A WALLET",
      "NOT A FASTAG",
      "NOT CREDIT",
      "NOT PREPAID",
    ],
  };
}

export async function issueQrToken(actor: SuperActor) {
  assertCustomer(actor);
  const identity = await ensureIdentity(actor.userId);
  await prisma.motorCartOneToken.updateMany({
    where: { identityId: identity.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const raw = randomBytes(24).toString("base64url");
  await prisma.motorCartOneToken.create({
    data: { identityId: identity.id, tokenHash: hashToken(raw) },
  });
  return { token: raw, verifyPath: `/one/verify/${raw}` };
}

export async function verifyQrToken(token: string, ip: string) {
  if (!allowSlidingWindow(`mc1:${ip}`, 40, 60_000)) {
    throw new SuperAppError("Too many verification attempts", 429, "RATE_LIMIT");
  }
  if (!token || token.length < 16 || token.includes(".")) {
    throw new SuperAppError("Invalid token", 400, "INVALID_TOKEN");
  }
  const row = await prisma.motorCartOneToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { identity: true },
  });
  if (!row || row.revokedAt) throw new SuperAppError("Token is invalid or revoked", 404, "TOKEN_REVOKED");
  if (row.identity.status !== "ACTIVE") throw new SuperAppError("Membership is not active", 404, "INACTIVE");
  return {
    title: "MotorCart One Member",
    publicId: row.identity.publicId,
    memberSince: row.identity.issuedAt.toISOString().slice(0, 10),
    status: row.identity.status,
    disclaimers: [
      "NOT A PAYMENT CARD",
      "NOT A BANK CARD",
      "NOT A WALLET",
      "NOT A FASTAG",
      "NOT CREDIT",
      "NOT PREPAID",
    ],
  };
}

export async function revokeQrTokens(actor: SuperActor) {
  assertCustomer(actor);
  const identity = await ensureIdentity(actor.userId);
  await prisma.motorCartOneToken.updateMany({
    where: { identityId: identity.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { revoked: true };
}
