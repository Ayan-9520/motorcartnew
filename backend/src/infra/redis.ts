import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType | null> | null = null;

export async function getRedis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (client?.isOpen) return client;

  connecting ??= (async () => {
    const next = createClient({ url });
    next.on("error", (err) => console.error("[redis]", err.message));
    await next.connect();
    client = next as RedisClientType;
    return client;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export async function closeRedis(): Promise<void> {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
}
