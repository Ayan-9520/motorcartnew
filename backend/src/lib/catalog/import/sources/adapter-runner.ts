import type { AdapterContext } from "./adapter-context";
import {
  adapterSuccess,
  type AdapterLifecycleResult,
  type SourceAdapterStage,
} from "./adapter-types";
import type { SourceAdapter } from "./source-adapter";

const ADAPTER_STAGES: readonly SourceAdapterStage[] = [
  "connect",
  "fetch",
  "validate",
  "normalize",
  "disconnect",
] as const;

async function runStage(
  adapter: SourceAdapter,
  stage: SourceAdapterStage,
  context: AdapterContext,
): Promise<{ success: boolean; warnings: string[] }> {
  context.beginStage(stage);

  let result;
  switch (stage) {
    case "connect":
      result = await adapter.connect(context);
      if (result.success) context.setConnection(result.data);
      break;
    case "fetch":
      result = await adapter.fetch(context);
      if (result.success) context.setFetch(result.data);
      break;
    case "validate":
      result = await adapter.validate(context);
      if (result.success) context.setValidation(result.data);
      break;
    case "normalize":
      result = await adapter.normalize(context);
      if (result.success) context.setNormalized(result.data);
      break;
    case "disconnect":
      result = await adapter.disconnect(context);
      if (result.success && context.connection) {
        context.setConnection({ ...context.connection, connected: false });
      }
      break;
    default:
      context.completeStage(stage, false, "Unknown stage");
      return { success: false, warnings: [] };
  }

  const warnings = result.warnings ?? [];
  for (const w of warnings) context.addWarning(w);

  if (!result.success) {
    context.addError(result.error);
    context.completeStage(stage, false, result.error.message);
    return { success: false, warnings };
  }

  context.completeStage(stage, true);
  return { success: true, warnings };
}

/** Runs connect → fetch → validate → normalize → disconnect on an adapter. */
export async function runAdapterLifecycle(
  adapter: SourceAdapter,
  context: AdapterContext,
): Promise<AdapterLifecycleResult> {
  const completedStages: SourceAdapterStage[] = [];

  for (const stage of ADAPTER_STAGES) {
    const outcome = await runStage(adapter, stage, context);
    if (!outcome.success) {
      return {
        runId: context.runId,
        sourceId: context.sourceId,
        success: false,
        completedStages,
        failedStage: stage,
        context,
      };
    }
    completedStages.push(stage);
  }

  return {
    runId: context.runId,
    sourceId: context.sourceId,
    success: true,
    completedStages,
    context,
  };
}

/** Convenience helper for mock/test adapters that succeed with empty payload. */
export async function runAdapterStageConnectMock(
  context: AdapterContext,
  endpoint = "mock://catalog-source",
) {
  const info = {
    connected: true,
    connectedAt: new Date().toISOString(),
    endpoint,
  };
  context.setConnection(info);
  return adapterSuccess("connect", info, { metadata: { mock: true } });
}

export { ADAPTER_STAGES };
