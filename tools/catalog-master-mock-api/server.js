/**
 * LOCAL-ONLY catalog master mock JSON API.
 * Not a real vehicle data provider. Fixtures only — never write to the catalog DB.
 *
 * Endpoints:
 *   GET /health
 *   GET /v1/vehicles              valid master rows
 *   GET /v1/vehicles/duplicates   duplicate business-key rows
 *   GET /v1/vehicles/invalid      invalid catalog rows
 *   GET /v1/vehicles/listing-shaped  inventory-shaped (adapter must reject)
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 3099);
const API_KEY = (process.env.CATALOG_MASTER_API_KEY || process.env.MOCK_API_KEY || "").trim();
const FIXTURES = path.join(__dirname, "fixtures");

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-MotorCart-Mock": "catalog-master-local",
  });
  res.end(payload);
}

function unauthorized(res) {
  sendJson(res, 401, { error: "unauthorized", code: "CATALOG_MASTER_AUTH_FAILED" });
}

function authorize(req) {
  if (!API_KEY) return true;
  const auth = String(req.headers.authorization || "");
  const apiKeyHeader = String(req.headers["x-api-key"] || "");
  if (auth === `Bearer ${API_KEY}`) return true;
  if (apiKeyHeader === API_KEY) return true;
  return false;
}

const routes = {
  "/health": () => ({
    status: 200,
    body: { ok: true, service: "catalog-master-mock-api", localOnly: true },
  }),
  "/v1/vehicles": () => ({ status: 200, body: readJson("vehicles-valid.json") }),
  "/v1/vehicles/duplicates": () => ({ status: 200, body: readJson("vehicles-duplicates.json") }),
  "/v1/vehicles/invalid": () => ({ status: 200, body: readJson("vehicles-invalid.json") }),
  "/v1/vehicles/listing-shaped": () => ({
    status: 200,
    body: readJson("vehicles-listing-shaped.json"),
  }),
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  if (pathname !== "/health" && !authorize(req)) {
    unauthorized(res);
    return;
  }

  const handler = routes[pathname];
  if (!handler) {
    sendJson(res, 404, { error: "not_found", path: pathname });
    return;
  }

  try {
    const result = handler();
    const body =
      pathname.startsWith("/v1/") && result.body && typeof result.body === "object"
        ? { ...result.body, fetchedAt: new Date().toISOString() }
        : result.body;
    sendJson(res, result.status, body);
  } catch (error) {
    sendJson(res, 500, {
      error: "fixture_read_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(
    `catalog-master-mock-api listening on :${PORT} (local-only fixtures; auth=${API_KEY ? "on" : "off"})`,
  );
});
