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
let panelStatus = "Fill in the memo and save — the record goes straight to your dashboard's Completed tab.";
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

  // PRESERVE user input across re-renders. Memo fields and category chips
  // are inside `.tx-card` so a full innerHTML rebuild would wipe whatever
  // the user is typing. Snapshot + restore around the render.
  const preservedInputs = new Map();
  root.querySelectorAll("input, textarea").forEach((el) => {
    if (el.dataset.field || el.id) {
      const k = el.dataset.recordField
        ? `${el.dataset.recordField}:${el.dataset.field}`
        : el.id || el.dataset.field;
      preservedInputs.set(k, { value: el.value });
    }
  });
  const previouslyFocusedId = document.activeElement?.id || "";

  // The sidepanel is now capture-only: detected tx → fill memo → save.
  // No wallet watcher form, no "Morph tx memory" review surface — that's
  // what /app/review on the dApp is for. The header just frames the
  // single transaction prompt.
  const latest = records[0];
  root.innerHTML = `
    <div class="shell">
      <header>
        <img class="logo" src="icons/icon-48.png" width="40" height="40" alt="PayMemo" />
        <div>
          <span class="eyebrow">PayMemo capture</span>
          <h1>Tag this transaction</h1>
          <p class="subtitle">Add the category and a private note. Saved memos go straight to your dashboard's Completed tab — encrypted in your vault.</p>
        </div>
      </header>
      <div class="scroll">
        ${
          latest
            ? records.map(card).join("")
            : `<div class="empty">No detected transactions yet. The next Morph Hoodi tx on a watched wallet will appear here automatically.</div>`
        }
      </div>
      <div class="status-line">${escapeHtml(panelStatus)}</div>
    </div>
  `;

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
          ? "Saved. The memo is now in your dashboard's Completed tab."
          : synced.error || "Saved locally, but dApp sync failed.";
        if (popupMode) window.close();
      } else {
        panelStatus = "Saved locally. Click Save & sync to push it to the dashboard.";
      }
      await load();
    });
  });

  // Restore any input values + focus that existed before this re-render.
  // This is what keeps the wallet-address field stable while the 3.5s
  // chain-watch tick rebuilds the panel.
  preservedInputs.forEach((snapshot, id) => {
    const el = root.querySelector(`#${id}`);
    if (!el) return;
    if (snapshot.value !== undefined) el.value = snapshot.value;
  });
  if (previouslyFocusedId) {
    const focusTarget = root.querySelector(`#${previouslyFocusedId}`);
    if (focusTarget && typeof focusTarget.focus === "function") {
      const cursorPos = preservedInputs.get(previouslyFocusedId)?.value?.length ?? 0;
      focusTarget.focus();
      if (typeof focusTarget.setSelectionRange === "function") {
        try {
          focusTarget.setSelectionRange(cursorPos, cursorPos);
        } catch {
          // setSelectionRange isn't supported on every input type; ignore.
        }
      }
    }
  }
}

async function load() {
  const state = await sendMessage({ type: "PAYMEMO_GET_STATE" });
  settings = state.settings || {};
  records = chainWatchRecords(state.records || []);
  render();
}

function isUserEditing() {
  const focused = document.activeElement;
  if (!focused) return false;
  const tag = focused.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

chrome.runtime.onMessage.addListener((message) => {
  if (
    message?.type === "PAYMEMO_RECORDS_UPDATED" ||
    message?.type === "PAYMEMO_CHAIN_WATCH_FOUND"
  ) {
    // Never tear the form out from under the user. If this side panel was
    // opened as the windowed "transaction detected" prompt (popupMode), the
    // user is here to fill one memo — never refresh. Same when they're
    // typing into any input.
    if (popupMode) return;
    if (isUserEditing()) return;
    void load();
  }
});

// Slow heartbeat so the user can type into the wallet form without it
// being clobbered every few seconds. Real-time scanning happens server-side
// (Vercel cron + Railway worker); this is just a fallback poll, and we
// freeze it entirely while the user has the form open / focused.
setInterval(() => {
  if (popupMode) return;
  if (isUserEditing()) return;
  if (settings.chainWatchEnabled) void sendMessage({ type: "PAYMEMO_SCAN_MORPH_NOW" }).then(load);
}, 10000);

void load();
