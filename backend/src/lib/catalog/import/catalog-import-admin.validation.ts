import { z } from "zod";
import { CATALOG_IMPORT_JOB_SOURCES } from "./catalog-import-job.types";

export const catalogImportStartBodySchema = z.object({
  source: z.enum(CATALOG_IMPORT_JOB_SOURCES),
  city: z.string().trim().min(1).max(120).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  pages: z.coerce.number().int().min(1).max(50).optional().default(1),
  segment: z.string().trim().min(1).max(80).optional(),
});

export type CatalogImportStartBody = z.infer<typeof catalogImportStartBodySchema>;

export const catalogImportJobIdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const catalogImportApprovalBodySchema = z.object({
  recordIds: z.array(z.string().trim().min(1).max(200)).min(1).max(500),
  reason: z.string().trim().min(1).max(500).optional(),
  override: z.boolean().optional().default(false),
});

export type CatalogImportApprovalBody = z.infer<typeof catalogImportApprovalBodySchema>;

export const catalogImportPublishBodySchema = z.object({
  confirm: z.literal(true),
  recordIds: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
});

export type CatalogImportPublishBody = z.infer<typeof catalogImportPublishBodySchema>;
