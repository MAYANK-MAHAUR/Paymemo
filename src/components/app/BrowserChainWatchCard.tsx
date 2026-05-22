import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, PlayCircle, RadioTower, Sparkles, Wifi, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBrowserChainWatch } from "@/lib/browser-chain-watch";

type BrowserChainWatchCardProps = {
  ownerAddress: string | null | undefined;
  watchedAddresses: string[];
  /** Label map: lowercased address -> human label. */
  labels?: Record<string, string>;
  className?: string;
};

function relative(ts: number | null) {
  if (!ts) return "Not yet";
  const seconds = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function BrowserChainWatchCard({
  ownerAddress,
  watchedAddresses,
  labels = {},
  className,
}: BrowserChainWatchCardProps) {
  const { state, enabled, setEnabled, scanNow, watchedCount, chainName } = useBrowserChainWatch({
    ownerAddress,
    watchedAddresses,
  });
  const [scanFlash, setScanFlash] = useState<string>("");
  const [, setTick] = useState(0);

  // Re-render every second so "last scan" relative time updates.
  useEffect(() => {
    if (!state.lastScanAt) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [state.lastScanAt]);

  const watchedPreview = useMemo(() => {
    const seen = new Set<string>();
    return watchedAddresses
      .map((address) => address.trim().toLowerCase())
      .filter(
        (address) => /^0x[a-f0-9]{40}$/.test(address) && !seen.has(address) && seen.add(address),
      )
      .slice(0, 6);
  }, [watchedAddresses]);

  async function onScan() {
    setScanFlash("Scanning Morph…");
    const found = await scanNow();
    setScanFlash(
      found > 0
        ? `Found ${found} new transaction${found === 1 ? "" : "s"}.`
        : "Up to date — no new activity yet.",
    );
  }

  const status = !ownerAddress
    ? { tone: "neutral" as const, copy: "Connect a wallet to start watching it on Morph." }
    : !watchedCount
      ? { tone: "neutral" as const, copy: "Add at least one wallet to watch." }
      : enabled
        ? {
            tone: "live" as const,
            copy: `Live on ${chainName}. Detections drop into Needs Review.`,
          }
        : {
            tone: "paused" as const,
            copy: "Watcher is paused. Turn it on to capture transactions.",
          };

  return (
    <section
      className={`rounded-2xl border bg-white p-4 shadow-soft ${
        status.tone === "live" ? "border-mint/50" : "border-ink/15"
      } ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RadioTower
              className={`h-4 w-4 ${status.tone === "live" ? "text-mint" : "text-ink/55"}`}
            />
            Browser chain watch
            <span className="ml-1 rounded-full border border-ink/15 bg-cream/50 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-ink/55">
              No extension needed
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-ink/55 leading-relaxed">
            Same detection as the PayMemo extension, running in this tab. Add your wallet (and
            partner wallets), keep the dashboard open, and Morph Hoodi transactions land in{" "}
            <Link to="/app/review" className="underline underline-offset-2 hover:text-ink">
              Needs Review
            </Link>{" "}
            with a private memo prompt.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink/20 bg-cream/60 px-3 py-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--pink)]"
              disabled={!ownerAddress || !watchedCount}
            />
            {enabled ? (
              <span className="inline-flex items-center gap-1.5 text-ink">
                <Wifi className="h-3.5 w-3.5 text-mint" /> Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-ink/70">
                <WifiOff className="h-3.5 w-3.5" /> Paused
              </span>
            )}
          </label>
          <button
            onClick={onScan}
            disabled={!ownerAddress || !watchedCount || state.isScanning}
            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/25 bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {state.isScanning ? "Scanning…" : "Scan now"}
          </button>
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
          status.tone === "live"
            ? "border-mint/40 bg-mint/10 text-ink"
            : status.tone === "paused"
              ? "border-papaya/40 bg-papaya/10 text-ink"
              : "border-ink/15 bg-cream/50 text-ink/70"
        }`}
      >
        {scanFlash || status.copy}
        {state.scanError && <span className="ml-2 text-destructive">· {state.scanError}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat
          icon={<Eye className="h-3 w-3" />}
          label="Watching"
          value={`${watchedCount} wallet${watchedCount === 1 ? "" : "s"}`}
        />
        <Stat label="Last block" value={state.lastBlock ? `#${state.lastBlock}` : "—"} />
        <Stat label="Last scan" value={relative(state.lastScanAt)} />
        <Stat
          icon={<Sparkles className="h-3 w-3" />}
          label="New detections"
          value={String(state.latestDetections)}
        />
      </div>

      {watchedPreview.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {watchedPreview.map((address) => (
            <span
              key={address}
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/60 px-3 py-1 text-[11px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              <strong>{labels[address] || "Watched"}</strong>
              <span className="font-mono text-ink/55">
                {address.slice(0, 6)}…{address.slice(-4)}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink/45">
          Morph Hoodi · {state.isScanning ? "polling" : "idle"}
        </span>
        <Link
          to="/app/review"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:underline"
        >
          Open Needs Review <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/15 bg-cream/40 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink/55">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tracking-tight">{value}</div>
    </div>
  );
}
