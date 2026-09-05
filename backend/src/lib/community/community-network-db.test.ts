/**
 * DB-backed Batch 6 community network tests.
 * Requires local Docker PostgreSQL.
 */
import assert from "node:assert/strict";
import { describe, it, after } from "node:test";
import { prisma } from "@/lib/prisma";
import { CommunityError } from "./errors";
import { mapPublicUserProfile, assertPublicSafeCommunityPayload } from "./serialize";
import { getOrCreateUserProfile, updateUserProfile } from "@/services/community-profile.service";
import {
  createSocialPost,
  deleteSocialPost,
  getSocialPostById,
  updateSocialPost,
} from "@/services/community-post.service";
import { getCommunityFeed } from "@/services/community-feed.service";
import {
  addPostComment,
  createCommunityReport,
  deletePostComment,
  followUserById,
  likePost,
  listFollowers,
  listFollowing,
  savePost,
  sharePost,
  unlikePost,
  unsavePost,
  unfollowUserById,
  updatePostComment,
} from "@/services/community-engagement.service";

const PREFIX = `__c6_${Date.now()}_`;

const ids = {
  userA: "",
  userB: "",
  ownerA: "",
  ownerB: "",
  dealerA: "",
  dealerB: "",
  orgA: "",
  orgB: "",
  postA: "",
  commentA: "",
};

async function seed() {
  const userA = await prisma.user.create({
    data: { email: `${PREFIX}a@test.com`, fullName: "Cust A", role: "customer", passwordHash: "x", city: "Pune", state: "MH" },
  });
  const userB = await prisma.user.create({
    data: { email: `${PREFIX}b@test.com`, fullName: "Cust B", role: "customer", passwordHash: "x", city: "Mumbai", state: "MH" },
  });
  const ownerA = await prisma.user.create({
    data: { email: `${PREFIX}da@test.com`, fullName: "Dealer A", role: "dealer", passwordHash: "x" },
  });
  const ownerB = await prisma.user.create({
    data: { email: `${PREFIX}db@test.com`, fullName: "Dealer B", role: "dealer", passwordHash: "x" },
  });
  const dealerA = await prisma.dealer.create({
    data: { ownerId: ownerA.id, name: `${PREFIX} A Motors`, slug: `${PREFIX}a-motors`, city: "Pune", state: "MH", pincode: "411001" },
  });
  const dealerB = await prisma.dealer.create({
    data: { ownerId: ownerB.id, name: `${PREFIX} B Motors`, slug: `${PREFIX}b-motors`, city: "Mumbai", state: "MH", pincode: "400001" },
  });
  const orgA = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org A`,
      displayName: `${PREFIX} Org A`,
      slug: `${PREFIX}org-a`,
      createdByUserId: ownerA.id,
      legacyDealerId: dealerA.id,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      type: "DEALER",
      name: `${PREFIX} Org B`,
      displayName: `${PREFIX} Org B`,
      slug: `${PREFIX}org-b`,
      createdByUserId: ownerB.id,
      legacyDealerId: dealerB.id,
    },
  });
  await prisma.organizationMember.create({
    data: { organizationId: orgA.id, userId: ownerA.id, role: "OWNER", status: "active" },
  });
  await prisma.organizationMember.create({
    data: { organizationId: orgB.id, userId: ownerB.id, role: "OWNER", status: "active" },
  });

  ids.userA = userA.id;
  ids.userB = userB.id;
  ids.ownerA = ownerA.id;
  ids.ownerB = ownerB.id;
  ids.dealerA = dealerA.id;
  ids.dealerB = dealerB.id;
  ids.orgA = orgA.id;
  ids.orgB = orgB.id;
}

describe("Batch 6 community DB", () => {
  after(async () => {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: PREFIX } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length) {
      await prisma.communityReport.deleteMany({ where: { reporterUserId: { in: userIds } } });
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.socialPost.deleteMany({ where: { authorId: { in: userIds } } });
      await prisma.communityFollow.deleteMany({
        where: { OR: [{ followerUserId: { in: userIds } }, { targetUserId: { in: userIds } }] },
      });
      await prisma.userFollow.deleteMany({
        where: { OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }] },
      });
      await prisma.communityUserProfile.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.organizationMember.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.organization.deleteMany({ where: { slug: { startsWith: PREFIX } } });
      await prisma.dealer.deleteMany({ where: { slug: { startsWith: PREFIX } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("1-2 community profile creation and ownership", async () => {
    await seed();
    const profile = await getOrCreateUserProfile(ids.userA);
    assert.equal(profile.userId, ids.userA);
    assert.equal(profile.profileType, "CUSTOMER");
    const again = await getOrCreateUserProfile(ids.userA);
    assert.equal(again.id, profile.id);

    const dealerProfile = await getOrCreateUserProfile(ids.ownerA);
    assert.equal(dealerProfile.dealerId, ids.dealerA);
    assert.equal(dealerProfile.organizationId, ids.orgA);

    const patched = await updateUserProfile(ids.userA, {
      headline: "Car shopper",
      location_city: "Pune",
      dealer_id: ids.dealerB,
      organization_id: ids.orgB,
    });
    assert.equal(patched.headline, "Car shopper");
    assert.equal(patched.dealerId, null);
    assert.equal(patched.organizationId, null);
  });

  it("3-7 create, own, edit, forbid foreign edit, delete own post", async () => {
    const post = await createSocialPost(ids.userA, { content: `${PREFIX} hello community` });
    ids.postA = post.id;
    assert.equal(post.authorId, ids.userA);
    assert.equal(post.content.includes(PREFIX), true);

    const edited = await updateSocialPost(post.id, ids.userA, "customer", { content: `${PREFIX} edited` });
    assert.equal(edited.content, `${PREFIX} edited`);

    await assert.rejects(
      () => updateSocialPost(post.id, ids.userB, "customer", { content: "hacked" }),
      (e: unknown) => e instanceof CommunityError && e.status === 403,
    );

    const second = await createSocialPost(ids.userA, { content: `${PREFIX} to delete` });
    await deleteSocialPost(second.id, ids.userA, "customer");
    const gone = await getSocialPostById(second.id, ids.userA);
    assert.equal(gone, null);
  });

  it("8-9 feed returns real posts and empty following stays empty", async () => {
    const feed = await getCommunityFeed({ type: "global", viewerId: ids.userA, author_id: ids.userA });
    assert.equal(feed.items.some((i) => i.post.id === ids.postA), true);
    assert.equal(feed.items.every((i) => i.post.authorId === ids.userA), true);

    const empty = await getCommunityFeed({ type: "following", viewerId: ids.userB });
    assert.equal(empty.items.length, 0);
  });

  it("10-14 follow, duplicate blocked, self blocked, unfollow, isolation", async () => {
    const followed = await followUserById(ids.userB, ids.userA);
    assert.equal(followed.followed, true);

    await assert.rejects(
      () => followUserById(ids.userB, ids.userA),
      (e: unknown) => e instanceof CommunityError && e.code === "DUPLICATE_FOLLOW",
    );
    await assert.rejects(
      () => followUserById(ids.userA, ids.userA),
      (e: unknown) => e instanceof CommunityError && e.code === "SELF_FOLLOW",
    );

    const followers = await listFollowers(ids.userA);
    assert.equal(followers.some((f) => f.user_id === ids.userB), true);
    const following = await listFollowing(ids.userB);
    assert.equal(following.some((f) => f.user_id === ids.userA), true);
    const isolated = await listFollowers(ids.userB);
    assert.equal(isolated.some((f) => f.user_id === ids.userA), false);

    await unfollowUserById(ids.userB, ids.userA);
    const after = await listFollowers(ids.userA);
    assert.equal(after.some((f) => f.user_id === ids.userB), false);
  });

  it("15-17 like, duplicate like blocked, unlike", async () => {
    const liked = await likePost(ids.postA, ids.userB);
    assert.ok(liked);
    assert.equal(liked!.likeCount, 1);
    await assert.rejects(
      () => likePost(ids.postA, ids.userB),
      (e: unknown) => e instanceof CommunityError && e.code === "DUPLICATE_LIKE",
    );
    const unliked = await unlikePost(ids.postA, ids.userB);
    assert.equal(unliked!.likeCount, 0);
  });

  it("18-20 comment, ownership, unauthorized edit blocked", async () => {
    const comment = await addPostComment(ids.postA, ids.userB, `${PREFIX} nice car`);
    assert.ok(comment);
    ids.commentA = comment!.id;
    const edited = await updatePostComment(comment!.id, ids.userB, "customer", `${PREFIX} edited comment`);
    assert.equal(edited.content, `${PREFIX} edited comment`);
    await assert.rejects(
      () => updatePostComment(comment!.id, ids.userA, "customer", "nope"),
      (e: unknown) => e instanceof CommunityError && e.status === 403,
    );
    await deletePostComment(comment!.id, ids.userB, "customer");
  });

  it("21-24 save, unsave, share, report", async () => {
    await savePost(ids.postA, ids.userB);
    await assert.rejects(
      () => savePost(ids.postA, ids.userB),
      (e: unknown) => e instanceof CommunityError && e.code === "DUPLICATE_SAVE",
    );
    await unsavePost(ids.postA, ids.userB);
    const shared = await sharePost(ids.postA, ids.userB);
    assert.equal(shared!.shareCount, 1);
    const report = await createCommunityReport(ids.userB, {
      target_type: "post",
      target_id: ids.postA,
      reason: "spam",
    });
    assert.equal(report.status, "OPEN");
    const still = await getSocialPostById(ids.postA, ids.userA);
    assert.ok(still);
  });

  it("25-29 forged ids and isolation", async () => {
    await assert.rejects(
      () => createSocialPost(ids.userA, { content: "x", author_id: ids.userB }),
      (e: unknown) => e instanceof CommunityError && e.code === "FORGED_AUTHOR",
    );
    await assert.rejects(
      () => createSocialPost(ids.ownerA, { content: `${PREFIX} forged dealer`, dealer_id: ids.dealerB }),
      (e: unknown) => e instanceof CommunityError && e.code === "FORGED_DEALER",
    );
    await assert.rejects(
      () => createSocialPost(ids.ownerA, { content: `${PREFIX} forged org`, organization_id: ids.orgB }),
      (e: unknown) => e instanceof CommunityError && e.code === "FORGED_ORGANIZATION",
    );

    const postB = await createSocialPost(ids.userB, { content: `${PREFIX} private-ish`, visibility: "private" });
    const asA = await getSocialPostById(postB.id, ids.userA);
    assert.equal(asA, null);
    const asB = await getSocialPostById(postB.id, ids.userB);
    assert.ok(asB);

    const dealerPost = await createSocialPost(ids.ownerA, { content: `${PREFIX} dealer owned` });
    assert.equal(dealerPost.dealerId, ids.dealerA);
    assert.equal(dealerPost.organizationId, ids.orgA);
    assert.notEqual(dealerPost.dealerId, ids.dealerB);
  });

  it("30 notification creation without duplicates", async () => {
    await followUserById(ids.userB, ids.userA);
    await likePost(ids.postA, ids.userB);
    const notes = await prisma.notification.findMany({
      where: { userId: ids.userA, kind: "community" },
    });
    assert.ok(notes.length >= 2);
    const likeNotes = notes.filter((n) => JSON.stringify(n.payload).includes("post_like"));
    await likePost(ids.postA, ids.userB).catch(() => undefined);
    const notes2 = await prisma.notification.findMany({
      where: { userId: ids.userA, kind: "community" },
    });
    const likeNotes2 = notes2.filter((n) => JSON.stringify(n.payload).includes("post_like"));
    assert.equal(likeNotes2.length, likeNotes.length);
  });

  it("31-33 no fake data and public-safe PII", async () => {
    const profile = await getOrCreateUserProfile(ids.userA);
    const publicProfile = mapPublicUserProfile(profile);
    assertPublicSafeCommunityPayload(publicProfile as Record<string, unknown>);
    const blob = JSON.stringify(publicProfile);
    assert.equal(blob.includes("email"), false);
    assert.equal(blob.includes("phone"), false);
    assert.equal(blob.includes("gst"), false);
    assert.equal(blob.includes("pan"), false);

    const feed = await getCommunityFeed({ type: "following", viewerId: ids.userB });
    assert.equal(feed.items.every((i) => i.post.content.includes("MOCK") === false), true);
    assert.equal(feed.items.every((i) => !i.post.id.startsWith("mp-")), true);
  });
});
