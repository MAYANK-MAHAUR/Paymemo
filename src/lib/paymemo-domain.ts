import type { EncryptedMetadata } from "./crypto-vault";
import { getVaultAuthHeaders } from "./crypto-vault";

export type DomainRecordType = "invoice" | "batch-payout" | "agent-payment-intent";

export type EncryptedDomainRecord = {
  id: string;
  walletAddress: string;
  type: DomainRecordType;
  publicData: Record<string, unknown>;
  encryptedMetadata: EncryptedMetadata;
  status: string;
  createdAt: string;
  updatedAt: string;
};

const ENDPOINTS: Record<DomainRecordType, string> = {
  invoice: "/api/invoices",
  "batch-payout": "/api/batch-payouts",
  "agent-payment-intent": "/api/agent-payment-intent",
};

export async function fetchDomainRecords(walletAddress: string, type: DomainRecordType) {
  const response = await fetch(
    `${ENDPOINTS[type]}?wallet=${encodeURIComponent(walletAddress.toLowerCase())}`,
    { headers: getVaultAuthHeaders() },
  );

  if (!response.ok) {
    throw new Error(`Unable to load ${type} records.`);
  }

  const payload = (await response.json()) as { ok: true; records: EncryptedDomainRecord[] };
  return payload.records;
}

export async function syncDomainRecord(record: EncryptedDomainRecord) {
  const response = await fetch(ENDPOINTS[record.type], {
    method: "POST",
    headers: { "content-type": "application/json", ...getVaultAuthHeaders() },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    throw new Error(`Unable to sync ${record.type} record.`);
  }

  return (await response.json()) as { ok: true; record: EncryptedDomainRecord };
}
