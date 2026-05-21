import { connectWallet, discoverWalletProviders, type WalletOption } from "@/lib/morph";
import { rememberVaultSession, signVaultUnlock } from "@/lib/crypto-vault";
import { pairExtensionInstallWithWallet } from "@/lib/extension-pair";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

const logoDomains: Record<string, string> = {
  metamask: "metamask.io",
  rabby: "rabby.io",
  bitget: "web3.bitget.com",
  trust: "trustwallet.com",
  phantom: "phantom.app",
  okx: "okx.com",
  coinbase: "coinbase.com",
  binance: "binance.com",
};

function walletLogo(wallet: WalletOption) {
  if (wallet.icon) return wallet.icon;
  const key = wallet.name.toLowerCase();
  const domain = Object.entries(logoDomains).find(([name]) => key.includes(name))?.[1];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : "";
}

export function WalletConnectModal({
  open,
  onClose,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  onConnected: (address: string, wallet: WalletOption) => void | Promise<void>;
}) {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [message, setMessage] = useState("Please connect wallet before continuing.");
  const [connectingId, setConnectingId] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setMessage("Please connect wallet before continuing.");
    void discoverWalletProviders().then((detected) => {
      if (!alive) return;
      setWallets(detected);
      if (!detected.length) setMessage("No wallet was detected. Install or unlock an EVM wallet.");
    });
    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  async function connect(wallet: WalletOption) {
    try {
      setConnectingId(wallet.id);
      setMessage(`Connecting ${wallet.name}...`);
      const address = await connectWallet(wallet.id);
      setMessage("Unlocking private notes with a harmless signature...");
      const signature = await signVaultUnlock(address);
      rememberVaultSession(address, signature);
      // Pair extension install with this wallet (no-op if extension is not present).
      void pairExtensionInstallWithWallet(address).catch(() => null);
      await onConnected(address, wallet);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect wallet.");
    } finally {
      setConnectingId("");
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-ink/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-ink/20 bg-white shadow-card">
        <div className="flex items-start justify-between gap-4 border-b border-ink/15 p-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-mint">
              Wallet required
            </div>
            <h2 className="mt-1 text-xl font-semibold">Choose a wallet</h2>
            <p className="mt-1 text-sm font-semibold text-red-900">{message}</p>
            <p className="mt-2 text-xs text-red-900">
              Testnet only. The signature unlocks encrypted PayMemo notes; it does not send a transaction.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-ink/20 text-ink/60 hover:text-ink"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2 p-4">
          {wallets.map((wallet) => {
            const logo = walletLogo(wallet);
            return (
              <button
                key={wallet.id}
                onClick={() => void connect(wallet)}
                className="flex w-full items-center gap-3 rounded-2xl border border-ink/15 bg-cream/50 p-3 text-left transition-colors hover:border-mint hover:bg-mint/10"
                disabled={Boolean(connectingId)}
                type="button"
              >
                <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-ink/15 bg-white text-xs font-black">
                  {logo ? <img src={logo} alt={`${wallet.name} logo`} className="h-7 w-7 object-contain" /> : wallet.name.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{wallet.name}</span>
                  <span className="block truncate text-xs text-ink/50">
                    {connectingId === wallet.id ? "Waiting for wallet approval" : wallet.rdns || "Detected browser wallet"}
                  </span>
                </span>
              </button>
            );
          })}
          {!wallets.length && (
            <div className="rounded-2xl border border-dashed border-red-900/30 p-5 text-center text-sm text-red-900">
              No injected wallet detected yet. Unlock Bitget, MetaMask, Trust Wallet, Phantom, or another EVM wallet, then reopen this dialog.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
