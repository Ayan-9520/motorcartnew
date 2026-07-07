import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { UnifiedLeadRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data", "lead-router");
const DATA_FILE = path.join(DATA_DIR, "leads.json");

type StoreFile = {
  version: 1;
  leads: UnifiedLeadRecord[];
};

async function ensureStore(): Promise<StoreFile> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    if (parsed?.version === 1 && Array.isArray(parsed.leads)) return parsed;
  } catch {
    /* empty store */
  }
  return { version: 1, leads: [] };
}

async function persist(store: StoreFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function listStoredLeads(limit = 200, offset = 0): Promise<UnifiedLeadRecord[]> {
  const store = await ensureStore();
  return store.leads.slice(offset, offset + limit);
}

export async function appendLead(lead: UnifiedLeadRecord): Promise<UnifiedLeadRecord> {
  const store = await ensureStore();
  store.leads.unshift(lead);
  if (store.leads.length > 10_000) {
    store.leads = store.leads.slice(0, 10_000);
  }
  await persist(store);
  return lead;
}

export async function countStoredLeads(): Promise<number> {
  const store = await ensureStore();
  return store.leads.length;
}

export async function getLeadById(id: string): Promise<UnifiedLeadRecord | null> {
  const store = await ensureStore();
  return store.leads.find((l) => l.id === id) ?? null;
}
