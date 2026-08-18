-- Phase 1 catalog seed (idempotent via ON CONFLICT where possible)

INSERT INTO catalog_cities (id, name, slug, state, state_slug, tier, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'Mumbai', 'mumbai', 'Maharashtra', 'maharashtra', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Delhi NCR', 'delhi-ncr', 'Delhi', 'delhi', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Bangalore', 'bangalore', 'Karnataka', 'karnataka', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Hyderabad', 'hyderabad', 'Telangana', 'telangana', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Chennai', 'chennai', 'Tamil Nadu', 'tamil-nadu', 1, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Pune', 'pune', 'Maharashtra', 'maharashtra', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Ahmedabad', 'ahmedabad', 'Gujarat', 'gujarat', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Kolkata', 'kolkata', 'West Bengal', 'west-bengal', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Jaipur', 'jaipur', 'Rajasthan', 'rajasthan', 2, true, NOW(), NOW()),
  (gen_random_uuid()::text, 'Lucknow', 'lucknow', 'Uttar Pradesh', 'uttar-pradesh', 2, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  state = EXCLUDED.state,
  state_slug = EXCLUDED.state_slug,
  tier = EXCLUDED.tier,
  is_active = true,
  updated_at = NOW();

INSERT INTO catalog_data_sources (id, code, name, source_type, base_url, is_active, config, created_at, updated_at)
VALUES
  (gen_random_uuid()::text, 'manual', 'Manual Entry', 'manual', NULL, true, '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'gaadi_bazaar', 'GaadiBazaar', 'scrape', 'https://www.gaadibazaar.in', true, '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'cardekho', 'CarDekho', 'scrape', 'https://www.cardekho.com', true, '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'oem_feed', 'OEM Feed', 'oem_feed', NULL, true, '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'csv_upload', 'CSV Upload', 'csv', NULL, true, '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'excel_upload', 'Excel Upload', 'excel', NULL, true, '{}', NOW(), NOW()),
  (gen_random_uuid()::text, 'json_api', 'JSON / API', 'json', NULL, true, '{}', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  source_type = EXCLUDED.source_type,
  base_url = EXCLUDED.base_url,
  is_active = true,
  updated_at = NOW();

-- Demo catalog: Hyundai Creta SX(O) 1.5 Diesel Automatic
INSERT INTO catalog_brands (id, name, slug, segment, country, status, metadata, created_at, updated_at)
VALUES (gen_random_uuid()::text, 'Hyundai', 'hyundai', 'car', 'IN', 'published', '{}', NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, segment = EXCLUDED.segment, status = 'published', updated_at = NOW();

INSERT INTO catalog_models (id, brand_id, name, slug, segment, body_type, condition_scope, launch_year, status, metadata, created_at, updated_at)
SELECT gen_random_uuid()::text, b.id, 'Creta', 'creta', 'car', 'SUV', 'all', 2024, 'published', '{}', NOW(), NOW()
FROM catalog_brands b WHERE b.slug = 'hyundai'
ON CONFLICT (brand_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  segment = EXCLUDED.segment,
  body_type = EXCLUDED.body_type,
  status = 'published',
  updated_at = NOW();

INSERT INTO catalog_variants (
  id, model_id, name, slug, business_key, fuel_type, transmission, model_year,
  condition_scope, seating, ex_showroom_ref, status, source_id, published_at, metadata, created_at, updated_at
)
SELECT
  gen_random_uuid()::text,
  m.id,
  'SX(O) 1.5 Diesel Automatic',
  'sx-o-1-5-diesel-automatic',
  'car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|automatic|2025',
  'Diesel',
  'Automatic',
  2025,
  'new',
  5,
  1899000.00,
  'published',
  ds.id,
  NOW(),
  '{}',
  NOW(),
  NOW()
FROM catalog_models m
JOIN catalog_brands b ON b.id = m.brand_id AND b.slug = 'hyundai' AND m.slug = 'creta'
CROSS JOIN catalog_data_sources ds
WHERE ds.code = 'manual'
ON CONFLICT (business_key) DO UPDATE SET
  name = EXCLUDED.name,
  status = 'published',
  ex_showroom_ref = EXCLUDED.ex_showroom_ref,
  published_at = NOW(),
  updated_at = NOW();

INSERT INTO catalog_variant_specs (
  id, variant_id, engine, displacement, power, torque, mileage, seating, boot_space,
  dimensions, safety, comfort, extras, created_at, updated_at
)
SELECT
  gen_random_uuid()::text,
  v.id,
  '1.5L U2 CRDi',
  '1493 cc',
  '115 bhp',
  '250 Nm',
  '18.4 kmpl',
  5,
  '433 L',
  '{"length":"4300 mm","width":"1790 mm","height":"1635 mm","wheelbase":"2610 mm"}'::jsonb,
  '["6 Airbags","ABS with EBD","ESC","HAC","TPMS"]'::jsonb,
  '["Ventilated Seats","Panoramic Sunroof","BOSE Audio","Wireless Charger"]'::jsonb,
  '{}'::jsonb,
  NOW(),
  NOW()
FROM catalog_variants v
WHERE v.business_key = 'car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|automatic|2025'
ON CONFLICT (variant_id) DO UPDATE SET
  engine = EXCLUDED.engine,
  displacement = EXCLUDED.displacement,
  power = EXCLUDED.power,
  torque = EXCLUDED.torque,
  mileage = EXCLUDED.mileage,
  updated_at = NOW();

INSERT INTO catalog_variant_media (id, variant_id, media_type, url, sort_order, is_primary, alt_text, source_id, created_at, updated_at)
SELECT gen_random_uuid()::text, v.id, 'image', '/media/vehicles/cars/Hyundai/Creta/01.webp', 0, true, 'Hyundai Creta', ds.id, NOW(), NOW()
FROM catalog_variants v
CROSS JOIN catalog_data_sources ds
WHERE v.business_key = 'car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|automatic|2025'
  AND ds.code = 'manual'
  AND NOT EXISTS (
    SELECT 1 FROM catalog_variant_media m
    WHERE m.variant_id = v.id AND m.media_type = 'image' AND m.is_primary = true
  );

INSERT INTO catalog_variant_colors (id, variant_id, name, hex_code, is_default, created_at, updated_at)
SELECT gen_random_uuid()::text, v.id, c.name, c.hex_code, c.is_default, NOW(), NOW()
FROM catalog_variants v
CROSS JOIN (VALUES
  ('Atlas White', '#F5F5F5', true),
  ('Abyss Black', '#1A1A1A', false),
  ('Titan Grey', '#6B7280', false)
) AS c(name, hex_code, is_default)
WHERE v.business_key = 'car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|automatic|2025'
  AND NOT EXISTS (
    SELECT 1 FROM catalog_variant_colors col
    WHERE col.variant_id = v.id AND col.name = c.name
  );

INSERT INTO catalog_variant_features (id, variant_id, category, name, created_at)
SELECT gen_random_uuid()::text, v.id, f.category, f.name, NOW()
FROM catalog_variants v
CROSS JOIN (VALUES
  ('safety', '6 Airbags'),
  ('safety', 'ADAS Level 1'),
  ('comfort', 'Ventilated Front Seats'),
  ('tech', '10.25-inch Touchscreen'),
  ('exterior', 'LED DRLs')
) AS f(category, name)
WHERE v.business_key = 'car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|automatic|2025'
  AND NOT EXISTS (
    SELECT 1 FROM catalog_variant_features feat
    WHERE feat.variant_id = v.id AND feat.category = f.category AND feat.name = f.name
  );

INSERT INTO catalog_variant_city_prices (
  id, variant_id, city_id, ex_showroom, on_road, rto, insurance, effective_from, source_id, created_at, updated_at
)
SELECT
  gen_random_uuid()::text,
  v.id,
  c.id,
  1899000.00,
  2150000.00,
  95000.00,
  85000.00,
  '2025-01-01T00:00:00.000Z'::timestamptz,
  ds.id,
  NOW(),
  NOW()
FROM catalog_variants v
JOIN catalog_cities c ON c.slug = 'delhi-ncr'
CROSS JOIN catalog_data_sources ds
WHERE v.business_key = 'car|hyundai|creta|sx-o-1-5-diesel-automatic|diesel|automatic|2025'
  AND ds.code = 'manual'
ON CONFLICT (variant_id, city_id, effective_from) DO UPDATE SET
  ex_showroom = EXCLUDED.ex_showroom,
  on_road = EXCLUDED.on_road,
  rto = EXCLUDED.rto,
  insurance = EXCLUDED.insurance,
  updated_at = NOW();
