import { verifyMessage } from "viem";
import { PAYMEMO_UNLOCK_MESSAGE } from "@/lib/crypto-vault";

export async function requireWalletAuth(request: Request, expectedWallet?: string | null) {
  const walletAddress = request.headers.get("x-paymemo-wallet")?.toLowerCase();
  const signature = request.headers.get("x-paymemo-signature");

  if (!walletAddress || !signature) {
    return {
      ok: false as const,
      response: Response.json(
        { error: "Wallet authorization required. Unlock the PayMemo vault first." },
        { status: 401 },
      ),
    };
  }

  if (expectedWallet && expectedWallet.toLowerCase() !== walletAddress) {
    return {
      ok: false as const,
      response: Response.json({ error: "Wallet authorization mismatch." }, { status: 403 }),
    };
  }

  const valid = await verifyMessage({
    address: walletAddress as `0x${string}`,
    message: PAYMEMO_UNLOCK_MESSAGE,
    signature: signature as `0x${string}`,
  }).catch(() => false);

  if (!valid) {
    return {
      ok: false as const,
      response: Response.json({ error: "Invalid wallet authorization signature." }, { status: 401 }),
    };
  }

  return { ok: true as const, walletAddress };
}
