import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { FileText, PenLine, Shield, Lock } from "lucide-react";

const steps = [
  { icon: PenLine, label: "Wallet Pays", desc: "User sends from PayMemo, a dApp, or wallet UI.", color: "bg-papaya" },
  { icon: Shield, label: "Tx Detected", desc: "PayMemo watches the configured Morph wallet address.", color: "bg-mint" },
  { icon: FileText, label: "Info Added", desc: "User records category, note, counterparty, and project.", color: "bg-pink" },
  { icon: Lock, label: "Review Saved", desc: "Encrypted context lands in Review and the ledger.", color: "bg-ink text-cream" },
];

export function Lifecycle() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section ref={ref} id="solution" className="relative py-24 sm:py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">02 - Lifecycle</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
            Add context <span className="font-serif-italic text-gradient-aurora">after</span> the transaction is detected.
          </h2>
        </div>

        <div className="mt-16 relative">
          <div className="absolute left-0 right-0 top-7 h-[2px] bg-ink/10 hidden md:block" />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.6, ease: "easeOut" }}
            style={{ transformOrigin: "left" }}
            className="absolute left-0 right-0 top-7 h-[2px] bg-aurora hidden md:block"
          />
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.25 + i * 0.18, duration: 0.6 }}
                  className="relative"
                >
                  <div className={`relative z-10 grid h-14 w-14 place-items-center rounded-2xl ${s.color} text-white shadow-card`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-ink/50">Step {String(i + 1).padStart(2, "0")}</div>
                  <h3 className="mt-1 text-xl font-semibold">{s.label}</h3>
                  <p className="mt-1 text-sm text-ink/60">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
