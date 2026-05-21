import { createFileRoute } from "@tanstack/react-router";
import { deleteUserDatabase } from "@/lib/server/paymemo-db";
import { requireWalletAuth } from "@/lib/server/wallet-auth";

export const Route = createFileRoute("/api/database-reset")({
  server: {
    handlers: {
      DELETE: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get("wallet")?.toLowerCase();

        if (!walletAddress) {
          return Response.json({ error: "Missing wallet query parameter" }, { status: 400 });
        }

        const auth = await requireWalletAuth(request, walletAddress);
        if (!auth.ok) return auth.response;

        const result = await deleteUserDatabase(walletAddress);
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
