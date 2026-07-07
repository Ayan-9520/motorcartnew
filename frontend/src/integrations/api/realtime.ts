import { io, type Socket } from "socket.io-client";
import { getApiBaseUrl } from "@/lib/api/base-url";

function getSocketUrl(): string | undefined {
  const fromEnv = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const apiBase = getApiBaseUrl();
  if (apiBase) return apiBase;
  return undefined;
}

type PostgresChangeFilter = {
  event: string;
  schema: string;
  table: string;
  filter?: string;
};

type ChannelHandler = {
  event: string;
  config?: Record<string, unknown>;
  callback: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void;
};

export type RealtimeChannel = {
  on: (
    type: "postgres_changes" | "presence" | "broadcast",
    filter: PostgresChangeFilter | { event: string },
    callback: ChannelHandler["callback"]
  ) => RealtimeChannel;
  subscribe: (cb?: (status: string) => void) => RealtimeChannel;
  track: (payload: Record<string, unknown>) => Promise<void>;
  presenceState: () => Record<string, unknown[]>;
  unsubscribe: () => void;
};

const sockets = new Map<string, Socket>();

function parseFilter(filter?: string): Record<string, string> {
  if (!filter) return {};
  const m = filter.match(/^(\w+)=eq\.(.+)$/);
  if (!m) return {};
  return { [m[1]!]: m[2]! };
}

export function createChannel(name: string, _config?: Record<string, unknown>): RealtimeChannel {
  const handlers: Array<{ type: string; filter: PostgresChangeFilter | { event: string }; callback: ChannelHandler["callback"] }> = [];
  let socket: Socket | null = null;
  let subscribed = false;

  const channel: RealtimeChannel = {
    on(type, filter, callback) {
      handlers.push({ type, filter: filter as PostgresChangeFilter, callback });
      return channel;
    },

    subscribe(cb) {
      if (subscribed) return channel;
      subscribed = true;
      const socketUrl = getSocketUrl();
      socket =
        sockets.get(name) ??
        (socketUrl
          ? io(socketUrl, { transports: ["websocket"], autoConnect: true })
          : io({ transports: ["websocket"], autoConnect: true }));
      sockets.set(name, socket);

      socket.emit("join", { room: name });

      const events = ["insert", "update", "delete"];
      for (const h of handlers) {
        if (h.type === "postgres_changes") {
          const f = h.filter as PostgresChangeFilter;
          const extra = parseFilter(f.filter);
          const ev = f.event === "*" ? events : [f.event.toLowerCase()];
          for (const e of ev) {
            socket.on(`db:${f.table}:${e}`, (payload: { new?: Record<string, unknown> }) => {
              if (extra.user_id && payload.new?.user_id !== extra.user_id) return;
              if (extra.id && payload.new?.id !== extra.id && payload.new?.auction_id !== extra.id) return;
              if (extra.auction_id && payload.new?.auction_id !== extra.auction_id) return;
              h.callback({ new: payload.new });
            });
          }
        }
        if (h.type === "broadcast") {
          socket.on("broadcast", (payload: { new?: Record<string, unknown> }) => h.callback(payload));
        }
        if (h.type === "presence") {
          socket.on("presence:sync", () => h.callback({}));
        }
      }

      socket.on("connect", () => cb?.("SUBSCRIBED"));
      if (socket.connected) cb?.("SUBSCRIBED");
      return channel;
    },

    async track(payload) {
      socket?.emit("presence:track", { room: name, ...payload });
    },

    presenceState() {
      return (socket as Socket & { presence?: Record<string, unknown[]> })?.presence ?? {};
    },

    unsubscribe() {
      socket?.emit("leave", { room: name });
    },
  };

  return channel;
}

export function removeChannel(channel: RealtimeChannel | null) {
  channel?.unsubscribe();
}
