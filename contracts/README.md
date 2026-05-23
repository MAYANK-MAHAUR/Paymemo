# PayMemo Contracts

`BatchPayout.sol` is a minimal optional helper for Morph Hoodi demos.

The dApp MVP works with sequential wallet sends first. This contract can be deployed later when the demo needs atomic payroll or vendor payouts.

Functions:

- `batchPayETH(bytes32 batchId, address payable[] recipients, uint256[] amounts)` — push ETH to each recipient. If a recipient reverts or exceeds the per-call gas budget (100k), the amount is escrowed to `unclaimedEth[recipient]` and an `EthPayoutFailed` event fires; the batch keeps going for everyone else.
- `batchPayERC20(bytes32 batchId, IERC20 token, address[] recipients, uint256[] amounts)` — pull `transferFrom` from the caller to each recipient. Rejects EOAs as `token`. On a per-recipient `transferFrom` failure (e.g. blacklisted on USDC/USDT), the batch continues and an `Erc20PayoutFailed` event fires. `Erc20Payout.amount` is the actually-delivered amount measured via `balanceOf` delta; `Erc20Payout.requested` is what the sender asked.
- `claimEth()` — pull-payment fallback: a recipient withdraws ETH escrowed by a failed push from `batchPayETH`.

Each payout emits an event that PayMemo can link back to encrypted batch metadata in the private vault.
