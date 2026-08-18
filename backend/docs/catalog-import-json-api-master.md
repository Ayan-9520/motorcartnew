# Catalog Master JSON API Source (Phase 5G-1)

Infrastructure for **automatic licensed new-vehicle catalog master** ingestion via HTTPS JSON API.

**Not implemented here:** fake providers, demo CSVs, GaadiBazaar/CarDekho listings as master, publish, or database writes.

## Flow

```
CATALOG_MASTER_SOURCE_URL (+ optional API key)
  → JsonApiSourceAdapter.connect / fetch
  → ingestFromSourceAdapter
  → existing import pipeline (validate → normalize → duplicate → preview)
  → dry-run publish skip (published: false, no DB writes)
```

## Environment

```bash
CATALOG_MASTER_SOURCE=json_api
CATALOG_MASTER_SOURCE_URL=   # required — licensed provider HTTPS URL (do not invent)
CATALOG_MASTER_API_KEY=      # optional Bearer / X-API-Key
```

Missing URL → `CATALOG_MASTER_SOURCE_URL_NOT_CONFIGURED`.

## Local mock (Docker)

Service `catalog-master-mock` serves fixtures at `http://catalog-master-mock:3099/v1/vehicles`.

```bash
# From host (with compose up)
curl -H "X-API-Key: local-dev-mock-key" http://localhost:3099/v1/vehicles

# Dry-run inside backend container
docker compose exec backend npm run catalog:master:json-api:dry-run
```

Scenario paths: `/v1/vehicles/duplicates`, `/v1/vehicles/invalid`, `/v1/vehicles/listing-shaped`.

## Expected provider JSON schema

```json
{
  "source": "licensed_provider_code",
  "fetchedAt": "2026-08-13T00:00:00.000Z",
  "segment": "car",
  "vehicles": [
    {
      "brand": "Maruti Suzuki",
      "model": "Swift",
      "variant": "VXI",
      "fuel": "Petrol",
      "transmission": "Manual",
      "year": 2025,
      "segment": "car",
      "bodyType": "Hatchback",
      "color": "White",
      "exShowroomPrice": 650000,
      "onRoadPrice": 720000,
      "city": "Delhi",
      "state": "Delhi",
      "imageUrl": "https://…",
      "brochureUrl": "https://…",
      "description": "…",
      "features": ["ABS", "Airbags"],
      "externalId": "provider-stable-id"
    }
  ]
}
```

Also accepted: top-level array of vehicle objects, or `{ "data": [ … ] }`.

### Required fields per vehicle

`brand`, `model`, `variant`, `fuel`, `transmission`, `year`

### Forbidden (listing-shaped — entire payload rejected)

`KM Driven`, `Ownership`, `Dealer Price`, `Discount`, `Registration State` (any casing / snake_case / camelCase).

## Files

| Path | Role |
|------|------|
| `sources/json-api/json-api.adapter.ts` | `JsonApiSourceAdapter` |
| `sources/json-api/json-api-config.ts` | Env resolution |
| `sources/json-api/json-api-mapper.ts` | JSON → `ImportRecord` |
| `sources/json-api/json-api-listing-guard.ts` | Reject inventory fields |
| `catalog-master-json-api.service.ts` | Dry-run orchestration |
| `scripts/catalog-master-json-api-dry-run.ts` | CLI |

`gaadi_bazaar` remains listing-only. Existing Hyundai Creta catalog row is not modified by this dry-run path.
