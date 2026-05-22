/**
 * Robust amount parsers used across the dashboard, ledger and reports.
 *
 * Chain-watch records store amount as a human-readable string like
 * `"0.000001 ETH"` (the token symbol is baked in). The dApp's own /app/send
 * flow stores it as a clean numeric string like `"0.000001"`. Anywhere we
 * need to do math on the amount, we have to tolerate both shapes, or you
 * get `NaN ETH` rendered in tables.
 */

export function parseAmountNumber(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== "string") return 0;
  const trimmed = raw.replace(/,/g, "").trim();
  if (!trimmed) return 0;
  // Pull out the first numeric token (supports negatives, decimals, exponents).
  const match = trimmed.match(/-?\d+(\.\d+)?(e[+-]?\d+)?/i);
  if (!match) return 0;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Some chain-watch records also have the token symbol baked into the
 * amount string. If the row's separate `token` column is empty, fall
 * back to the inline symbol so the UI never shows just "0.0001 ".
 */
export function extractTokenSymbol(raw: unknown, fallback = "ETH"): string {
  if (typeof raw !== "string") return fallback;
  const match = raw.match(/[A-Za-z]{2,8}/);
  return match ? match[0].toUpperCase() : fallback;
}
