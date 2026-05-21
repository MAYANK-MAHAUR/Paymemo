import { Bell, HelpCircle, Search } from "lucide-react";
import { readVaultSession } from "@/lib/crypto-vault";
import { readEncryptedVaultRecords } from "@/lib/paymemo-vault";
import { useExtensionRecords } from "@/lib/extension-records";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

const searchItems = [
  { label: "Dashboard", path: "/app", keywords: "home totals sent received records" },
  { label: "Send Payment", path: "/app/send", keywords: "pay transfer eth usdc weth bgb intent" },
  { label: "Wallet Assist", path: "/app/assist", keywords: "extension bitget metamask morph watcher" },
  { label: "Needs Review", path: "/app/review", keywords: "review unclear needs memo classify" },
  { label: "Ledger", path: "/app/ledger", keywords: "transactions export csv private notes" },
  { label: "Invoices", path: "/app/invoices", keywords: "invoice payment link paid due" },
  { label: "Batch Payouts", path: "/app/batch", keywords: "payroll vendor recipients sequential" },
  { label: "AI Agents", path: "/app/agents", keywords: "agent api x402 setup tutorial spending" },
  { label: "Docs", path: "/app/docs", keywords: "human setup extension api agent guide" },
  { label: "Reports", path: "/app/reports", keywords: "csv charts accounting export" },
  { label: "Settings", path: "/app/settings", keywords: "vault encryption delete backup" },
];

const NOTIFICATION_ACK_KEY = "paymemo:notifications-ack:v1";

function notificationKey(counts: { pending: number; review: number; extension: number }) {
  return `${counts.pending}:${counts.review}:${counts.extension}`;
}

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState("");
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState({
    pending: 0,
    review: 0,
    extension: 0,
  });
  const [rawNotificationCounts, setRawNotificationCounts] = useState({
    pending: 0,
    review: 0,
    extension: 0,
  });

  const extensionQuery = useExtensionRecords();
  const extensionRecords = extensionQuery.data ?? [];

  useEffect(() => {
    const update = () => {
      const session = readVaultSession();
      setWallet(session?.walletAddress ?? "");
      const localRecords = readEncryptedVaultRecords();
      const pending = localRecords.filter((record) =>
        ["intent", "pending_signature", "pending_chain", "signed"].includes(record.publicRecord.status),
      ).length;
      const review = localRecords.filter((record) => record.publicRecord.status === "needs-review").length;
      const extension = extensionRecords.filter((record) => record.status !== "confirmed").length;
      const rawCounts = { pending, review, extension };
      setRawNotificationCounts(rawCounts);
      const acknowledged = window.localStorage.getItem(NOTIFICATION_ACK_KEY);
      setNotificationCounts(
        acknowledged === notificationKey(rawCounts)
          ? { pending: 0, review: 0, extension: 0 }
          : rawCounts,
      );
    };

    update();
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 5000);
    return () => {
      window.removeEventListener("focus", update);
      window.clearInterval(timer);
    };
  }, [extensionRecords]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return searchItems
      .filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(term))
      .slice(0, 5);
  }, [query]);

  const totalNotifications =
    notificationCounts.pending + notificationCounts.review + notificationCounts.extension;

  const go = (path: string) => {
    setQuery("");
    void navigate({ to: path });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-ink/35 bg-cream/90 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-6 py-4 lg:px-10">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-ink/55">{subtitle}</p>}
        </div>

        <div className="relative hidden w-80 items-center gap-2 rounded-full border border-ink/35 bg-white px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-ink/50" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) go(results[0].path);
              if (event.key === "Escape") setQuery("");
            }}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="Search pages, records, tools..."
          />
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-11 overflow-hidden rounded-2xl border border-ink/20 bg-white shadow-card">
              {results.map((result) => (
                <button
                  key={result.path}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go(result.path)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-cream/70"
                >
                  <span className="font-medium">{result.label}</span>
                  <span className="font-mono text-xs text-ink/45">{result.path}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-ink/35 bg-white px-3 py-1.5 text-xs sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Morph Hoodi Testnet
        </div>

        <div className="relative">
          <button
            onClick={() => {
              const nextOpen = !notificationsOpen;
              setNotificationsOpen(nextOpen);
              if (nextOpen) {
                window.localStorage.setItem(NOTIFICATION_ACK_KEY, notificationKey(rawNotificationCounts));
                setNotificationCounts({ pending: 0, review: 0, extension: 0 });
              }
            }}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-ink/35 bg-white text-ink/60 hover:text-ink"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {totalNotifications > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1 text-[10px] font-black text-ink">
                {totalNotifications}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-11 w-80 overflow-hidden rounded-2xl border border-ink/20 bg-white shadow-card">
              <div className="border-b border-ink/15 px-4 py-3">
                <div className="text-sm font-semibold">PayMemo notifications</div>
                <div className="text-xs text-ink/50">Live from vault and extension records</div>
              </div>
              <NotificationRow label="Pending intents" value={notificationCounts.pending} path="/app/ledger" onGo={go} />
              <NotificationRow label="Needs review" value={notificationCounts.review} path="/app/review" onGo={go} />
              <NotificationRow label="Extension captures" value={notificationCounts.extension} path="/app/assist" onGo={go} />
            </div>
          )}
        </div>

        <div className="group relative inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-2 pr-3 text-xs font-semibold text-cream">
          <span className="h-6 w-6 rounded-full bg-aurora" />
          {wallet ? short(wallet) : "Vault locked"}
          <HelpCircle className="h-3.5 w-3.5 text-cream/70" />
          <div className="pointer-events-none absolute right-0 top-11 z-50 w-80 rounded-2xl border border-ink/20 bg-white p-4 text-left text-xs font-normal leading-5 text-ink opacity-0 shadow-card transition-opacity group-hover:opacity-100">
            {wallet ? (
              <>
                <div className="font-semibold">Vault unlocked in this tab</div>
                <p className="mt-1 text-ink/60">
                  Your wallet signature is cached in this browser tab so PayMemo can decrypt your
                  private notes, counterparties, project tags, and accounting context locally.
                  Closing the tab re-locks the vault. No transaction or spending permission is
                  granted by this signature.
                </p>
              </>
            ) : (
              <>
                <div className="font-semibold">What does vault locked mean?</div>
                <p className="mt-1 text-ink/60">
                  Connect wallet to load your PayMemo records. PayMemo asks for a harmless
                  signature to unlock encrypted private notes, counterparties, project tags, and
                  accounting context in this browser tab. It does not send a transaction or grant
                  spending permission.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationRow({
  label,
  value,
  path,
  onGo,
}: {
  label: string;
  value: number;
  path: string;
  onGo: (path: string) => void;
}) {
  return (
    <button
      onClick={() => onGo(path)}
      className="flex w-full items-center justify-between border-b border-ink/10 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-cream/70"
    >
      <span>{label}</span>
      <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-cream">
        {value}
      </span>
    </button>
  );
}

function short(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
