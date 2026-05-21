const appUrlInput = document.querySelector("#appUrl");
const rpcUrlInput = document.querySelector("#rpcUrl");
const chainWatchInput = document.querySelector("#chainWatchEnabled");
const chainWatchText = document.querySelector("#chainWatchText");
const watchedAddressesInput = document.querySelector("#watchedAddresses");
const autoOpenChainWatchPromptInput = document.querySelector("#autoOpenChainWatchPrompt");
const settingsStatus = document.querySelector("#settingsStatus");

let currentSettings = {};

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response || {}));
  });
}

function parseWatchedWalletLines(value) {
  const labels = {};
  const addresses = [];
  String(value || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/0x[a-fA-F0-9]{40}/);
      if (!match) return;
      const address = match[0].toLowerCase();
      const label = line
        .replace(match[0], "")
        .replace(/[|,\-:]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!addresses.includes(address)) addresses.push(address);
      if (label) labels[address] = label;
    });
  return { addresses, labels };
}

function formatWatchedWallets(settings = {}) {
  const labels = settings.watchedWalletLabels || {};
  const addresses = Array.isArray(settings.watchedAddresses)
    ? settings.watchedAddresses
    : String(settings.watchedAddresses || "").split(/[\s,]+/);
  return addresses
    .map((address) => String(address || "").trim().toLowerCase())
    .filter((address) => /^0x[a-f0-9]{40}$/.test(address))
    .map((address) => (labels[address] ? `${labels[address]} | ${address}` : address))
    .join("\n");
}

function applySettings(settings) {
  currentSettings = settings;
  appUrlInput.value = settings.appUrl || "";
  rpcUrlInput.value = settings.rpcUrl || "";
  chainWatchInput.checked = Boolean(settings.chainWatchEnabled);
  chainWatchText.textContent = settings.chainWatchEnabled ? "Watching Morph" : "Paused";
  watchedAddressesInput.value = formatWatchedWallets(settings);
  autoOpenChainWatchPromptInput.checked = settings.autoOpenChainWatchPrompt !== false;
}

async function load() {
  const response = await sendMessage({ type: "PAYMEMO_GET_STATE" });
  applySettings(response.settings || {});
  const watchState = response.watchState || {};
  settingsStatus.textContent = watchState.updatedAt
    ? `Last scan ${new Date(watchState.updatedAt).toLocaleString()}.`
    : "Ready. Add wallets and enable watching.";
}

async function save() {
  const watched = parseWatchedWalletLines(watchedAddressesInput.value);
  const response = await sendMessage({
    type: "PAYMEMO_SAVE_SETTINGS",
    settings: {
      ...currentSettings,
      appUrl: appUrlInput.value.trim(),
      rpcUrl: rpcUrlInput.value.trim(),
      chainWatchEnabled: chainWatchInput.checked,
      watchedAddresses: watched.addresses,
      watchedWalletLabels: watched.labels,
      autoOpenChainWatchPrompt: autoOpenChainWatchPromptInput.checked,
    },
  });
  applySettings(response.settings || {});
  settingsStatus.textContent = response.ok
    ? `Saved ${watched.addresses.length} watched wallet${watched.addresses.length === 1 ? "" : "s"}.`
    : response.error || "Could not save settings.";
}

chainWatchInput.addEventListener("change", () => void save());
document.querySelector("#saveSettings").addEventListener("click", () => void save());

document.querySelector("#scanMorphNow").addEventListener("click", async () => {
  settingsStatus.textContent = "Scanning Morph Hoodi...";
  const response = await sendMessage({ type: "PAYMEMO_SCAN_MORPH_NOW" });
  const result = response.result || {};
  settingsStatus.textContent = response.ok
    ? `Scanned blocks ${result.fromBlock ?? "-"}-${result.latestBlock ?? "-"}; found ${result.found ?? 0}.`
    : response.error || "Scan failed.";
});

document.querySelector("#openSidePanel").addEventListener("click", async () => {
  const response = await sendMessage({ type: "PAYMEMO_OPEN_SIDE_PANEL" });
  settingsStatus.textContent = response.ok ? "Side panel opened." : response.error || "Open from toolbar.";
});

document.querySelector("#openReview").addEventListener("click", () => {
  const url = `${(currentSettings.appUrl || "http://127.0.0.1:5174").replace(/\/$/, "")}/app/review`;
  chrome.tabs.create({ url });
});

void load();
