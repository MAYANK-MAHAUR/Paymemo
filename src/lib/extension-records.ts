import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { readVaultSession } from "./crypto-vault";
import { readPartnerWallets } from "./watched-wallets";

export type ExtensionRecord = {
  id?: string;
  source?: string;
  provider?: string;
  txHash?: string;
  from?: string;
  to: string;
  amount: string;
  token: string;
  category: string;
  counterparty?: string;
  note?: string;
  project?: string;
  direction?: "incoming" | "outgoing";
  method?: string;
  rawValue?: string;
  callData?: string;
  tokenContract?: string;
  transactionType?: "native" | "erc20" | "contract-call";
  blockNumber?: string;
  confirmedAt?: string;
  detectionTiming?: string;
  reviewedAt?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

function ownedWallets(): string[] {
  const session = readVaultSession();
  const wallets = new Set<string>();
  if (session?.walletAddress) wallets.add(session.walletAddress.toLowerCase());
  readPartnerWallets(session?.walletAddress).forEach((wallet) => wallets.add(wallet.address));
  return [...wallets];
}

async function fetchExtensionRecords(wallets: string[]): Promise<ExtensionRecord[]> {
  if (!wallets.length) return [];
  const params = new URLSearchParams();
  wallets.forEach((wallet) => params.append("wallet", wallet));
  const response = await fetch(`/api/extension-intent?${params.toString()}`);
  if (!response.ok) throw new Error("Unable to load extension records");
  const payload = (await response.json()) as { records?: ExtensionRecord[] };
  return payload.records ?? [];
}

export function useExtensionRecords(): UseQueryResult<ExtensionRecord[]> {
  const wallets = ownedWallets();
  return useQuery({
    queryKey: ["extension-records", wallets.sort().join(",")],
    queryFn: () => fetchExtensionRecords(wallets),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    staleTime: 1500,
    enabled: wallets.length > 0,
    placeholderData: (previous) => previous,
  });
}
