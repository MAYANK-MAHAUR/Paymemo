import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/app/Topbar";
import { WalletConnectModal } from "@/components/app/WalletConnectModal";
import { clearVaultSession, readVaultSession } from "@/lib/crypto-vault";
import {
  deleteEncryptedVaultRecords,
  deleteFullUserDatabase,
  exportEncryptedVaultJson,
  fetchEncryptedVaultRecords,
} from "@/lib/paymemo-vault";
import { morphHoodi, shortAddress } from "@/lib/morph";
import { clearWalletDataFromExtension } from "@/lib/watched-wallets";
import { Database, Download, KeyRound, RefreshCw, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings | PayMemo" }] }),
  component: Settings,
});

function Settings() {
  const [walletAddress, setWalletAddress] = useState("");
  const [recordCount, setRecordCount] = useState(0);
  const [lastSync, setLastSync] = useState("Not synced yet");
  const [message, setMessage] = useState("Encrypted records are stored in the PayMemo database.");
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState("");

  const runHealthCheck = async () => {
    setHealthStatus("Checking…");
    try {
      const response = await fetch("/api/health");
      const payload = await response.json();
      const lines: string[] = [];
      lines.push(
        `Server: ${payload.server?.runtime ?? "unknown"} · total ${payload.totalLatencyMs}ms`,
      );
      lines.push(
        `Database: ${payload.database?.backend}` +
          ` · configured=${payload.database?.configured}` +
          ` · reachable=${payload.database?.reachable}` +
          (payload.database?.latencyMs != null ? ` · ${payload.database.latencyMs}ms` : "") +
          (payload.database?.error ? ` · err=${payload.database.error}` : ""),
      );
      lines.push(
        `Morph RPC: reachable=${payload.chainWatch?.morph?.reachable}` +
          (payload.chainWatch?.morph?.latencyMs != null
            ? ` · ${payload.chainWatch.morph.latencyMs}ms`
            : "") +
          (payload.chainWatch?.morph?.latestBlock != null
            ? ` · block #${payload.chainWatch.morph.latestBlock}`
            : ""),
      );
      lines.push(`Cron secret: ${payload.chainWatch?.cronSecretConfigured ? "set" : "MISSING"}`);
      setHealthStatus(lines.join("\n"));
      if (!payload.database?.reachable) {
        notify.error(
          "Database not reachable",
          payload.database?.configured
            ? "Supabase is configured but the request failed. Check SUPABASE_URL / service-role key in Vercel."
            : "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.",
        );
      } else {
        notify.success("All systems up", "Database and Morph RPC are reachable.");
      }
    } catch (error) {
      setHealthStatus(`Failed: ${error instanceof Error ? error.message : "unknown"}`);
      notify.error("Health check failed", "See the readout above.");
    }
  };

  const loadRecords = async (wallet = walletAddress) => {
    if (!wallet) {
      setMessage("Connect or unlock your vault to load database records.");
      return;
    }

    try {
      const records = await fetchEncryptedVaultRecords(wallet);
      setRecordCount(records.length);
      setLastSync(new Date().toLocaleString());
      setMessage("Loaded encrypted records from the database.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load database records.");
    }
  };

  useEffect(() => {
    const session = readVaultSession();
    if (!session) return;
    setWalletAddress(session.walletAddress);
    void loadRecords(session.walletAddress);
  }, []);

  const connectForSettings = () => {
    setMessage("Please connect wallet before continuing.");
    setWalletPickerOpen(true);
  };

  const downloadEncryptedBackup = async () => {
    if (!walletAddress) {
      setMessage("Please connect wallet before continuing.");
      setWalletPickerOpen(true);
      return;
    }

    const json = await exportEncryptedVaultJson(walletAddress);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `paymemo-encrypted-vault-${walletAddress.slice(0, 8)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const deleteServerVault = async () => {
    if (!walletAddress) {
      setMessage("Please connect wallet before continuing.");
      setWalletPickerOpen(true);
      notify.walletRequired();
      return;
    }

    await deleteEncryptedVaultRecords(walletAddress);
    setRecordCount(0);
    setLastSync(new Date().toLocaleString());
    setMessage("Encrypted database records deleted for this wallet.");
    notify.success("Vault deleted", "All encrypted vault records for this wallet are removed.");
  };

  const clearFullDatabase = async () => {
    if (!walletAddress) {
      setMessage("Please connect wallet before continuing.");
      setWalletPickerOpen(true);
      notify.walletRequired();
      return;
    }

    const typed = window.prompt(
      `This deletes all stored PayMemo data for ${walletAddress}: send/vault records, Review, Wallet Assist, invoices, batch payouts, agent payment intents, and extension records. Onchain transactions stay public. Type DELETE to continue.`,
    );
    if (typed !== "DELETE") {
      setMessage("Full database clear cancelled.");
      notify.info("Cancelled", "Full database clear cancelled.");
      return;
    }

    try {
      await deleteFullUserDatabase(walletAddress);
      clearWalletDataFromExtension(walletAddress);
      clearVaultSession();
      setRecordCount(0);
      setLastSync(new Date().toLocaleString());
      setMessage("Full PayMemo database cleared for this wallet. Reconnect to start fresh.");
      notify.success("Database cleared", "All PayMemo data for this wallet has been removed.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to clear the full database.";
      setMessage(text);
      notify.error("Clear failed", text);
    }
  };

  return (
    <>
      <Topbar title="Settings" subtitle="Manage your wallet, vault, and encrypted records." />
      <div className="grid gap-5 p-6 lg:grid-cols-2 lg:p-10">
        <Card
          icon={<Wallet className="h-5 w-5" />}
          title="Connected wallet"
          hue="bg-pink/10 text-pink"
        >
          <Row k="Address" v={walletAddress ? shortAddress(walletAddress) : "Not connected"} mono />
          <Row k="Network" v={`${morphHoodi.name} - ${morphHoodi.chainId}`} />
          <Row k="Identity" v="Wallet-only access" />
          <Btn onClick={connectForSettings}>Connect wallet</Btn>
        </Card>

        <Card
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Vault status"
          hue="bg-mint/10 text-mint"
        >
          <Row k="Status" v={readVaultSession() ? "Unlocked in this tab" : "Locked"} />
          <Row k="Database records" v={`${recordCount} encrypted entries`} />
          <Row k="Last sync" v={lastSync} />
          <Btn onClick={() => void loadRecords()}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh database
          </Btn>
        </Card>

        <Card
          icon={<KeyRound className="h-5 w-5" />}
          title="Encryption"
          hue="bg-papaya/15 text-papaya"
        >
          <Row k="Algorithm" v="AES-256-GCM" />
          <Row k="Key derivation" v="Wallet signature" />
          <Row k="Plaintext storage" v="Never for private fields" />
          <p className="text-xs text-ink/75">
            Notes, labels, invoices, and agent reasons are encrypted before reaching the database.
          </p>
        </Card>

        <Card
          icon={<Database className="h-5 w-5" />}
          title="Database sync"
          hue="bg-ink/10 text-ink"
        >
          <Row k="Backend" v="PayMemo encrypted database" />
          <Row k="Sensitive fields" v="Ciphertext only" />
          <Row k="Browser storage" v="Session cache only" />
          <p className="text-xs font-semibold text-red-900">{message}</p>
          <div className="grid gap-2">
            <Btn onClick={downloadEncryptedBackup}>
              <Download className="h-3.5 w-3.5" /> Download encrypted backup
            </Btn>
            <Btn onClick={runHealthCheck}>
              <ShieldCheck className="h-3.5 w-3.5" /> Check database + chain connectivity
            </Btn>
            {healthStatus && (
              <pre className="mt-1 overflow-auto rounded-xl border border-ink/15 bg-ink/[0.03] p-3 text-[11px] leading-snug text-ink/82 whitespace-pre-wrap">
                {healthStatus}
              </pre>
            )}
          </div>
        </Card>

        <div className="rounded-3xl border border-destructive/30 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <Trash2 className="h-4 w-4" /> Delete stored data
          </div>
          <p className="mt-2 text-sm text-ink/78">
            Delete either the encrypted vault records or every PayMemo database record owned by the
            connected wallet. Onchain transactions remain public on Morph.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={deleteServerVault}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive hover:text-cream"
            >
              Delete vault only
            </button>
            <button
              onClick={clearFullDatabase}
              className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-destructive/85"
            >
              Clear full stored database
            </button>
          </div>
        </div>
        <WalletConnectModal
          open={walletPickerOpen}
          onClose={() => setWalletPickerOpen(false)}
          onConnected={async (account) => {
            setWalletAddress(account);
            await loadRecords(account);
          }}
        />
      </div>
    </>
  );
}

function Card({
  icon,
  title,
  hue,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${hue}`}>{icon}</span>
        <div className="text-base font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/30 pb-2 text-sm">
      <span className="text-ink/75">{k}</span>
      <span className={`text-right ${mono ? "font-mono" : ""}`}>{v}</span>
    </div>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-cream hover:bg-ink/85"
    >
      {children}
    </button>
  );
}
