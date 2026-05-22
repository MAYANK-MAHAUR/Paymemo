import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  BookOpen,
  ChevronDown,
  FileSearch,
  FileText,
  Layers,
  LayoutDashboard,
  MoreHorizontal,
  RadioTower,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { readVaultSession } from "@/lib/crypto-vault";

type NavItem = { to: string; label: string; icon: LucideIcon; exact?: boolean };

const primaryItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/send", label: "Send Payment", icon: Send },
  { to: "/app/assist", label: "Wallet Assist", icon: WalletCards },
  { to: "/app/review", label: "Needs Review", icon: FileSearch },
  { to: "/app/ledger", label: "Ledger", icon: ScrollText },
  { to: "/app/batch", label: "Batch Payouts", icon: Layers },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

const moreItems: NavItem[] = [
  { to: "/app/invoices", label: "Invoices", icon: FileText },
  { to: "/app/morph", label: "Morph Testnet", icon: RadioTower },
  { to: "/app/agents", label: "AI Agents", icon: Bot },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/docs", label: "Docs", icon: BookOpen },
];

function renderItem(it: NavItem, active: boolean) {
  const Icon = it.icon;
  return (
    <Link
      key={it.to}
      to={it.to}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-ink text-cream shadow-soft" : "text-ink/82 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {it.label}
        {it.to === "/app/review" && (
          <span className="relative flex h-2.5 w-2.5" aria-label="Needs review attention">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-900 opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-900" />
          </span>
        )}
      </span>
    </Link>
  );
}

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const moreActive = moreItems.some((item) => path.startsWith(item.to));
  const [moreOpen, setMoreOpen] = useState(moreActive);

  useEffect(() => {
    const refresh = () => setVaultUnlocked(Boolean(readVaultSession()));
    refresh();
    const timer = window.setInterval(refresh, 2000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (moreActive) setMoreOpen(true);
  }, [moreActive]);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink/35 bg-white/70 backdrop-blur p-4 sticky top-0 h-screen">
      <Link to="/" className="flex items-center gap-2 px-2 py-2">
        <Logo size={32} className="rounded-xl" />
        <span className="font-semibold tracking-tight">PayMemo</span>
      </Link>
      <nav className="mt-6 space-y-1">
        {primaryItems.map((it) => {
          const active = it.exact ? path === it.to : path.startsWith(it.to);
          return renderItem(it, active);
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
          aria-expanded={moreOpen}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
            moreActive ? "bg-ink/5 text-ink" : "text-ink/82 hover:bg-ink/5 hover:text-ink"
          }`}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="flex-1 text-left">More</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`}
          />
        </button>
        {moreOpen && (
          <div className="ml-3 space-y-1 border-l border-ink/15 pl-2">
            {moreItems.map((it) => {
              const active = it.exact ? path === it.to : path.startsWith(it.to);
              return renderItem(it, active);
            })}
          </div>
        )}
      </nav>
      <div
        className={`mt-auto rounded-2xl border p-3 text-xs ${
          vaultUnlocked ? "border-mint/30 bg-mint/10" : "border-red-900/30 bg-red-50"
        }`}
      >
        <div
          className={`flex items-center gap-2 font-bold uppercase tracking-widest ${
            vaultUnlocked ? "text-mint" : "text-red-900"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Vault
        </div>
        <div className={`mt-1 ${vaultUnlocked ? "text-ink" : "text-red-900"}`}>
          {vaultUnlocked ? "Unlocked in this tab" : "Locked - connect wallet"}
        </div>
      </div>
    </aside>
  );
}
