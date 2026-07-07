import { prisma } from "@/lib/prisma";

export async function followDirectoryBusiness(followerUserId: string, businessId: string) {
  const business = await prisma.communityBusinessProfile.findFirst({
    where: { id: businessId },
  });
  if (!business) return null;
  if (business.ownerUserId === followerUserId) {
    throw new Error("SELF_FOLLOW");
  }

  await prisma.$transaction(async (tx) => {
    const exists = await tx.communityFollow.findFirst({
      where: {
        followerUserId,
        targetType: "business",
        targetBusinessId: businessId,
      },
    });
    if (exists) return;

    await tx.communityFollow.create({
      data: {
        followerUserId,
        targetType: "business",
        targetBusinessId: businessId,
      },
    });

    await tx.communityBusinessProfile.update({
      where: { id: businessId },
      data: { followerCount: { increment: 1 } },
    });
  });

  return { following: true };
}

export async function unfollowDirectoryBusiness(followerUserId: string, businessId: string) {
  await prisma.$transaction(async (tx) => {
    const removed = await tx.communityFollow.deleteMany({
      where: {
        followerUserId,
        targetType: "business",
        targetBusinessId: businessId,
      },
    });
    if (removed.count > 0) {
      await tx.communityBusinessProfile.update({
        where: { id: businessId },
        data: { followerCount: { decrement: 1 } },
      });
    }
  });
  return { following: false };
}
