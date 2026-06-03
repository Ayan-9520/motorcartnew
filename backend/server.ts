import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketServer } from "socket.io";
import path from "path";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3001", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);

      if (parsedUrl.pathname?.startsWith("/uploads/")) {
        const rel = parsedUrl.pathname.replace("/uploads/", "");
        const filePath = path.join(process.env.UPLOAD_DIR ?? "./uploads", rel);
        if (existsSync(filePath)) {
          const st = await stat(filePath);
          if (st.isFile()) {
            createReadStream(filePath).pipe(res);
            return;
          }
        }
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error(err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN ?? "http://localhost:3000", credentials: true },
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

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\nPort ${port} is already in use. Stop the other process (often Vite on 3001) and run:\n  npm run ports:free\n  npm run dev\n`
      );
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen(port, () => {
    console.log(`> Motorcart API ready on http://localhost:${port}`);
  });
});
