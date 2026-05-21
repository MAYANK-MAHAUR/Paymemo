# PayMemo Wallet Assist Extension

This is the PayMemo browser-extension prototype for supported EVM browser dApp flows.

It injects a lightweight wrapper around supported browser EVM providers, including `window.ethereum.request`, legacy `send` / `sendAsync`, `window.ethereum.providers[]`, EIP-6963 announced providers, and known wallet namespaces such as Bitget Wallet's `window.bitkeep.ethereum`, Phantom's `window.phantom.ethereum`, OKX, Trust Wallet, Coinbase Wallet, Binance Wallet, Rabby, Brave, Frame, Taho, SafePal, TokenPocket, OneKey, Coin98, and Core where those wallets expose an EVM provider to the page.

```text
What is this transaction for?
```

Then it stores the context locally, tracks the tx hash when the wallet returns one, polls Morph Hoodi for receipt confirmation, and lets the user sync the captured record back into the PayMemo dApp session.

It also includes a Morph-only Chain Watch fallback for wallet-internal sends. If a user sends from Bitget Wallet's own extension screen, PayMemo cannot inject into that private wallet UI, but it can watch the configured Morph Hoodi wallet address and show a same-page memo drawer or side panel update shortly after the transaction is detected onchain.

## Load Unpacked

1. Open Chrome or Brave.
2. Go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select this `extension/` folder.

## Demo Flow

1. Run the PayMemo dApp locally at `http://127.0.0.1:5174`.
2. Open the extension popup.
3. Confirm the dApp URL and Morph RPC settings.
4. Visit a supported EVM dApp that uses an injected EVM provider such as `window.ethereum`, EIP-6963, or Bitget Wallet's `window.bitkeep.ethereum`.
5. Start a transaction.
6. PayMemo asks for category, counterparty, note, and project/task before the wallet request continues.
7. Sign or reject in the wallet.
8. The popup updates status: waiting sign -> verifying -> confirmed/failed.
9. Click Sync or Sync all.
10. Open PayMemo dApp -> Wallet Assist to see synced extension captures.

## Morph Chain Watch Demo

1. Open the PayMemo extension popup.
2. Add the wallet you will send from, with an optional name such as `Main wallet | 0xYourAddress`.
3. Enable Morph chain watch.
4. Send a Morph Hoodi testnet transaction from Bitget Wallet's own Send screen.
5. Open the side panel, paste the wallet address, and click Start listening.
6. PayMemo scans Morph Hoodi, detects incoming or outgoing transactions for that wallet, auto-syncs them as `needs-review`, and opens a compact dark memo drawer on the active web page when Chrome allows it.
7. If Chrome cannot inject into the active page, PayMemo opens its own small prompt window focused on the new transaction and also updates the badge/side panel.
8. Add the private reason, then sync it into the PayMemo dApp Review tab.

## Scope

The extension targets browser dApp flows that call injected EVM providers such as MetaMask, Rabby, OKX, Trust Wallet, Bitget Wallet, Coinbase Wallet, Binance Wallet, Brave Wallet, and Phantom EVM. For Bitget Wallet, supported dApps often use the official `window.bitkeep.ethereum` provider.

It does not claim to intercept every wallet, mobile flow, hardware wallet, wallet-internal send screen, or non-EVM transaction. Browser extensions cannot inject into another wallet extension's private UI, so wallet-internal sends are handled by Morph Chain Watch after broadcast, not before signing.
