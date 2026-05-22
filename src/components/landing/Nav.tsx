import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function Nav() {
  return (
    <header className="fixed top-4 left-1/2 z-50 -translate-x-1/2 w-[min(1180px,calc(100%-2rem))]">
      <div className="flex items-center justify-between rounded-full border border-ink/40 bg-background/70 backdrop-blur-xl px-4 py-2 shadow-soft">
        <Link to="/" className="flex items-center gap-2 pl-1">
          <Logo size={32} className="rounded-[10px]" />
          <span className="font-semibold tracking-tight text-ink">PayMemo</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-ink/82">
          <a href="#problem" className="hover:text-ink">
            Problem
          </a>
          <a href="#solution" className="hover:text-ink">
            How it works
          </a>
          <a href="#privacy" className="hover:text-ink">
            Privacy
          </a>
          <a href="#dashboard" className="hover:text-ink">
            Dashboard
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/install"
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-full border border-ink/15 bg-white/70 px-3.5 text-sm font-medium text-ink/88 hover:text-ink hover:bg-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Get Extension
          </Link>
          <Link
            to="/app"
            className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-cream hover:bg-ink/85 transition-colors"
          >
            Launch App →
          </Link>
        </div>
      </div>
    </header>
  );
}
