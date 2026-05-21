export const morphHoodi = {
  name: "Morph Hoodi Testnet",
  shortName: "Morph Hoodi",
  chainId: 2910,
  chainIdHex: "0xb5e",
  rpcUrl: "https://rpc-hoodi.morph.network",
  explorerUrl: "https://explorer-hoodi.morph.network",
  bridgeUrl: "https://bridge-hoodi.morph.network",
  faucetUrl: "https://morph-rails-hoodi.morph.network",
  currency: "ETH",
  rpcLimit: "600 req/min/IP",
};

export type MorphToken = {
  symbol: "ETH" | "USDC" | "WETH" | "BGB";
  name: string;
  decimals: number;
  type: "native" | "stable" | "token";
  coingeckoId: "ethereum" | "usd-coin" | "bitget-token";
  iconUrl: string;
  contractAddress?: string;
  envContractKey?: string;
  hoodiStatus: "native" | "official" | "env-required";
  note: string;
};

export const morphTokens: MorphToken[] = [
  {
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    type: "native",
    coingeckoId: "ethereum",
    iconUrl: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
    hoodiStatus: "native",
    note: "Native Morph Hoodi gas and payment token.",
  },
  {
    symbol: "USDC",
    name: "L2USDC",
    decimals: 6,
    type: "stable",
    coingeckoId: "usd-coin",
    iconUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    contractAddress: "0x1178341838B764dCfFA5BCEAb1d41443Fd71a227",
    envContractKey: "VITE_MORPH_USDC_ADDRESS",
    hoodiStatus: "official",
    note: "Official Morph Hoodi L2USDC contract from Morph docs.",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    type: "token",
    coingeckoId: "ethereum",
    iconUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
    contractAddress: "0x5300000000000000000000000000000000000011",
    envContractKey: "VITE_MORPH_WETH_ADDRESS",
    hoodiStatus: "official",
    note: "Morph Hoodi WETH predeploy.",
  },
  {
    symbol: "BGB",
    name: "Bitget Token",
    decimals: 18,
    type: "token",
    coingeckoId: "bitget-token",
    iconUrl: "https://assets.coingecko.com/coins/images/11610/small/icon_colour.png",
    envContractKey: "VITE_MORPH_BGB_ADDRESS",
    hoodiStatus: "env-required",
    note: "BGB is listed for Morph mainnet; set a Hoodi BGB contract env value before testnet transfers.",
  },
];

export function getMorphToken(symbol: string) {
  return morphTokens.find((token) => token.symbol === symbol.toUpperCase());
}

export function getMorphTokenContract(symbol: string) {
  const token = getMorphToken(symbol);
  if (!token || token.symbol === "ETH") return "";
  const envKey = token.envContractKey;
  const envContract = envKey ? ((import.meta.env[envKey] as string | undefined) ?? "") : "";
  return envContract || token.contractAddress || "";
}

export const hackathonTracks = [
  {
    title: "Payroll + B2B",
    fit: "Batch payouts with private accounting context for teams and vendors.",
    feature: "Batch payroll, invoice reconciliation, ledger exports",
  },
  {
    title: "SME Payments",
    fit: "Merchant payment records that explain settlement, fee, and customer context.",
    feature: "Payment links, customer memos, receipt vault",
  },
  {
    title: "FX Treasury",
    fit: "Swaps, bridges, and treasury moves that stay explainable after the fact.",
    feature: "Bridge/swap classification and chain-aware reporting",
  },
  {
    title: "x402 Agentic Payments",
    fit: "Agent payments with task, tool, policy, and explanation memory.",
    feature: "Agent spend ledger and review queue",
  },
];

export const morphBuildChecklist = [
  "Add Morph Hoodi Testnet to wallet",
  "Claim or bridge Hoodi ETH for test gas",
  "Create a direct PayMemo payment intent",
  "Capture a wallet-assist transaction from an external dApp",
  "Record an agent spend explanation",
  "Export the private ledger for the demo",
];

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
  isTrustWallet?: boolean;
  isBitKeep?: boolean;
  isBitget?: boolean;
  isBitgetWallet?: boolean;
  isBitgetProvider?: boolean;
  isOkxWallet?: boolean;
  isCoinbaseWallet?: boolean;
  isPhantom?: boolean;
  providers?: EthereumProvider[];
};

export type WalletOption = {
  id: string;
  name: string;
  rdns?: string;
  icon?: string;
  provider: EthereumProvider;
};

export type TransactionReceipt = {
  transactionHash: string;
  status?: "0x0" | "0x1";
  blockNumber?: string;
};

const SELECTED_WALLET_KEY = "paymemo:selected-wallet:v1";
let eip6963Providers: WalletOption[] = [];
let eip6963ListenerInstalled = false;

function installEip6963Listener() {
  if (typeof window === "undefined" || eip6963ListenerInstalled) return;
  eip6963ListenerInstalled = true;
  window.addEventListener("eip6963:announceProvider", ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    const provider = detail?.provider as EthereumProvider | undefined;
    if (!provider) return;
    const rdns = String(detail?.info?.rdns ?? "");
    const name = String(detail?.info?.name || rdns || "EVM Wallet");
    const id = `eip6963:${rdns || name}`;
    eip6963Providers = [
      ...eip6963Providers.filter((item) => item.id !== id),
      {
        id,
        name,
        rdns,
        icon: typeof detail?.info?.icon === "string" ? detail.info.icon : undefined,
        provider,
      },
    ];
  }) as EventListener);
}

function requestEip6963Providers() {
  if (typeof window === "undefined") return;
  installEip6963Listener();
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function providerName(provider: EthereumProvider, fallback: string) {
  if (provider.isRabby) return "Rabby";
  if (provider.isBitKeep || provider.isBitget || provider.isBitgetWallet || provider.isBitgetProvider)
    return "Bitget Wallet";
  if (provider.isTrust || provider.isTrustWallet) return "Trust Wallet";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isOkxWallet) return "OKX Wallet";
  if (provider.isPhantom) return "Phantom EVM";
  if (provider.isMetaMask) return "MetaMask";
  return fallback;
}

function addWalletOption(
  options: WalletOption[],
  seen: WeakSet<object>,
  id: string,
  fallbackName: string,
  provider?: EthereumProvider,
) {
  if (!provider || typeof provider !== "object" || seen.has(provider)) return;
  seen.add(provider);
  options.push({
    id,
    name: providerName(provider, fallbackName),
    provider,
  });
}

export function rememberSelectedWallet(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_WALLET_KEY, id);
}

export function readSelectedWallet() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SELECTED_WALLET_KEY) ?? "";
}

export async function discoverWalletProviders(waitMs = 700): Promise<WalletOption[]> {
  if (typeof window === "undefined") return [];
  requestEip6963Providers();
  if (waitMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, waitMs));
    // Bitget injects late on some installs; request a second announcement burst.
    requestEip6963Providers();
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }

  const win = window as Window & {
    ethereum?: EthereumProvider;
    rabby?: { ethereum?: EthereumProvider };
    bitkeep?: EthereumProvider & { ethereum?: EthereumProvider };
    bitget?: EthereumProvider & { ethereum?: EthereumProvider };
    bitgetWallet?: EthereumProvider & { ethereum?: EthereumProvider };
    bitgetwallet?: EthereumProvider & { ethereum?: EthereumProvider };
    bitKeep?: EthereumProvider & { ethereum?: EthereumProvider };
    trustwallet?: EthereumProvider & { ethereum?: EthereumProvider };
    trustWallet?: EthereumProvider & { ethereum?: EthereumProvider };
    phantom?: { ethereum?: EthereumProvider };
    okxwallet?: EthereumProvider & { ethereum?: EthereumProvider };
    coinbaseWalletExtension?: EthereumProvider & { ethereum?: EthereumProvider };
    BinanceChain?: EthereumProvider;
  };

  const options: WalletOption[] = [];
  const seen = new WeakSet<object>();

  eip6963Providers.forEach((item) =>
    addWalletOption(options, seen, item.id, item.name, item.provider),
  );

  if (Array.isArray(win.ethereum?.providers)) {
    win.ethereum.providers.forEach((provider, index) => {
      const fallback =
        provider?.isBitKeep ||
        provider?.isBitget ||
        provider?.isBitgetWallet ||
        provider?.isBitgetProvider
          ? "Bitget Wallet"
          : `Wallet ${index + 1}`;
      addWalletOption(options, seen, `ethereum.providers.${index}`, fallback, provider);
    });
  }

  // Bitget exposes the provider through several globals depending on extension version
  // and may inject after window load. Try every known surface.
  const bitgetCandidates: (EthereumProvider | undefined)[] = [
    win.bitget?.ethereum,
    win.bitget,
    win.bitgetWallet?.ethereum,
    win.bitgetWallet,
    win.bitgetwallet?.ethereum,
    win.bitgetwallet,
    win.bitKeep?.ethereum,
    win.bitKeep,
    win.bitkeep?.ethereum,
    win.bitkeep,
  ];
  for (const candidate of bitgetCandidates) {
    if (candidate && typeof candidate === "object") {
      addWalletOption(options, seen, "bitget", "Bitget Wallet", candidate);
      break;
    }
  }

  addWalletOption(options, seen, "window.ethereum", "Browser Wallet", win.ethereum);
  addWalletOption(options, seen, "rabby", "Rabby", win.rabby?.ethereum);
  addWalletOption(options, seen, "trust", "Trust Wallet", win.trustWallet?.ethereum ?? win.trustwallet?.ethereum);
  addWalletOption(options, seen, "phantom", "Phantom EVM", win.phantom?.ethereum);
  addWalletOption(options, seen, "okx", "OKX Wallet", win.okxwallet?.ethereum ?? win.okxwallet);
  addWalletOption(
    options,
    seen,
    "coinbase",
    "Coinbase Wallet",
    win.coinbaseWalletExtension?.ethereum ?? win.coinbaseWalletExtension,
  );
  addWalletOption(options, seen, "binance", "Binance Wallet", win.BinanceChain);

  const seenNames = new Set<string>();
  return options.filter((option) => {
    const key = option.name.trim().toLowerCase();
    if (!key || seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });
}

export function getEthereumProvider() {
  if (typeof window === "undefined") return null;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

export async function getSelectedEthereumProvider(providerId?: string) {
  const options = await discoverWalletProviders(providerId ? 50 : 200);
  const selectedId = providerId || readSelectedWallet();
  const selected = selectedId ? options.find((option) => option.id === selectedId) : null;
  return selected?.provider ?? options[0]?.provider ?? getEthereumProvider();
}

export async function addMorphHoodiToWallet(providerId?: string) {
  const ethereum = await getSelectedEthereumProvider(providerId);
  if (!ethereum) throw new Error("No browser wallet found");

  await ethereum.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: morphHoodi.chainIdHex,
        chainName: morphHoodi.name,
        nativeCurrency: {
          name: morphHoodi.currency,
          symbol: morphHoodi.currency,
          decimals: 18,
        },
        rpcUrls: [morphHoodi.rpcUrl],
        blockExplorerUrls: [morphHoodi.explorerUrl],
      },
    ],
  });
}

export async function switchToMorphHoodi(providerId?: string) {
  const ethereum = await getSelectedEthereumProvider(providerId);
  if (!ethereum) throw new Error("No browser wallet found");

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: morphHoodi.chainIdHex }],
    });
  } catch {
    await addMorphHoodiToWallet(providerId);
  }
}

export async function connectWallet(providerId?: string) {
  const ethereum = await getSelectedEthereumProvider(providerId);
  if (!ethereum) throw new Error("No browser wallet found");
  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  if (providerId) rememberSelectedWallet(providerId);
  await switchToMorphHoodi(providerId);
  return accounts[0] ?? "";
}

export function shortAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function parseUnits(value: string, decimals: number) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
}

export function toQuantity(value: bigint) {
  return `0x${value.toString(16)}`;
}

function pad32(hex: string) {
  return hex.replace(/^0x/, "").padStart(64, "0");
}

export function buildErc20TransferData(to: string, amount: string, decimals = 6) {
  if (!isAddress(to)) throw new Error("Recipient must be a full EVM address.");
  const units = parseUnits(amount, decimals);
  return `0xa9059cbb${pad32(to)}${pad32(toQuantity(units))}`;
}

export function buildErc20BalanceOfData(owner: string) {
  if (!isAddress(owner)) throw new Error("Owner must be a full EVM address.");
  return `0x70a08231${pad32(owner)}`;
}

export function formatUnits(value: bigint, decimals: number, maxFractionDigits = 6) {
  const scale = 10n ** BigInt(decimals);
  const whole = value / scale;
  const fraction = (value % scale).toString().padStart(decimals, "0").slice(0, maxFractionDigits);
  return `${whole}.${fraction}`.replace(/\.?0+$/, "") || "0";
}

export async function rpcCall<T = unknown>(method: string, params: unknown[] = []) {
  const response = await fetch(morphHoodi.rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) throw new Error("Morph RPC request failed.");
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message || "Morph RPC error.");
  return payload.result as T;
}

export async function getNativeBalance(address: string) {
  const result = await rpcCall<string>("eth_getBalance", [address, "latest"]);
  return formatUnits(BigInt(result || "0x0"), 18, 6);
}

export async function getErc20Balance({
  owner,
  tokenContract,
  decimals,
}: {
  owner: string;
  tokenContract: string;
  decimals: number;
}) {
  if (!isAddress(tokenContract)) return "";
  const result = await rpcCall<string>("eth_call", [
    {
      to: tokenContract,
      data: buildErc20BalanceOfData(owner),
    },
    "latest",
  ]);
  return formatUnits(BigInt(result || "0x0"), decimals, 6);
}

export async function sendNativePayment(from: string, to: string, amount: string) {
  const ethereum = await getSelectedEthereumProvider();
  if (!ethereum) throw new Error("No browser wallet found.");
  if (!isAddress(to)) throw new Error("Recipient must be a full EVM address.");

  return (await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to,
        value: toQuantity(parseUnits(amount, 18)),
      },
    ],
  })) as string;
}

export async function sendErc20Payment({
  from,
  tokenContract,
  to,
  amount,
  decimals = 6,
}: {
  from: string;
  tokenContract: string;
  to: string;
  amount: string;
  decimals?: number;
}) {
  const ethereum = await getSelectedEthereumProvider();
  if (!ethereum) throw new Error("No browser wallet found.");
  if (!isAddress(tokenContract)) throw new Error("Token contract is not configured.");

  return (await ethereum.request({
    method: "eth_sendTransaction",
    params: [
      {
        from,
        to: tokenContract,
        value: "0x0",
        data: buildErc20TransferData(to, amount, decimals),
      },
    ],
  })) as string;
}

export async function getTransactionReceipt(txHash: string) {
  return rpcCall<TransactionReceipt | null>("eth_getTransactionReceipt", [txHash]);
}

export async function waitForTransactionReceipt(
  txHash: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const intervalMs = options.intervalMs ?? 3_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const receipt = await getTransactionReceipt(txHash);
    if (receipt) return receipt;
    await new Promise((resolve) => {
      window.setTimeout(resolve, intervalMs);
    });
  }

  throw new Error("Timed out waiting for Morph confirmation.");
}
