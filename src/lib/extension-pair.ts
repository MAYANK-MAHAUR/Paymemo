import { getVaultAuthHeaders } from "./crypto-vault";

const REQUEST_TIMEOUT_MS = 1500;

export function requestExtensionInstallToken(): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const requestId = `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      const data = event.data as
        | { type?: string; requestId?: string; token?: string; ok?: boolean }
        | undefined;
      if (data?.type !== "PAYMEMO_INSTALL_TOKEN" || data.requestId !== requestId) return;
      window.removeEventListener("message", handler);
      resolve(data.ok && data.token ? data.token : null);
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "PAYMEMO_REQUEST_INSTALL_TOKEN", requestId }, window.location.origin);
    window.setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(null);
    }, REQUEST_TIMEOUT_MS);
  });
}

export async function pairExtensionInstallWithWallet(walletAddress: string) {
  const token = await requestExtensionInstallToken();
  if (!token) return { ok: false as const, reason: "extension-unavailable" };

  const response = await fetch("/api/extension-pair", {
    method: "POST",
    headers: { "content-type": "application/json", ...getVaultAuthHeaders() },
    body: JSON.stringify({ walletAddress, installToken: token }),
  });
  if (!response.ok) {
    return { ok: false as const, reason: `pair-${response.status}` };
  }
  const payload = (await response.json()) as { ok?: boolean };
  return { ok: Boolean(payload.ok) };
}
