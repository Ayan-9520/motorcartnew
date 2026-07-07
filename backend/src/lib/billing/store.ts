import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type {
  BillingAccount,
  MockInvoice,
  SubscriptionRecord,
  UsageRecord,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data", "billing");
const FILES = {
  accounts: path.join(DATA_DIR, "billing-accounts.json"),
  subscriptions: path.join(DATA_DIR, "subscriptions.json"),
  usage: path.join(DATA_DIR, "usage-tracking.json"),
  invoices: path.join(DATA_DIR, "invoices.json"),
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export async function listBillingAccounts(): Promise<BillingAccount[]> {
  const store = await readJson<{ accounts: BillingAccount[] }>(FILES.accounts, { accounts: [] });
  return store.accounts;
}

export async function saveBillingAccounts(accounts: BillingAccount[]) {
  await writeJson(FILES.accounts, { version: 1, accounts });
}

export async function findBillingAccountForUser(
  userId: string,
  businessProfileId?: string | null
): Promise<BillingAccount | null> {
  const accounts = await listBillingAccounts();
  if (businessProfileId) {
    return (
      accounts.find(
        (a) => a.owner_user_id === userId && a.business_profile_id === businessProfileId
      ) ?? null
    );
  }
  return accounts.find((a) => a.owner_user_id === userId && !a.business_profile_id) ?? accounts.find((a) => a.owner_user_id === userId) ?? null;
}

export async function upsertBillingAccount(account: BillingAccount) {
  const accounts = await listBillingAccounts();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) accounts[idx] = account;
  else accounts.push(account);
  await saveBillingAccounts(accounts);
  return account;
}

export async function createBillingAccount(data: Omit<BillingAccount, "id" | "created_at">) {
  const account: BillingAccount = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...data,
  };
  await upsertBillingAccount(account);
  return account;
}

export async function listSubscriptions(): Promise<SubscriptionRecord[]> {
  const store = await readJson<{ subscriptions: SubscriptionRecord[] }>(FILES.subscriptions, {
    subscriptions: [],
  });
  return store.subscriptions;
}

export async function saveSubscriptions(subscriptions: SubscriptionRecord[]) {
  await writeJson(FILES.subscriptions, { version: 1, subscriptions });
}

export async function getActiveSubscription(
  billingAccountId: string
): Promise<SubscriptionRecord | null> {
  const subs = await listSubscriptions();
  return (
    subs.find(
      (s) =>
        s.billing_account_id === billingAccountId &&
        ["active", "trialing"].includes(s.status)
    ) ?? null
  );
}

export async function upsertSubscription(sub: SubscriptionRecord) {
  const subs = await listSubscriptions();
  const idx = subs.findIndex((s) => s.id === sub.id);
  if (idx >= 0) subs[idx] = sub;
  else subs.push(sub);
  await saveSubscriptions(subs);
  return sub;
}

export async function listUsageRecords(): Promise<UsageRecord[]> {
  const store = await readJson<{ records: UsageRecord[] }>(FILES.usage, { records: [] });
  return store.records;
}

export async function saveUsageRecords(records: UsageRecord[]) {
  await writeJson(FILES.usage, { version: 1, records });
}

export async function listInvoices(): Promise<MockInvoice[]> {
  const store = await readJson<{ invoices: MockInvoice[] }>(FILES.invoices, { invoices: [] });
  return store.invoices;
}

export async function saveInvoices(invoices: MockInvoice[]) {
  await writeJson(FILES.invoices, { version: 1, invoices });
}

export function currentBillingPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
