# 📅 Progress Log: Day 2

## 🛠️ Accomplished Tasks

### Contract: `VaultManager.sol` (86 lines)
- Inherits `Ownable`, `Pausable` from OpenZeppelin.
- Uses `SafeERC20` for all USDC transfers.

#### State Variables
- `IERC20 public immutable usdcToken` — MockUSDC address, set once in constructor.
- `address public feeReceiver` — defaults to deployer (`msg.sender`), receives early withdrawal penalties.
- `address public savingCore` — set post-deployment via `setSavingCore()`, authorizes SavingCore calls.
- `uint256 public totalPromisedInterest` — **C2 Solvency Guard** accumulator.

#### Admin Functions (all `onlyOwner`)
- `setFeeReceiver(address)` — changes penalty recipient. Requires non-zero.
- `setSavingCore(address)` — links to SavingCore contract. Requires non-zero.
- `pause()` / `unpause()` — toggles `Pausable` state. SavingCore checks `vaultManager.paused()` to block user operations.
- `fundVault(uint256 amount)` — `onlyOwner whenNotPaused`. Pulls USDC from owner into vault via `safeTransferFrom`.
- `withdrawVault(uint256 amount)` — `onlyOwner`. **C2 guard**: requires `currentBalance - amount >= totalPromisedInterest`. Prevents admin from withdrawing funds committed to active deposits.

#### SavingCore-Only Functions (modifier `onlySavingCore`)
- `allocateInterest(uint256 amount)` — increments `totalPromisedInterest`. Called when a new deposit is opened.
- `cancelInterest(uint256 amount)` — decrements `totalPromisedInterest`. Called on early withdrawal (interest is never paid).
- `payInterest(address receiver, uint256 amount)` — `whenNotPaused`. Transfers interest from vault to user, decrements `totalPromisedInterest`. Reverts if vault balance insufficient.

#### Events
- `VaultFunded(address indexed sender, uint256 amount)`
- `VaultWithdrawn(address indexed owner, uint256 amount)`
- `FeeReceiverSet(address indexed newFeeReceiver)`
- `SavingCoreSet(address indexed newSavingCore)`

### Design Decisions
- **Separation of Funds**: VaultManager holds ONLY the bank's interest pool. User principal is held in SavingCore. This is a critical invariant.
- **C2 Solvency Guard**: `withdrawVault` checks `balance - amount >= totalPromisedInterest`. This prevents admin from making the vault insolvent against committed interest obligations.

## 📊 Cumulative Contract State

| Contract | Status | Lines | Key Interfaces |
|---|---|---|---|
| `MockUSDC.sol` | ✅ Complete | 27 | `mint()`, `decimals()=6` |
| `VaultManager.sol` | ✅ Complete | 86 | `fundVault()`, `withdrawVault()`, `allocateInterest()`, `cancelInterest()`, `payInterest()`, `pause()`/`unpause()` |
| `SavingCore.sol` | ❌ Not started | — | — |
