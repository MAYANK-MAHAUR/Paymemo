import { useEffect } from "react";
import { clearVaultSession, readVaultSession } from "@/lib/crypto-vault";
import { getSelectedEthereumProvider } from "@/lib/morph";
import { notify } from "@/lib/notify";

type ProviderEvents = {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

let installed = false;
let lastAccount: string | null = null;

function lock(reason: string) {
  const session = readVaultSession();
  if (!session) return;
  clearVaultSession();
  notify.warn("Vault locked", reason);
}

function handleAccountsChanged(accounts: unknown) {
  const list = Array.isArray(accounts) ? accounts : [];
  const next = String(list[0] ?? "").toLowerCase();
  if (!next) {
    lastAccount = null;
    lock("Wallet disconnected. Reconnect to reload private notes.");
    return;
  }
  const session = readVaultSession();
  if (session && next !== session.walletAddress.toLowerCase()) {
    lock("Active wallet changed. Re-connect to unlock that wallet's notes.");
  }
  lastAccount = next;
}

function handleChainChanged() {
  // Force a refresh so balances and morph context re-read.
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

async function attachProviderListener() {
  if (installed || typeof window === "undefined") return;
  const provider = (await getSelectedEthereumProvider().catch(() => null)) as
    | (ProviderEvents & {
        request?: (args: { method: string }) => Promise<unknown>;
      })
    | null;
  if (!provider || typeof provider.on !== "function") return;

  installed = true;
  provider.on("accountsChanged", handleAccountsChanged);
  provider.on("chainChanged", handleChainChanged);

  try {
    const accounts = (await provider.request?.({ method: "eth_accounts" })) as string[] | undefined;
    if (Array.isArray(accounts)) handleAccountsChanged(accounts);
  } catch {
    // Provider may not allow eth_accounts without a connect step; ignore.
  }
}

export function useWalletAccountWatcher() {
  useEffect(() => {
    void attachProviderListener();
    const id = window.setInterval(() => {
      void attachProviderListener();
    }, 5000);
    return () => {
      window.clearInterval(id);
    };
  }, []);
}
