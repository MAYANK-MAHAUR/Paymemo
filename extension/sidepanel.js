const categories = [
  "Vendor Payment",
  "Invoice Payment",
  "Business Expense",
  "Payroll",
  "Personal",
  "Transfer to Self",
  "Refund",
  "Subscription",
  "Agent Task Payment",
  "Other",
];

let records = [];
let settings = {};
let panelStatus = "Detected Morph transactions without a memo stay in Needs Review until the user explains them.";
const urlParams = new URLSearchParams(location.search);
const focusedRecordId = urlParams.get("record") || "";
const popupMode = urlParams.get("popup") === "1";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response || {}));
  });
}

function shorten(value) {
  if (!value) return "-";
  const text = String(value);
  if (text.length <= 18) return text;
  return `${text.slice(0, 10)}...${text.slice(-8)}`;
}

function normalizeAddress(value) {
  const address = String(value || "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(address) ? address : "";
}

function normalizeAddresses(addresses) {
  const values = Array.isArray(addresses) ? addresses : String(addresses || "").split(/[\s,]+/);
  return values.map(normalizeAddress).filter(Boolean);
}

function chainWatchRecords(all) {
  const chainRecords = all.filter((record) => record.provider === "Morph Chain Watch");
  const visibleRecords = popupMode && focusedRecordId
    ? chainRecords.filter((record) => record.id === focusedRecordId)
    : chainRecords;

  return visibleRecords
    .sort((a, b) => {
      if (focusedRecordId && a.id === focusedRecordId) return -1;
      if (focusedRecordId && b.id === focusedRecordId) return 1;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
}

function card(record) {
  const category = record.category || "Other";
  const actionMarkup = popupMode
    ? `<button class="primary" data-sync="${escapeHtml(record.id)}" type="button">Save & sync</button>`
    : `
        <button class="secondary" data-save="${escapeHtml(record.id)}" type="button">Save</button>
        <button class="primary" data-sync="${escapeHtml(record.id)}" type="button">Save & sync</button>
      `;
  return `
    <section class="tx-card" data-record="${escapeHtml(record.id)}">
      <div class="tx-top">
        <div>
          <span class="mini-label">Morph Hoodi chain watch</span>
          <div class="amount">${escapeHtml(record.amount || "contract call")}</div>
          <p class="hint">${escapeHtml(record.txHash ? `Tx ${shorten(record.txHash)}` : "Waiting for a detected Morph tx.")}</p>
        </div>
        <span class="pill">${escapeHtml(record.status || "needs-review")}</span>
      </div>
      <div class="meta">
        <div><span class="mini-label">From</span><strong>${escapeHtml(shorten(record.from))}</strong></div>
        <div><span class="mini-label">To</span><strong>${escapeHtml(shorten(record.to))}</strong></div>
      </div>
      <input data-field="category" type="hidden" value="${escapeHtml(category)}" />
      <div class="chips">
        ${categories
          .map(
            (item) =>
              `<button type="button" class="${item === category ? "active" : ""}" data-category="${escapeHtml(item)}">${escapeHtml(item)}</button>`,
          )
          .join("")}
      </div>
      <div class="field-grid">
        <label>Counterparty<input data-field="counterparty" value="${escapeHtml(record.counterparty || record.to || "")}" /></label>
        <label>Private note<textarea data-field="note">${escapeHtml(record.note || "")}</textarea></label>
        <label>Invoice, project, or task<input data-field="project" value="${escapeHtml(record.project || "")}" /></label>
      </div>
      <div class="actions" style="padding: 10px 0 0; border-top: 0; background: transparent; ${popupMode ? "grid-template-columns: 1fr;" : ""}">
        ${actionMarkup}
      </div>
    </section>
  `;
}

function render() {
  const root = document.querySelector("#app");
  const latest = records[0];
  const watchedAddresses = normalizeAddresses(settings.watchedAddresses);
  const watchedLabels = settings.watchedWalletLabels || {};
  const showWatcher = !popupMode;
  const watchedList = watchedAddresses.length
    ? watchedAddresses
        .slice(0, 4)
        .map(
          (address) =>
            `<span class="watch-pill">${escapeHtml(watchedLabels[address] || shorten(address))}</span>`,
        )
        .join("")
    : `<span class="watch-pill muted">No wallet yet</span>`;
  root.innerHTML = `
    <div class="shell">
      <header>
        <span class="logo">P</span>
        <div>
          <span class="eyebrow">${popupMode ? "PayMemo transaction prompt" : "PayMemo Side Panel"}</span>
          <h1>${popupMode ? "Transaction detected" : "Morph tx memory"}</h1>
          <p class="subtitle">${popupMode ? "Add the category, counterparty, note, and project for this Morph transaction." : "Listen to a wallet address. When any incoming or outgoing Morph tx is detected, PayMemo pops up and asks what it was for."}</p>
        </div>
      </header>
      <div class="scroll">
        ${showWatcher ? `<section class="tx-card watcher-card">
          <div class="tx-top">
            <div>
              <span class="mini-label">Watcher</span>
              <div class="amount">${settings.chainWatchEnabled ? "Live" : "Paused"}</div>
              <p class="hint">Watching ${watchedAddresses.length} Morph address${watchedAddresses.length === 1 ? "" : "es"} for incoming and outgoing transactions.</p>
            </div>
            <button class="primary" id="scanNow" type="button">Scan</button>
          </div>
          <div class="watch-pills">${watchedList}</div>
          <div class="field-grid watch-form">
            <label>Wallet address<input id="watchAddress" placeholder="0x..." /></label>
            <label>Wallet name<input id="watchLabel" placeholder="Main wallet" /></label>
          </div>
          <div class="panel-actions">
            <button class="primary" id="startWatch" type="button">Start listening</button>
          </div>
        </section>` : ""}
        ${latest ? records.map(card).join("") : `<div class="empty">${popupMode ? "Loading detected transaction..." : "No Morph chain-watch records yet. Send a Morph Hoodi tx from a watched wallet and PayMemo will ask for the memo."}</div>`}
      </div>
      <div class="status-line">${escapeHtml(panelStatus)}</div>
    </div>
  `;

  root.querySelector("#scanNow")?.addEventListener("click", async () => {
    await sendMessage({ type: "PAYMEMO_SCAN_MORPH_NOW" });
    await load();
  });

  root.querySelector("#startWatch")?.addEventListener("click", async () => {
    const address = normalizeAddress(root.querySelector("#watchAddress")?.value);
    const label = root.querySelector("#watchLabel")?.value.trim();
    if (!address) {
      panelStatus = "Paste a valid 0x wallet address to start listening.";
      render();
      return;
    }

    const existing = normalizeAddresses(settings.watchedAddresses);
    const watchedWalletLabels = { ...(settings.watchedWalletLabels || {}) };
    if (label) watchedWalletLabels[address] = label;
    const response = await sendMessage({
      type: "PAYMEMO_SAVE_SETTINGS",
      settings: {
        ...settings,
        chainWatchEnabled: true,
        autoOpenChainWatchPrompt: true,
        watchedAddresses: [address, ...existing.filter((item) => item !== address)],
        watchedWalletLabels,
      },
    });

    if (!response.ok) {
      panelStatus = response.error || "Could not save this watched wallet.";
      render();
      return;
    }

    panelStatus = `Listening for Morph transactions on ${shorten(address)}. PayMemo will pop up when one appears.`;
    await sendMessage({ type: "PAYMEMO_SCAN_MORPH_NOW" });
    await load();
  });

  root.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const cardRoot = button.closest("[data-record]");
      cardRoot.querySelector('[data-field="category"]').value = button.dataset.category;
      cardRoot
        .querySelectorAll("[data-category]")
        .forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  root.querySelectorAll("[data-save], [data-sync]").forEach((button) => {
    button.addEventListener("click", async () => {
      const originalText = button.textContent;
      button.textContent = button.dataset.sync ? "Syncing..." : "Saving...";
      button.disabled = true;
      const cardRoot = button.closest("[data-record]");
      const id = cardRoot.dataset.record;
      const source = records.find((item) => item.id === id);
      const patch = {
        category: cardRoot.querySelector('[data-field="category"]').value.trim() || "Other",
        counterparty: cardRoot.querySelector('[data-field="counterparty"]').value.trim(),
        note: cardRoot.querySelector('[data-field="note"]').value.trim(),
        project: cardRoot.querySelector('[data-field="project"]').value.trim(),
        status: source?.status === "failed" ? "failed" : "confirmed",
        provider: "Morph Chain Watch",
        method: "morph-chain-watch",
        reviewedAt: new Date().toISOString(),
      };
      const update = await sendMessage({ type: "PAYMEMO_UPDATE_RECORD", id, patch });
      if (!update.ok) {
        panelStatus = update.error || "Could not save this memo locally.";
        button.textContent = originalText;
        button.disabled = false;
        await load();
        return;
      }
      if (button.dataset.sync) {
        const synced = await sendMessage({ type: "PAYMEMO_SYNC_RECORD", id, removeLocal: true });
        panelStatus = synced.ok
          ? "Saved and synced. This transaction was removed from extension storage and is now in the dApp Review tab."
          : synced.error || "Saved locally, but dApp sync failed.";
        if (popupMode) window.close();
      } else {
        panelStatus = "Saved locally. Use Save & sync to send it to the dApp Review tab.";
      }
      await load();
    });
  });
}

async function load() {
  const state = await sendMessage({ type: "PAYMEMO_GET_STATE" });
  settings = state.settings || {};
  records = chainWatchRecords(state.records || []);
  render();
}

chrome.runtime.onMessage.addListener((message) => {
  if (
    message?.type === "PAYMEMO_RECORDS_UPDATED" ||
    message?.type === "PAYMEMO_CHAIN_WATCH_FOUND"
  ) {
    void load();
  }
});

setInterval(() => {
  if (settings.chainWatchEnabled) void sendMessage({ type: "PAYMEMO_SCAN_MORPH_NOW" }).then(load);
}, 3500);

void load();
