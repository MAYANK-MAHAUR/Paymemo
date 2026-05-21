import { toast } from "sonner";

export const notify = {
  success(message: string, description?: string) {
    toast.success(message, description ? { description } : undefined);
  },
  error(message: string | unknown, description?: string) {
    const text = typeof message === "string" ? message : message instanceof Error ? message.message : "Something went wrong.";
    toast.error(text, description ? { description } : undefined);
  },
  info(message: string, description?: string) {
    toast(message, description ? { description } : undefined);
  },
  warn(message: string, description?: string) {
    toast.warning(message, description ? { description } : undefined);
  },
  walletRequired(message = "Please connect wallet before continuing.") {
    toast.error(message, {
      id: "wallet-required",
      description: "All wallet actions on PayMemo are testnet only.",
    });
  },
};

export type Notify = typeof notify;
