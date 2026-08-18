import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCatalogSourceMayPublish,
  classifyCatalogSource,
} from "./source-classification";

describe("catalog source classification", () => {
  it("classifies local mock API as MOCK", () => {
    const result = classifyCatalogSource({
      sourceCode: "json_api",
      sourceUrl: "http://catalog-master-mock:3099/v1/vehicles",
      apiKey: "local-dev-mock-key",
    });
    assert.equal(result.classification, "MOCK");
    assert.equal(result.licensed, false);
  });

  it("refuses to publish mock sources", () => {
    assert.throws(
      () =>
        assertCatalogSourceMayPublish({
          sourceCode: "json_api",
          sourceUrl: "http://127.0.0.1:3099/v1/vehicles",
        }),
      (err: unknown) => {
        assert.equal((err as { code?: string }).code, "MOCK_SOURCE_PUBLISH_FORBIDDEN");
        return true;
      },
    );
  });

  it("does not treat an unconfigured json_api URL as licensed", () => {
    const result = classifyCatalogSource({ sourceCode: "json_api", sourceUrl: null });
    assert.equal(result.licensed, false);
    assert.equal(result.classification, "INTERNAL");
  });
});
