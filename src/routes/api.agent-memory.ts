import { createFileRoute } from "@tanstack/react-router";
import { agentMemoryRequestSchema, normalizeRecord } from "@/lib/paymemo-schema";
import { addAgentMemoryRecord, listAgentMemoryRecords } from "@/lib/server/paymemo-db";
import { checkRateLimit } from "@/lib/server/rate-limit";

export const Route = createFileRoute("/api/agent-memory")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const agentId = url.searchParams.get("agentId");
        const taskId = url.searchParams.get("taskId");
        const records = await listAgentMemoryRecords({ agentId, taskId });

        return Response.json({
          name: "PayMemo Agent Memory API",
          description: "Agents call this before or after spending to explain why money moved.",
          records,
          count: records.length,
          storage: "database",
          endpoints: {
            createIntent: "POST /api/agent-memory",
            listAll: "GET /api/agent-memory",
            filterByAgent: "GET /api/agent-memory?agentId=research-agent",
            filterByTask: "GET /api/agent-memory?taskId=btc-brief",
          },
          example: {
            agentId: "research-agent",
            taskId: "btc-brief",
            tool: "SignalBase API",
            paidFor: "Market data API call",
            reason: "Needed live order book data to complete the BTC research task.",
            to: "0xAPIWallet",
            amount: "0.20",
            token: "ETH",
            policy: "under-limit",
          },
        });
      },

      POST: async ({ request }: { request: Request }) => {
        const limited = checkRateLimit(request, { scope: "agent-memory-post", limit: 30 });
        if (!limited.ok) return limited.response;

        const body = await request.json().catch(() => null);
        const parsed = agentMemoryRequestSchema.safeParse(body);

        if (!parsed.success) {
          return Response.json(
            { error: "Invalid agent memory payload", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const payload = parsed.data;
        const needsReview = payload.policy === "needs-review";
        const record = normalizeRecord({
          mode: "agent",
          status: needsReview ? "needs-review" : "intent",
          to: payload.to,
          amount: payload.amount,
          token: payload.token,
          category: payload.paidFor.toLowerCase().includes("api")
            ? "API Payment"
            : "Agent Task Payment",
          counterparty: payload.tool,
          note: payload.reason,
          taskId: payload.taskId,
          tool: payload.tool,
          agentId: payload.agentId,
          agentReason: payload.reason,
          txHash: payload.txHash,
          source: "agent-api",
        });

        await addAgentMemoryRecord(record);

        return Response.json({
          ok: true,
          record,
          storage: "database",
          policy: payload.policy,
          approvalRequired: needsReview,
          humanReadable: `Agent ${payload.agentId} paid ${payload.amount} ${payload.token} for ${payload.paidFor}: ${payload.reason}`,
        });
      },
    },
  },
});
