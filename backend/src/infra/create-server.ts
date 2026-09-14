import { createServer, type Server } from "http";
import { parse } from "url";
import path from "path";
import express, { type Express, type Request } from "express";
import helmet from "helmet";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { closeRedis } from "@/infra/redis";

export type MotorcartServer = {
  httpServer: Server;
  expressApp: Express;
  io: SocketServer;
  shutdown: () => Promise<void>;
};

function apiPath(req: Request): string {
  return String(req.originalUrl || req.url || "").split("?")[0] || "";
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Prefer nginx X-Real-IP so all Docker traffic is not counted as one shared IP. */
function clientIp(req: Request): string {
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) return xf.split(",")[0]!.trim();
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).split(",")[0]!.trim();
  return req.ip || req.socket.remoteAddress || "unknown";
}

function rateLimitKey(req: Request): string {
  return clientIp(req);
}

export async function createMotorcartServer(): Promise<MotorcartServer> {
  const dev = process.env.NODE_ENV !== "production";
  const hostname = "0.0.0.0";
  const port = parseInt(process.env.PORT ?? "3001", 10);
  const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

  const nextApp = next({ dev, hostname, port });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  const expressApp = express();
  const httpServer = createServer(expressApp);

  expressApp.set("trust proxy", 1);
  expressApp.disable("x-powered-by");

  expressApp.use(
    helmet({
      contentSecurityPolicy: dev ? false : undefined,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  expressApp.use(compression());
  expressApp.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  expressApp.use(morgan(dev ? "dev" : "combined"));

  /**
   * Auth has its own bucket so inventory/home SPA traffic cannot lock users out of login.
   * GET settings/me are polled heavily — do not burn the login budget on them.
   */
  expressApp.use(
    "/api/auth/",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: envInt("AUTH_RATE_LIMIT_MAX", dev ? 2000 : 600),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: rateLimitKey,
      skipSuccessfulRequests: true,
      validate: { trustProxy: false, xForwardedForHeader: false },
      message: { message: "Too many auth attempts. Please wait a few minutes and try again." },
      skip: (req) => {
        const p = apiPath(req);
        if (req.method === "GET" && (p === "/api/auth/settings" || p === "/api/auth/me")) return true;
        return false;
      },
    })
  );

  expressApp.use(
    "/api/",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: envInt("API_RATE_LIMIT_MAX", dev ? 20000 : 12000),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: rateLimitKey,
      validate: { trustProxy: false, xForwardedForHeader: false },
      message: { message: "Too many requests. Please try again later." },
      skip: (req) => {
        const p = apiPath(req);
        if (p === "/api/health" || p === "/api/ready" || p.startsWith("/api/health/")) return true;
        if (p.startsWith("/api/auth/")) return true;
        return false;
      },
    })
  );

  expressApp.use(
    "/uploads",
    express.static(path.resolve(process.env.UPLOAD_DIR ?? "./uploads"), {
      fallthrough: false,
      index: false,
    })
  );

  expressApp.use((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  expressApp.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[express:error]", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  );

  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.on("join", ({ room }: { room: string }) => {
      socket.join(room);
    });
    socket.on("leave", ({ room }: { room: string }) => {
      socket.leave(room);
    });
    socket.on("presence:track", ({ room, ...payload }: { room: string }) => {
      socket.to(room).emit("presence:sync", payload);
    });
  });

  (globalThis as unknown as { motorcartIo: SocketServer }).motorcartIo = io;

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[motorcart] Graceful shutdown…");

    await new Promise<void>((resolve) => {
      io.close(() => resolve());
    });

    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });

    await closeRedis();
    console.log("[motorcart] Shutdown complete");
  };

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${port} is already in use.\n`);
      process.exit(1);
    }
    throw err;
  });

  return {
    httpServer,
    expressApp,
    io,
    shutdown,
  };
}

export function listen(server: MotorcartServer, port = parseInt(process.env.PORT ?? "3001", 10)) {
  return new Promise<void>((resolve) => {
    server.httpServer.listen(port, "0.0.0.0", () => {
      console.log(`> Motorcart API ready on port ${port}`);
      resolve();
    });
  });
}

export function registerGracefulShutdown(server: MotorcartServer) {
  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT"];
  for (const signal of signals) {
    process.on(signal, () => {
      void server.shutdown().then(
        () => process.exit(0),
        () => process.exit(1)
      );
    });
  }
}
