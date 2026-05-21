import type { EncryptedMetadata } from "./crypto-vault";
import { getVaultAuthHeaders } from "./crypto-vault";
import type { PayMemoRecord, PayMemoRecordInput } from "./paymemo-schema";
import { normalizeRecord } from "./paymemo-schema";

const VAULT_KEY = "paymemo:vault:v1";
const ENCRYPTED_VAULT_SESSION_KEY = "paymemo:encrypted-vault-session:v1";

function clearPayMemoBrowserStorage() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => Boolean(key?.startsWith("paymemo:")),
    );
    keys.forEach((key) => storage.removeItem(key));
  }
}

const PRIVATE_FIELDS = [
  "category",
  "counterparty",
  "note",
  "project",
  "invoiceRef",
  "taskId",
  "tool",
  "agentId",
  "agentReason",
] as const;

type PrivateField = (typeof PRIVATE_FIELDS)[number];

export type PublicPayMemoRecord = Omit<PayMemoRecord, PrivateField>;

export type StoredVaultRecord = {
  id: string;
  walletAddress: string;
  publicRecord: PublicPayMemoRecord;
  encryptedMetadata: EncryptedMetadata;
  syncStatus: "local" | "synced" | "sync-failed";
  updatedAt: string;
};

export function readVaultRecords(): PayMemoRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(VAULT_KEY);
  if (!raw) return [];

  try {
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function writeVaultRecords(records: PayMemoRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VAULT_KEY, JSON.stringify(records));
}

export function saveVaultRecord(record: PayMemoRecord) {
  const normalized = normalizeRecord(record);
  const next = [normalized, ...readVaultRecords().filter((item) => item.id !== normalized.id)];
  writeVaultRecords(next);
  return normalized;
}

export function exportVaultJson() {
  return JSON.stringify(readVaultRecords(), null, 2);
}

export function toPrivateMetadata(record: PayMemoRecordInput) {
  return {
    category: record.category,
    counterparty: record.counterparty ?? "",
    note: record.note ?? "",
    project: record.project ?? "",
    invoiceRef: record.invoiceRef ?? "",
    taskId: record.taskId ?? "",
    tool: record.tool ?? "",
    agentId: record.agentId ?? "",
    agentReason: record.agentReason ?? "",
  };
}

export function toPublicRecord(record: PayMemoRecord): PublicPayMemoRecord {
  const {
    category,
    counterparty,
    note,
    project,
    invoiceRef,
    taskId,
    tool,
    agentId,
    agentReason,
    ...publicRecord
  } = record;
  void category;
  void counterparty;
  void note;
  void project;
  void invoiceRef;
  void taskId;
  void tool;
  void agentId;
  void agentReason;
  return publicRecord;
}

export function readEncryptedVaultRecords(): StoredVaultRecord[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(ENCRYPTED_VAULT_SESSION_KEY);
  if (!raw) return [];

  try {
    const records = JSON.parse(raw);
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export function writeEncryptedVaultRecords(records: StoredVaultRecord[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ENCRYPTED_VAULT_SESSION_KEY, JSON.stringify(records));
}

export function saveEncryptedVaultRecord(record: StoredVaultRecord) {
  const next = [record, ...readEncryptedVaultRecords().filter((item) => item.id !== record.id)];
  writeEncryptedVaultRecords(next);
  return record;
}

export async function syncEncryptedVaultRecord(record: StoredVaultRecord) {
  const response = await fetch("/api/vault-records", {
    method: "POST",
    headers: { "content-type": "application/json", ...getVaultAuthHeaders() },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error("Unable to sync encrypted PayMemo record.");
  }

  return (await response.json()) as { ok: true; record: StoredVaultRecord };
}

export async function fetchEncryptedVaultRecords(walletAddress: string) {
  const response = await fetch(
    `/api/vault-records?wallet=${encodeURIComponent(walletAddress.toLowerCase())}`,
    { headers: getVaultAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error("Unable to load encrypted PayMemo records from the database.");
  }

  const payload = (await response.json()) as { ok: true; records: StoredVaultRecord[] };
  writeEncryptedVaultRecords(payload.records);
  return payload.records;
}

export async function deleteEncryptedVaultRecords(walletAddress: string) {
  const response = await fetch(
    `/api/vault-records?wallet=${encodeURIComponent(walletAddress.toLowerCase())}`,
    { method: "DELETE", headers: getVaultAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error("Unable to delete encrypted PayMemo records from the database.");
  }

  writeEncryptedVaultRecords([]);
  return (await response.json()) as { ok: true; deleted: true; remaining: StoredVaultRecord[] };
}

export async function deleteFullUserDatabase(walletAddress: string) {
  const response = await fetch(
    `/api/database-reset?wallet=${encodeURIComponent(walletAddress.toLowerCase())}`,
    { method: "DELETE", headers: getVaultAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error("Unable to clear the full PayMemo database for this wallet.");
  }

  clearPayMemoBrowserStorage();
  return (await response.json()) as { ok: true; deleted: true };
}

export async function exportEncryptedVaultJson(walletAddress?: string) {
  const records = walletAddress
    ? await fetchEncryptedVaultRecords(walletAddress)
    : readEncryptedVaultRecords();
  return JSON.stringify(records, null, 2);
}
