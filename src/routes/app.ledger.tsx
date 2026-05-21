import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/app/Topbar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { EditRecordModal, type EditableRecord } from "@/components/app/EditRecordModal";
import {
  decryptPrivateMetadata,
  encryptPrivateMetadata,
  getRememberedVaultKey,
  readVaultSession,
} from "@/lib/crypto-vault";
import {
  fetchEncryptedVaultRecords,
  readEncryptedVaultRecords,
  saveEncryptedVaultRecord,
  syncEncryptedVaultRecord,
  type StoredVaultRecord,
} from "@/lib/paymemo-vault";
import { Pencil, Search, Calendar, Filter, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/app/ledger")({
  head: () => ({ meta: [{ title: "Ledger | PayMemo" }] }),
  component: Ledger,
});

type LedgerRow = {
  id: string;
  date: string;
  hash: string;
  amount: string;
  token: string;
  category: string;
  counterparty: string;
  note: string;
  project: string;
  status: string;
  source: "vault";
  raw?: StoredVaultRecord;
};

const cats = [
  "All",
  "Payroll",
  "Vendor Payment",
  "Invoice",
  "Invoice Payment",
  "Bridge",
  "Swap",
  "Business Expense",
  "Refund",
  "Personal",
  "Transfer to Self",
  "Income",
  "Subscription",
  "API Payment",
  "Agent Task Payment",
];
const statuses = ["All", "confirmed", "pending_signature", "pending_chain", "failed", "needs-review", "rejected"];

function downloadCsv(rows: LedgerRow[]) {
  const csvRows = [
    [
      "date",
      "txHash",
      "amount",
      "token",
      "category",
      "counterparty",
      "privateNote",
      "status",
      "source",
    ],
    ...rows.map((row) => [
      row.date,
      row.hash,
      row.amount,
      row.token,
      row.category,
      row.counterparty,
      row.note,
      row.status,
      row.source,
    ]),
  ];
  const csv = csvRows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `paymemo-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Ledger() {
  const [cat, setCat] = useState("All");
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");
  const [vaultRows, setVaultRows] = useState<LedgerRow[]>([]);
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  async function loadVaultRows() {
    const key = await getRememberedVaultKey();
    const session = readVaultSession();
    const records = session
      ? await fetchEncryptedVaultRecords(session.walletAddress).catch(() =>
          readEncryptedVaultRecords(),
        )
      : readEncryptedVaultRecords();

    if (!key) {
      const lockedRows: LedgerRow[] = records.map((record) => ({
        id: record.id,
        date: new Date(record.publicRecord.createdAt ?? record.updatedAt).toLocaleDateString(),
        hash: record.publicRecord.txHash ?? "pending",
        amount: record.publicRecord.amount,
        token: record.publicRecord.token,
        category: "Encrypted",
        counterparty: "Unlock vault",
        note: "Private metadata is encrypted on this device.",
        project: "",
        status: record.publicRecord.status,
        source: "vault",
        raw: record,
      }));
      setVaultRows(lockedRows);
      return;
    }

    const decryptedRows = await Promise.all(
      records.map(async (record) => {
        const metadata = await decryptPrivateMetadata<Record<string, string>>(
          record.encryptedMetadata,
          key,
        );
        return {
          id: record.id,
          date: new Date(record.publicRecord.createdAt ?? record.updatedAt).toLocaleDateString(),
          hash: record.publicRecord.txHash ?? "pending",
          amount: record.publicRecord.amount,
          token: record.publicRecord.token,
          category: metadata.category || "Other",
          counterparty: metadata.counterparty || "Unknown",
          note: metadata.note || "",
          project: metadata.project || "",
          status: record.publicRecord.status,
          source: "vault" as const,
          raw: record,
        };
      }),
    );

    setVaultRows(decryptedRows);
  }

  useEffect(() => {
    let alive = true;
    void (async () => {
      await loadVaultRows();
      if (!alive) return;
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function saveLedgerEdit(patch: EditableRecord) {
    const session = readVaultSession();
    const key = await getRememberedVaultKey();
    if (!session || !key) throw new Error("Please connect wallet before continuing.");

    const target = vaultRows.find((row) => row.id === patch.id);
    if (!target?.raw) throw new Error("Ledger record not found.");

    const existing = await decryptPrivateMetadata<Record<string, string>>(
      target.raw.encryptedMetadata,
      key,
    ).catch(() => ({}) as Record<string, string>);

    const nextMetadata = {
      ...existing,
      category: patch.category,
      counterparty: patch.counterparty,
      note: patch.note,
      project: patch.project,
    };

    const encryptedMetadata = await encryptPrivateMetadata(
      nextMetadata,
      key,
      session.walletAddress,
    );

    const updated: StoredVaultRecord = {
      ...target.raw,
      encryptedMetadata,
      syncStatus: "local",
      updatedAt: new Date().toISOString(),
    };

    saveEncryptedVaultRecord(updated);
    try {
      const synced = await syncEncryptedVaultRecord(updated);
      saveEncryptedVaultRecord({ ...synced.record, syncStatus: "synced" });
    } catch {
      saveEncryptedVaultRecord({ ...updated, syncStatus: "sync-failed" });
    }

    setSaveStatus("Saved. Encrypted update synced to the database.");
    await loadVaultRows();
  }

  const rows = useMemo(
    () =>
      vaultRows.filter(
        (t) =>
          (cat === "All" || t.category === cat) &&
          (status === "All" || t.status === status) &&
          (!q ||
            t.counterparty.toLowerCase().includes(q.toLowerCase()) ||
            t.note.toLowerCase().includes(q.toLowerCase()) ||
            t.hash.includes(q)),
      ),
    [vaultRows, cat, status, q],
  );

  return (
    <>
      <Topbar title="Ledger" subtitle="Your private, encrypted record of every payment." />
      <div className="p-6 lg:p-10 space-y-5">
        <div className="rounded-2xl border border-ink/35 bg-white p-4 shadow-soft flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-ink/35 bg-cream/60 px-3 py-2 flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-ink/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search note, counterparty, hash"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <Select
            label="Category"
            value={cat}
            onChange={setCat}
            options={cats}
            icon={<Filter className="h-3.5 w-3.5" />}
          />
          <Select
            label="Status"
            value={status}
            onChange={setStatus}
            options={statuses}
            icon={<Filter className="h-3.5 w-3.5" />}
          />
          <button className="inline-flex items-center gap-2 rounded-xl border border-ink/35 bg-cream/60 px-3 py-2 text-sm">
            <Calendar className="h-3.5 w-3.5" /> Last 30 days
          </button>
          <button
            onClick={() => downloadCsv(rows)}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-ink text-cream px-3 py-2 text-sm font-semibold"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="rounded-3xl border border-ink/35 bg-white shadow-soft overflow-hidden">
          {saveStatus && (
            <div className="border-b border-ink/15 bg-mint/10 px-5 py-2 text-xs font-semibold text-ink">
              {saveStatus}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-ink/50 bg-cream/60">
                {[
                  "Date",
                  "Tx hash",
                  "Amount",
                  "Category",
                  "Counterparty",
                  "Private note",
                  "Status",
                  "",
                ].map((h, index) => (
                  <th key={`${h}-${index}`} className="text-left font-medium px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={`${t.source}-${t.id}`}
                  className="border-t border-ink/30 hover:bg-cream/40"
                >
                  <td className="px-5 py-3.5 text-ink/60">{t.date}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">{t.hash}</td>
                  <td className="px-5 py-3.5 font-mono">
                    {t.amount} <span className="text-ink/50">{t.token}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-full border border-ink/35 bg-cream px-2 py-0.5 text-[10px] font-medium">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">{t.counterparty}</td>
                  <td className="px-5 py-3.5 text-ink/70">{t.note}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(t)}
                      className="inline-flex items-center gap-1 rounded-lg border border-ink/25 px-2 py-1 text-xs font-semibold text-ink/70 hover:text-ink"
                      disabled={t.category === "Encrypted"}
                      title={t.category === "Encrypted" ? "Unlock vault to edit" : "Edit record"}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-ink/50">
                    No records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditRecordModal
        open={Boolean(editing)}
        initial={
          editing
            ? {
                id: editing.id,
                category: editing.category,
                counterparty: editing.counterparty,
                note: editing.note,
                project: editing.project,
                status: editing.status,
              }
            : null
        }
        onClose={() => setEditing(null)}
        onSave={saveLedgerEdit}
      />
    </>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  icon: React.ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-ink/35 bg-cream/60 px-3 py-2 text-sm">
      {icon}
      <span className="text-ink/55">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
