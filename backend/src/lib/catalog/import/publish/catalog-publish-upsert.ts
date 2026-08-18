import type { CatalogSegment, PrismaClient } from "@prisma/client";
import { businessKeyFromLabels, slugifyCatalog } from "../../business-key";
import { normalizeFuelValue, normalizeTransmissionValue } from "../../normalization";
import { importRecordToStandard } from "../import-record-normalizer";
import type { ImportRecord } from "../import-types";
import type { CatalogImportPreviewRecord } from "../catalog-import-preview.types";
import type { StorageProvider } from "../../../storage/storage-types";

export type CatalogPublishUpsertDeps = {
  prisma: PrismaClient;
  storage: StorageProvider;
  jobId: string;
  sourceCode: string;
  actorUserId: string;
};

export type CatalogPublishUpsertResult =
  | {
      ok: true;
      catalogVariantId: string;
      businessKey: string;
      externalId: string | null;
      created: boolean;
      skippedDuplicate: boolean;
      mediaUploaded: boolean;
      mediaFailure: boolean;
    }
  | {
      ok: false;
      code: string;
      message: string;
      validationFailure?: boolean;
      mediaFailure?: boolean;
      businessKey?: string | null;
      externalId?: string | null;
    };

function field(record: ImportRecord | null, preview: CatalogImportPreviewRecord, key: string): string {
  if (record?.fields[key] != null && String(record.fields[key]).trim()) {
    return String(record.fields[key]).trim();
  }
  const fromPreview = (preview as Record<string, unknown>)[key];
  if (typeof fromPreview === "string" && fromPreview.trim() && fromPreview !== "—") {
    return fromPreview.trim();
  }
  return "";
}

function resolveSegment(record: ImportRecord | null): CatalogSegment {
  const raw = record?.segment ?? "car";
  const allowed: CatalogSegment[] = [
    "car",
    "bike",
    "scooter",
    "ev",
    "truck",
    "bus",
    "pickup",
    "tractor",
    "construction_equipment",
    "farm_equipment",
    "commercial_vehicle",
    "auto",
    "rickshaw",
  ];
  return allowed.includes(raw as CatalogSegment) ? (raw as CatalogSegment) : "car";
}

function parseYear(value: string): number {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1990 && n <= 2100) return Math.trunc(n);
  return new Date().getFullYear();
}

async function uploadMediaIfNeeded(options: {
  storage: StorageProvider;
  variantId: string;
  imageUrl: string | null;
  jobId: string;
}): Promise<{ uploaded: boolean; failure: boolean; publicUrl: string | null }> {
  if (!options.imageUrl) {
    return { uploaded: false, failure: false, publicUrl: null };
  }

  try {
    const response = await fetch(options.imageUrl);
    if (!response.ok) {
      return { uploaded: false, failure: true, publicUrl: null };
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    const key = `catalog/${options.jobId}/${options.variantId}/primary.jpg`;
    const upload = await options.storage.upload({
      key,
      body: buffer,
      contentType: contentType.startsWith("image/") ? contentType : "image/jpeg",
      metadata: { sourceUrl: options.imageUrl, jobId: options.jobId },
    });
    if (!upload.success) {
      return { uploaded: false, failure: true, publicUrl: null };
    }
    return { uploaded: true, failure: false, publicUrl: upload.data.publicUrl };
  } catch {
    return { uploaded: false, failure: true, publicUrl: null };
  }
}

/**
 * Upsert one approved import row into catalog tables inside a DB transaction.
 * Idempotent on businessKey and (sourceId, externalId).
 */
export async function upsertApprovedCatalogRecord(
  deps: CatalogPublishUpsertDeps,
  preview: CatalogImportPreviewRecord,
  importRecord: ImportRecord | null,
): Promise<CatalogPublishUpsertResult> {
  const standard = importRecord ? importRecordToStandard(importRecord) : null;
  const brand = standard?.brand || field(importRecord, preview, "brand") || preview.brand;
  const model = standard?.model || field(importRecord, preview, "model") || preview.model;
  const variant = standard?.variant || field(importRecord, preview, "variant") || preview.variant;
  const fuel = standard?.fuel || field(importRecord, preview, "fuel") || preview.fuel;
  const transmission =
    standard?.transmission || field(importRecord, preview, "transmission") || preview.transmission;
  const year = standard?.year ?? parseYear(field(importRecord, preview, "year"));
  const city = standard?.city || field(importRecord, preview, "city") || preview.city;
  const priceRaw =
    (standard?.exShowroomPrice != null ? String(standard.exShowroomPrice) : "") ||
    field(importRecord, preview, "exShowroomPrice") ||
    preview.price ||
    "";
  const imageUrl =
    standard?.imageUrl || field(importRecord, preview, "imageUrl") || preview.imageUrl || null;
  const externalId =
    field(importRecord, preview, "source_id") ||
    field(importRecord, preview, "externalId") ||
    null;
  const sourceUrl = field(importRecord, preview, "vehicleUrl") || null;
  const bodyType = standard?.bodyType || field(importRecord, preview, "bodyType") || "Unknown";
  const segment = resolveSegment(importRecord);

  if (!brand || brand === "—" || !model || model === "—" || !variant || variant === "—") {
    return {
      ok: false,
      code: "VALIDATION_INCOMPLETE",
      message: "Brand, model, and variant are required to publish",
      validationFailure: true,
      externalId,
    };
  }

  if (preview.validationErrors.length > 0 && !preview.approvalDecision?.override) {
    return {
      ok: false,
      code: "VALIDATION_REJECTED",
      message: "Record has validation errors and cannot be published",
      validationFailure: true,
      externalId,
    };
  }

  const brandSlug = slugifyCatalog(brand);
  const modelSlug = slugifyCatalog(model);
  const variantSlug = slugifyCatalog(variant);
  const businessKey = businessKeyFromLabels({
    segment,
    brand,
    model,
    variant,
    fuel: fuel || "petrol",
    transmission: transmission || "manual",
    modelYear: year,
  });

  try {
    const result = await deps.prisma.$transaction(async (tx) => {
      const dataSource = await tx.catalogDataSource.upsert({
        where: { code: deps.sourceCode },
        update: { isActive: true },
        create: {
          code: deps.sourceCode,
          name: deps.sourceCode,
          sourceType: deps.sourceCode === "gaadi_bazaar" ? "scrape" : "manual",
          isActive: true,
          config: {},
        },
      });

      // Idempotency: existing by business key or source+external
      let existing = await tx.catalogVariant.findUnique({ where: { businessKey } });
      if (!existing && externalId) {
        existing = await tx.catalogVariant.findFirst({
          where: { sourceId: dataSource.id, externalId },
        });
      }

      if (existing) {
        const meta = (existing.metadata ?? {}) as Record<string, unknown>;
        const alreadyFromJob =
          meta.lastImportJobId === deps.jobId && existing.status === "published";
        if (alreadyFromJob) {
          return {
            ok: true as const,
            catalogVariantId: existing.id,
            businessKey,
            externalId,
            created: false,
            skippedDuplicate: true,
            mediaUploaded: false,
            mediaFailure: false,
          };
        }
      }

      const brandRow = await tx.catalogBrand.upsert({
        where: { slug: brandSlug },
        update: { name: brand, segment, status: "published" },
        create: {
          name: brand,
          slug: brandSlug,
          segment,
          country: "IN",
          status: "published",
          metadata: { createdByImportJobId: deps.jobId },
        },
      });

      const modelRow = await tx.catalogModel.upsert({
        where: { brandId_slug: { brandId: brandRow.id, slug: modelSlug } },
        update: { name: model, segment, bodyType, status: "published" },
        create: {
          brandId: brandRow.id,
          name: model,
          slug: modelSlug,
          segment,
          bodyType,
          status: "published",
          metadata: { createdByImportJobId: deps.jobId },
        },
      });

      const priceNum = Number(String(priceRaw).replace(/[,\s₹]/g, ""));
      const price =
        Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null;
      const metadata = {
        lastImportJobId: deps.jobId,
        publishedByUserId: deps.actorUserId,
        publishedAtIso: new Date().toISOString(),
        previewRecordId: preview.id,
      };

      const variantRow = existing
        ? await tx.catalogVariant.update({
            where: { id: existing.id },
            data: {
              name: variant,
              slug: variantSlug,
              businessKey,
              fuelType: normalizeFuelValue(fuel || "petrol"),
              transmission: normalizeTransmissionValue(transmission || "manual"),
              modelYear: year,
              exShowroomRef: price ?? undefined,
              status: "published",
              sourceId: dataSource.id,
              externalId: externalId || existing.externalId,
              sourceUrl: sourceUrl || existing.sourceUrl,
              publishedAt: existing.publishedAt ?? new Date(),
              metadata,
            },
          })
        : await tx.catalogVariant.create({
            data: {
              modelId: modelRow.id,
              name: variant,
              slug: variantSlug,
              businessKey,
              fuelType: normalizeFuelValue(fuel || "petrol"),
              transmission: normalizeTransmissionValue(transmission || "manual"),
              modelYear: year,
              exShowroomRef: price ?? undefined,
              status: "published",
              sourceId: dataSource.id,
              externalId: externalId || undefined,
              sourceUrl: sourceUrl || undefined,
              publishedAt: new Date(),
              metadata,
            },
          });

      await tx.catalogVariantSpec.upsert({
        where: { variantId: variantRow.id },
        update: { seating: standard?.year ? undefined : undefined },
        create: { variantId: variantRow.id },
      });

      const media = await uploadMediaIfNeeded({
        storage: deps.storage,
        variantId: variantRow.id,
        imageUrl,
        jobId: deps.jobId,
      });

      if (media.failure && imageUrl) {
        // Roll back this record's transaction by throwing — other records unaffected.
        throw Object.assign(new Error("Media upload failed for catalog publish"), {
          code: "MEDIA_UPLOAD_FAILED",
          mediaFailure: true,
        });
      }

      if (media.uploaded && media.publicUrl) {
        const existingPrimary = await tx.catalogVariantMedia.findFirst({
          where: { variantId: variantRow.id, isPrimary: true, mediaType: "image" },
        });
        if (existingPrimary) {
          await tx.catalogVariantMedia.update({
            where: { id: existingPrimary.id },
            data: { url: media.publicUrl, sourceId: dataSource.id },
          });
        } else {
          await tx.catalogVariantMedia.create({
            data: {
              variantId: variantRow.id,
              mediaType: "image",
              url: media.publicUrl,
              sortOrder: 0,
              isPrimary: true,
              altText: `${brand} ${model} ${variant}`,
              sourceId: dataSource.id,
            },
          });
        }
      } else if (imageUrl) {
        const existingByUrl = await tx.catalogVariantMedia.findFirst({
          where: { variantId: variantRow.id, url: imageUrl },
        });
        if (!existingByUrl) {
          await tx.catalogVariantMedia.create({
            data: {
              variantId: variantRow.id,
              mediaType: "image",
              url: imageUrl,
              sortOrder: 0,
              isPrimary: true,
              sourceId: dataSource.id,
            },
          });
        }
      }

      const colorName = field(importRecord, preview, "color");
      if (colorName) {
        const existingColor = await tx.catalogVariantColor.findFirst({
          where: { variantId: variantRow.id, name: colorName },
        });
        if (!existingColor) {
          await tx.catalogVariantColor.create({
            data: { variantId: variantRow.id, name: colorName, isDefault: true },
          });
        }
      }

      const featuresRaw = field(importRecord, preview, "features");
      if (featuresRaw) {
        for (const name of featuresRaw.split("|").map((f) => f.trim()).filter(Boolean)) {
          const existingFeature = await tx.catalogVariantFeature.findFirst({
            where: { variantId: variantRow.id, category: "general", name },
          });
          if (!existingFeature) {
            await tx.catalogVariantFeature.create({
              data: { variantId: variantRow.id, category: "general", name },
            });
          }
        }
      }

      if (city && city !== "—" && price != null) {
        const citySlug = slugifyCatalog(city);
        let cityRow = await tx.catalogCity.findUnique({ where: { slug: citySlug } });
        if (!cityRow) {
          cityRow = await tx.catalogCity.create({
            data: {
              name: city,
              slug: citySlug,
              state: field(importRecord, preview, "state") || "Unknown",
              stateSlug: slugifyCatalog(field(importRecord, preview, "state") || "unknown"),
              tier: 3,
              isActive: true,
            },
          });
        }
        const effectiveFrom = new Date("1970-01-01T00:00:00.000Z");
        const existingPrice = await tx.catalogVariantCityPrice.findFirst({
          where: { variantId: variantRow.id, cityId: cityRow.id, effectiveFrom },
        });
        if (existingPrice) {
          await tx.catalogVariantCityPrice.update({
            where: { id: existingPrice.id },
            data: { exShowroom: price, sourceId: dataSource.id },
          });
        } else {
          await tx.catalogVariantCityPrice.create({
            data: {
              variantId: variantRow.id,
              cityId: cityRow.id,
              exShowroom: price,
              effectiveFrom,
              sourceId: dataSource.id,
            },
          });
        }
      }

      return {
        ok: true as const,
        catalogVariantId: variantRow.id,
        businessKey,
        externalId,
        created: !existing,
        skippedDuplicate: false,
        mediaUploaded: media.uploaded,
        mediaFailure: false,
      };
    });

    return result;
  } catch (error) {
    const err = error as { code?: string; mediaFailure?: boolean; message?: string };
    if (err.code === "MEDIA_UPLOAD_FAILED" || err.mediaFailure) {
      return {
        ok: false,
        code: "MEDIA_UPLOAD_FAILED",
        message: err.message ?? "Media upload failed",
        mediaFailure: true,
        businessKey,
        externalId,
      };
    }
    return {
      ok: false,
      code: "PUBLISH_TRANSACTION_FAILED",
      message: error instanceof Error ? error.message : String(error),
      businessKey,
      externalId,
    };
  }
}
