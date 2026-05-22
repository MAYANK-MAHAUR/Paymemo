import { motion } from "framer-motion";
import { Briefcase, Building2, FileText, Wallet, ArrowLeftRight, BookOpen } from "lucide-react";

const items = [
  { icon: Briefcase, title: "Payroll", desc: "Tag and verify every contributor payout.", color: "bg-pink", glow: "shadow-glow-pink" },
  { icon: Building2, title: "Vendor payments", desc: "Match vendor payouts to scopes and invoices.", color: "bg-papaya", glow: "shadow-glow-papaya" },
  { icon: FileText, title: "Invoice tracking", desc: "Issue invoices and reconcile onchain.", color: "bg-mint", glow: "shadow-glow-mint" },
  { icon: Wallet, title: "Business expenses", desc: "Tag transactions like a real expense report.", color: "bg-ink text-cream", glow: "" },
  { icon: ArrowLeftRight, title: "Swaps & bridges", desc: "Annotate routing and rebalance moves.", color: "bg-pink", glow: "shadow-glow-pink" },
  { icon: BookOpen, title: "Stablecoin bookkeeping", desc: "Export categorized records for accounting.", color: "bg-papaya", glow: "shadow-glow-papaya" },
];

export function UseCases() {
  return (
    <section className="relative py-24 sm:py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between flex-wrap gap-6">
          <div className="max-w-2xl">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">04 - Use cases</span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
              Built for teams that <span className="font-serif-italic">move money in stablecoins.</span>
            </h2>
          </div>
        </div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                className={`group relative overflow-hidden rounded-3xl bg-white border border-ink/35 p-7 shadow-soft hover:shadow-card transition-all`}
              >
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${it.color} text-white ${it.glow}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{it.title}</h3>
                <p className="mt-2 text-sm text-ink/78">{it.desc}</p>
                <div className="mt-6 font-mono text-[10px] uppercase tracking-widest text-ink/65">Use case · 0{i + 1}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
