import { motion } from "framer-motion";
import { HelpCircle, Receipt, Tag } from "lucide-react";

const items = [
  { icon: HelpCircle, q: "Who did I pay?", color: "from-pink/15 to-pink/0", accent: "bg-pink" },
  { icon: Receipt, q: "What was this transaction for?", color: "from-papaya/20 to-papaya/0", accent: "bg-papaya" },
  { icon: Tag, q: "Was this payroll, invoice, bridge, or swap?", color: "from-mint/20 to-mint/0", accent: "bg-mint" },
];

export function Problem() {
  return (
    <section id="problem" className="relative py-24 sm:py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">01 - Problem</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
            Wallets show the transfer. <span className="font-serif-italic text-ink/50">Not the reason.</span>
          </h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6, rotate: -0.4 }}
                className={`group relative overflow-hidden rounded-3xl border border-ink/35 bg-white p-7 shadow-soft hover:shadow-card transition-all`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${it.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${it.accent} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-2xl font-semibold leading-tight tracking-tight">{it.q}</p>
                  <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-ink/50">Today's wallet UX</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
