import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data", "unified-notifications");
const DATA_FILE = path.join(DATA_DIR, "read-state.json");

type UserReadState = {
  read_ids: string[];
  read_all_at: string | null;
};

type StoreFile = {
  version: 1;
  users: Record<string, UserReadState>;
};

async function ensureStore(): Promise<StoreFile> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.version === 1 && parsed.users) return parsed;
  } catch {
    /* empty */
  }
  return { version: 1, users: {} };
}

async function persist(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function getUserState(store: StoreFile, userId: string): UserReadState {
  return store.users[userId] ?? { read_ids: [], read_all_at: null };
}

export function isOverlayRead(
  userId: string,
  unifiedId: string,
  createdAt: string,
  state: UserReadState
): boolean {
  if (state.read_ids.includes(unifiedId)) return true;
  if (state.read_all_at && createdAt <= state.read_all_at) return true;
  return false;
}

export async function loadUserReadState(userId: string): Promise<UserReadState> {
  const store = await ensureStore();
  return getUserState(store, userId);
}

export async function markUnifiedRead(userId: string, unifiedId: string) {
  const store = await ensureStore();
  const user = getUserState(store, userId);
  if (!user.read_ids.includes(unifiedId)) {
    user.read_ids.push(unifiedId);
  }
  store.users[userId] = user;
  await persist(store);
  return user;
}

export async function markAllUnifiedRead(userId: string) {
  const store = await ensureStore();
  const now = new Date().toISOString();
  store.users[userId] = {
    read_ids: getUserState(store, userId).read_ids,
    read_all_at: now,
  };
  await persist(store);
  return store.users[userId];
}
