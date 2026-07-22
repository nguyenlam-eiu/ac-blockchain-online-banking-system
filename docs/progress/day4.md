# 📅 Progress Log: Day 4

## 🛠️ Accomplished Tasks

### Contract: `SavingCore.sol` — Withdrawal Logic (265 lines after Day 4, +91 from Day 3)

#### New State Variable
- `mapping(address => uint256) public pendingInterest` — **C1 Principal Safety**: tracks deferred interest per user when vault is insolvent at withdrawal time.

#### New Functions

##### `withdrawAtMaturity(uint256 depositId)` — Mature Withdrawal
- **Caller**: NFT owner (`ownerOf(depositId) == msg.sender`).
- **Guards**: system not paused, deposit is `Active`, `block.timestamp >= maturityAt`.
- **Flow**:
  1. Sets `deposit.status = Withdrawn`.
  2. Transfers `principal` from SavingCore → user via `usdcToken.safeTransfer`.
  3. **C1 try/catch**: Attempts `vaultManager.payInterest(msg.sender, expectedInterest)`.
     - **Success**: interest paid directly to user from vault. `totalPromisedInterest` decremented inside `payInterest`.
     - **Failure** (vault insolvent): catches revert, adds `expectedInterest` to `pendingInterest[msg.sender]`, emits `InterestDeferred`.
  4. Emits `DepositWithdrawn(depositId, owner, principal, interestPaid)` — `interestPaid` is 0 if deferred.
- **Key invariant**: Principal is ALWAYS returned regardless of vault solvency.

##### `earlyWithdraw(uint256 depositId)` — Pre-Maturity Withdrawal
- **Caller**: NFT owner.
- **Guards**: system not paused, deposit is `Active`, `block.timestamp < maturityAt`.
- **Flow**:
  1. Sets `deposit.status = Withdrawn`.
  2. Calculates `penaltyAmount = principal * earlyWithdrawPenaltyBpsAtOpen / 10000`.
  3. `userReceives = principal - penaltyAmount`.
  4. Transfers `userReceives` from SavingCore → user.
  5. Transfers `penaltyAmount` from SavingCore → `vaultManager.feeReceiver()` (if > 0).
  6. Calls `vaultManager.cancelInterest(expectedInterest)` — releases C2 allocation (interest was never earned).
  7. Emits `EarlyWithdrawn(depositId, owner, userReceives, penaltyAmount)`.
- **Key detail**: No interest is paid. Penalty goes to `feeReceiver`, NOT back into vault pool.

##### `claimPendingInterest()` — C1 Deferred Interest Recovery
- **Caller**: Any user with `pendingInterest[msg.sender] > 0`.
- **Guards**: system not paused, pending amount > 0.
- **Flow**:
  1. Reads `amount = pendingInterest[msg.sender]`, zeros it out (CEI pattern).
  2. Calls `vaultManager.payInterest(msg.sender, amount)` — reverts if vault still insufficient.
  3. Emits `PendingInterestClaimed(user, amount)`.

#### New Events
- `DepositWithdrawn(uint256 indexed depositId, address indexed owner, uint256 principal, uint256 interestPaid)`
- `InterestDeferred(uint256 indexed depositId, address indexed owner, uint256 amount)`
- `EarlyWithdrawn(uint256 indexed depositId, address indexed owner, uint256 userReceives, uint256 penaltyAmount)`
- `PendingInterestClaimed(address indexed user, uint256 amount)`

### Design Decisions
- **C1 try/catch on external call**: `VaultManager.payInterest` is an external contract call, so Solidity `try/catch` applies cleanly. Internal calls would require a different pattern.
- **Penalty to feeReceiver, not vault**: Keeps penalty revenue separate from the interest reserve pool. `feeReceiver` is configurable by admin.
- **C2 bookkeeping on early withdraw**: `cancelInterest` releases the promised amount since interest is never earned. On mature withdraw, `payInterest` handles the decrement internally.
- **`withdrawAtMaturity` ignores grace period**: Users can withdraw anytime `>= maturityAt`. Grace period only constrains the auto-renewal bot (Day 5 scope).

### Compilation
- `npx hardhat compile` — **0 errors, 0 warnings**.
- SavingCore deployed size: **8.894 KiB** (+4.061 from Day 3).

## 📊 Cumulative Contract State

| Contract | Status | Lines | Key Interfaces |
|---|---|---|---|
| `MockUSDC.sol` | ✅ Complete | 27 | `mint()`, `decimals()=6` |
| `VaultManager.sol` | ✅ Complete | 86 | `fundVault()`, `withdrawVault()`, `allocateInterest()`, `cancelInterest()`, `payInterest()` |
| `SavingCore.sol` | 🔨 In progress | 265 | Plans: `createPlan()`, `updatePlan()`, `enablePlan()`, `disablePlan()` · Deposits: `openDeposit()` · Withdrawals: `withdrawAtMaturity()`, `earlyWithdraw()`, `claimPendingInterest()` |

### What's NOT implemented yet
- `renewDeposit()` — manual renewal (Day 5)
- `autoRenewDeposit()` — bot-triggered auto-renewal within grace period (Day 5)
- Test suite (Day 5–6)
- Deployment script (Day 6)
- Frontend (Day 7)
