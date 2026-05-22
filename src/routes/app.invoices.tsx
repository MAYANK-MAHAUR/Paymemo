import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/app/Topbar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { WalletConnectModal } from "@/components/app/WalletConnectModal";
import {
  decryptPrivateMetadata,
  encryptPrivateMetadata,
  getRememberedVaultKey,
  readVaultSession,
} from "@/lib/crypto-vault";
import { createRecordId } from "@/lib/paymemo-schema";
import { fetchDomainRecords, syncDomainRecord, type EncryptedDomainRecord } from "@/lib/paymemo-domain";
import { morphTokens } from "@/lib/morph";
import { Copy, ExternalLink, Link2, Plus, RefreshCw } from "lucide-react";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/app/invoices")({
  head: () => ({ meta: [{ title: "Invoices | PayMemo" }] }),
  component: Invoices,
});

type InvoiceRow = {
  id: string;
  number: string;
  client: string;
  amount: string;
  token: string;
  due: string;
  status: string;
  description: string;
  paymentLink: string;
  linkedTxHash: string;
  payer: string;
};

function Invoices() {
  const [walletAddress, setWalletAddress] = useState("");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [message, setMessage] = useState("Please connect wallet before continuing.");
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const [form, setForm] = useState({
    client: "",
    clientWallet: "",
    amount: "0.0001",
    token: "ETH",
    due: "",
    description: "",
  });

  async function loadInvoices(wallet = walletAddress, key?: CryptoKey) {
    if (!wallet) return;
    const records = await fetchDomainRecords(wallet, "invoice");
    const decrypted = await Promise.all(
      records.map(async (record) => {
        const metadata = key
          ? await decryptPrivateMetadata<Record<string, string>>(record.encryptedMetadata, key)
          : {};
        return toInvoiceRow(record, metadata);
      }),
    );
    setRows(decrypted);
    setMessage(`${decrypted.length} encrypted invoice records loaded from database.`);
  }

  useEffect(() => {
    const session = readVaultSession();
    if (!session) return;
    void getRememberedVaultKey().then((key) => {
      if (!key) return;
      setWalletAddress(session.walletAddress);
      void loadInvoices(session.walletAddress, key);
    });
  }, []);

  async function requireUnlockedWallet() {
    const session = readVaultSession();
    const key = session ? await getRememberedVaultKey() : null;
    if (!session || !key) {
      setMessage("Please connect wallet before continuing.");
      setWalletPickerOpen(true);
      return null;
    }
    setWalletAddress(session.walletAddress);
    return { walletAddress: session.walletAddress, key };
  }

  async function createInvoice() {
    try {
      const unlocked = await requireUnlockedWallet();
      if (!unlocked) return;
      const { walletAddress: wallet, key } = unlocked;
      setWalletAddress(wallet);
      const id = createRecordId("inv");
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(rows.length + 1).padStart(3, "0")}`;
      const now = new Date().toISOString();
      const paymentLink = `${window.location.origin}/pay/${id}`;
      const encryptedMetadata = await encryptPrivateMetadata(
        {
          client: form.client,
          clientWallet: form.clientWallet,
          description: form.description,
          paymentLink,
          accountingLabel: "Invoice receivable",
        },
        key,
        wallet,
      );

      const record: EncryptedDomainRecord = {
        id,
        walletAddress: wallet,
        type: "invoice",
        publicData: {
          invoiceNumber,
          amount: form.amount,
          token: form.token,
          due: form.due,
          payee: wallet,
        },
        encryptedMetadata,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };

      await syncDomainRecord(record);
      await loadInvoices(wallet, key);
      setMessage("Invoice encrypted and saved to the database.");
      notify.success("Invoice created", `Invoice ${invoiceNumber} saved.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to create invoice.";
      setMessage(text);
      notify.error("Could not create invoice", text);
    }
  }

  return (
    <>
      <Topbar title="Invoices" subtitle="Issue and reconcile encrypted stablecoin invoices." />
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
          <div className="flex items-center justify-between border-b border-ink/35 px-6 py-4">
            <div>
              <div className="text-sm font-semibold">All invoices</div>
              <div className="text-xs text-ink/72">{rows.length} encrypted records</div>
            </div>
            <button
              onClick={() => void loadInvoices()}
              className="inline-flex items-center gap-2 rounded-xl border border-ink/30 bg-cream/60 px-3 py-2 text-sm font-semibold"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream/60 text-[10px] uppercase tracking-widest text-ink/72">
                {["Number", "Client", "Amount", "Due", "Linked tx", "Status", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((invoice) => (
                <tr key={invoice.id} className="border-t border-ink/30 hover:bg-cream/40">
                  <td className="px-5 py-3.5 font-mono">{invoice.number}</td>
                  <td className="px-5 py-3.5">{invoice.client}</td>
                  <td className="px-5 py-3.5 font-mono">
                    {Number(invoice.amount).toLocaleString(undefined, { maximumFractionDigits: 18 })}{" "}
                    <span className="text-ink/72">{invoice.token}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink/78">{invoice.due}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink/78">
                    {invoice.linkedTxHash ? shortHash(invoice.linkedTxHash) : "none"}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => void navigator.clipboard?.writeText(invoice.paymentLink)}
                        className="text-ink/78 hover:text-pink"
                        title="Copy payment link"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                      <a
                        href={invoice.paymentLink}
                        className="text-ink/78 hover:text-pink"
                        title="Open payment link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-ink/72">
                    No encrypted invoices yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-pink/30 bg-white p-6 shadow-glow-pink">
            <div className="absolute inset-x-0 top-0 h-1 bg-aurora" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-pink">
              Create invoice
            </div>
            <div className="mt-3 space-y-3 text-sm">
              <Input label="Client name" value={form.client} onChange={(client) => setForm({ ...form, client })} />
              <Input
                label="Client wallet optional"
                value={form.clientWallet}
                onChange={(clientWallet) => setForm({ ...form, clientWallet })}
              />
              <Input label="Amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} mono />
              <label className="block rounded-xl border border-ink/35 bg-cream/60 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-ink/75">Token</div>
                <select
                  value={form.token}
                  onChange={(event) => setForm({ ...form, token: event.target.value })}
                  className="mt-0.5 w-full bg-transparent outline-none"
                >
                  {morphTokens.map((token) => (
                    <option key={token.symbol}>{token.symbol}</option>
                  ))}
                </select>
              </label>
              <Input label="Due date" value={form.due} onChange={(due) => setForm({ ...form, due })} />
              <Input
                label="Private memo"
                value={form.description}
                onChange={(description) => setForm({ ...form, description })}
              />
            </div>
            <button
              onClick={createInvoice}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-semibold text-cream"
            >
              <Plus className="h-4 w-4" /> Encrypt and save invoice
            </button>
          </div>

          <div className="rounded-3xl border border-ink/35 bg-cream/60 p-5 shadow-soft">
            <div className="text-[10px] font-bold uppercase tracking-widest text-mint">
              Database status
            </div>
            <p className="mt-3 text-xs font-semibold text-red-900">{message}</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-ink/35 bg-white p-3 font-mono text-xs">
              <span className="flex-1 truncate">{walletAddress || "No wallet unlocked"}</span>
              <Copy className="h-3.5 w-3.5 text-ink/72" />
            </div>
          </div>
        </div>
        <WalletConnectModal
          open={walletPickerOpen}
          onClose={() => setWalletPickerOpen(false)}
          onConnected={async (account) => {
            const key = await getRememberedVaultKey();
            setWalletAddress(account);
            if (key) await loadInvoices(account, key);
          }}
        />
      </div>
    </>
  );
}

function toInvoiceRow(record: EncryptedDomainRecord, metadata: Record<string, string>): InvoiceRow {
  return {
    id: record.id,
    number: String(record.publicData.invoiceNumber ?? record.id),
    client: metadata.client || "Encrypted client",
    amount: String(record.publicData.amount ?? "0"),
    token: String(record.publicData.token ?? "ETH"),
    due: String(record.publicData.due ?? ""),
    status: record.status,
    description: metadata.description || "",
    paymentLink: metadata.paymentLink || "",
    linkedTxHash: String(record.publicData.linkedTxHash ?? ""),
    payer: String(record.publicData.payer ?? ""),
  };
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function Input({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block rounded-xl border border-ink/35 bg-cream/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-ink/75">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-0.5 w-full bg-transparent outline-none ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
