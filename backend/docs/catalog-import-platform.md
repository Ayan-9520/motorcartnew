# Catalog Import Platform (Phase 3A)

Internal backend foundation only. **No UI, no API, no database writes.**

## Purpose

Establish the catalog import architecture — job management, pipeline orchestration, and pluggable interfaces for future CSV/Excel/JSON/API/scraper/OEM sources.

## Location

```
backend/src/lib/catalog/import/
├── import-types.ts          ImportResult, ImportError, shared types
├── import-interfaces.ts     ImportSource, ImportParser, ImportValidator, ImportPublisher
├── import-context.ts        ImportContext
├── import-job.ts            ImportJob
├── import-pipeline.ts       ImportPipeline
├── import-manager.ts        ImportManager
├── import-platform.test.ts
└── index.ts
```

## Pipeline stages

```
Upload → Validate → Normalize → Duplicate Check → Preview → Approve → Publish
```

| Stage | Phase 3A behavior |
|-------|-------------------|
| Upload | `ImportSource.upload()`; optional `ImportParser.parse()` |
| Validate | `ImportValidator` if configured; else skip with warning |
| Normalize | Identity pass-through (catalog normalization in 3B+) |
| Duplicate Check | Stub — deferred to 3B |
| Preview | In-memory sample + summary |
| Approve | Dry-run auto-approve when record count meets threshold |
| Publish | **Always dry-run in 3A** — no DB writes |

## Class diagram

```mermaid
classDiagram
    class ImportManager {
        +createJob(options) ImportJob
        +runJob(job) ImportJob
        +getJob(id) ImportJob
        +listJobs() ImportJob[]
        +cancelJob(id) boolean
    }

    class ImportJob {
        +id string
        +context ImportContext
        +status ImportJobStatus
        +attachResult(result)
        +snapshot()
    }

    class ImportContext {
        +jobId string
        +sourceType ImportSourceType
        +records ImportRecord[]
        +normalizedRecords ImportRecord[]
        +beginStage(stage)
        +completeStage(stage, success)
        +snapshot() ImportContextSnapshot
    }

    class ImportPipeline {
        +run(context) ImportPipelineRunResult
    }

    class ImportSource {
        <<interface>>
        +type ImportSourceType
        +upload(context) ImportResult
    }

    class ImportParser {
        <<interface>>
        +supportedSources ImportSourceType[]
        +parse(context) ImportResult
    }

    class ImportValidator {
        <<interface>>
        +validate(context) ImportResult
    }

    class ImportPublisher {
        <<interface>>
        +publish(context) ImportResult
    }

    class ImportError {
        +code string
        +stage ImportPipelineStage
    }

    class ImportResult~T~ {
        +success boolean
        +stage ImportPipelineStage
        +data T
        +errors ImportError[]
    }

    ImportManager --> ImportPipeline
    ImportManager --> ImportJob
    ImportJob --> ImportContext
    ImportPipeline --> ImportContext
    ImportPipeline --> ImportSource
    ImportPipeline --> ImportParser
    ImportPipeline --> ImportValidator
    ImportPipeline --> ImportPublisher
    ImportPipeline --> ImportResult
    ImportPipeline --> ImportError
```

## Sequence diagram

```mermaid
sequenceDiagram
    participant Caller
    participant Manager as ImportManager
    participant Job as ImportJob
    participant Pipeline as ImportPipeline
    participant Ctx as ImportContext
    participant Source as ImportSource
    participant Parser as ImportParser
    participant Validator as ImportValidator
    participant Publisher as ImportPublisher

    Caller->>Manager: runNewJob(options)
    Manager->>Job: create ImportContext
    Manager->>Pipeline: run(context)

    Pipeline->>Ctx: beginStage(upload)
    Pipeline->>Source: upload(context)
    Source-->>Pipeline: ImportResult(raw payload)
    opt Parser configured
        Pipeline->>Parser: parse(context)
        Parser-->>Pipeline: ImportResult(records)
    end
    Pipeline->>Ctx: setUpload / setRecords

    Pipeline->>Ctx: beginStage(validate)
    opt Validator configured
        Pipeline->>Validator: validate(context)
        Validator-->>Pipeline: ImportResult(report)
    end

    Pipeline->>Ctx: beginStage(normalize)
    Note over Pipeline,Ctx: identity normalize (3A)

    Pipeline->>Ctx: beginStage(duplicate_check)
    Note over Pipeline,Ctx: stub — Phase 3B

    Pipeline->>Ctx: beginStage(preview)
    Pipeline->>Ctx: setPreview(sample)

    Pipeline->>Ctx: beginStage(approve)
    Pipeline->>Ctx: setApproval(decision)

    Pipeline->>Ctx: beginStage(publish)
    alt dryRun true (Phase 3A default)
        Note over Pipeline,Ctx: wouldPublishCount only — no DB
    else dryRun false
        Pipeline->>Publisher: publish(context)
        Publisher-->>Pipeline: ImportResult
    end

    Pipeline-->>Manager: ImportPipelineRunResult
    Manager->>Job: attachResult
    Manager-->>Caller: ImportJob
```

## Usage (internal)

```typescript
import { createImportManager } from "@/lib/catalog/import";

const manager = createImportManager({
  source: myCsvSource,
  // parser, validator, publisher — Phase 3B+
});

const job = await manager.runNewJob({
  sourceType: "csv",
  fileName: "variants.csv",
  dryRun: true,
});

console.log(job.context.preview);
console.log(job.context.publish); // dryRun: true, published: false
```

## Future source types

| Type | Interface entry |
|------|-----------------|
| CSV | `ImportSource` + `ImportParser` |
| Excel | `ImportSource` + `ImportParser` |
| JSON | `ImportSource` + `ImportParser` |
| API | `ImportSource` |
| Scraper | `ImportSource` |
| OEM Feed | `ImportSource` |

## Tests

```bash
cd backend
npm run test:catalog-import
# or full catalog suite:
npm run test:catalog
```

## Safety

| Rule | Enforced |
|------|----------|
| No DB writes | Publish stage dry-run by default |
| No API / UI | Not registered in routes |
| No schema changes | Pure TypeScript module |
| Backward compatible | Additive `import/` package only |

## Phase boundaries

| Phase | Scope |
|-------|--------|
| **3A** | Architecture + pipeline skeleton (this document) |
| 3B | Parsers, validators, duplicate detection |
| 3C+ | Publishing + admin integration (future) |
