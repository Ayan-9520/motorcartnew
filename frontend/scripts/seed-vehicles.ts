/**
 * Seed vehicles via Motorcart backend API.
 * Requires: backend running on VITE_API_URL (default http://localhost:3001)
 * Run: npm run seed:vehicles
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import axios from "axios";
import { MOCK_VEHICLES } from "../src/data/vehicle-catalog";
import { normalizeFuelType, normalizeTransmissionType } from "../src/services/vehicle.service";

function loadEnvFile(name: string) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const API = process.env.VITE_API_URL ?? "http://localhost:3001";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const limit = Number(process.env.SEED_LIMIT ?? MOCK_VEHICLES.length);
  const pool = MOCK_VEHICLES.slice(0, limit);
  console.log(`Seeding ${pool.length} vehicles via ${API}…`);

  let inserted = 0;
  let errors = 0;

  for (const batch of chunk(pool, 40)) {
    const rows = batch.map((v) => ({
      slug: v.slug,
      title: v.title,
      brand: v.brand,
      model: v.model,
      variant: v.variant ?? null,
      year: v.year,
      price: v.price,
      original_price: v.originalPrice ?? null,
      fuel_type: normalizeFuelType(v.fuelType),
      transmission: normalizeTransmissionType(v.transmission),
      body_type: v.bodyType,
      category: v.category,
      kms_driven: v.kmsDriven,
      owners: v.owners,
      color: v.color ?? null,
      location: v.location ?? `${v.city}, ${v.state}`,
      city: v.city,
      state: v.state,
      images: v.images,
      features: v.features,
      description: v.description ?? null,
      is_certified: v.isCertified,
      is_featured: v.isFeatured,
      condition: v.condition,
      status: v.status,
      metadata: {
        ...v.metadata,
        dealerName: v.dealerName,
        dealerSlug: v.dealerSlug,
        catalogId: v.id,
      },
    }));

    try {
      await axios.post(`${API}/api/db/query`, {
        table: "vehicles",
        action: "upsert",
        onConflict: "slug",
        body: rows,
      });
      inserted += batch.length;
    } catch (e) {
      console.error("Batch error:", axios.isAxiosError(e) ? e.response?.data : e);
      errors += batch.length;
    }
  }

  console.log(`Done. Upserted ~${inserted} rows, ${errors} failed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
