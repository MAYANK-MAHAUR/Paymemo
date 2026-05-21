import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { normalizeRecord, payMemoRecordSchema } from "@/lib/paymemo-schema";
import {
  addExtensionRecord,
  isExtensionWalletPaired,
  listExtensionPairings,
  listExtensionRecords,
} from "@/lib/server/paymemo-db";
import { checkRateLimit } from "@/lib/server/rate-limit";

const extensionIntentSchema = payMemoRecordSchema.extend({
  method: z.string().optional(),
  origin: z.string().optional(),
});

function normalizeAddress(value: string | null | undefined) {
  const address = String(value || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(address) ? address : "";
}

async function ensureInstallTokenForWallet(
  request: Request,
  wallet: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (!wallet) return { ok: true };
  const pairings = await listExtensionPairings(wallet);
  if (!pairings.length) return { ok: true }; // No pairing recorded yet — first-touch trust.

  const token = request.headers.get("x-paymemo-install-token")?.trim();
  if (!token) {
    return {
      ok: false,
      response: Response.json(
        { error: "Missing extension install token for paired wallet." },
        { status: 401 },
      ),
    };
  }

  const ok = await isExtensionWalletPaired(token, wallet);
  if (!ok) {
    return {
      ok: false,
      response: Response.json(
        { error: "Install token is not paired with this wallet." },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}

export const Route = createFileRoute("/api/extension-intent")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const wallets = url.searchParams.getAll("wallet").flatMap((value) =>
          value
            .split(/[\s,]+/)
            .map((address) => normalizeAddress(address))
            .filter(Boolean),
        );

        const records = await listExtensionRecords();
        const scoped = wallets.length
          ? records.filter((record) => {
              const from = normalizeAddress(record.from ?? undefined);
              const to = normalizeAddress(record.to ?? undefined);
              return wallets.includes(from) || wallets.includes(to);
            })
          : records;

        return Response.json({
          ok: true,
          records: scoped,
          storage: "database",
          wallets,
        });
      },

      POST: async ({ request }: { request: Request }) => {
        const limited = checkRateLimit(request, { scope: "extension-intent-post", limit: 60 });
        if (!limited.ok) return limited.response;

        const body = await request.json().catch(() => null);
        const parsed = extensionIntentSchema.safeParse(body);

        if (!parsed.success) {
          return Response.json(
            { error: "Invalid extension intent", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const fromWallet = normalizeAddress(parsed.data.from);
        if (fromWallet) {
          const check = await ensureInstallTokenForWallet(request, fromWallet);
          if (!check.ok) return check.response;
        }

        const record = normalizeRecord({
          ...parsed.data,
          from: parsed.data.from ? parsed.data.from.toLowerCase() : parsed.data.from,
          to: parsed.data.to ? parsed.data.to.toLowerCase() : parsed.data.to,
          mode: "wallet-assist",
          source: parsed.data.origin ?? parsed.data.source ?? "browser-extension",
        });

        await addExtensionRecord(record);

        return Response.json({
          ok: true,
          record,
          storage: "database",
        });
      },
    },
  },
});
