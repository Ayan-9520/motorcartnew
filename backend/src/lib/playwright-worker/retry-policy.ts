import type { RetryPolicyConfig, WorkerError } from "./worker-types";

export type RetryExecutionResult<T> = {
  value: T;
  attempts: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryPolicy {
  constructor(private readonly config: RetryPolicyConfig) {}

  computeDelayMs(attempt: number): number {
    const raw = this.config.baseDelayMs * this.config.backoffMultiplier ** Math.max(0, attempt - 1);
    return Math.min(raw, this.config.maxDelayMs);
  }

  isRetryable(error: WorkerError, attempt: number): boolean {
    if (attempt >= this.config.maxAttempts) return false;
    if (error.retryable === false) return false;
    if (error.retryable === true) return true;
    if (this.config.retryableCodes?.includes(error.code)) return true;
    return false;
  }

  async execute<T>(
    fn: () => Promise<T>,
    onError?: (error: WorkerError, attempt: number) => void,
  ): Promise<RetryExecutionResult<T>> {
    let lastError: WorkerError = { code: "UNKNOWN", message: "Unknown error" };

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const value = await fn();
        return { value, attempts: attempt };
      } catch (err) {
        lastError = normalizeWorkerError(err);
        onError?.(lastError, attempt);
        if (!this.isRetryable(lastError, attempt)) break;
        await sleep(this.computeDelayMs(attempt));
      }
    }

    throw lastError;
  }
}

export function normalizeWorkerError(err: unknown): WorkerError {
  if (isWorkerError(err)) return err;
  if (err instanceof Error) {
    return { code: "WORKER_ERROR", message: err.message, retryable: false };
  }
  return { code: "WORKER_ERROR", message: String(err), retryable: false };
}

function isWorkerError(value: unknown): value is WorkerError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as WorkerError).code === "string"
  );
}
