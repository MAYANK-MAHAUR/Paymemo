import { z } from "zod";

export const payMemoCategories = [
  "Payroll",
  "Vendor Payment",
  "Invoice",
  "Invoice Payment",
  "Bridge",
  "Bridge Out",
  "Bridge In",
  "Swap",
  "Business Expense",
  "Refund",
  "Personal",
  "Transfer to Self",
  "Income",
  "Subscription",
  "API Payment",
  "Agent Task Payment",
  "Tool Usage",
  "Faucet",
  "Other",
] as const;

export const paymentModeSchema = z.enum(["direct", "wallet-assist", "agent"]);
export const recordStatusSchema = z.enum([
  "intent",
  "pending_signature",
  "pending_chain",
  "signed",
  "confirmed",
  "failed",
  "rejected",
  "needs-review",
]);

export const payMemoRecordSchema = z.object({
  id: z.string().optional(),
  mode: paymentModeSchema,
  status: recordStatusSchema.default("intent"),
  chainId: z.number().default(2910),
  chainName: z.string().default("Morph Hoodi Testnet"),
  txHash: z.string().optional(),
  from: z.string().optional(),
  to: z.string().min(1),
  amount: z.string().min(1),
  token: z.string().default("ETH"),
  category: z.enum(payMemoCategories),
  counterparty: z.string().optional(),
  note: z.string().optional(),
  project: z.string().optional(),
  invoiceRef: z.string().optional(),
  taskId: z.string().optional(),
  tool: z.string().optional(),
  agentId: z.string().optional(),
  agentReason: z.string().optional(),
  source: z.string().optional(),
  provider: z.string().optional(),
  origin: z.string().optional(),
  pageTitle: z.string().optional(),
  method: z.string().optional(),
  rawValue: z.string().optional(),
  callData: z.string().optional(),
  tokenContract: z.string().optional(),
  transactionType: z.enum(["native", "erc20", "contract-call"]).optional(),
  direction: z.enum(["incoming", "outgoing"]).optional(),
  blockNumber: z.string().optional(),
  confirmedAt: z.string().optional(),
  detectionTiming: z.string().optional(),
  reviewedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const agentMemoryRequestSchema = z.object({
  agentId: z.string().min(1),
  taskId: z.string().min(1),
  tool: z.string().optional(),
  paidFor: z.string().min(1),
  reason: z.string().min(1),
  to: z.string().min(1),
  amount: z.string().min(1),
  token: z.string().default("ETH"),
  policy: z.enum(["approved", "under-limit", "needs-review"]).default("under-limit"),
  txHash: z.string().optional(),
});

export type PayMemoRecordInput = z.input<typeof payMemoRecordSchema>;
export type PayMemoRecord = z.output<typeof payMemoRecordSchema>;
export type AgentMemoryRequest = z.infer<typeof agentMemoryRequestSchema>;

export function createRecordId(prefix = "pm") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function normalizeRecord(input: PayMemoRecordInput): PayMemoRecord {
  return payMemoRecordSchema.parse({
    ...input,
    id: input.id ?? createRecordId(),
    createdAt: input.createdAt ?? new Date().toISOString(),
  });
}
