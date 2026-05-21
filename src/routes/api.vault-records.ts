import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteVaultRecords, listVaultRecords, upsertVaultRecord } from "@/lib/server/paymemo-db";
import { paymentModeSchema, recordStatusSchema } from "@/lib/paymemo-schema";
import { requireWalletAuth } from "@/lib/server/wallet-auth";

const encryptedMetadataSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal("AES-GCM"),
  kdf: z.literal("SHA-256(wallet-signature)"),
  walletAddress: z.string().min(1),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  createdAt: z.string().min(1),
});

const publicRecordSchema = z.object({
  id: z.string().min(1),
  mode: paymentModeSchema,
  status: recordStatusSchema,
  chainId: z.number(),
  chainName: z.string().min(1),
  txHash: z.string().optional(),
  from: z.string().optional(),
  to: z.string().min(1),
  amount: z.string().min(1),
  token: z.string().min(1),
  source: z.string().optional(),
  createdAt: z.string().min(1),
});

const storedRecordSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  publicRecord: publicRecordSchema,
  encryptedMetadata: encryptedMetadataSchema,
  syncStatus: z.enum(["local", "synced", "sync-failed"]).default("local"),
  updatedAt: z.string().min(1),
});

export const Route = createFileRoute("/api/vault-records")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get("wallet")?.toLowerCase();

        if (!walletAddress) {
          return Response.json(
            {
              name: "PayMemo Encrypted Vault Store",
              description:
                "Demo server store for encrypted blobs. Sensitive metadata is never accepted in plaintext here.",
              query: "GET /api/vault-records?wallet=0x...",
            },
            { status: 400 },
          );
        }

        const auth = await requireWalletAuth(request, walletAddress);
        if (!auth.ok) return auth.response;

        const records = await listVaultRecords(walletAddress);

        return Response.json({ ok: true, records, storage: "database" });
      },

      POST: async ({ request }: { request: Request }) => {
        const body = await request.json().catch(() => null);
        const parsed = storedRecordSchema.safeParse(body);

        if (!parsed.success) {
          return Response.json(
            { error: "Invalid encrypted vault record", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const auth = await requireWalletAuth(request, parsed.data.walletAddress);
        if (!auth.ok) return auth.response;

        try {
          const record = await upsertVaultRecord(parsed.data);
          return Response.json({ ok: true, record, storage: "database" });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to save vault record";
          const status = message.toLowerCase().includes("owned by a different wallet") ? 403 : 500;
          return Response.json({ error: message }, { status });
        }
      },

      DELETE: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get("wallet")?.toLowerCase();

        if (!walletAddress) {
          return Response.json({ error: "Missing wallet query parameter" }, { status: 400 });
        }

        const auth = await requireWalletAuth(request, walletAddress);
        if (!auth.ok) return auth.response;

        const remaining = await deleteVaultRecords(walletAddress);
        return Response.json({ ok: true, deleted: true, remaining });
      },
    },
  },
});
