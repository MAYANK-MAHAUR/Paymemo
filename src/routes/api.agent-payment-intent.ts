import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  listEncryptedDomainRecords,
  upsertEncryptedDomainRecord,
} from "@/lib/server/paymemo-db";
import { createRecordId } from "@/lib/paymemo-schema";
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

const encryptedAgentIntentSchema = z.object({
  id: z.string().min(1),
  walletAddress: z.string().min(1),
  type: z.literal("agent-payment-intent").default("agent-payment-intent"),
  publicData: z.record(z.unknown()),
  encryptedMetadata: encryptedMetadataSchema,
  status: z.enum(["intent", "needs-review", "approved", "pending_chain", "confirmed", "failed"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const plainAgentIntentSchema = z.object({
  ownerWallet: z.string().min(1),
  agentId: z.string().min(1),
  taskId: z.string().min(1),
  tool: z.string().optional(),
  to: z.string().min(1),
  amount: z.string().min(1),
  token: z.string().default("ETH"),
  reason: z.string().min(1),
  policy: z.enum(["approved", "under-limit", "needs-review"]).default("under-limit"),
  txHash: z.string().optional(),
});

export const Route = createFileRoute("/api/agent-payment-intent")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const walletAddress = url.searchParams.get("wallet");

        if (!walletAddress) {
          return Response.json({
            name: "PayMemo Agent Payment Intent API",
            description:
              "Create encrypted agent spend intents. Use encrypted payloads from the dApp for privacy.",
            encryptedCreate: "POST /api/agent-payment-intent",
            query: "GET /api/agent-payment-intent?wallet=0x...",
          });
        }

        const auth = await requireWalletAuth(request, walletAddress);
        if (!auth.ok) return auth.response;

        const records = await listEncryptedDomainRecords(walletAddress, "agent-payment-intent");
        return Response.json({ ok: true, records, storage: "database" });
      },

      POST: async ({ request }: { request: Request }) => {
        const body = await request.json().catch(() => null);
        const encrypted = encryptedAgentIntentSchema.safeParse(body);

        if (encrypted.success) {
          const auth = await requireWalletAuth(request, encrypted.data.walletAddress);
          if (!auth.ok) return auth.response;

          try {
            const record = await upsertEncryptedDomainRecord(encrypted.data);
            return Response.json({ ok: true, record, storage: "database" });
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to save agent payment intent";
            const status = message.toLowerCase().includes("owned by a different wallet") ? 403 : 500;
            return Response.json({ error: message }, { status });
          }
        }

        const plain = plainAgentIntentSchema.safeParse(body);
        if (!plain.success) {
          return Response.json(
            {
              error: "Invalid agent payment intent payload",
              issues: encrypted.error.flatten(),
            },
            { status: 400 },
          );
        }

        return Response.json(
          {
            error: "Encrypted payload required",
            id: createRecordId("agent_intent"),
            message:
              "Agent payment reasons must be encrypted client-side before storage. Use the dApp vault or agent client with encryption support.",
            publicPreview: {
              ownerWallet: plain.data.ownerWallet,
              agentId: plain.data.agentId,
              taskId: plain.data.taskId,
              to: plain.data.to,
              amount: plain.data.amount,
              token: plain.data.token,
              policy: plain.data.policy,
              txHash: plain.data.txHash,
            },
          },
          { status: 422 },
        );
      },
    },
  },
});
