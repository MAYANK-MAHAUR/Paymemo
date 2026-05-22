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

        try {
          const result = await deleteUserDatabase(walletAddress);
          const partialErrors =
            "partialErrors" in result ? (result.partialErrors ?? []) : [];
          if (partialErrors.length > 0) {
            return Response.json(
              {
                ok: false,
                deleted: false,
                error:
                  "Some tables could not be cleared. Check that Supabase env vars are set in Vercel and the schema is up to date.",
                walletAddress: walletAddress.toLowerCase(),
                partialErrors,
              },
              { status: 502 },
            );
          }
          return Response.json({ ok: true, ...result });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown database error.";
          return Response.json(
            {
              ok: false,
              error:
                "Database delete failed: " +
                message +
                ". If you're on Vercel, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars and redeploy.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
