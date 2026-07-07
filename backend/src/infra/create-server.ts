import { createServer, type Server } from "http";
import { parse } from "url";
import path from "path";
import express, { type Express } from "express";
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
  expressApp.use(
    "/api/",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: dev ? 2000 : 400,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests. Please try again later." },
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
