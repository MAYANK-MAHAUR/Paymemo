import { motion } from "framer-motion";
import { AppWindow, Puzzle, ArrowRight, MessageSquare, ShieldCheck } from "lucide-react";

const modes = [
  {
    tag: "Mode 01",
    icon: AppWindow,
    title: "dApp Mode",
    subtitle: "Pay directly inside PayMemo.",
    description:
      "Send testnet payments straight from the PayMemo app. PayMemo encrypts the private memo, submits the transaction, verifies it on-chain, and saves a categorized record to your ledger.",
    steps: [
      { icon: MessageSquare, label: "Add memo and category in PayMemo" },
      { icon: ArrowRight, label: "Connect wallet and sign on testnet" },
      { icon: ShieldCheck, label: "Tx verified & saved to ledger" },
    ],
    accent: "bg-pink",
    glow: "shadow-glow-pink",
  },
  {
    tag: "Mode 02",
    icon: Puzzle,
    title: "Wallet-Assist / Extension Mode",
    subtitle: "Works with any dApp or wallet you already use.",
    description:
      "Keep using Bitget, MetaMask, Trust Wallet, or any dApp. The PayMemo extension watches configured Morph wallet addresses and pops up after a matching transaction is detected so you can add the private reason.",
    steps: [
      { icon: Puzzle, label: "Extension listens to watched wallets" },
      { icon: MessageSquare, label: "Popup: what was this transaction for?" },
      { icon: ShieldCheck, label: "Saved to Review after sync" },
    ],
    accent: "bg-papaya",
    glow: "shadow-glow-papaya",
  },
];

export function Modes() {
  return (
    <section id="modes" className="relative py-24 sm:py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">
            02.5 - How you use it
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
            Two ways to add{" "}
            <span className="font-serif-italic">meaning</span> to a transaction.
          </h2>
          <p className="mt-5 text-lg text-ink/65 leading-relaxed">
            Pay inside PayMemo, or let the extension watch the wallets and dApps you already use.
            Either way, every detected transaction can be reviewed, tagged, verified, and remembered.
          </p>
        </div>

        <div className="mt-14 grid lg:grid-cols-2 gap-6">
          {modes.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`${i === 1 ? "dark bg-[oklch(0.16_0.01_280)] text-white" : "bg-white"} relative overflow-hidden rounded-3xl border border-ink/35 p-8 sm:p-10 shadow-soft hover:shadow-card transition-all`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-2xl ${m.accent} text-white ${m.glow}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
                    {m.tag}
                  </span>
                </div>

                <h3 className="mt-7 text-2xl sm:text-3xl font-semibold tracking-tight">
                  {m.title}
                </h3>
                <p className="mt-2 text-sm font-medium text-ink/70">
                  {m.subtitle}
                </p>
                <p className="mt-4 text-base text-ink/60 leading-relaxed">
                  {m.description}
                </p>

                <div className="mt-8 space-y-3">
                  {m.steps.map((s, idx) => {
                    const SIcon = s.icon;
                    return (
                      <div
                        key={s.label}
                        className="flex items-center gap-3 rounded-2xl bg-cream/70 border border-ink/30 p-3.5"
                      >
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-ink/35">
                          <SIcon className="h-4 w-4 text-ink/70" />
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40 w-6">
                          0{idx + 1}
                        </span>
                        <span className="text-sm text-ink/80">{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
