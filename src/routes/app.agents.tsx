import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Clock, Plug, Plus, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { StatusBadge } from "@/components/app/StatusBadge";
import { morphTokens } from "@/lib/morph";

export const Route = createFileRoute("/app/agents")({
  head: () => ({
    meta: [
      { title: "AI Agents | PayMemo" },
      {
        name: "description",
        content: "Create and review AI-agent payment explanations with PayMemo.",
      },
    ],
  }),
  component: AgentsPage,
});

type AgentRecord = {
  id?: string;
  agentId?: string;
  taskId?: string;
  tool?: string;
  agentReason?: string;
  note?: string;
  to: string;
  amount: string;
  token: string;
  category: string;
  status: string;
  txHash?: string;
  createdAt?: string;
};

function AgentsPage() {
  const [records, setRecords] = useState<AgentRecord[]>([]);
  const [message, setMessage] = useState("Load live agent memory records from the PayMemo API.");
  const [saving, setSaving] = useState(false);
  const [apiCheckRunning, setApiCheckRunning] = useState(false);
  const [apiCheckStatus, setApiCheckStatus] = useState("");
  const [form, setForm] = useState({
    agentId: "",
    taskId: "",
    tool: "",
    paidFor: "",
    reason: "",
    to: "",
    amount: "0.0001",
    token: "ETH",
    policy: "under-limit",
  });

  async function runAgentApiCheck() {
    setApiCheckRunning(true);
    setApiCheckStatus("Pinging /api/agent-memory…");
    const lines: string[] = [];
    try {
      const t0 = Date.now();
      const response = await fetch("/api/agent-memory");
      const dt = Date.now() - t0;
      const payload = (await response.json()) as {
        records?: AgentRecord[];
        storage?: string;
        count?: number;
        endpoints?: Record<string, string>;
      };
      lines.push(`GET  /api/agent-memory  ·  HTTP ${response.status}  ·  ${dt}ms`);
      lines.push(
        `storage=${payload.storage ?? "unknown"}  ·  records=${payload.count ?? payload.records?.length ?? 0}`,
      );

      // Round-trip POST → GET dry run with a marker record we don't insert
      // into the demo flow. (Don't actually POST so we don't pollute live data.)
      lines.push("");
      lines.push("To create a real record, fill the form on the right or:");
      lines.push("  curl -X POST https://paymemo.vercel.app/api/agent-memory \\");
      lines.push("    -H 'content-type: application/json' \\");
      lines.push(
        '    -d \'{"agentId":"demo","taskId":"hello","paidFor":"API call","reason":"why","to":"0x000…","amount":"0.01"}\'',
      );
      setApiCheckStatus(lines.join("\n"));
    } catch (error) {
      setApiCheckStatus(`Failed: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setApiCheckRunning(false);
    }
  }

  async function loadRecords() {
    const response = await fetch("/api/agent-memory").catch(() => null);
    if (!response?.ok) {
      setMessage("Unable to reach the agent memory API.");
      return;
    }
    const payload = (await response.json()) as { records?: AgentRecord[]; count?: number };
    setRecords(payload.records ?? []);
    setMessage(`${payload.count ?? payload.records?.length ?? 0} live agent records loaded.`);
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  const totals = useMemo(
    () => ({
      total: records.length,
      confirmed: records.filter((record) => record.status === "confirmed").length,
      pending: records.filter((record) =>
        ["intent", "pending_signature", "pending_chain"].includes(record.status),
      ).length,
      review: records.filter((record) => record.status === "needs-review").length,
    }),
    [records],
  );

  async function createAgentRecord() {
    try {
      setSaving(true);
      const response = await fetch("/api/agent-memory", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Unable to create agent memory record.");
      }
      setMessage("Agent spend explanation saved. It is now reviewable in PayMemo.");
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save agent record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Topbar title="AI Agents" subtitle="Agents spend money. PayMemo makes them explain why." />

      <div className="space-y-6 p-6 lg:p-10">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={<Bot className="h-4 w-4" />} label="Agent records" value={totals.total} />
          <Kpi icon={<Clock className="h-4 w-4" />} label="Pending" value={totals.pending} />
          <Kpi
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Confirmed"
            value={totals.confirmed}
          />
          <Kpi
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Needs review"
            value={totals.review}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-3xl border border-ink/35 bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/35 px-6 py-4">
              <div>
                <div className="text-sm font-semibold">Live agent memory</div>
                <div className="text-xs text-ink/72">{message}</div>
              </div>
              <button
                onClick={loadRecords}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/30 bg-cream/60 px-3 py-2 text-sm font-semibold"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="bg-cream/60 text-[10px] uppercase tracking-widest text-ink/72">
                    {[
                      "Agent",
                      "Task",
                      "Tool/API",
                      "Reason",
                      "Recipient",
                      "Amount",
                      "Status",
                      "Tx",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr
                      key={record.id ?? `${record.agentId}-${index}`}
                      className="border-t border-ink/30 hover:bg-cream/40"
                    >
                      <td className="px-5 py-3.5 font-medium">{record.agentId || "agent"}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink/80">
                        {record.taskId || "-"}
                      </td>
                      <td className="px-5 py-3.5">{record.tool || "-"}</td>
                      <td className="max-w-[280px] px-5 py-3.5 text-ink/82">
                        {record.agentReason || record.note || ""}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs">{short(record.to)}</td>
                      <td className="px-5 py-3.5 font-mono">
                        {record.amount} <span className="text-ink/72">{record.token}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink/78">
                        {record.txHash ? short(record.txHash) : "not linked"}
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-14 text-center text-sm text-ink/72">
                        No agent records yet. Create one from the form or call the API from an
                        agent.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-pink/30 bg-white p-6 shadow-glow-pink">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
                <Plug className="h-4 w-4" /> Create agent memory
              </div>
              <div className="mt-4 space-y-3">
                <Input
                  label="Agent ID"
                  value={form.agentId}
                  onChange={(agentId) => setForm({ ...form, agentId })}
                />
                <Input
                  label="Task ID"
                  value={form.taskId}
                  onChange={(taskId) => setForm({ ...form, taskId })}
                />
                <Input
                  label="Tool/API/service"
                  value={form.tool}
                  onChange={(tool) => setForm({ ...form, tool })}
                />
                <Input
                  label="Paid for"
                  value={form.paidFor}
                  onChange={(paidFor) => setForm({ ...form, paidFor })}
                />
                <Input
                  label="Reason"
                  value={form.reason}
                  onChange={(reason) => setForm({ ...form, reason })}
                />
                <Input
                  label="Recipient"
                  value={form.to}
                  onChange={(to) => setForm({ ...form, to })}
                  mono
                />
                <div className="grid grid-cols-[1fr_120px] gap-2">
                  <Input
                    label="Amount"
                    value={form.amount}
                    onChange={(amount) => setForm({ ...form, amount })}
                    mono
                  />
                  <label className="block rounded-xl border border-ink/35 bg-cream/60 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-widest text-ink/75">Token</div>
                    <select
                      value={form.token}
                      onChange={(event) => setForm({ ...form, token: event.target.value })}
                      className="mt-0.5 w-full bg-transparent outline-none"
                    >
                      {morphTokens.map((token) => (
                        <option key={token.symbol}>{token.symbol}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <button
                onClick={createAgentRecord}
                disabled={saving}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-sm font-semibold text-cream disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Save agent explanation
              </button>
            </div>

            <div className="rounded-3xl border border-mint/30 bg-mint/10 p-5 text-sm leading-6 text-ink/82">
              <div className="mb-2 flex items-center gap-2 font-semibold text-ink">
                <Wallet className="h-4 w-4" /> Agent API
              </div>
              Agents can call <span className="font-mono">POST /api/agent-memory</span> before or
              after spending. For encrypted spend intents,{" "}
              <span className="font-mono">/api/agent-payment-intent</span>.
              <button
                onClick={runAgentApiCheck}
                disabled={apiCheckRunning}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-cream disabled:opacity-60"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {apiCheckRunning ? "Checking…" : "Ping agent API"}
              </button>
              {apiCheckStatus && (
                <pre className="mt-3 overflow-auto rounded-xl border border-ink/15 bg-white p-3 text-[11px] leading-snug text-ink/82 whitespace-pre-wrap">
                  {apiCheckStatus}
                </pre>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft lg:col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-pink">
              Agent setup tutorial
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Make an agent explain spending before or after it pays
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                ["1", "Agent creates intent", "Task ID, tool/API, recipient, amount, policy."],
                [
                  "2",
                  "PayMemo records why",
                  "Reason is stored as agent memory or encrypted intent.",
                ],
                ["3", "User reviews", "Needs-review policy appears in the review queue."],
                ["4", "Tx gets linked", "After signing, attach tx hash and confirmation status."],
              ].map(([n, title, text]) => (
                <div key={n} className="rounded-2xl border border-ink/25 bg-cream/60 p-4">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-black text-cream">
                    {n}
                  </span>
                  <div className="mt-3 text-sm font-semibold">{title}</div>
                  <p className="mt-1 text-xs leading-5 text-ink/78">{text}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <CodeBlock
                title="TypeScript / Node SDK"
                language="ts"
                code={`import { createAgentPaymentIntent } from "./paymemo-agent-client";

await createAgentPaymentIntent({
  agentId: "research-agent",
  taskId: "btc-brief",
  tool: "Market data API",
  paidFor: "API call",
  reason: "Live order book data for the BTC research task.",
  to: "0xRecipient...",
  amount: "0.0001",
  token: "ETH",
  policy: "needs-review",
});`}
              />
              <CodeBlock
                title="curl (any language)"
                language="bash"
                code={`curl -X POST https://paymemo.vercel.app/api/agent-memory \\
  -H 'content-type: application/json' \\
  -d '{
    "agentId": "research-agent",
    "taskId": "btc-brief",
    "tool": "Market data API",
    "paidFor": "API call",
    "reason": "Live order book data.",
    "to": "0xRecipient...",
    "amount": "0.0001",
    "token": "ETH",
    "policy": "needs-review"
  }'`}
              />
              <CodeBlock
                title="Python"
                language="python"
                code={`import requests

requests.post(
    "https://paymemo.vercel.app/api/agent-memory",
    json={
        "agentId": "research-agent",
        "taskId": "btc-brief",
        "tool": "Market data API",
        "paidFor": "API call",
        "reason": "Live order book data.",
        "to": "0xRecipient...",
        "amount": "0.0001",
        "token": "ETH",
        "policy": "needs-review",
    },
)`}
              />
              <CodeBlock
                title="Verify it landed"
                language="bash"
                code={`# Lists every agent memory record (filter by agentId or taskId).
curl https://paymemo.vercel.app/api/agent-memory?agentId=research-agent`}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-ink/20 bg-ink p-4 text-xs text-cream">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cream/78">
                Raw shape (POST /api/agent-memory)
              </div>
              <pre className="overflow-auto whitespace-pre-wrap font-mono leading-5">{`{
  "agentId": "research-agent",
  "taskId": "btc-brief",
  "tool": "Market data API",
  "paidFor": "API Payment",
  "reason": "Needed live order book data for the BTC research task.",
  "to": "0x...",
  "amount": "0.0001",
  "token": "ETH",
  "policy": "needs-review"
}`}</pre>
            </div>
          </div>

          <div className="rounded-3xl border border-mint/30 bg-mint/10 p-6 shadow-soft">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink/75">
              Morph fit
            </div>
            <div className="mt-3 space-y-3 text-sm leading-6 text-ink/80">
              <p>
                Morph's hackathon includes x402 / agentic payments, so PayMemo acts as the private
                memory layer around those API and agent payments.
              </p>
              <p>
                The Morph SDK can later support bridge-aware records, cross-chain message tracking,
                and gas estimation helpers for agent workflows.
              </p>
              <p className="font-semibold text-ink">
                Rule: agents may spend money, but PayMemo makes every spend reviewable.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink/35 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink/75">
        {label}
        <span className="text-pink">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function CodeBlock({ title, code, language }: { title: string; code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };
  return (
    <div className="rounded-2xl border border-ink/20 bg-ink p-4 text-xs text-cream">
      <div className="mb-2 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-cream/85">
        <span>{title}</span>
        <button
          onClick={handleCopy}
          className="rounded-md border border-cream/30 px-2 py-0.5 text-[10px] hover:bg-cream/15"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-auto whitespace-pre-wrap font-mono leading-5" data-lang={language}>
        {code}
      </pre>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mono?: boolean;
}) {
  return (
    <label className="block rounded-xl border border-ink/35 bg-cream/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-ink/75">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-0.5 w-full bg-transparent outline-none ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function short(value: string) {
  if (!value) return "-";
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}
