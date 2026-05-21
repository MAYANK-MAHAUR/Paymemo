import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { listExtensionPairings, pairExtensionInstall } from "@/lib/server/paymemo-db";
import { requireWalletAuth } from "@/lib/server/wallet-auth";
import { checkRateLimit } from "@/lib/server/rate-limit";

const pairSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  installToken: z.string().min(24),
});

export const Route = createFileRoute("/api/extension-pair")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get("wallet")?.toLowerCase();
        if (!walletAddress) {
          return Response.json({ error: "Missing wallet query parameter" }, { status: 400 });
        }

        const auth = await requireWalletAuth(request, walletAddress);
        if (!auth.ok) return auth.response;

        const pairings = await listExtensionPairings(walletAddress);
        return Response.json({ ok: true, pairings });
      },

      POST: async ({ request }: { request: Request }) => {
        const limited = checkRateLimit(request, { scope: "extension-pair-post", limit: 20 });
        if (!limited.ok) return limited.response;

        const body = await request.json().catch(() => null);
        const parsed = pairSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid extension pair payload", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const auth = await requireWalletAuth(request, parsed.data.walletAddress);
        if (!auth.ok) return auth.response;

        const pairing = await pairExtensionInstall(parsed.data.installToken, parsed.data.walletAddress);
        return Response.json({ ok: true, pairing });
      },
    },
  },
});
