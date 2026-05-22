import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/app/Topbar";
import { Check, FileSearch, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useExtensionRecords } from "@/lib/extension-records";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/review")({
  head: () => ({ meta: [{ title: "Review Queue | PayMemo" }] }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const extensionQuery = useExtensionRecords();
  const extensionRecords = useMemo<ReviewItem[]>(
    () =>
      (extensionQuery.data ?? [])
        .filter((record) => record.status !== "confirmed")
        .map((record, index) => toReviewItem(record, index)),
    [extensionQuery.data],
  );
  const [draft, setDraft] = useState({
    category: "Other",
    counterparty: "",
    note: "",
    project: "",
  });
  const [actionMessage, setActionMessage] = useState("");
  const [activeId, setActiveId] = useState<string>("");
  const active = extensionRecords.find((item) => item.id === activeId) ?? extensionRecords[0];

  useEffect(() => {
    setActiveId((current) =>
      current && extensionRecords.some((record) => record.id === current)
        ? current
        : (extensionRecords[0]?.id ?? ""),
    );
  }, [extensionRecords]);

  async function loadExtensionRecords() {
    await extensionQuery.refetch();
  }

  useEffect(() => {
    if (!active) return;
    setDraft({
      category: active.category,
      counterparty: active.counterparty,
      note: active.note,
      project: active.project,
    });
    setActionMessage("");
  }, [active?.id]);

  async function confirmActive() {
    if (!active) return;
    setActionMessage("Saving review...");
    const response = await fetch("/api/extension-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...active.raw,
        id: active.id,
        ...draft,
        status: "confirmed",
        reviewedAt: new Date().toISOString(),
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setActionMessage("Could not save this review decision. Check the API connection.");
      notify.error("Could not save review", "Check the API connection and try again.");
      return;
    }

    await extensionQuery.refetch();
    setActionMessage("Recorded. This payment left Needs Review.");
    notify.success("Review recorded", "Transaction left Needs Review.");
  }

  return (
    <>
      <Topbar
        title="Review Queue"
        subtitle="Confirm unclear transaction meaning before it enters the vault."
      />
      <div className="grid gap-6 p-6 pb-28 lg:grid-cols-[minmax(0,1fr)_440px] lg:p-10">
        <section className="overflow-hidden rounded-3xl border border-ink/35 bg-white shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/25 px-5 py-4">
            <div>
              <div className="text-sm font-semibold">Payments to review</div>
              <div className="text-xs text-ink/50">
                Click a transaction, add context, then record it.
              </div>
            </div>
            <button
              onClick={() => void loadExtensionRecords()}
              className="inline-flex items-center gap-2 rounded-xl border border-ink/25 px-3 py-2 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          <div className="divide-y divide-ink/15">
            {extensionRecords.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`block w-full p-5 text-left transition-colors ${
                  active?.id === item.id ? "bg-mint/10" : "bg-white hover:bg-cream/60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-ink/45">
                      <FileSearch className="h-3.5 w-3.5" /> {item.source}
                    </div>
                    <div className="mt-2 text-lg font-semibold">{item.publicFact}</div>
                    <div className="mt-1 text-xs text-ink/55">{item.localDateTime}</div>
                    <div className="mt-1 truncate font-mono text-xs text-ink/45">{item.hash}</div>
                  </div>
                  <span className="rounded-full border border-papaya/40 bg-papaya/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink">
                    Needs review
                  </span>
                </div>
              </button>
            ))}
          </div>
          {extensionRecords.length === 0 && (
            <div className="rounded-3xl border border-ink/35 bg-white p-8 text-center text-sm text-ink/55 shadow-soft">
              No review items yet. Two ways to get one:{" "}
              <a href="/install" className="font-semibold text-ink underline underline-offset-2">
                install the extension
              </a>{" "}
              and capture a wallet tx, or open the{" "}
              <a href="/app" className="font-semibold text-ink underline underline-offset-2">
                dashboard
              </a>{" "}
              and enable <em>Browser chain watch</em> to scan Morph Hoodi from this tab.
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-ink/35 bg-white p-6 shadow-card">
          {active ? (
            <>
              <div className="text-[10px] font-bold uppercase tracking-widest text-mint">
                Review selected payment
              </div>
              <h2 className="mt-2 text-xl font-semibold">{active.publicFact}</h2>
              <div className="mt-4 space-y-3 text-sm">
                <ReviewRow label="Detected" value={active.localDateTime} />
                <ReviewRow label="From" value={active.raw.from ?? "unknown"} mono />
                <ReviewRow label="To" value={active.raw.to} mono />
                <ReviewRow label="Tx hash" value={active.hash} mono />
                <ReviewRow label="Status" value={active.status} />
              </div>

              <label className="mt-5 block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Category
                </span>
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Counterparty
                </span>
                <input
                  value={draft.counterparty}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, counterparty: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Private note
                </span>
                <textarea
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, note: event.target.value }))
                  }
                  className="mt-2 min-h-28 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  Invoice, project, or task
                </span>
                <input
                  value={draft.project}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, project: event.target.value }))
                  }
                  className="mt-2 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
                />
              </label>

              <button
                onClick={confirmActive}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-semibold text-cream"
              >
                <Check className="h-4 w-4" /> Record review
              </button>
              {actionMessage && (
                <p className="mt-3 text-xs leading-5 text-ink/55">{actionMessage}</p>
              )}
            </>
          ) : (
            <div className="text-sm text-ink/55">No transaction selected.</div>
          )}
        </aside>
      </div>
    </>
  );
}

const categories = [
  "Payroll",
  "Vendor Payment",
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
  "Other",
];

function toReviewItem(record: SyncedRecord, index: number): ReviewItem {
  const id = record.id ?? `extension-${index}`;
  return {
    id,
    source: record.provider ?? record.source ?? "Wallet Assist",
    publicFact: formatPublicFact(record),
    hash: record.txHash ?? "pending",
    category: record.category ?? "Other",
    counterparty:
      record.counterparty ?? (record.direction === "incoming" ? (record.from ?? "") : record.to),
    note: record.note ?? "",
    project: record.project ?? "",
    status: record.status,
    localDateTime: formatLocalDateTime(record.confirmedAt ?? record.updatedAt ?? record.createdAt),
    raw: record,
  };
}

type ReviewItem = {
  id: string;
  source: string;
  publicFact: string;
  hash: string;
  category: string;
  counterparty: string;
  note: string;
  project: string;
  status: string;
  localDateTime: string;
  raw: SyncedRecord;
};

type SyncedRecord = {
  id?: string;
  mode?: string;
  chainId?: number;
  chainName?: string;
  source?: string;
  provider?: string;
  txHash?: string;
  from?: string;
  to: string;
  amount: string;
  token: string;
  category?: string;
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
  createdAt?: string;
  updatedAt?: string;
  status: string;
};

function formatLocalDateTime(value?: string) {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPublicFact(record: SyncedRecord) {
  const amount = formatAmount(record.amount, record.token);
  if (record.direction === "incoming") return `${amount} from ${record.from ?? "unknown sender"}`;
  return `${amount} to ${record.to}`;
}

function formatAmount(amount: string, token: string) {
  const value = String(amount || "contract call");
  if (!token || value.toLowerCase().includes(token.toLowerCase())) return value;
  return `${value} ${token}`;
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 border-b border-ink/20 pb-2">
      <div className="text-[10px] uppercase tracking-widest text-ink/45">{label}</div>
      <div className={`mt-1 min-w-0 break-all leading-6 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}
