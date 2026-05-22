import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/app/Topbar";
import {
  addMorphHoodiToWallet,
  hackathonTracks,
  morphBuildChecklist,
  morphHoodi,
} from "@/lib/morph";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clipboard,
  Code2,
  ExternalLink,
  FileVideo,
  PlugZap,
  RadioTower,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/morph")({
  head: () => ({ meta: [{ title: "Morph Testnet | PayMemo" }] }),
  component: MorphTestnet,
});

const flowCards = [
  {
    icon: Code2,
    title: "Direct dApp payment",
    text: "Create a PayMemo intent, ask why the payment exists, then send on Morph Hoodi.",
    state: "Ready for demo",
  },
  {
    icon: WalletCards,
    title: "Wallet-assist extension",
    text: "Capture context for MetaMask, Rabby, swaps, bridges, and external dApp signatures.",
    state: "Prototype flow",
  },
  {
    icon: Bot,
    title: "Agentic payments",
    text: "Log x402/API spend with task, tool, policy, and user-review explanation.",
    state: "Track aligned",
  },
];

function MorphTestnet() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard?.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  };

  const addNetwork = async () => {
    await addMorphHoodiToWallet()
      .then(() => setCopied("Network added"))
      .catch(() => setCopied("Install wallet"));
    window.setTimeout(() => setCopied(null), 1400);
  };

  return (
    <>
      <Topbar
        title="Morph Testnet"
        subtitle="Hackathon build center for PayMemo dApp, extension, and agent payment flows."
      />

      <div className="p-6 lg:p-10 space-y-6 pb-28 lg:pb-10">
        <section className="grid xl:grid-cols-[1fr_420px] gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-ink/35 bg-white p-7 shadow-card">
            <div className="absolute inset-x-0 top-0 h-1 bg-aurora" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
                  <RadioTower className="h-4 w-4" /> Morph Hoodi Testnet
                </div>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight">
                  Build what moves money, then remember why it moved.
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/78">
                  PayMemo is positioned for the Build In! Payments hackathon across Payroll + B2B,
                  SME payments, FX treasury, and x402 agentic payments. The demo should show real
                  payment intent capture on Morph, not just a static ledger.
                </p>
              </div>
              <span className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-semibold">
                Chain ID {morphHoodi.chainId}
              </span>
            </div>

            <div className="mt-7 grid sm:grid-cols-3 gap-3">
              {flowCards.map((flow) => {
                const Icon = flow.icon;
                return (
                  <div
                    key={flow.title}
                    className="rounded-2xl border border-ink/30 bg-cream/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-pink" />
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink/72">
                        {flow.state}
                      </span>
                    </div>
                    <div className="mt-4 text-sm font-semibold">{flow.title}</div>
                    <p className="mt-2 text-xs leading-5 text-ink/78">{flow.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-ink/35 bg-ink p-6 text-cream shadow-card">
            <div className="text-[10px] font-bold uppercase tracking-widest text-pink">
              Network config
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <NetworkRow label="Name" value={morphHoodi.name} />
              <NetworkRow label="RPC" value={morphHoodi.rpcUrl} mono />
              <NetworkRow label="Explorer" value={morphHoodi.explorerUrl} mono />
              <NetworkRow label="Currency" value={morphHoodi.currency} />
              <NetworkRow label="Public RPC limit" value={morphHoodi.rpcLimit} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={addNetwork}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink px-3 py-2.5 text-sm font-semibold text-ink"
              >
                <PlugZap className="h-4 w-4" /> Add network
              </button>
              <button
                onClick={() => copy("RPC copied", morphHoodi.rpcUrl)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cream/20 bg-cream/10 px-3 py-2.5 text-sm font-semibold"
              >
                <Clipboard className="h-4 w-4" /> Copy RPC
              </button>
            </div>
            {copied && <div className="mt-3 text-center text-xs text-pink">{copied}</div>}
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <ResourceLink href={morphHoodi.faucetUrl}>Faucet</ResourceLink>
              <ResourceLink href={morphHoodi.bridgeUrl}>Bridge</ResourceLink>
              <ResourceLink href={morphHoodi.explorerUrl}>Explorer</ResourceLink>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[1fr_420px] gap-6">
          <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
            <div className="text-sm font-semibold">Hackathon track fit</div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {hackathonTracks.map((track) => (
                <div key={track.title} className="rounded-2xl border border-ink/30 bg-cream/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{track.title}</div>
                    <ArrowUpRight className="h-4 w-4 text-pink" />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-ink/78">{track.fit}</p>
                  <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-ink/80">
                    {track.feature}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileVideo className="h-4 w-4 text-pink" /> Demo readiness
            </div>
            <div className="mt-4 space-y-2">
              {morphBuildChecklist.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-ink/25 bg-cream/60 px-3 py-2.5 text-sm"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[10px] font-bold text-ink/72">
                    {index + 1}
                  </span>
                  <span className="flex-1">{item}</span>
                  <CheckCircle2 className="h-4 w-4 text-mint" />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-mint/30 bg-mint/10 p-4 text-xs leading-5 text-ink/80">
              <ShieldCheck className="mb-2 h-4 w-4 text-mint" />
              The demo story is strongest when each transaction has public onchain proof plus
              private PayMemo context: purpose, counterparty, task, invoice, and export label.
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function NetworkRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-cream/15 pb-2">
      <span className="text-cream/75">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function ResourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-cream/20 bg-cream/10 px-3 py-1.5 text-cream/90 hover:text-cream"
    >
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}
