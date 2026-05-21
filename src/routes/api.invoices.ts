import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  listEncryptedDomainRecords,
  upsertEncryptedDomainRecord,
} from "@/lib/server/paymemo-db";
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

const invoiceRecordSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  type: z.literal("invoice").default("invoice"),
  publicData: z.record(z.unknown()),
  encryptedMetadata: encryptedMetadataSchema,
  status: z.enum(["draft", "sent", "paid", "cancelled"]).default("draft"),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const Route = createFileRoute("/api/invoices")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get("wallet");

        if (!walletAddress) {
          return Response.json({ error: "Missing wallet query parameter" }, { status: 400 });
        }

        const auth = await requireWalletAuth(request, walletAddress);
        if (!auth.ok) return auth.response;

        const records = await listEncryptedDomainRecords(walletAddress, "invoice");
        return Response.json({ ok: true, records, storage: "database" });
      },

      POST: async ({ request }: { request: Request }) => {
        const body = await request.json().catch(() => null);
        const parsed = invoiceRecordSchema.safeParse(body);

        if (!parsed.success) {
          return Response.json(
            { error: "Invalid encrypted invoice record", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const auth = await requireWalletAuth(request, parsed.data.walletAddress);
        if (!auth.ok) return auth.response;

        try {
          const record = await upsertEncryptedDomainRecord(parsed.data);
          return Response.json({ ok: true, record, storage: "database" });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to save invoice";
          const status = message.toLowerCase().includes("owned by a different wallet") ? 403 : 500;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
