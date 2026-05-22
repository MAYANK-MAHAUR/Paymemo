/**
 * Browser-side Morph Hoodi chain watcher.
 *
 * Mirrors the extension's background watcher in pure browser code so users
 * without the PayMemo extension can still:
 *   1. Add a wallet (their own connected wallet + partner wallets)
 *   2. Watch incoming + outgoing Morph Hoodi transactions in real time
 *   3. Review every detection in the same /app/review queue
 *
 * Detections are POSTed to /api/extension-intent (same endpoint the extension
 * uses) so they flow through the existing review pipeline without any new
 * server work.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, isAddress, morphHoodi, morphTokens, rpcCall } from "./morph";

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Re-scan window. We only ever look back this many blocks from the last seen
// to keep RPC use bounded.
const MAX_BLOCK_WINDOW = 200;
// Initial look-back so first activation surfaces recent activity (~5 minutes at 2s/block).
const INITIAL_LOOKBACK = 150;
// Poll cadence.
const POLL_INTERVAL_MS = 4000;

type Hex = string;

type RawBlockTx = {
  hash: Hex;
  from: Hex;
  to: Hex | null;
  value: Hex;
  input?: Hex;
  blockNumber?: Hex;
};

type RawBlock = {
  number: Hex;
  timestamp: Hex;
  transactions: RawBlockTx[];
};

type RawLog = {
  address: Hex;
  topics: Hex[];
  data: Hex;
  transactionHash: Hex;
  blockNumber: Hex;
};

export type ChainWatchState = {
  enabled: boolean;
  lastBlock: number | null;
  lastScanAt: number | null;
  latestDetections: number;
  scanError: string | null;
  isScanning: boolean;
};

type StoredState = {
  enabled: boolean;
  lastBlock: number | null;
  seenTxHashes: string[];
};

const STORAGE_PREFIX = "paymemo:browser-chain-watch:owner:";
const SEEN_LIMIT = 500;

function storageKey(owner: string) {
  return `${STORAGE_PREFIX}${owner.toLowerCase()}`;
}

function readStored(owner: string): StoredState {
  if (typeof window === "undefined") {
    return { enabled: false, lastBlock: null, seenTxHashes: [] };
  }
  try {
    const raw = window.localStorage.getItem(storageKey(owner));
    if (!raw) return { enabled: false, lastBlock: null, seenTxHashes: [] };
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      enabled: Boolean(parsed.enabled),
      lastBlock: typeof parsed.lastBlock === "number" ? parsed.lastBlock : null,
      seenTxHashes: Array.isArray(parsed.seenTxHashes)
        ? parsed.seenTxHashes.slice(-SEEN_LIMIT)
        : [],
    };
  } catch {
    return { enabled: false, lastBlock: null, seenTxHashes: [] };
  }
}

function writeStored(owner: string, state: StoredState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(owner), JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function hexToBigInt(value: string | null | undefined) {
  if (!value) return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function hexToNumber(value: string | null | undefined) {
  return Number(hexToBigInt(value));
}

function pad32(address: string) {
  return `0x${address.replace(/^0x/, "").toLowerCase().padStart(64, "0")}`;
}

function parseLogTransfer(log: RawLog) {
  const from = `0x${log.topics[1]?.slice(-40) ?? ""}`;
  const to = `0x${log.topics[2]?.slice(-40) ?? ""}`;
  const value = hexToBigInt(log.data);
  return { from, to, value, address: log.address, txHash: log.transactionHash };
}

function findKnownToken(contract: string) {
  const normalized = contract.toLowerCase();
  return morphTokens.find(
    (token) => token.contractAddress && token.contractAddress.toLowerCase() === normalized,
  );
}

function describeNativeAmount(rawValue: string) {
  const value = hexToBigInt(rawValue);
  if (value === 0n) return "0 ETH";
  return `${formatUnits(value, 18, 6)} ETH`;
}

function describeErc20Amount(value: bigint, decimals: number, symbol: string) {
  return `${formatUnits(value, decimals, 6)} ${symbol}`;
}

export type DetectedRecord = {
  id: string;
  mode: "wallet-assist";
  txHash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  direction: "incoming" | "outgoing";
  transactionType: "native" | "erc20" | "contract-call";
  tokenContract?: string;
  rawValue?: string;
  blockNumber?: string;
  source: "dashboard-chain-watch";
  status: "needs-review";
  provider: "Morph Chain Watch";
  method: "morph-chain-watch";
  category: "Other";
  createdAt: string;
};

function buildNativeRecord(tx: RawBlockTx, watched: Set<string>): DetectedRecord | null {
  const from = (tx.from || "").toLowerCase();
  const to = (tx.to || "").toLowerCase();
  const valueRaw = tx.value ?? "0x0";
  const value = hexToBigInt(valueRaw);

  // skip contract-deploy and zero-value calls
  if (!to) return null;
  if (value === 0n) return null;

  const isOutgoing = watched.has(from);
  const isIncoming = watched.has(to);
  if (!isOutgoing && !isIncoming) return null;

  return {
    id: `mcw-${tx.hash}`,
    mode: "wallet-assist",
    txHash: tx.hash,
    from,
    to,
    amount: describeNativeAmount(valueRaw),
    token: "ETH",
    direction: isOutgoing ? "outgoing" : "incoming",
    transactionType: "native",
    rawValue: valueRaw,
    blockNumber: tx.blockNumber,
    source: "dashboard-chain-watch",
    status: "needs-review",
    provider: "Morph Chain Watch",
    method: "morph-chain-watch",
    category: "Other",
    createdAt: new Date().toISOString(),
  };
}

function buildErc20Record(log: RawLog, watched: Set<string>): DetectedRecord | null {
  const parsed = parseLogTransfer(log);
  const from = parsed.from.toLowerCase();
  const to = parsed.to.toLowerCase();
  const isOutgoing = watched.has(from);
  const isIncoming = watched.has(to);
  if (!isOutgoing && !isIncoming) return null;

  const token = findKnownToken(parsed.address);
  const symbol = token?.symbol ?? "TOKEN";
  const decimals = token?.decimals ?? 18;

  return {
    id: `mcw-${log.transactionHash}-${parsed.address.toLowerCase()}`,
    mode: "wallet-assist",
    txHash: log.transactionHash,
    from,
    to,
    amount: describeErc20Amount(parsed.value, decimals, symbol),
    token: symbol,
    direction: isOutgoing ? "outgoing" : "incoming",
    transactionType: "erc20",
    tokenContract: parsed.address.toLowerCase(),
    blockNumber: log.blockNumber,
    source: "dashboard-chain-watch",
    status: "needs-review",
    provider: "Morph Chain Watch",
    method: "morph-chain-watch",
    category: "Other",
    createdAt: new Date().toISOString(),
  };
}

async function fetchBlockRange(fromBlock: number, toBlock: number) {
  const blocks: RawBlock[] = [];
  for (let i = fromBlock; i <= toBlock; i++) {
    const hex = `0x${i.toString(16)}`;
    try {
      const block = await rpcCall<RawBlock | null>("eth_getBlockByNumber", [hex, true]);
      if (block) blocks.push(block);
    } catch {
      // RPC hiccups are fine; resume next tick.
    }
  }
  return blocks;
}

async function fetchErc20Transfers(fromBlock: number, toBlock: number, watched: string[]) {
  const knownContracts = morphTokens
    .map((token) => token.contractAddress)
    .filter((value): value is string => Boolean(value));

  if (!knownContracts.length || !watched.length) return [] as RawLog[];

  const paddedAddresses = watched.map((address) => pad32(address));
  const base = {
    fromBlock: `0x${fromBlock.toString(16)}`,
    toBlock: `0x${toBlock.toString(16)}`,
    address: knownContracts,
  };

  // eth_getLogs OR semantics apply within a single topic position only, so
  // we need two parallel calls: one matching `from` (topic[1]), one matching
  // `to` (topic[2]). Hits are de-duplicated upstream by `${txHash}:${addr}`.
  const fromCall = rpcCall<RawLog[]>("eth_getLogs", [
    {
      ...base,
      topics: [ERC20_TRANSFER_TOPIC, paddedAddresses],
    },
  ]).catch(() => [] as RawLog[]);

  const toCall = rpcCall<RawLog[]>("eth_getLogs", [
    {
      ...base,
      topics: [ERC20_TRANSFER_TOPIC, null, paddedAddresses],
    },
  ]).catch(() => [] as RawLog[]);

  const [fromLogs, toLogs] = await Promise.all([fromCall, toCall]);
  return [...(fromLogs ?? []), ...(toLogs ?? [])];
}

async function syncDetectedRecord(record: DetectedRecord) {
  try {
    const response = await fetch("/api/extension-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    return false;
  }
}

type UseBrowserChainWatchArgs = {
  /** The connected (vault-unlocked) wallet — used for storage namespacing. */
  ownerAddress: string | null | undefined;
  /** Every address to watch (owner + partners). */
  watchedAddresses: string[];
};

export function useBrowserChainWatch({ ownerAddress, watchedAddresses }: UseBrowserChainWatchArgs) {
  const owner = (ownerAddress || "").toLowerCase();
  const stored = useMemo(() => readStored(owner), [owner]);
  const [enabled, setEnabled] = useState<boolean>(stored.enabled);
  const [state, setState] = useState<ChainWatchState>(() => ({
    enabled: stored.enabled,
    lastBlock: stored.lastBlock,
    lastScanAt: null,
    latestDetections: 0,
    scanError: null,
    isScanning: false,
  }));

  const seenRef = useRef<Set<string>>(new Set(stored.seenTxHashes));
  const inFlightRef = useRef(false);
  const lastBlockRef = useRef<number | null>(stored.lastBlock);

  // Reload state when the owner changes (wallet swap).
  useEffect(() => {
    if (!owner) return;
    const next = readStored(owner);
    seenRef.current = new Set(next.seenTxHashes);
    lastBlockRef.current = next.lastBlock;
    setEnabled(next.enabled);
    setState((current) => ({
      ...current,
      enabled: next.enabled,
      lastBlock: next.lastBlock,
      lastScanAt: null,
      latestDetections: 0,
      scanError: null,
    }));
  }, [owner]);

  const watchedKey = useMemo(
    () =>
      Array.from(
        new Set(
          watchedAddresses
            .map((address) => address.trim().toLowerCase())
            .filter((address) => isAddress(address)),
        ),
      )
        .sort()
        .join(","),
    [watchedAddresses],
  );

  const watchedSet = useMemo(() => new Set(watchedKey ? watchedKey.split(",") : []), [watchedKey]);

  const persist = useCallback(
    (next: { enabled?: boolean; lastBlock?: number | null }) => {
      if (!owner) return;
      const merged: StoredState = {
        enabled: next.enabled ?? enabled,
        lastBlock: next.lastBlock !== undefined ? next.lastBlock : lastBlockRef.current,
        seenTxHashes: Array.from(seenRef.current).slice(-SEEN_LIMIT),
      };
      writeStored(owner, merged);
    },
    [enabled, owner],
  );

  const scan = useCallback(async (): Promise<number> => {
    if (inFlightRef.current) return 0;
    if (!watchedSet.size) return 0;
    inFlightRef.current = true;
    setState((current) => ({ ...current, isScanning: true, scanError: null }));

    try {
      const latestHex = await rpcCall<Hex>("eth_blockNumber", []);
      const latest = hexToNumber(latestHex);
      if (!latest) {
        inFlightRef.current = false;
        setState((current) => ({
          ...current,
          isScanning: false,
          lastScanAt: Date.now(),
        }));
        return 0;
      }

      const previous = lastBlockRef.current ?? Math.max(0, latest - INITIAL_LOOKBACK);
      const fromBlock = Math.max(0, Math.min(previous + 1, latest));
      const toBlock = latest;
      const span = toBlock - fromBlock + 1;
      const startBlock = span > MAX_BLOCK_WINDOW ? toBlock - MAX_BLOCK_WINDOW + 1 : fromBlock;

      const watchedList = Array.from(watchedSet);

      // Run both fetchers in parallel.
      const [blocks, logs] = await Promise.all([
        startBlock <= toBlock
          ? fetchBlockRange(startBlock, toBlock)
          : Promise.resolve([] as RawBlock[]),
        startBlock <= toBlock
          ? fetchErc20Transfers(startBlock, toBlock, watchedList)
          : Promise.resolve([] as RawLog[]),
      ]);

      const detections: DetectedRecord[] = [];

      for (const block of blocks) {
        for (const tx of block.transactions) {
          if (!tx.hash) continue;
          const key = `native:${tx.hash.toLowerCase()}`;
          if (seenRef.current.has(key)) continue;
          const record = buildNativeRecord(tx, watchedSet);
          if (!record) continue;
          seenRef.current.add(key);
          detections.push(record);
        }
      }

      for (const log of logs) {
        if (!log.transactionHash) continue;
        const key = `erc20:${log.transactionHash.toLowerCase()}:${log.address.toLowerCase()}`;
        if (seenRef.current.has(key)) continue;
        const record = buildErc20Record(log, watchedSet);
        if (!record) continue;
        seenRef.current.add(key);
        detections.push(record);
      }

      // Sync each new detection to the dashboard review queue.
      if (detections.length) {
        await Promise.all(detections.map(syncDetectedRecord));
      }

      lastBlockRef.current = toBlock;
      persist({ lastBlock: toBlock });

      setState((current) => ({
        ...current,
        lastBlock: toBlock,
        lastScanAt: Date.now(),
        latestDetections: detections.length,
        scanError: null,
        isScanning: false,
      }));

      inFlightRef.current = false;
      return detections.length;
    } catch (error) {
      inFlightRef.current = false;
      setState((current) => ({
        ...current,
        isScanning: false,
        lastScanAt: Date.now(),
        scanError: error instanceof Error ? error.message : "Morph RPC error",
      }));
      return 0;
    }
  }, [persist, watchedSet]);

  const setEnabledPersist = useCallback(
    (value: boolean) => {
      setEnabled(value);
      setState((current) => ({ ...current, enabled: value }));
      persist({ enabled: value });
      if (value) {
        // Fire immediately when turning on so the user sees life.
        void scan();
      }
    },
    [persist, scan],
  );

  // Polling loop.
  useEffect(() => {
    if (!enabled) return;
    if (!owner) return;
    if (!watchedSet.size) return;

    const interval = window.setInterval(() => {
      void scan();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled, owner, scan, watchedSet]);

  return {
    state,
    enabled,
    setEnabled: setEnabledPersist,
    scanNow: scan,
    watchedCount: watchedSet.size,
    rpcUrl: morphHoodi.rpcUrl,
    chainName: morphHoodi.shortName,
  };
}
