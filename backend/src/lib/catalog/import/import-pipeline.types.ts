import type { ImportContext } from "./import-context";
import type { ImportPipelineStage } from "./import-types";

/** Result of a single catalog import pipeline run (no DB writes unless publish is confirmed). */
export type ImportPipelineRunResult = {
  jobId: string;
  success: boolean;
  completedStages: ImportPipelineStage[];
  failedStage?: ImportPipelineStage;
  finalStage: ImportPipelineStage | null;
  context: ImportContext;
};
