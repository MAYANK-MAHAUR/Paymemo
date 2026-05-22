import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Topbar } from "@/components/app/Topbar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { WalletConnectModal } from "@/components/app/WalletConnectModal";
import {
  decryptPrivateMetadata,
  encryptPrivateMetadata,
  getRememberedVaultKey,
  readVaultSession,
} from "@/lib/crypto-vault";
import {
  saveEncryptedVaultRecord,
  syncEncryptedVaultRecord,
  toPrivateMetadata,
  toPublicRecord,
} from "@/lib/paymemo-vault";
import { createRecordId, normalizeRecord } from "@/lib/paymemo-schema";
import {
  fetchDomainRecords,
  syncDomainRecord,
  type EncryptedDomainRecord,
} from "@/lib/paymemo-domain";
import {
  isAddress,
  getMorphToken,
  getMorphTokenContract,
  getSelectedEthereumProvider,
  morphHoodi,
  sendErc20Payment,
  sendNativePayment,
  shortAddress,
  waitForTransactionReceipt,
} from "@/lib/morph";
import { Bookmark, Clock, Layers, Lock, Play, Plus, ReceiptText, Zap } from "lucide-react";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/batch")({
  head: () => ({ meta: [{ title: "Batch Payouts - PayMemo" }] }),
  component: Batch,
});

type BatchRow = {
  id: string;
  name: string;
  address: string;
  amount: string;
  memo: string;
  category: "Payroll" | "Vendor Payment";
  intentStatus: "intent" | "pending_signature" | "pending_chain" | "confirmed" | "failed";
  txHash?: string;
};

const initialRows: BatchRow[] = [
  {
    id: "row-1",
    name: "",
    address: "",
    amount: "0.0001",
    memo: "",
    category: "Payroll",
    intentStatus: "intent",
  },
];

function Batch() {
  const [walletAddress, setWalletAddress] = useState("");
  const [savedBatches, setSavedBatches] = useState<EncryptedDomainRecord[]>([]);
  const [message, setMessage] = useState("Please connect wallet before continuing.");
  const [rows, setRows] = useState<BatchRow[]>(initialRows);
  const [token, setToken] = useState("ETH");
  const [batchName, setBatchName] = useState("Payroll batch");
  const [dispatching, setDispatching] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [batchStatus, setBatchStatus] = useState<
    "draft" | "intent" | "dispatching" | "confirmed" | "failed"
  >("draft");

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );
  const confirmed = rows.filter((row) => row.intentStatus === "confirmed").length;
  const allValid = rows.length > 0 && rows.every((row) => isAddress(row.address) && Number(row.amount) > 0);

  async function loadBatches(wallet = walletAddress) {
    if (!wallet) return;
    const records = await fetchDomainRecords(wallet, "batch-payout");
    setSavedBatches(records);
    setMessage(`${records.length} encrypted batch records loaded from database.`);
  }

  useEffect(() => {
    const session = readVaultSession();
    if (!session) return;
    setWalletAddress(session.walletAddress);
    void loadBatches(session.walletAddress);
  }, []);

  async function requireUnlockedWallet() {
    const session = readVaultSession();
    if (!session) {
      notify.walletRequired();
      setMessage("Please connect wallet before continuing.");
      setWalletPickerOpen(true);
      return null;
    }
    const key = await getRememberedVaultKey();
    if (!key) {
      notify.walletRequired();
      setMessage("Please connect wallet before continuing.");
      setWalletPickerOpen(true);
      return null;
    }
    setWalletAddress(session.walletAddress);
    return { walletAddress: session.walletAddress, key };
  }

  async function saveBatchSnapshot(status: "intent" | "dispatching" | "confirmed" | "failed") {
    const unlocked = await requireUnlockedWallet();
    if (!unlocked) throw new Error("Please connect wallet before continuing.");
    const { walletAddress: wallet, key } = unlocked;
    setWalletAddress(wallet);
    const now = new Date().toISOString();
    const id = createRecordId(`batch_${status}`);
    const encryptedMetadata = await encryptPrivateMetadata(
      {
        batchName,
        recipients: rows.map((row) => ({
          name: row.name,
          address: row.address,
          amount: row.amount,
          memo: row.memo,
          category: row.category,
          status: row.intentStatus,
          txHash: row.txHash ?? "",
        })),
      },
      key,
      wallet,
    );

    await syncDomainRecord({
      id,
      walletAddress: wallet,
      type: "batch-payout",
      publicData: {
        chainId: morphHoodi.chainId,
        recipientCount: rows.length,
        totalAmount: total,
        token,
        txHashes: rows.map((row) => row.txHash).filter(Boolean),
      },
      encryptedMetadata,
      status,
      createdAt: now,
      updatedAt: now,
    });
    await loadBatches(wallet);
    return { wallet, key };
  }

  async function saveBatchIntents() {
    try {
      await saveBatchSnapshot("intent");
      setBatchStatus("intent");
      setRows((current) => current.map((row) => ({ ...row, intentStatus: "pending_signature" })));
      setMessage("Encrypted batch payout intent saved to database.");
      notify.success("Batch session saved", "Encrypted intent stored on the server.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to save batch intents.";
      setMessage(text);
      notify.error(text);
    }
  }

  async function loadBatchSession(record: EncryptedDomainRecord) {
    const unlocked = await requireUnlockedWallet();
    if (!unlocked) return;
    try {
      const metadata = await decryptPrivateMetadata<{
        batchName: string;
        recipients: {
          name: string;
          address: string;
          amount: string;
          memo: string;
          category: string;
          status: string;
          txHash: string;
        }[];
      }>(record.encryptedMetadata, unlocked.key);

      setBatchName(metadata.batchName || "Loaded session");
      setRows(
        (metadata.recipients || []).map((recipient, index) => ({
          id: `loaded-${record.id}-${index}`,
          name: recipient.name || "",
          address: recipient.address || "",
          amount: recipient.amount || "",
          memo: recipient.memo || "",
          category:
            recipient.category === "Vendor Payment" ? "Vendor Payment" : "Payroll",
          intentStatus: "intent",
          txHash: recipient.txHash || undefined,
        })),
      );
      if (record.publicData.token) setToken(String(record.publicData.token));
      setBatchStatus("draft");
      setMessage(`Loaded session "${metadata.batchName || record.id}". Edit and re-dispatch when ready.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not decrypt this batch session.";
      setMessage(text);
      notify.error(text);
    }
  }

  type BatchCall = { to: `0x${string}`; value: string; data: `0x${string}` };

  function buildBatchCalls(): BatchCall[] {
    if (token === "ETH") {
      return rows.map((row) => ({
        to: row.address as `0x${string}`,
        value: bigIntToHex(parseUnitsSafe(row.amount, 18)),
        data: "0x",
      }));
    }
    const decimals = getTokenDecimals(token);
    const contract = getTokenContract(token) as `0x${string}`;
    return rows.map((row) => ({
      to: contract,
      value: "0x0",
      data: buildErc20Calldata(row.address, row.amount, decimals),
    }));
  }

  async function dispatchAsAtomicBatch() {
    if (dispatching) return;
    if (!allValid) {
      setMessage("Enter full recipient addresses and positive amounts before dispatch.");
      return;
    }
    try {
      setDispatching(true);
      setBatchStatus("dispatching");
      const unlocked = await requireUnlockedWallet();
      if (!unlocked) throw new Error("Please connect wallet before continuing.");
      const provider = await getSelectedEthereumProvider();
      if (!provider) throw new Error("No browser wallet found.");

      const calls = buildBatchCalls();
      const params = [
        {
          version: "1.0",
          chainId: `0x${morphHoodi.chainId.toString(16)}`,
          from: unlocked.walletAddress,
          atomicRequired: true,
          calls,
        },
      ];

      try {
        const result = (await provider.request({
          method: "wallet_sendCalls",
          params,
        })) as { id?: string } | string;
        const id = typeof result === "string" ? result : result?.id;
        setMessage(
          `Wallet accepted the atomic batch (${id ?? "no id"}). Tracking each transfer in your wallet's UI.`,
        );
        setBatchStatus("confirmed");
        await saveBatchSnapshot("confirmed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "wallet_sendCalls not supported";
        setMessage(
          `Atomic batch not supported by your wallet (${message}). Falling back to sequential dispatch.`,
        );
        await dispatchSequentialBatch();
      }
    } catch (error) {
      setBatchStatus("failed");
      const text = error instanceof Error ? error.message : "Unable to dispatch batch.";
      setMessage(text);
      notify.error("Atomic batch failed", text);
    } finally {
      setDispatching(false);
    }
  }

  async function saveLedgerRow(row: BatchRow, status: BatchRow["intentStatus"], hash = "") {
    const unlocked = await requireUnlockedWallet();
    if (!unlocked) throw new Error("Please connect wallet before continuing.");
    const { walletAddress: wallet, key } = unlocked;
    const normalized = normalizeRecord({
      id: createRecordId("batch_item"),
      mode: "direct",
      status,
      chainId: morphHoodi.chainId,
      chainName: morphHoodi.name,
      txHash: hash || undefined,
      from: wallet,
      to: row.address,
      amount: row.amount,
      token,
      category: row.category,
      counterparty: row.name,
      note: row.memo,
      project: batchName,
      source: "paymemo-batch-payout",
    });
    const encryptedMetadata = await encryptPrivateMetadata(toPrivateMetadata(normalized), key, wallet);
    const stored = saveEncryptedVaultRecord({
      id: normalized.id ?? "",
      walletAddress: wallet,
      publicRecord: toPublicRecord(normalized),
      encryptedMetadata,
      syncStatus: "local",
      updatedAt: new Date().toISOString(),
    });
    const synced = await syncEncryptedVaultRecord(stored);
    saveEncryptedVaultRecord({ ...synced.record, syncStatus: "synced" });
  }

  async function dispatchSequentialBatch() {
    if (dispatching) return;
    if (!allValid) {
      setMessage("Enter full recipient addresses and positive amounts before dispatch.");
      return;
    }

    try {
      setDispatching(true);
      setBatchStatus("dispatching");
      const { wallet } = await saveBatchSnapshot("dispatching");

      for (const row of rows) {
        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, intentStatus: "pending_signature" } : item,
          ),
        );
        await saveLedgerRow(row, "pending_signature");
        setMessage(`Waiting for wallet signature: ${row.name}`);

        const hash =
          token === "ETH"
            ? await sendNativePayment(wallet, row.address, row.amount)
            : await sendErc20Payment({
                from: wallet,
                tokenContract: getTokenContract(token),
                to: row.address,
                amount: row.amount,
                decimals: getTokenDecimals(token),
              });

        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, intentStatus: "pending_chain", txHash: hash } : item,
          ),
        );
        await saveLedgerRow({ ...row, txHash: hash }, "pending_chain", hash);
        setMessage(`Submitted ${row.name}. Waiting for Morph confirmation.`);

        const receipt = await waitForTransactionReceipt(hash);
        if (receipt.status !== "0x1") {
          setRows((current) =>
            current.map((item) =>
              item.id === row.id ? { ...item, intentStatus: "failed", txHash: hash } : item,
            ),
          );
          await saveLedgerRow({ ...row, txHash: hash }, "failed", hash);
          setBatchStatus("failed");
          await saveBatchSnapshot("failed");
          setMessage(`Batch stopped: ${row.name} failed onchain.`);
          return;
        }

        setRows((current) =>
          current.map((item) =>
            item.id === row.id ? { ...item, intentStatus: "confirmed", txHash: hash } : item,
          ),
        );
        await saveLedgerRow({ ...row, txHash: hash }, "confirmed", hash);
      }

      setBatchStatus("confirmed");
      await saveBatchSnapshot("confirmed");
      setMessage("Sequential batch complete. Every payout is confirmed and saved to ledger.");
      notify.success("Batch complete", "Every payout confirmed and saved to ledger.");
    } catch (error) {
      setBatchStatus("failed");
      const text = error instanceof Error ? error.message : "Unable to dispatch batch.";
      setMessage(text);
      notify.error("Dispatch failed", text);
    } finally {
      setDispatching(false);
    }
  }

  function addRecipient() {
    setRows((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        name: "",
        address: "",
        amount: token === "ETH" ? "0.0001" : "1",
        memo: "",
        category: "Vendor Payment",
        intentStatus: "intent",
      },
    ]);
  }

  return (
    <>
      <Topbar title="Batch Payouts" subtitle="Sequential Morph payouts, each with its own memo." />
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_380px] lg:p-10">
        {!walletAddress && (
          <div className="rounded-2xl border border-red-900/25 bg-red-50 p-4 text-sm text-red-900 shadow-soft lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>Please connect wallet before continuing.</span>
              <button
                onClick={() => setWalletPickerOpen(true)}
                className="rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-cream"
              >
                Connect wallet
              </button>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-3xl border border-ink/35 bg-white shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/35 px-6 py-5">
            <div className="min-w-[260px] flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-ink/75">
                Batch name
              </div>
              <input
                value={batchName}
                onChange={(event) => setBatchName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/20 bg-cream/70 px-3 py-2 text-xl font-semibold tracking-tight outline-none"
              />
              <div className="mt-1 text-xs text-ink/75">
                {rows.length} recipients - Morph Hoodi sequential dispatch
              </div>
            </div>
            <select
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="rounded-xl border border-ink/25 bg-cream px-3 py-2 text-sm font-semibold outline-none"
            >
              <option>ETH</option>
              <option>USDC</option>
              <option>WETH</option>
              <option>BGB</option>
            </select>
            <button
              onClick={addRecipient}
              className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-cream"
            >
              <Plus className="h-4 w-4" /> Add recipient
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-cream/60 text-[10px] uppercase tracking-widest text-ink/72">
                  {["Name", "Address", "Amount", "Category", "Private memo", "Tx hash", "Status"].map(
                    (h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-ink/30 hover:bg-cream/40">
                    <td className="px-5 py-3.5">
                      <input
                        value={row.name}
                        onChange={(event) => updateRow(row.id, { name: event.target.value })}
                        className="w-full rounded-xl border border-ink/25 bg-cream px-3 py-2 text-xs outline-none"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        value={row.address}
                        onChange={(event) => updateRow(row.id, { address: event.target.value })}
                        placeholder="0x..."
                        className="w-full rounded-xl border border-ink/25 bg-cream px-3 py-2 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        value={row.amount}
                        onChange={(event) => updateRow(row.id, { amount: event.target.value })}
                        className="w-28 rounded-xl border border-ink/25 bg-cream px-3 py-2 font-mono text-xs outline-none"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={row.category}
                        onChange={(event) =>
                          updateRow(row.id, { category: event.target.value as BatchRow["category"] })
                        }
                        className="rounded-xl border border-ink/25 bg-cream px-2 py-1 text-xs outline-none"
                      >
                        <option>Payroll</option>
                        <option>Vendor Payment</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <input
                        value={row.memo}
                        onChange={(event) => updateRow(row.id, { memo: event.target.value })}
                        className="w-full rounded-xl border border-ink/25 bg-cream px-3 py-2 text-xs outline-none"
                      />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink/78">
                      {row.txHash ? shortAddress(row.txHash) : "none"}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={row.intentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-pink/30 bg-white p-6 shadow-glow-pink">
            <div className="absolute inset-x-0 top-0 h-1 bg-aurora" />
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
              <Layers className="h-4 w-4" /> Batch summary
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <Row k="Total recipients" v={String(rows.length)} />
              <Row k="Total amount" v={`${total.toLocaleString(undefined, { maximumFractionDigits: 18 })} ${token}`} mono />
              <Row k="Confirmed records" v={`${confirmed}/${rows.length}`} />
              <Row k="Database records" v={String(savedBatches.length)} />
              <Row k="Batch status" v={batchStatus} />
            </div>
            <div className="mt-5 grid gap-2">
              <button
                onClick={saveBatchIntents}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-semibold text-cream"
              >
                <Bookmark className="h-4 w-4" /> Save session
              </button>
              <button
                onClick={dispatchAsAtomicBatch}
                disabled={dispatching || !allValid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-pink py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Zap className="h-4 w-4" /> Atomic batch (1 signature)
              </button>
              <button
                onClick={dispatchSequentialBatch}
                disabled={dispatching || !allValid}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-mint py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-4 w-4" /> Dispatch sequentially
              </button>
              <p className="text-[11px] leading-5 text-ink/75">
                Atomic batch uses your wallet's EIP-5792 <code>wallet_sendCalls</code>. If the wallet does
                not support it, PayMemo falls back to one signature per recipient.
              </p>
            </div>
          </div>

          {savedBatches.length > 0 && (
            <div className="rounded-3xl border border-ink/25 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" /> Saved sessions
              </div>
              <p className="mt-1 text-xs text-ink/75">
                Reload a previous session to edit recipients or re-dispatch with the same members.
              </p>
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                {savedBatches.slice(0, 12).map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => void loadBatchSession(record)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/15 bg-cream/40 p-3 text-left text-xs hover:border-ink/35"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{record.id}</div>
                      <div className="text-ink/75">
                        {String(record.publicData.recipientCount ?? "?")} recipients ·{" "}
                        {String(record.publicData.token ?? "ETH")} · status {record.status}
                      </div>
                    </div>
                    <span className="text-ink/75 font-mono">
                      {new Date(record.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-ink/35 bg-cream/60 p-5 text-xs leading-5 text-ink/78">
            <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
              <ReceiptText className="h-4 w-4" /> Real MVP behavior
            </div>
            PayMemo signs one payout at a time, verifies each Morph receipt, and saves each row to
            the encrypted private ledger.
            <div className="mt-3 rounded-2xl bg-white p-3 font-mono text-[11px] text-red-900">
              {message}
            </div>
          </div>

          <div className="rounded-3xl border border-mint/30 bg-mint/10 p-5 text-xs leading-5 text-ink/78">
            <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
              <Lock className="h-4 w-4" /> Private by default
            </div>
            Recipient notes, payroll tags, project names, and accounting labels stay in encrypted
            metadata. Public records only keep tx facts.
          </div>
        </div>
        <WalletConnectModal
          open={walletPickerOpen}
          onClose={() => setWalletPickerOpen(false)}
          onConnected={(account) => {
            setWalletAddress(account);
            void loadBatches(account);
          }}
        />
      </div>
    </>
  );

  function updateRow(id: string, patch: Partial<BatchRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
}

function getTokenContract(token: string) {
  const key = getMorphToken(token)?.envContractKey ?? `VITE_MORPH_${token.toUpperCase()}_ADDRESS`;
  const contract = getMorphTokenContract(token);
  if (!isAddress(contract)) {
    throw new Error(`${token} contract address is not configured. Use ETH or set ${key}.`);
  }
  return contract;
}

function getTokenDecimals(token: string) {
  return getMorphToken(token)?.decimals ?? 18;
}

function parseUnitsSafe(value: string, decimals: number) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return 0n;
  const [whole, fraction = ""] = trimmed.split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  try {
    return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
  } catch {
    return 0n;
  }
}

function bigIntToHex(value: bigint) {
  return `0x${value.toString(16)}`;
}

function pad32(hex: string) {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

function buildErc20Calldata(to: string, amount: string, decimals: number): `0x${string}` {
  const units = parseUnitsSafe(amount, decimals);
  return `0xa9059cbb${pad32(to)}${pad32(units.toString(16))}` as `0x${string}`;
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/30 pb-2">
      <span className="text-ink/75">{k}</span>
      <span className={mono ? "font-mono" : ""}>{v}</span>
    </div>
  );
}
