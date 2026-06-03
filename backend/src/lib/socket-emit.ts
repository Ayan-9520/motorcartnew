import type { Server as SocketServer } from "socket.io";

export function emitDbChange(table: string, event: string, payload: { new?: Record<string, unknown> }) {
  const io = (globalThis as unknown as { motorcartIo?: SocketServer }).motorcartIo;
  if (!io) return;
  io.emit(`db:${table}:${event.toLowerCase()}`, payload);
  const rooms = io.sockets.adapter.rooms;
  rooms.forEach((_, room) => {
    if (room.startsWith("room:") || room.includes(table)) {
      io.to(room).emit(`db:${table}:${event.toLowerCase()}`, payload);
    }
  });
}
