import { motion } from "framer-motion";
import { Activity, ArrowDownLeft, ArrowUpRight, Layers } from "lucide-react";

const badge = (s: string) => {
  const map: Record<string, string> = {
    Confirmed: "bg-mint/15 text-mint border border-mint/30",
    Pending: "bg-papaya/15 text-papaya border border-papaya/40",
    Failed: "bg-destructive/10 text-destructive border border-destructive/30",
    "Needs Review": "bg-pink/15 text-pink border border-pink/30",
  };
  return map[s] ?? "bg-ink/10 text-ink";
};

export function DashboardPreview() {
  const previewRows = [
    {
      id: "intent",
      date: "After unlock",
      counterparty: "Vendor wallet",
      note: "Private memo decrypts locally",
      amount: "User token",
      status: "Confirmed",
    },
    {
      id: "invoice",
      date: "On payment",
      counterparty: "Invoice payer",
      note: "Linked tx hash after Morph receipt",
      amount: "Invoice amount",
      status: "Pending",
    },
    {
      id: "agent",
      date: "Agent task",
      counterparty: "API or tool",
      note: "Agent reason stays encrypted",
      amount: "Policy spend",
      status: "Needs Review",
    },
  ];

  return (
    <section id="dashboard" className="relative py-24 sm:py-32 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pink">05 - Dashboard</span>
          <h2 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[-0.02em]">
            Your stablecoin activity, <span className="font-serif-italic text-gradient-aurora">finally legible.</span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1400 }}
          className="mt-14 rounded-[2rem] border border-ink/35 bg-white shadow-card overflow-hidden"
        >
          <div className="grid lg:grid-cols-[240px_1fr]">
            <aside className="border-r border-ink/35 p-5 bg-cream/40">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-aurora text-white text-xs font-bold">P</span>
                <span className="font-semibold text-sm">PayMemo</span>
              </div>
              <nav className="mt-8 space-y-1 text-sm">
                {["Dashboard", "Send Payment", "Ledger", "Invoices", "Batch Payouts", "Reports"].map((n, i) => (
                  <div key={n} className={`px-3 py-2 rounded-xl ${i === 0 ? "bg-ink text-cream" : "text-ink/70 hover:bg-ink/5"}`}>{n}</div>
                ))}
              </nav>
              <div className="mt-10 rounded-2xl border border-mint/30 bg-mint/10 p-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-mint">Vault</div>
                <div className="mt-1 text-xs text-ink">Unlocked & syncing</div>
              </div>
            </aside>

            <div className="p-7 bg-white">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { l: "Sent", v: "From vault", icon: ArrowUpRight, c: "text-pink" },
                  { l: "Received", v: "From wallet", icon: ArrowDownLeft, c: "text-mint" },
                  { l: "Pending", v: "Live intents", icon: Activity, c: "text-papaya" },
                  { l: "Confirmed", v: "Verified txs", icon: Layers, c: "text-ink" },
                ].map((k) => {
                  const I = k.icon;
                  return (
                    <div key={k.l} className="rounded-2xl border border-ink/35 p-4">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink/50">
                        {k.l}
                        <I className={`h-4 w-4 ${k.c}`} />
                      </div>
                      <div className="mt-2 text-2xl font-semibold tracking-tight">{k.v}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-ink/35 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-ink/35">
                  <span className="text-sm font-semibold">Recent ledger</span>
                  <span className="text-xs text-ink/50">Last 7 days</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-ink/50">
                      <th className="text-left font-medium px-4 py-2">Date</th>
                      <th className="text-left font-medium px-4 py-2">Counterparty / Note</th>
                      <th className="text-left font-medium px-4 py-2">Amount</th>
                      <th className="text-left font-medium px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((t) => (
                      <tr key={t.id} className="border-t border-ink/30">
                        <td className="px-4 py-3 text-ink/60">{t.date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{t.counterparty}</div>
                          <div className="text-xs text-ink/50">{t.note}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{t.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${badge(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
