import type { CapturedRequest, CapturedResponse } from "./worker-types";

export type RequestInterceptorContext = {
  request: CapturedRequest;
  abort?: boolean;
  headers?: Record<string, string>;
};

export type ResponseInterceptorContext = {
  request: CapturedRequest;
  response: CapturedResponse;
  abort?: boolean;
};

export type RequestInterceptor = (
  ctx: RequestInterceptorContext,
) => RequestInterceptorContext | void | Promise<RequestInterceptorContext | void>;

export type ResponseInterceptor = (
  ctx: ResponseInterceptorContext,
) => ResponseInterceptorContext | void | Promise<ResponseInterceptorContext | void>;

export class InterceptorRegistry {
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  addRequest(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponse(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async runRequest(ctx: RequestInterceptorContext): Promise<RequestInterceptorContext> {
    let current = ctx;
    for (const interceptor of this.requestInterceptors) {
      const next = await interceptor(current);
      if (next) current = next;
      if (current.abort) break;
    }
    return current;
  }

  async runResponse(ctx: ResponseInterceptorContext): Promise<ResponseInterceptorContext> {
    let current = ctx;
    for (const interceptor of this.responseInterceptors) {
      const next = await interceptor(current);
      if (next) current = next;
      if (current.abort) break;
    }
    return current;
  }
}

export function blockExternalHostsInterceptor(
  allowedSchemes: readonly string[],
  allowedHosts: readonly string[] = [],
): RequestInterceptor {
  return (ctx) => {
    try {
      const url = new URL(ctx.request.url);
      const scheme = url.protocol.replace(":", "");
      if (!allowedSchemes.includes(scheme)) {
        return { ...ctx, abort: true };
      }
      if ((scheme === "http" || scheme === "https") && allowedHosts.length > 0) {
        const host = url.hostname.toLowerCase();
        const ok = allowedHosts.some((allowed) => {
          const a = allowed.toLowerCase();
          return host === a || host.endsWith(`.${a}`);
        });
        if (!ok) return { ...ctx, abort: true };
      }
    } catch {
      return { ...ctx, abort: true };
    }
    return ctx;
  };
}

export function logResponseStatusInterceptor(onLog: (status: number, url: string) => void): ResponseInterceptor {
  return (ctx) => {
    onLog(ctx.response.status, ctx.response.url);
    return ctx;
  };
}
