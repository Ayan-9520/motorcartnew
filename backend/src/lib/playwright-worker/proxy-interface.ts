import type { ProxyConfig } from "./worker-types";

/** Proxy provider interface — implementations supply rotation without binding to Playwright. */
export interface ProxyProvider {
  getProxy(): ProxyConfig | null;
  rotate?(): void;
}

export class StaticProxyProvider implements ProxyProvider {
  constructor(private readonly proxy: ProxyConfig | null) {}

  getProxy(): ProxyConfig | null {
    return this.proxy;
  }
}

export class RotatingProxyProvider implements ProxyProvider {
  private index = 0;

  constructor(private readonly proxies: ProxyConfig[]) {}

  getProxy(): ProxyConfig | null {
    if (!this.proxies.length) return null;
    return this.proxies[this.index % this.proxies.length] ?? null;
  }

  rotate(): void {
    if (this.proxies.length) this.index = (this.index + 1) % this.proxies.length;
  }
}

export function proxyToLaunchArgs(proxy: ProxyConfig | null): Record<string, string> | undefined {
  if (!proxy) return undefined;
  const args: Record<string, string> = { server: proxy.server };
  if (proxy.username) args.username = proxy.username;
  if (proxy.password) args.password = proxy.password;
  if (proxy.bypass?.length) args.bypass = proxy.bypass.join(",");
  return args;
}
