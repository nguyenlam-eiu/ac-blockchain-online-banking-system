# 📅 Progress Log: Day 5

## 🛠️ Accomplished Tasks

### Contract: `SavingCore.sol` — Renewal Logic (326 lines after Day 5, +61 from Day 4)

#### New Event

##### `DepositRenewed`
```solidity
event DepositRenewed(
    uint256 indexed oldDepositId,
    uint256 indexed newDepositId,
    address indexed owner,
    uint256 principal,
    uint256 expectedInterest,
    DepositStatus renewalType
);
```

- Emitted by both manual renewal and auto-renewal.
- `oldDepositId` is the matured deposit being closed.
- `newDepositId` is the new ERC721 certificate minted for the renewed term.
- `principal` is the renewed principal: `old principal + matured interest`.
- `expectedInterest` is the promised interest for the new term.
- `renewalType` is either `ManualRenewed` or `AutoRenewed`.

#### New Functions

##### `renewDeposit(uint256 depositId)` — Manual Renewal
- **Caller**: Current NFT owner only (`ownerOf(depositId) == msg.sender`).
- **Guards**:
  1. Caller owns the deposit NFT.
  2. System is not paused (`!vaultManager.paused()` inside `_renewDeposit`).
  3. Deposit status is `Active`.
  4. Deposit has matured (`block.timestamp >= maturityAt`).
- **Flow**:
  1. Calls `_renewDeposit(depositId, msg.sender, DepositStatus.ManualRenewed, false)`.
  2. Old deposit status becomes `ManualRenewed`.
  3. Matured interest is paid from `VaultManager` to `SavingCore` via `vaultManager.payInterest(address(this), interest)`.
  4. New principal becomes `old principal + old expectedInterest`.
  5. A new deposit certificate is created with the same `planId`, original `aprBpsAtOpen`, and original `earlyWithdrawPenaltyBpsAtOpen`.
  6. New expected interest is calculated using the preserved APR:
     `newExpectedInterest = (newPrincipal * aprBpsAtOpen * tenorSeconds) / (365 * 86400 * 10000)`.
  7. Calls `vaultManager.allocateInterest(newExpectedInterest)` for C2 bookkeeping.
  8. Mints a new ERC721 deposit NFT to the caller.
  9. Emits `DepositRenewed`.

##### `autoRenewDeposit(uint256 depositId)` — Bot-Triggered Renewal
- **Caller**: Any caller can trigger it; the new NFT is minted to the current deposit owner.
- **Guards**:
  1. System is not paused.
  2. Deposit status is `Active`.
  3. Deposit has matured.
  4. Current time is inside the grace window: `block.timestamp <= maturityAt + GRACE_PERIOD`.
- **Flow**:
  1. Reads `depositOwner = ownerOf(depositId)`.
  2. Calls `_renewDeposit(depositId, depositOwner, DepositStatus.AutoRenewed, true)`.
  3. Reuses the original APR and penalty snapshots to protect the user from plan rate decreases.
  4. Old deposit status becomes `AutoRenewed`.
  5. New ERC721 certificate is minted to the current NFT owner.
  6. Emits `DepositRenewed`.

##### `_renewDeposit(uint256 depositId, address depositOwner, DepositStatus renewalType, bool enforceGracePeriod)` — Internal Shared Renewal Flow
- **Visibility**: `internal`.
- **Purpose**: Keeps manual and auto-renew behavior consistent while allowing the auto-renew grace-period guard to be optional.
- **C2 bookkeeping**:
  - Old promised interest is paid exactly once through `vaultManager.payInterest(address(this), interest)`, which decrements `totalPromisedInterest`.
  - New promised interest is registered through `vaultManager.allocateInterest(newExpectedInterest)`.
- **Design decision**: Interest is paid into `SavingCore` instead of directly to the user because renewed principal is defined as `principal + interest`. This keeps the combined renewed amount in the principal-holding contract.

### Tests: Three Separate Contract Suites

#### `test/MockUSDC.test.ts` (41 lines)
- Verifies token metadata: `name()`, `symbol()`, and `decimals() == 6`.
- Verifies public minting for test setup.
- Verifies normal ERC20 transfer behavior.

#### `test/VaultManager.test.ts` (88 lines)
- Verifies owner starts as initial `feeReceiver`.
- Verifies `setFeeReceiver(address _feeReceiver)`.
- Verifies `fundVault(uint256 amount)` and `withdrawVault(uint256 amount)`.
- Verifies C2 solvency guard blocks admin withdrawals below `totalPromisedInterest`.
- Verifies `allocateInterest(uint256 amount)` and `payInterest(address receiver, uint256 amount)` are restricted by `onlySavingCore`.
- Verifies pause blocks `fundVault` and `payInterest`.

#### `test/SavingCore.test.ts` (189 lines)
- Verifies `openDeposit(uint256 planId, uint256 amount)` snapshots APR and penalty.
- Verifies `withdrawAtMaturity(uint256 depositId)` pays principal from `SavingCore` and interest from `VaultManager`.
- Verifies `earlyWithdraw(uint256 depositId)` pays zero interest and sends penalty to `feeReceiver`.
- Verifies C1 pending-interest behavior when the vault cannot pay interest at maturity.
- Verifies `renewDeposit(uint256 depositId)` preserves original APR after `updatePlan`.
- Verifies `autoRenewDeposit(uint256 depositId)` works inside the 3-day grace period and mints to the current NFT owner.
- Verifies auto-renewal is blocked after the grace period.
- Verifies pause blocks mature withdrawal, manual renewal, and auto-renewal.

### Design Decisions

- **Separate test files by contract**: Created `MockUSDC.test.ts`, `VaultManager.test.ts`, and `SavingCore.test.ts` instead of one combined system suite, matching the requested testing structure.
- **Per-file fixtures for now**: Kept setup local to each test file. A shared helper can be introduced later if duplication becomes painful, but the current split is easier to read while the test suite is still small.
- **Auto-renew caller model**: `autoRenewDeposit` can be triggered by any caller, but it always mints the renewed NFT to the current owner. This matches the bot-triggered flow in the project diagram while preserving user ownership.
- **Renewal compounding across terms only**: No compounding occurs inside a single term. On renewal, matured interest becomes part of the next term's principal, which is a new deposit term.

### Compilation / Verification

- `npx hardhat compile` could not be used because the local machine's global `npx` points to a missing npm CLI file.
- Used local Hardhat binary instead:
  - `.\node_modules\.bin\hardhat.cmd compile`
  - Result: **compiled successfully** after allowing Solidity compiler `0.8.28` download.
  - SavingCore deployed size: **10.354 KiB** (+1.461 from Day 4).
- Full test suite:
  - `.\node_modules\.bin\hardhat.cmd test`
  - Result: **17 passing**.

## 📊 Cumulative Contract State

| Contract | Status | Lines | Key Interfaces |
|---|---|---:|---|
| `MockUSDC.sol` | ✅ Complete | 26 | `decimals()`, `mint(address,uint256)` |
| `VaultManager.sol` | ✅ Complete | 85 | `setFeeReceiver()`, `setSavingCore()`, `pause()`, `unpause()`, `fundVault()`, `withdrawVault()`, `allocateInterest()`, `cancelInterest()`, `payInterest()` |
| `SavingCore.sol` | ✅ Core complete | 326 | `createPlan()`, `updatePlan()`, `enablePlan()`, `disablePlan()`, `openDeposit()`, `withdrawAtMaturity()`, `earlyWithdraw()`, `renewDeposit()`, `autoRenewDeposit()`, `claimPendingInterest()` |

### What's NOT implemented yet

- Complete full requirement coverage beyond the first 17 tests (Day 6).
- Run Solidity coverage and ensure coverage exceeds 90% (Day 6).
- Write deployment script for local/Sepolia deployment (Day 6).
- Complete README design answers and frontend demo (Day 7).
