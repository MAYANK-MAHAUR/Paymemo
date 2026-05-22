import { motion } from "framer-motion";
import { Eye, Lock, ShieldCheck } from "lucide-react";

export function Privacy() {
  return (
    <section id="privacy" className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">03 - Privacy</span>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">
            Public transaction. <span className="font-serif-italic text-gradient-aurora">Private meaning.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-ink/80">
            The blockchain shows the transfer. PayMemo encrypts the human context: category, note,
            counterparty, invoice, and agent reason.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-ink/35 bg-white p-8 shadow-soft"
          >
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-ink/72">
              <Eye className="h-4 w-4" /> Public / Onchain
            </div>
            <div className="mt-6 space-y-3 font-mono text-sm">
              {[
                ["TX HASH", "confirmed tx hash"],
                ["AMOUNT", "token amount"],
                ["FROM", "wallet address"],
                ["TO", "recipient address"],
                ["BLOCK", "Morph block"],
                ["MEMO", "-"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-ink/30 pb-2.5">
                  <span className="text-ink/68">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-xs text-ink/75">
              Visible on the explorer / no private context
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-aurora-animated relative overflow-hidden rounded-3xl border border-ink/35 p-8 text-ink shadow-glow-pink"
          >
            <div className="grain absolute inset-0 opacity-20" />
            <div className="animate-shimmer absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
                  <Lock className="h-4 w-4" /> PayMemo Vault / Encrypted
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cream">
                  <ShieldCheck className="h-3 w-3" /> AES-256
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <PrivateLine label="Purpose" value="User-selected category and purpose" />
                <PrivateLine label="Counterparty" value="Private counterparty label" />
                <PrivateLine label="Internal tag" value="Project, client, task, or payroll tag" />
                <PrivateLine label="Invoice" value="Invoice reference / paid status" mono />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PrivateLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
      <div className={`text-lg font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
