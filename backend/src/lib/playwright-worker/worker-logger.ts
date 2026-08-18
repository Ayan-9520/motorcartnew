import type { WorkerLogLevel } from "./worker-types";

export type WorkerLogEntry = {
  level: WorkerLogLevel;
  message: string;
  timestamp: string;
  taskId?: string;
  context?: Record<string, unknown>;
};

export type WorkerLogger = {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  setTaskId?(taskId: string | undefined): void;
  getEntries?(): readonly WorkerLogEntry[];
};

export class InMemoryWorkerLogger implements WorkerLogger {
  private readonly entries: WorkerLogEntry[] = [];
  private taskId: string | undefined;

  constructor(private readonly prefix = "PlaywrightWorker") {}

  setTaskId(taskId: string | undefined): void {
    this.taskId = taskId;
  }

  private push(level: WorkerLogLevel, message: string, context?: Record<string, unknown>): void {
    this.entries.push({
      level,
      message: `[${this.prefix}] ${message}`,
      timestamp: new Date().toISOString(),
      taskId: this.taskId,
      context,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.push("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.push("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.push("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.push("error", message, context);
  }

  getEntries(): readonly WorkerLogEntry[] {
    return this.entries;
  }
}

export function createWorkerLogger(prefix?: string): InMemoryWorkerLogger {
  return new InMemoryWorkerLogger(prefix);
}
