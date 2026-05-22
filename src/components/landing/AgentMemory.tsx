import { motion } from "framer-motion";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  FileSearch,
  ShieldCheck,
} from "lucide-react";

const examples = [
  "Paid 0.2 USDC to access a market data API for the BTC research task.",
  "Paid this wallet for completing the logo design task.",
  "Bridged funds to continue the user's workflow on another chain.",
];

const principles = [
  {
    icon: CheckCircle2,
    title: "Rules first",
    text: "Known bridges, swaps, invoices, and recurring payments are classified without AI.",
  },
  {
    icon: ShieldCheck,
    title: "User confirmation second",
    text: "Sensitive notes and categories stay user-controlled before they enter the private vault.",
  },
  {
    icon: BrainCircuit,
    title: "AI only when useful",
    text: "AI helps clean unclear notes, summarize activity, and explain agent spending.",
  },
];

export function AgentMemory() {
  return (
    <section id="agents" className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">
            04.5 - Agent payments
          </span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
            Agents spend money.{" "}
            <span className="font-serif-italic text-gradient-aurora">
              PayMemo makes them explain why.
            </span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/80">
            When an AI agent pays an API, hires another agent, bridges funds, or completes a paid
            task, PayMemo keeps the reason tied to the spend: task, tool, counterparty, policy, and
            private explanation.
          </p>

          <div className="mt-8 grid gap-3">
            {principles.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.08 }}
                  className="flex gap-3 rounded-2xl border border-ink/35 bg-white p-4 shadow-soft"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink text-ink">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-ink/78">{item.text}</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="relative overflow-hidden rounded-3xl border border-ink/35 bg-ink p-7 text-cream shadow-card"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-pink" />
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
              <Bot className="h-4 w-4" /> Agent spend record
            </div>
            <span className="rounded-full bg-cream/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cream/85">
              user reviewable
            </span>
          </div>

          <div className="mt-7 rounded-2xl bg-cream/10 p-5">
            <div className="flex items-center justify-between text-xs text-cream/78">
              <span>Research Agent</span>
              <span>0.20 USDC</span>
            </div>
            <p className="mt-4 text-2xl leading-snug">
              "Paid for live market data needed to finish the BTC research task."
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {examples.map((example) => (
              <div
                key={example}
                className="rounded-2xl border border-cream/15 bg-cream/5 p-4 text-sm leading-6 text-cream/88"
              >
                {example}
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-cream/10 p-4">
              <CircleDollarSign className="mb-3 h-4 w-4 text-pink" />
              API payment, task payout, subscription, bridge
            </div>
            <div className="rounded-2xl bg-cream/10 p-4">
              <FileSearch className="mb-3 h-4 w-4 text-pink" />
              Audit trail for humans, teams, and agent owners
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
