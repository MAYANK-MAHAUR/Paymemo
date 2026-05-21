import { isAddress } from "./morph";

const LEGACY_PARTNER_KEY = "paymemo:partner-wallets:v1";
const PARTNER_WALLETS_PREFIX = "paymemo:partner-wallets:owner:";

export type PartnerWallet = {
  address: string;
  label: string;
};

function ownerKey(walletAddress: string | null | undefined) {
  const normalized = String(walletAddress || "").trim().toLowerCase();
  if (!normalized) return "";
  return `${PARTNER_WALLETS_PREFIX}${normalized}`;
}

export function normalizePartnerWallet(address: string, label = "Partner wallet") {
  const normalized = address.trim().toLowerCase();
  if (!isAddress(normalized)) return null;
  return {
    address: normalized,
    label: label.trim() || "Partner wallet",
  } satisfies PartnerWallet;
}

export function readPartnerWallets(walletAddress?: string | null) {
  if (typeof window === "undefined") return [];

  const key = walletAddress ? ownerKey(walletAddress) : "";
  const storageKey = key || LEGACY_PARTNER_KEY;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    if (key) {
      // One-shot migration: if scoped key empty but legacy exists, copy then drop legacy.
      const legacy = window.localStorage.getItem(LEGACY_PARTNER_KEY);
      if (legacy) {
        window.localStorage.setItem(key, legacy);
        window.localStorage.removeItem(LEGACY_PARTNER_KEY);
        return readPartnerWallets(walletAddress);
      }
    }
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PartnerWallet[];
    return Array.isArray(parsed)
      ? parsed.flatMap((wallet) => {
          const next = normalizePartnerWallet(wallet.address, wallet.label);
          return next ? [next] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function writePartnerWallets(walletAddress: string | null | undefined, wallets: PartnerWallet[]) {
  if (typeof window === "undefined") return;
  const key = walletAddress ? ownerKey(walletAddress) : LEGACY_PARTNER_KEY;
  if (!key) return;
  const seen = new Set<string>();
  const normalized = wallets.flatMap((wallet) => {
    const next = normalizePartnerWallet(wallet.address, wallet.label);
    if (!next || seen.has(next.address)) return [];
    seen.add(next.address);
    return [next];
  });
  window.localStorage.setItem(key, JSON.stringify(normalized));
}

export function upsertPartnerWallet(walletAddress: string | null | undefined, wallet: PartnerWallet) {
  const normalized = normalizePartnerWallet(wallet.address, wallet.label);
  if (!normalized) return readPartnerWallets(walletAddress ?? undefined);
  const current = readPartnerWallets(walletAddress ?? undefined);
  const next = [normalized, ...current.filter((item) => item.address !== normalized.address)];
  writePartnerWallets(walletAddress ?? undefined, next);
  return next;
}

export function removePartnerWallet(walletAddress: string | null | undefined, address: string) {
  const normalized = normalizePartnerWallet(address)?.address;
  if (!normalized) return readPartnerWallets(walletAddress ?? undefined);
  const next = readPartnerWallets(walletAddress ?? undefined).filter(
    (wallet) => wallet.address !== normalized,
  );
  writePartnerWallets(walletAddress ?? undefined, next);
  return next;
}

export function syncPartnerWalletsToExtension(wallets: PartnerWallet[]) {
  if (typeof window === "undefined") return;
  window.postMessage(
    {
      type: "PAYMEMO_SYNC_WATCHED_WALLETS_FROM_APP",
      wallets,
    },
    window.location.origin,
  );
}

export function clearWalletDataFromExtension(walletAddress: string) {
  if (typeof window === "undefined") return;
  window.postMessage(
    {
      type: "PAYMEMO_CLEAR_WALLET_DATA_FROM_APP",
      wallet: walletAddress,
    },
    window.location.origin,
  );
}
