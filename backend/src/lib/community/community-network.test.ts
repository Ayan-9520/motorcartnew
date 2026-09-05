import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, NAMED_QUERY_OPERATIONS, PUBLIC_SELECT_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { COMMUNITY_NEVER_ALLOW_TABLES, COMMUNITY_PII_KEYS } from "./constants";
import { CommunityError } from "./errors";
import { assertPublicSafeCommunityPayload, mapPublicUserProfile, stripCommunityPii } from "./serialize";
import { roleToProfileType, stripClientOwnedPostFields } from "./ownership";

const here = dirname(fileURLToPath(import.meta.url));

describe("Batch 6 community unit", () => {
  it("maps auth roles to presentation profile types without changing security", () => {
    assert.equal(roleToProfileType("customer"), "CUSTOMER");
    assert.equal(roleToProfileType("dealer"), "DEALER");
    assert.equal(roleToProfileType("finance_partner"), "FINANCE_PROFESSIONAL");
    assert.equal(roleToProfileType("parts_seller"), "PARTS_PROFESSIONAL");
  });

  it("strips client-owned author/dealer/org fields", () => {
    const cleaned = stripClientOwnedPostFields({
      content: "hello",
      authorUserId: "forged",
      author_id: "forged",
      dealerId: "d1",
      organizationId: "o1",
    });
    assert.equal(cleaned.authorUserId, undefined);
    assert.equal(cleaned.author_id, undefined);
    assert.equal(cleaned.dealerId, undefined);
    assert.equal(cleaned.organizationId, undefined);
    assert.equal(cleaned.content, "hello");
  });

  it("public profile payload does not include PII keys", () => {
    const payload = mapPublicUserProfile({
      id: "p1",
      userId: "u1",
      handle: "member_u1",
      displayName: "Member",
      headline: "Buyer",
      bio: "Hello",
      coverUrl: null,
      avatarUrl: null,
      persona: "customer",
      profileType: "CUSTOMER",
      locationCity: "Pune",
      locationState: "MH",
      dealerId: null,
      organizationId: null,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      isVerified: false,
      isPrivate: false,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    assertPublicSafeCommunityPayload(payload as Record<string, unknown>);
    const blob = JSON.stringify(payload);
    for (const key of COMMUNITY_PII_KEYS) {
      assert.equal(blob.includes(`"${key}"`), false, key);
    }
    assert.equal("phone" in payload, false);
    assert.equal("email" in payload, false);
  });

  it("stripCommunityPii drops phone/email/gst/pan", () => {
    const out = stripCommunityPii({
      name: "A Motors",
      phone: "999",
      email: "a@x.com",
      gst_number: "GST",
      pan: "PAN",
      city: "Pune",
    });
    assert.equal(out.name, "A Motors");
    assert.equal(out.city, "Pune");
    assert.equal(out.phone, undefined);
    assert.equal(out.email, undefined);
    assert.equal(out.gst_number, undefined);
    assert.equal(out.pan, undefined);
  });

  it("blocks community tables on /api/db/query", () => {
    for (const table of COMMUNITY_NEVER_ALLOW_TABLES) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false);
    }
    assert.equal(PUBLIC_SELECT_TABLES.has("social_posts"), false);
    assert.equal(PUBLIC_SELECT_TABLES.has("community_follows"), false);
    assert.equal(NAMED_QUERY_OPERATIONS.includes("community_feed" as never), false);
  });

  it("CommunityError carries HTTP status codes", () => {
    const e = new CommunityError("Already following", 409, "DUPLICATE_FOLLOW");
    assert.equal(e.status, 409);
    assert.equal(e.code, "DUPLICATE_FOLLOW");
  });

  it("frontend community service has no MOCK_POSTS / fake engagement", () => {
    const src = readFileSync(
      join(here, "../../../../frontend/src/features/community/services/community.service.ts"),
      "utf8",
    );
    assert.equal(src.includes("MOCK_POSTS"), false);
    assert.equal(src.includes("FAKE_FOLLOWERS"), false);
    assert.equal(src.includes("FAKE_LIKES"), false);
    assert.equal(src.includes("MOCK_COMMENTS"), false);
    assert.equal(src.includes("motorcart_community_like_delta"), false);
  });
});
