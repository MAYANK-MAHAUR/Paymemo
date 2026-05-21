import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export type EditableRecord = {
  id: string;
  category: string;
  counterparty: string;
  note: string;
  project: string;
  status?: string;
};

const categories = [
  "Payroll",
  "Vendor Payment",
  "Invoice Payment",
  "Bridge",
  "Swap",
  "Business Expense",
  "Refund",
  "Personal",
  "Transfer to Self",
  "Income",
  "Subscription",
  "API Payment",
  "Agent Task Payment",
  "Other",
];

export function EditRecordModal({
  open,
  initial,
  onClose,
  onSave,
  title = "Edit transaction",
  submitLabel = "Save changes",
}: {
  open: boolean;
  initial: EditableRecord | null;
  onClose: () => void;
  onSave: (patch: EditableRecord) => Promise<void> | void;
  title?: string;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState<EditableRecord | null>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(initial);
    setSaving(false);
    setError("");
  }, [initial?.id, open]);

  if (!open || !draft) return null;

  async function submit() {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-ink/20 bg-white shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-ink/15 p-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-mint">Edit record</div>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-ink/20 text-ink/60 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">Category</span>
            <select
              value={draft.category || "Other"}
              onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">Counterparty</span>
            <input
              value={draft.counterparty}
              onChange={(event) => setDraft({ ...draft, counterparty: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">Private note</span>
            <textarea
              value={draft.note}
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              className="mt-2 min-h-24 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">
              Invoice, project, or task
            </span>
            <input
              value={draft.project}
              onChange={(event) => setDraft({ ...draft, project: event.target.value })}
              className="mt-2 w-full rounded-2xl border border-ink/25 bg-cream/60 p-3 text-sm outline-none focus:border-mint"
            />
          </label>

          {error && <p className="text-xs font-semibold text-red-900">{error}</p>}

          <button
            onClick={submit}
            disabled={saving}
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-semibold text-cream disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> {saving ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
