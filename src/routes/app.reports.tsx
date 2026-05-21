import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, Filter } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { PayMemoBarChart } from "@/components/app/LazyCharts";
import { WalletConnectModal } from "@/components/app/WalletConnectModal";
import {
  decryptPrivateMetadata,
  getRememberedVaultKey,
  readVaultSession,
} from "@/lib/crypto-vault";
import { fetchEncryptedVaultRecords, type StoredVaultRecord } from "@/lib/paymemo-vault";
import { fetchDomainRecords, type EncryptedDomainRecord } from "@/lib/paymemo-domain";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports | PayMemo" }] }),
  component: Reports,
});

type ReportRow = {
  date: string;
  type: string;
  status: string;
  txHash: string;
  amount: number;
  token: string;
  category: string;
  counterparty: string;
  note: string;
};

const colors = ["#FF477E", "#FFB627", "#06D6A0", "#0B0B0F", "#7664FF", "#14B8A6"];

function Reports() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [message, setMessage] = useState("Please connect wallet before continuing.");
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  async function loadReports() {
    try {
      const session = readVaultSession();
      if (!session) {
        setMessage("Please connect wallet before continuing.");
        setWalletPickerOpen(true);
        return;
      }
      const unlocked = { walletAddress: session.walletAddress, key: await getRememberedVaultKey() };

      if (!unlocked.key) throw new Error("Vault key unavailable.");

      const [vaultRecords, invoiceRecords, batchRecords, agentIntentRecords] = await Promise.all([
        fetchEncryptedVaultRecords(unlocked.walletAddress),
        fetchDomainRecords(unlocked.walletAddress, "invoice"),
        fetchDomainRecords(unlocked.walletAddress, "batch-payout"),
        fetchDomainRecords(unlocked.walletAddress, "agent-payment-intent"),
      ]);

      const nextRows = [
        ...(await Promise.all(vaultRecords.map((record) => vaultToReportRow(record, unlocked.key!)))),
        ...(await Promise.all(
          [...invoiceRecords, ...batchRecords, ...agentIntentRecords].map((record) =>
            domainToReportRow(record, unlocked.key!),
          ),
        )),
      ];

      setRows(nextRows);
      setMessage(`${nextRows.length} decrypted report rows loaded from encrypted database records.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to load report records.";
      setMessage(text);
      notify.error("Reports failed to load", text);
    }
  }

  useEffect(() => {
    if (readVaultSession()) void loadReports();
  }, []);

  const monthly = useMemo(() => {
    const grouped = new Map<string, number>();
    rows.forEach((row) => {
      const month = row.date.slice(0, 7) || "unknown";
      grouped.set(month, (grouped.get(month) ?? 0) + row.amount);
    });
    return [...grouped.entries()].map(([m, sent]) => ({ m, sent }));
  }, [rows]);

  const breakdown = useMemo(() => {
    const grouped = new Map<string, number>();
    rows.forEach((row) => {
      grouped.set(row.category, (grouped.get(row.category) ?? 0) + row.amount);
    });
    return [...grouped.entries()].map(([label, value], index) => ({
      label,
      value,
      color: colors[index % colors.length],
    }));
  }, [rows]);

  function downloadCsv() {
    const csvRows = [
      ["date", "type", "status", "txHash", "amount", "token", "category", "counterparty", "note"],
      ...rows.map((row) => [
        row.date,
        row.type,
        row.status,
        row.txHash,
        row.amount,
        row.token,
        row.category,
        row.counterparty,
        row.note,
      ]),
    ];
    const csv = csvRows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `paymemo-real-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Topbar title="Reports" subtitle="Real encrypted records, decrypted locally for export." />
      <div className="space-y-5 p-6 lg:p-10">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/35 bg-white p-4 shadow-soft">
          <button className="inline-flex items-center gap-2 rounded-xl border border-ink/35 bg-cream/60 px-3 py-2 text-sm">
            <Calendar className="h-3.5 w-3.5" /> All time
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-ink/35 bg-cream/60 px-3 py-2 text-sm">
            <Filter className="h-3.5 w-3.5" /> Real records only
          </button>
          <button
            onClick={() => {
              if (!readVaultSession()) {
                setMessage("Please connect wallet before continuing.");
                setWalletPickerOpen(true);
                return;
              }
              downloadCsv();
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-cream"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {!readVaultSession() && (
          <div className="rounded-2xl border border-red-900/25 bg-red-50 p-4 text-sm text-red-900 shadow-soft">
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

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft lg:col-span-2">
            <div className="text-sm font-semibold">Monthly volume</div>
            <div className="text-xs font-semibold text-red-900">{message}</div>
            <div className="mt-4 h-72">
              <PayMemoBarChart data={monthly} />
            </div>
          </div>

          <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
            <div className="text-sm font-semibold">Category breakdown</div>
            <div className="text-xs text-ink/50">From decrypted records</div>
            <ul className="mt-5 space-y-3">
              {breakdown.map((item) => {
                const total = breakdown.reduce((sum, next) => sum + next.value, 0) || 1;
                const pct = Math.round((item.value / total) * 100);
                return (
                  <li key={item.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                        {item.label}
                      </span>
                      <span className="font-mono">${item.value.toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/5">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </li>
                );
              })}
              {breakdown.length === 0 && <li className="text-sm text-ink/50">No report rows yet.</li>}
            </ul>
          </div>
        </div>
        <WalletConnectModal
          open={walletPickerOpen}
          onClose={() => setWalletPickerOpen(false)}
          onConnected={() => void loadReports()}
        />
      </div>
    </>
  );
}

async function vaultToReportRow(record: StoredVaultRecord, key: CryptoKey): Promise<ReportRow> {
  const metadata = await decryptPrivateMetadata<Record<string, string>>(record.encryptedMetadata, key);
  return {
    date: record.publicRecord.createdAt?.slice(0, 10) ?? record.updatedAt.slice(0, 10),
    type: record.publicRecord.mode,
    status: record.publicRecord.status,
    txHash: record.publicRecord.txHash ?? "",
    amount: Number(record.publicRecord.amount || 0),
    token: record.publicRecord.token,
    category: metadata.category || "Other",
    counterparty: metadata.counterparty || "",
    note: metadata.note || "",
  };
}

async function domainToReportRow(record: EncryptedDomainRecord, key: CryptoKey): Promise<ReportRow> {
  const metadata = await decryptPrivateMetadata<Record<string, string>>(record.encryptedMetadata, key);
  return {
    date: record.createdAt.slice(0, 10),
    type: record.type,
    status: record.status,
    txHash: String(record.publicData.txHash ?? ""),
    amount: Number(record.publicData.amount ?? record.publicData.totalAmount ?? 0),
    token: String(record.publicData.token ?? "ETH"),
    category: metadata.category || record.type,
    counterparty: metadata.client || metadata.tool || metadata.batchName || "",
    note: metadata.description || metadata.reason || metadata.note || "",
  };
}
