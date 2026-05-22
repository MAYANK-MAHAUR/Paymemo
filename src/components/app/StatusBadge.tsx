export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Confirmed: "bg-mint/15 text-mint border-mint/30",
    Pending: "bg-papaya/15 text-papaya border-papaya/40",
    Failed: "bg-destructive/10 text-destructive border-destructive/30",
    "Needs Review": "bg-pink/15 text-pink border-pink/30",
    "Waiting Sign": "bg-ink/10 text-ink border-ink/45",
    "Awaiting Sign": "bg-ink/10 text-ink border-ink/45",
    intent: "bg-papaya/15 text-papaya border-papaya/40",
    pending_signature: "bg-ink/10 text-ink border-ink/45",
    pending_chain: "bg-papaya/15 text-papaya border-papaya/40",
    signed: "bg-papaya/15 text-papaya border-papaya/40",
    confirmed: "bg-mint/15 text-mint border-mint/30",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
    "needs-review": "bg-pink/15 text-pink border-pink/30",
    Queued: "bg-ink/10 text-ink/82 border-ink/40",
    Signed: "bg-papaya/15 text-papaya border-papaya/40",
    Draft: "bg-ink/10 text-ink/82 border-ink/40",
    Sent: "bg-papaya/15 text-papaya border-papaya/40",
    Paid: "bg-mint/15 text-mint border-mint/30",
    Cancelled: "bg-destructive/10 text-destructive border-destructive/30",
  };
  const cls = map[status] ?? "bg-ink/10 text-ink";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${cls}`}
    >
      {status}
    </span>
  );
}
