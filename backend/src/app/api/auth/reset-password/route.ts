import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getAuthUser } from "@/lib/auth/middleware";
import { ok, err, unauthorized } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password?: string; token?: string };

  if (body.token && body.password) {
    const reset = await prisma.passwordReset.findFirst({
      where: { token: body.token, used: false, expiresAt: { gt: new Date() } },
    });
    if (!reset) return err("Invalid or expired reset token", 400);

    const user = await prisma.user.findFirst({ where: { email: reset.email } });
    if (!user) return err("User not found", 404);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.password) },
    });
    await prisma.passwordReset.update({ where: { id: reset.id }, data: { used: true } });
    return ok({ success: true });
  }

  const auth = getAuthUser(req);
  if (!auth || !body.password) return unauthorized();

  await prisma.user.update({
    where: { id: auth.sub },
    data: { passwordHash: await hashPassword(body.password) },
  });
  return ok({ success: true });
}
