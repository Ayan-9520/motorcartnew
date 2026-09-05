import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { NEVER_ALLOW_TABLES, authorizeLegacyQuery } from "@/lib/db/query-allowlist";
import { CAREER_PATHS, PARTNER_OS_NEVER_ALLOW_TABLES, QUOTE_KINDS, VIN_COMPATIBILITY_LIVE } from "./constants";
import { vinCompatibilityLive } from "@/services/partner-industry.service";
import { organizationTypeFromAppRole } from "@/lib/organization/organization.types";

const here = dirname(fileURLToPath(import.meta.url));

describe("Batch 11 Partner / Industry OS unit", () => {
  it("reuses Organization tenant and does not invent sibling identity graphs", () => {
    const schema = readFileSync(join(here, "../../../prisma/schema.prisma"), "utf8");
    assert.match(schema, /model Organization \{/);
    assert.match(schema, /model Dealer \{/);
    assert.match(schema, /model Bank \{/);
    assert.match(schema, /model DsaAgent \{/);
    assert.match(schema, /model InsurancePartner \{/);
    assert.match(schema, /model ServiceCenter \{/);
    assert.match(schema, /model Part \{/);
    assert.match(schema, /model PartProduct \{/);
    assert.match(schema, /model Lead \{/);
    assert.match(schema, /model CrmActivity \{/);
    assert.match(schema, /model CommunicationProvider \{/);
    assert.match(schema, /model OrganizationSubscription \{/);
    assert.match(schema, /model OrganizationDealerAuthorization \{/);
    assert.match(schema, /model JobPosting \{/);
    assert.equal(schema.includes("model PartsOrganization"), false);
    assert.equal(schema.includes("model WorkshopOrganization"), false);
    assert.equal(schema.includes("model BankOrganization"), false);
    assert.equal(schema.includes("model InsurerOrganization"), false);
    assert.equal(organizationTypeFromAppRole("bank_nbfc"), "BANK");
  });

  it("keeps VIN compatibility architecture-ready only", () => {
    assert.equal(VIN_COMPATIBILITY_LIVE, false);
    assert.equal(vinCompatibilityLive(), false);
  });

  it("blocks partner-industry tables on /api/db/query", () => {
    for (const table of PARTNER_OS_NEVER_ALLOW_TABLES) {
      assert.equal(NEVER_ALLOW_TABLES.has(table), true, table);
      const decision = authorizeLegacyQuery(
        { userId: "u1", role: "super_admin" },
        { table, action: "select" },
        new Set([table]),
      );
      assert.equal(decision.ok, false, table);
    }
  });

  it("does not invent quote kinds, career paths, or payout percents", () => {
    assert.deepEqual([...QUOTE_KINDS], ["INDICATIVE", "PARTNER_QUOTE", "BOUND"]);
    assert.ok(CAREER_PATHS.includes("SALES"));
    assert.ok(CAREER_PATHS.includes("SERVICE"));
    const constants = readFileSync(join(here, "constants.ts"), "utf8");
    assert.equal(constants.includes("COMMISSION"), false);
  });
});
