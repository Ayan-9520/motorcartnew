/** Round-robin user agent rotation for browser contexts. */
export class UserAgentRotator {
  private index = 0;

  constructor(private readonly userAgents: readonly string[]) {
    if (!userAgents.length) {
      throw new Error("UserAgentRotator requires at least one user agent");
    }
  }

  next(): string {
    const ua = this.userAgents[this.index % this.userAgents.length]!;
    this.index += 1;
    return ua;
  }

  peek(): string {
    return this.userAgents[this.index % this.userAgents.length]!;
  }
}

export function randomDelayMs(minMs: number, maxMs: number, random = Math.random): number {
  if (maxMs <= minMs) return minMs;
  return Math.floor(minMs + random() * (maxMs - minMs + 1));
}

export async function applyRandomDelay(minMs: number, maxMs: number, random = Math.random): Promise<void> {
  const ms = randomDelayMs(minMs, maxMs, random);
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
