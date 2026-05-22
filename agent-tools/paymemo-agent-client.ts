export type AgentPaymentIntentInput = {
  agentId: string;
  taskId: string;
  tool?: string;
  paidFor: string;
  reason: string;
  to: string;
  amount: string;
  token?: string;
  policy?: "approved" | "under-limit" | "needs-review";
  txHash?: string;
};

export async function createAgentPaymentIntent(
  input: AgentPaymentIntentInput,
  baseUrl = "https://paymemo.vercel.app",
) {
  const response = await fetch(`${baseUrl}/api/agent-memory`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`PayMemo agent memory API failed: ${response.status}`);
  }

  return response.json();
}

export async function createEncryptedAgentPaymentIntent(
  encryptedRecord: unknown,
  baseUrl = "https://paymemo.vercel.app",
) {
  const response = await fetch(`${baseUrl}/api/agent-payment-intent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(encryptedRecord),
  });

  if (!response.ok) {
    throw new Error(`PayMemo encrypted agent payment intent API failed: ${response.status}`);
  }

  return response.json();
}

export async function listEncryptedAgentPaymentIntents(
  walletAddress: string,
  baseUrl = "https://paymemo.vercel.app",
) {
  const url = new URL("/api/agent-payment-intent", baseUrl);
  url.searchParams.set("wallet", walletAddress);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PayMemo encrypted agent intent lookup failed: ${response.status}`);
  }

  return response.json();
}

export async function listAgentPaymentMemory(
  filters: { agentId?: string; taskId?: string } = {},
  baseUrl = "https://paymemo.vercel.app",
) {
  const url = new URL("/api/agent-memory", baseUrl);
  if (filters.agentId) url.searchParams.set("agentId", filters.agentId);
  if (filters.taskId) url.searchParams.set("taskId", filters.taskId);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PayMemo agent memory lookup failed: ${response.status}`);
  }

  return response.json();
}

export function buildAgentSpendReason(input: {
  agentName: string;
  amount: string;
  token?: string;
  paidFor: string;
  taskId: string;
  tool?: string;
}) {
  const token = input.token || "USDC";
  const tool = input.tool ? ` through ${input.tool}` : "";
  return `${input.agentName} paid ${input.amount} ${token}${tool} for ${input.paidFor} on task ${input.taskId}.`;
}
