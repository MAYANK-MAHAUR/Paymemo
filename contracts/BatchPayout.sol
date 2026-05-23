// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title PayMemo BatchPayout
/// @notice Helper for paying many recipients in a single transaction.
/// @dev    ETH path uses checks-effects-interactions with a reentrancy guard
///         and a credit-and-claim fallback so a single hostile recipient
///         cannot DoS the whole batch. ERC-20 path tolerates non-standard
///         tokens that return no boolean by inspecting the returndata, and
///         emits a failure event (instead of reverting) when a single
///         recipient's transfer fails (e.g. blacklisted on USDC/USDT) so
///         the remaining recipients are still paid.
contract BatchPayout {
    event EthPayout(bytes32 indexed batchId, address indexed sender, address indexed recipient, uint256 amount);
    event EthPayoutFailed(
        bytes32 indexed batchId, address indexed sender, address indexed recipient, uint256 amount
    );
    event EthClaimed(address indexed recipient, uint256 amount);
    /// @dev `amount` is the actually-delivered amount (post fee-on-transfer / rebase);
    ///       `requested` is what the sender asked to send. They differ only for
    ///       non-standard tokens. Off-chain accounting should trust `amount`.
    event Erc20Payout(
        bytes32 indexed batchId,
        address indexed sender,
        address indexed token,
        address recipient,
        uint256 amount,
        uint256 requested
    );
    event Erc20PayoutFailed(
        bytes32 indexed batchId,
        address indexed sender,
        address indexed token,
        address recipient,
        uint256 amount
    );
    event BatchSubmitted(bytes32 indexed batchId, address indexed sender, uint256 itemCount);

    error LengthMismatch();
    error IncorrectEthValue();
    error TransferFailed();
    error EmptyBatch();
    error TooManyRecipients();
    error Reentrancy();
    error NothingToClaim();
    error InvalidToken();

    /// @dev Hard cap to keep a single batch within sane gas bounds and to bound
    ///      the worst-case loop length on any chain.
    uint256 private constant MAX_BATCH = 256;

    /// @dev Per-recipient gas budget. Generous enough for plain EOAs (~21k) and
    ///      typical smart-wallet `receive` hooks (Safe ~30k, AA wallets up to ~80k)
    ///      while preventing a hostile recipient from burning the whole tx's gas.
    uint256 private constant CALL_GAS = 100_000;

    uint256 private _locked = 1;

    /// @notice ETH escrowed for recipients whose push failed; recipient claims via `claimEth`.
    mapping(address => uint256) public unclaimedEth;

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    /// @notice Pay an arbitrary list of recipients in native ETH.
    /// @param  batchId    Caller-chosen identifier (for off-chain indexing only).
    /// @param  recipients Payable addresses.
    /// @param  amounts    Per-recipient amounts in wei. Sum must equal msg.value.
    /// @dev    If pushing ETH to a recipient fails (revert, OOG within CALL_GAS),
    ///         the amount is credited to `unclaimedEth[recipient]` and an
    ///         `EthPayoutFailed` event is emitted; the rest of the batch continues.
    function batchPayETH(bytes32 batchId, address payable[] calldata recipients, uint256[] calldata amounts)
        external
        payable
        nonReentrant
    {
        uint256 length = recipients.length;
        if (length != amounts.length) revert LengthMismatch();
        if (length == 0) revert EmptyBatch();
        if (length > MAX_BATCH) revert TooManyRecipients();

        uint256 total;
        for (uint256 i = 0; i < length;) {
            total += amounts[i];
            unchecked {
                ++i;
            }
        }
        if (msg.value != total) revert IncorrectEthValue();

        emit BatchSubmitted(batchId, msg.sender, length);

        for (uint256 i = 0; i < length;) {
            address payable to = recipients[i];
            uint256 amount = amounts[i];
            (bool ok,) = to.call{value: amount, gas: CALL_GAS}("");
            if (ok) {
                emit EthPayout(batchId, msg.sender, to, amount);
            } else {
                unclaimedEth[to] += amount;
                emit EthPayoutFailed(batchId, msg.sender, to, amount);
            }
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Pull-payment fallback: a recipient whose push transfer failed can
    ///         withdraw the escrowed amount themselves.
    function claimEth() external nonReentrant {
        uint256 amount = unclaimedEth[msg.sender];
        if (amount == 0) revert NothingToClaim();
        unclaimedEth[msg.sender] = 0; // effects before interactions
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit EthClaimed(msg.sender, amount);
    }

    /// @notice Pay an arbitrary list of recipients in any ERC-20.
    /// @dev    The caller must have approved this contract for at least the
    ///         total amount. Uses a low-level call so that legacy tokens
    ///         which return no boolean (USDT-style) are tolerated. Individual
    ///         recipient failures (e.g. blacklisted addresses on regulated
    ///         stablecoins) do not revert the whole batch.
    function batchPayERC20(
        bytes32 batchId,
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external nonReentrant {
        uint256 length = recipients.length;
        if (length != amounts.length) revert LengthMismatch();
        if (length == 0) revert EmptyBatch();
        if (length > MAX_BATCH) revert TooManyRecipients();
        // Reject EOAs / non-contract addresses so a low-level call cannot
        // silently succeed against an address with no code and forge events.
        if (address(token).code.length == 0) revert InvalidToken();

        emit BatchSubmitted(batchId, msg.sender, length);

        for (uint256 i = 0; i < length;) {
            address to = recipients[i];
            uint256 amount = amounts[i];
            (bool ok, uint256 delivered) = _tryTransferFrom(address(token), msg.sender, to, amount);
            if (ok) {
                emit Erc20Payout(batchId, msg.sender, address(token), to, delivered, amount);
            } else {
                emit Erc20PayoutFailed(batchId, msg.sender, address(token), to, amount);
            }
            unchecked {
                ++i;
            }
        }
    }

    /// @dev Attempts `transferFrom(from, to, amount)` and reports the actually-
    ///      delivered amount via `balanceOf` delta so fee-on-transfer / rebasing
    ///      tokens report truth in the emitted event. Returns `(false, 0)` on
    ///      any failure (revert, false return, malformed returndata).
    function _tryTransferFrom(address token, address from, address to, uint256 amount)
        private
        returns (bool ok, uint256 delivered)
    {
        uint256 balBefore = IERC20(token).balanceOf(to);
        (bool callOk, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        if (!callOk) return (false, 0);
        if (data.length != 0 && !abi.decode(data, (bool))) return (false, 0);

        // Self-transfer (from == to) leaves balance unchanged but the transfer
        // is still successful; report the requested amount to avoid a false-zero.
        if (from == to) return (true, amount);

        uint256 balAfter = IERC20(token).balanceOf(to);
        delivered = balAfter > balBefore ? balAfter - balBefore : 0;
        return (true, delivered);
    }
}
