-- CreateEnum
CREATE TYPE "CatalogSegment" AS ENUM ('car', 'bike', 'scooter', 'ev', 'truck', 'bus', 'pickup', 'tractor', 'construction_equipment', 'farm_equipment', 'commercial_vehicle', 'auto', 'rickshaw');

-- CreateEnum
CREATE TYPE "CatalogConditionScope" AS ENUM ('new', 'used', 'refurbished', 'all');

-- CreateEnum
CREATE TYPE "CatalogPublishStatus" AS ENUM ('draft', 'review', 'published', 'archived', 'discontinued');

-- CreateEnum
CREATE TYPE "CatalogDataSourceType" AS ENUM ('manual', 'csv', 'excel', 'json', 'api', 'scrape', 'oem_feed');

-- CreateTable
CREATE TABLE "catalog_cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "state_slug" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_data_sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" "CatalogDataSourceType" NOT NULL,
    "base_url" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "segment" "CatalogSegment" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "logo_url" VARCHAR(512),
    "website_url" VARCHAR(512),
    "status" "CatalogPublishStatus" NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_models" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "segment" "CatalogSegment" NOT NULL,
    "body_type" TEXT NOT NULL,
    "condition_scope" "CatalogConditionScope" NOT NULL DEFAULT 'all',
    "launch_year" INTEGER,
    "discontinue_year" INTEGER,
    "status" "CatalogPublishStatus" NOT NULL DEFAULT 'draft',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variants" (
    "id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "business_key" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "model_year" INTEGER NOT NULL,
    "condition_scope" "CatalogConditionScope" NOT NULL DEFAULT 'new',
    "seating" INTEGER,
    "ex_showroom_ref" DECIMAL(12,2),
    "status" "CatalogPublishStatus" NOT NULL DEFAULT 'draft',
    "source_id" TEXT,
    "external_id" TEXT,
    "source_url" VARCHAR(1024),
    "published_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variant_specs" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "engine" TEXT,
    "displacement" TEXT,
    "power" TEXT,
    "torque" TEXT,
    "mileage" TEXT,
    "range_km" TEXT,
    "seating" INTEGER,
    "boot_space" TEXT,
    "dimensions" JSONB NOT NULL DEFAULT '{}',
    "safety" JSONB NOT NULL DEFAULT '[]',
    "comfort" JSONB NOT NULL DEFAULT '[]',
    "extras" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_variant_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variant_media" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "url" VARCHAR(1024) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "alt_text" TEXT,
    "source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_variant_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variant_colors" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex_code" TEXT,
    "image_url" VARCHAR(1024),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_variant_colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variant_features" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_variant_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_variant_city_prices" (
    "id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "ex_showroom" DECIMAL(12,2) NOT NULL,
    "on_road" DECIMAL(12,2),
    "rto" DECIMAL(12,2),
    "insurance" DECIMAL(12,2),
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_variant_city_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_cities_slug_key" ON "catalog_cities"("slug");

-- CreateIndex
CREATE INDEX "catalog_cities_state_slug_idx" ON "catalog_cities"("state_slug");

-- CreateIndex
CREATE INDEX "catalog_cities_is_active_idx" ON "catalog_cities"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_data_sources_code_key" ON "catalog_data_sources"("code");

-- CreateIndex
CREATE INDEX "catalog_data_sources_source_type_is_active_idx" ON "catalog_data_sources"("source_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_brands_slug_key" ON "catalog_brands"("slug");

-- CreateIndex
CREATE INDEX "catalog_brands_segment_slug_idx" ON "catalog_brands"("segment", "slug");

-- CreateIndex
CREATE INDEX "catalog_brands_status_idx" ON "catalog_brands"("status");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_models_brand_id_slug_key" ON "catalog_models"("brand_id", "slug");

-- CreateIndex
CREATE INDEX "catalog_models_segment_body_type_idx" ON "catalog_models"("segment", "body_type");

-- CreateIndex
CREATE INDEX "catalog_models_status_idx" ON "catalog_models"("status");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_variants_business_key_key" ON "catalog_variants"("business_key");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_variants_model_id_slug_key" ON "catalog_variants"("model_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_variants_source_id_external_id_key" ON "catalog_variants"("source_id", "external_id");

-- CreateIndex
CREATE INDEX "catalog_variants_model_id_fuel_type_transmission_idx" ON "catalog_variants"("model_id", "fuel_type", "transmission");

-- CreateIndex
CREATE INDEX "catalog_variants_status_idx" ON "catalog_variants"("status");

-- CreateIndex
CREATE INDEX "catalog_variants_model_year_idx" ON "catalog_variants"("model_year");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_variant_specs_variant_id_key" ON "catalog_variant_specs"("variant_id");

-- CreateIndex
CREATE INDEX "catalog_variant_media_variant_id_media_type_sort_order_idx" ON "catalog_variant_media"("variant_id", "media_type", "sort_order");

-- CreateIndex
CREATE INDEX "catalog_variant_colors_variant_id_idx" ON "catalog_variant_colors"("variant_id");

-- CreateIndex
CREATE INDEX "catalog_variant_features_variant_id_category_idx" ON "catalog_variant_features"("variant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_variant_city_prices_v_city_eff_key" ON "catalog_variant_city_prices"("variant_id", "city_id", "effective_from");

-- CreateIndex
CREATE INDEX "catalog_variant_city_prices_city_id_variant_id_idx" ON "catalog_variant_city_prices"("city_id", "variant_id");

-- AddForeignKey
ALTER TABLE "catalog_models" ADD CONSTRAINT "catalog_models_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "catalog_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variants" ADD CONSTRAINT "catalog_variants_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "catalog_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variants" ADD CONSTRAINT "catalog_variants_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "catalog_data_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variant_specs" ADD CONSTRAINT "catalog_variant_specs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variant_media" ADD CONSTRAINT "catalog_variant_media_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variant_colors" ADD CONSTRAINT "catalog_variant_colors_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variant_features" ADD CONSTRAINT "catalog_variant_features_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variant_city_prices" ADD CONSTRAINT "catalog_variant_city_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "catalog_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_variant_city_prices" ADD CONSTRAINT "catalog_variant_city_prices_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "catalog_cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
