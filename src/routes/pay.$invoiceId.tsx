import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  getMorphToken,
  getMorphTokenContract,
  isAddress,
  morphHoodi,
  sendErc20Payment,
  sendNativePayment,
  shortAddress,
  waitForTransactionReceipt,
} from "@/lib/morph";
import {
  deriveVaultKey,
  encryptPrivateMetadata,
  getRememberedVaultKey,
  rememberVaultSession,
  readVaultSession,
  signVaultUnlock,
} from "@/lib/crypto-vault";
import { WalletConnectModal } from "@/components/app/WalletConnectModal";
import {
  saveEncryptedVaultRecord,
  syncEncryptedVaultRecord,
  toPrivateMetadata,
  toPublicRecord,
} from "@/lib/paymemo-vault";
import { createRecordId, normalizeRecord } from "@/lib/paymemo-schema";

export const Route = createFileRoute("/pay/$invoiceId")({
  head: () => ({ meta: [{ title: "Pay Invoice | PayMemo" }] }),
  component: PayInvoice,
});

type PublicInvoice = {
  id: string;
  status: string;
  createdAt: string;
  publicData: {
    invoiceNumber?: string;
    amount?: string;
    token?: string;
    due?: string;
    payee?: string;
  };
};

type FlowStep = "idle" | "intent" | "signature" | "chain" | "confirmed" | "failed";

function PayInvoice() {
  const { invoiceId } = Route.useParams();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [category, setCategory] = useState("Invoice Payment");
  const [counterparty, setCounterparty] = useState("Invoice recipient");
  const [note, setNote] = useState("Invoice payment");
  const [project, setProject] = useState("");
  const [flowStep, setFlowStep] = useState<FlowStep>("idle");
  const [message, setMessage] = useState("Load invoice, connect wallet, then pay on Morph Hoodi.");
  const [txHash, setTxHash] = useState("");
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadInvoice() {
      const response = await fetch(`/api/public-invoice?id=${encodeURIComponent(invoiceId)}`);
      if (!response.ok) {
        setMessage("Invoice not found or not available.");
        return;
      }
      const payload = (await response.json()) as { invoice: PublicInvoice };
      if (!alive) return;
      setInvoice(payload.invoice);
      setProject(String(payload.invoice.publicData.invoiceNumber ?? payload.invoice.id));
      setNote(`Payment for ${payload.invoice.publicData.invoiceNumber ?? "invoice"}`);
    }

    void loadInvoice();
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  const amount = String(invoice?.publicData.amount ?? "0");
  const token = String(invoice?.publicData.token ?? "ETH");
  const payee = String(invoice?.publicData.payee ?? "");
  const invoiceNumber = String(invoice?.publicData.invoiceNumber ?? invoiceId);
  const canPay = Boolean(invoice && isAddress(payee) && Number(amount) > 0);

  const lifecycle = useMemo(
    () => ({
      Intent: flowStep !== "idle",
      Sign: ["signature", "chain", "confirmed"].includes(flowStep),
      Verify: ["chain", "confirmed"].includes(flowStep),
      Ledger: flowStep === "confirmed",
    }),
    [flowStep],
  );

  async function prepareWallet() {
    setMessage("Please connect wallet before continuing.");
    setWalletPickerOpen(true);
  }

  async function savePayerRecord({
    id,
    status,
    account,
    key,
    hash,
  }: {
    id: string;
    status: "pending_signature" | "pending_chain" | "confirmed" | "failed";
    account: string;
    key: CryptoKey;
    hash?: string;
  }) {
    const normalized = normalizeRecord({
      id,
      mode: "direct",
      status,
      chainId: morphHoodi.chainId,
      chainName: morphHoodi.name,
      txHash: hash,
      from: account,
      to: payee,
      amount,
      token,
      category: category as Parameters<typeof normalizeRecord>[0]["category"],
      counterparty,
      note,
      project,
      invoiceRef: invoiceNumber,
      source: "paymemo-payment-link",
    });

    const encryptedMetadata = await encryptPrivateMetadata(
      toPrivateMetadata(normalized),
      key,
      account,
    );
    const stored = saveEncryptedVaultRecord({
      id: normalized.id ?? "",
      walletAddress: account,
      publicRecord: toPublicRecord(normalized),
      encryptedMetadata,
      syncStatus: "local",
      updatedAt: new Date().toISOString(),
    });
    const synced = await syncEncryptedVaultRecord(stored);
    saveEncryptedVaultRecord({ ...synced.record, syncStatus: "synced" });
  }

  async function payInvoice() {
    if (!invoice || !canPay) {
      setMessage("Invoice is missing a valid payee or amount.");
      return;
    }

    try {
      setTxHash("");
      setFlowStep("intent");
      if (!walletAddress) {
        setMessage("Please connect wallet before continuing.");
        setWalletPickerOpen(true);
        return;
      }
      const account = walletAddress;
      setWalletAddress(account);
      const session = readVaultSession();
      const existingKey =
        session?.walletAddress.toLowerCase() === account.toLowerCase()
          ? await getRememberedVaultKey()
          : null;
      const key = existingKey ?? (await (async () => {
        const signature = await signVaultUnlock(account);
        rememberVaultSession(account, signature);
        return deriveVaultKey(signature, account);
      })());
      const intentId = createRecordId("invoice_pay");

      await savePayerRecord({ id: intentId, status: "pending_signature", account, key });
      setFlowStep("signature");
      setMessage("Encrypted payer intent saved. Waiting for wallet signature.");

      let hash = "";
      if (token === "ETH") {
        hash = await sendNativePayment(account, payee, amount);
      } else {
        const contract = getMorphTokenContract(token);
        if (!contract) {
          throw new Error(
            `${token} contract is not configured for Morph Hoodi. Set ${getMorphToken(token)?.envContractKey ?? `VITE_MORPH_${token}_ADDRESS`} or pay an ETH invoice.`,
          );
        }
        hash = await sendErc20Payment({
          from: account,
          tokenContract: contract,
          to: payee,
          amount,
          decimals: getMorphToken(token)?.decimals ?? 18,
        });
      }

      setTxHash(hash);
      await savePayerRecord({ id: intentId, status: "pending_chain", account, key, hash });
      setFlowStep("chain");
      setMessage("Transaction submitted. Waiting for Morph confirmation.");

      const receipt = await waitForTransactionReceipt(hash);
      if (receipt.status !== "0x1") {
        await savePayerRecord({ id: intentId, status: "failed", account, key, hash });
        setFlowStep("failed");
        setMessage("Morph returned a failed receipt. The payer ledger record is marked failed.");
        return;
      }

      await savePayerRecord({ id: intentId, status: "confirmed", account, key, hash });
      await markInvoicePaid({ invoiceId: invoice.id, txHash: hash, payer: account });
      setFlowStep("confirmed");
      setMessage("Invoice paid, verified onchain, and saved to your private ledger.");
    } catch (error) {
      setFlowStep("failed");
      setMessage(error instanceof Error ? error.message : "Unable to pay invoice.");
    }
  }

  return (
    <>
    <main className="min-h-screen bg-[#f8f4ec] text-ink">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-10">
        <section className="flex flex-col justify-between rounded-3xl border border-ink/15 bg-white p-6 shadow-soft lg:p-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> PayMemo
            </Link>
            <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-xs font-semibold text-ink">
              <ShieldCheck className="h-4 w-4 text-mint" /> Encrypted payment memory
            </div>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight lg:text-7xl">
              Pay invoice with meaning attached.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/60">
              PayMemo saves your private reason before signing, verifies the Morph transaction, and
              writes the final record to your encrypted ledger.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-4">
            {Object.entries(lifecycle).map(([label, active]) => (
              <div key={label} className="rounded-2xl border border-ink/15 bg-cream/60 p-3">
                <div className={`h-1.5 rounded-full ${active ? "bg-pink" : "bg-ink/10"}`} />
                <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-ink/50">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-ink/15 bg-white p-5 shadow-float">
          <div className="rounded-2xl bg-ink p-5 text-cream">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cream/60">
              <FileText className="h-4 w-4" /> Invoice
            </div>
            <div className="mt-3 text-2xl font-semibold">{invoiceNumber}</div>
            <div className="mt-1 text-sm text-cream/60">Morph Hoodi Testnet</div>
            <div className="mt-8 flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-cream/50">Amount</div>
                <div className="mt-1 font-mono text-3xl font-semibold">
                  {amount} <span className="text-base text-cream/60">{token}</span>
                </div>
              </div>
              <StatusPill status={invoice?.status ?? "loading"} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <Info label="Payee" value={payee ? shortAddress(payee) : "Loading"} mono />
            <Info label="Due" value={String(invoice?.publicData.due ?? "Not set")} />
            <Info label="Connected wallet" value={walletAddress ? shortAddress(walletAddress) : "Not connected"} mono />
          </div>

          <div className="mt-5 rounded-2xl border border-ink/15 bg-cream/60 p-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
              <ReceiptText className="h-4 w-4" /> What is this transaction for?
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Invoice Payment", "Business Expense", "Vendor Payment", "Subscription"].map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    category === item ? "bg-ink text-cream" : "bg-white text-ink/65"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <Input label="Counterparty" value={counterparty} onChange={setCounterparty} />
            <Input label="Private note" value={note} onChange={setNote} />
            <Input label="Project/accounting tag" value={project} onChange={setProject} />
          </div>

          <div className="mt-4 rounded-2xl border border-red-900/25 bg-red-50 p-4 text-sm text-red-900">
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 text-papaya" />
              <p>{message}</p>
            </div>
            {txHash && <div className="mt-2 font-mono text-xs text-ink">{shortAddress(txHash)}</div>}
          </div>

          <div className="mt-5 grid gap-2">
            <button
              onClick={walletAddress ? payInvoice : prepareWallet}
              disabled={!invoice || flowStep === "signature" || flowStep === "chain"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-semibold text-cream shadow-glow-mint disabled:cursor-not-allowed disabled:opacity-60"
            >
              {walletAddress ? <Lock className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
              {walletAddress ? "Save Intent & Pay Invoice" : "Connect Wallet"}
            </button>
            {flowStep === "confirmed" && (
              <Link
                to="/app/ledger"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-mint py-3 text-sm font-semibold text-ink"
              >
                <CheckCircle2 className="h-4 w-4" /> Open private ledger
              </Link>
            )}
          </div>
        </aside>
      </div>
    </main>
      <WalletConnectModal
        open={walletPickerOpen}
        onClose={() => setWalletPickerOpen(false)}
        onConnected={(account) => {
          setWalletAddress(account);
          setMessage("Wallet connected and private notes unlocked.");
        }}
      />
    </>
  );
}

async function markInvoicePaid({
  invoiceId,
  txHash,
  payer,
}: {
  invoiceId: string;
  txHash: string;
  payer: string;
}) {
  const response = await fetch("/api/invoice-payment", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      invoiceId,
      txHash,
      payer,
      chainId: morphHoodi.chainId,
    }),
  });

  if (!response.ok) {
    throw new Error("Payment confirmed, but PayMemo could not mark the invoice paid.");
  }
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-ink/15 bg-cream/60 px-4 py-3 text-sm">
      <span className="text-ink/55">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-3 block rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-ink/45">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-0.5 w-full bg-transparent text-sm outline-none"
      />
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-cream/20 bg-cream/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cream">
      {status}
    </span>
  );
}
