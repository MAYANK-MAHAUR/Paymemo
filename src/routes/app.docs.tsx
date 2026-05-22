import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/app/Topbar";
import {
  Bot,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  KeyRound,
  Lock,
  RadioTower,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/app/docs")({
  head: () => ({
    meta: [
      { title: "Docs | PayMemo" },
      {
        name: "description",
        content: "PayMemo setup docs for humans, extension users, and AI agents.",
      },
    ],
  }),
  component: DocsPage,
});

const humanSteps = [
  "Connect a browser wallet and switch to Morph Hoodi testnet.",
  "Sign the vault unlock message. This creates the local encryption key from your wallet signature.",
  "Create a payment in Send Payment and answer: What is this transaction for?",
  "PayMemo saves a pending intent first, then waits for the wallet tx hash and receipt.",
  "Only confirmed transactions become final ledger records. Failed or rejected payments stay out of final accounting.",
  "Ledger and Reports decrypt private fields only after the vault is unlocked.",
];

const extensionSteps = [
  "Open chrome://extensions, enable Developer mode, and load the PayMemo extension folder.",
  "In the extension, set the PayMemo app URL to this running dApp.",
  "Add a Morph wallet as: Main wallet | 0xYourAddress.",
  "Turn on Morph chain watch and keep the side panel open while testing Bitget or another wallet.",
  "If PayMemo sees a Morph tx with no context, it syncs it as needs-review and opens the memo prompt when Chrome allows it.",
  "Chrome cannot inject UI into another wallet extension's internal chrome-extension page, so unsupported surfaces fall back to side panel and Review.",
];

const agentSteps = [
  "Agent creates an explanation before spending: agent ID, task ID, tool or API, recipient, amount, reason, and policy status.",
  "The dApp or agent client encrypts sensitive reason/context before storage.",
  "Backend stores public payment facts plus encrypted metadata. Service role keys stay server-side only.",
  "User reviews agent spend records in AI Agents or Needs Review.",
  "After the wallet payment confirms, link the tx hash to the agent intent for audit-ready memory.",
];

const endpoints = [
  {
    method: "POST",
    path: "/api/agent-payment-intent",
    text: "Encrypted agent spend intent. Plain private reasons are rejected.",
  },
  {
    method: "GET",
    path: "/api/agent-payment-intent?wallet=0x...",
    text: "List encrypted agent intents for an authenticated wallet.",
  },
  {
    method: "POST",
    path: "/api/extension-intent",
    text: "Extension sync endpoint for wallet-assist and Morph chain-watch records.",
  },
  {
    method: "GET",
    path: "/api/extension-intent",
    text: "Review queue source for extension records that need user meaning.",
  },
  {
    method: "POST",
    path: "/api/vault-records",
    text: "Encrypted dApp ledger records created after payment verification.",
  },
];

function DocsPage() {
  return (
    <>
      <Topbar
        title="Docs"
        subtitle="Setup paths for human payments, wallet assist, and AI-agent spending."
      />

      <main className="space-y-6 p-6 pb-24 lg:p-10">
        <section className="grid gap-4 lg:grid-cols-3">
          <HeroCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Private Memory"
            body="Wallets show tx hashes, amounts, senders, and recipients. PayMemo stores the private reason in encrypted records."
          />
          <HeroCard
            icon={<RadioTower className="h-5 w-5" />}
            title="Morph First"
            body="This build is scoped to Morph Hoodi testnet first: chain ID 2910, native ETH, official USDC, WETH predeploy, and optional BGB contract config."
          />
          <HeroCard
            icon={<Bot className="h-5 w-5" />}
            title="Agent Ready"
            body="Agents can create spend intents and explain what they paid for before a user links or approves the onchain payment."
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <DocPanel icon={<WalletCards />} title="Human dApp Mode">
              <StepList steps={humanSteps} />
            </DocPanel>

            <DocPanel icon={<WalletCards />} title="Wallet-Assist Extension">
              <StepList steps={extensionSteps} />
              <div className="mt-5 rounded-2xl border border-papaya/40 bg-papaya/15 p-4 text-sm leading-6 text-ink/82">
                When a user sends from Bitget wallet itself, PayMemo cannot stop the wallet confirm
                screen. The Morph watcher detects the tx right after broadcast, auto-syncs it to
                Review, and opens the prompt in the active web page or side panel.
              </div>
            </DocPanel>

            <DocPanel icon={<Bot />} title="AI-Agent Payment Memory">
              <StepList steps={agentSteps} />
            </DocPanel>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
                <KeyRound className="h-4 w-4" /> Vault model
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-ink/80">
                <p>
                  No email login. The wallet is identity. The unlock signature derives the browser
                  encryption key, and private fields are encrypted before database sync.
                </p>
                <p>
                  The backend stores encrypted blobs for notes, labels, invoices, projects, tax
                  labels, payroll context, and agent reasoning.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
                <Database className="h-4 w-4" /> Backend APIs
              </div>
              <div className="mt-4 space-y-3">
                {endpoints.map((endpoint) => (
                  <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-2xl border border-ink/25 bg-cream/60 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="rounded-lg bg-ink px-2 py-1 font-mono text-[10px] text-cream">
                        {endpoint.method}
                      </span>
                      <span className="break-all font-mono">{endpoint.path}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-ink/78">{endpoint.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <MiniDoc
            icon={<Lock className="h-4 w-4" />}
            title="Privacy rule"
            text="Do not send private notes to external AI by default. Use rules first, user confirmation second, AI only when useful."
          />
          <MiniDoc
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Review rule"
            text="A detected tx with no user memo lands in Needs Review. It is not treated like a final explained record until the user confirms context."
          />
          <MiniDoc
            icon={<FileText className="h-4 w-4" />}
            title="Export rule"
            text="CSV export is for bookkeeping, accounting, audit prep, and tax preparation support. PayMemo does not calculate official taxes."
          />
        </section>

        <section className="rounded-3xl border border-mint/30 bg-mint/10 p-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-mint">
            <Code2 className="h-4 w-4" /> Agent request shape
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-ink/20 bg-white p-4 text-xs leading-6 text-ink">
{`POST /api/agent-payment-intent
{
  "id": "agent_intent_...",
  "walletAddress": "0xUserWallet",
  "type": "agent-payment-intent",
  "status": "needs-review",
  "publicData": {
    "agentId": "research-agent",
    "taskId": "btc-market-brief",
    "to": "0xApiOrToolWallet",
    "amount": "0.2",
    "token": "USDC",
    "policy": "under-limit"
  },
  "encryptedMetadata": {
    "version": 1,
    "algorithm": "AES-GCM",
    "kdf": "SHA-256(wallet-signature)",
    "iv": "...",
    "ciphertext": "..."
  }
}`}
          </pre>
        </section>
      </main>
    </>
  );
}

function HeroCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <article className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-ink text-cream">{icon}</div>
      <h2 className="mt-5 text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/78">{body}</p>
    </article>
  );
}

function DocPanel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-ink/35 bg-white p-6 shadow-soft">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-pink">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-pink/15 text-pink">
          {icon}
        </span>
        {title}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-6 text-ink/80">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink/25 bg-cream text-[11px] font-bold text-ink">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function MiniDoc({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-3xl border border-ink/35 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-mint/15 text-mint">
          {icon}
        </span>
        {title}
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/78">{text}</p>
    </article>
  );
}
