# 📅 Progress Log: Day 3

## 🛠️ Accomplished Tasks

### Contract: `SavingCore.sol` — Foundation (174 lines after Day 3)
- Inherits `ERC721("Deposit Certificate", "DEPOSIT")`, `Ownable`.
- Uses `SafeERC20` for all USDC transfers.
- Imports `VaultManager.sol` directly for typed external calls.

#### Structs

```solidity
struct SavingPlan {
    uint256 tenorDays;               // Lock duration in days
    uint256 aprBps;                  // Annual rate in basis points (e.g. 225 = 2.25%)
    uint256 minDeposit;              // Minimum deposit (0 = no limit)
    uint256 maxDeposit;              // Maximum deposit (0 = no limit)
    uint256 earlyWithdrawPenaltyBps; // Penalty rate in basis points (e.g. 400 = 4%)
    bool enabled;                    // Can users open new deposits on this plan?
}

struct DepositCertificate {
    uint256 planId;
    uint256 principal;                    // USDC amount (6 decimals)
    uint256 startAt;                      // block.timestamp at open
    uint256 maturityAt;                   // startAt + tenorDays * 86400
    uint256 aprBpsAtOpen;                 // Snapshotted — immune to plan updates
    uint256 earlyWithdrawPenaltyBpsAtOpen; // Snapshotted — immune to plan updates
    uint256 expectedInterest;             // Pre-calculated at open
    DepositStatus status;                 // Active / Withdrawn / ManualRenewed / AutoRenewed
}
```

#### Enum
```solidity
enum DepositStatus { Active, Withdrawn, ManualRenewed, AutoRenewed }
```

#### State Variables
- `IERC20 public immutable usdcToken` — MockUSDC reference.
- `VaultManager public immutable vaultManager` — VaultManager reference.
- `mapping(uint256 => SavingPlan) public plans` — plan ID → plan data.
- `uint256 public nextPlanId` — starts at `1` (0 is unused sentinel).
- `mapping(uint256 => DepositCertificate) public deposits` — NFT token ID → deposit data.
- `uint256 public nextDepositId` — starts at `1`.
- `uint256 public constant GRACE_PERIOD = 3 days` — auto-renewal window.

#### Plan Management Functions (all `onlyOwner`)
- `createPlan(tenorDays, aprBps, minDeposit, maxDeposit, earlyWithdrawPenaltyBps)` — validates: tenor > 0, 0 < APR ≤ 10000, penalty ≤ 10000, max ≥ min (if max > 0). Auto-enables plan. Emits `PlanCreated`.
- `updatePlan(planId, newAprBps)` — changes APR on an existing plan. Does NOT affect already-opened deposits (they use snapshotted `aprBpsAtOpen`). Emits `PlanUpdated`.
- `enablePlan(planId)` / `disablePlan(planId)` — toggles `plan.enabled`. Emits `PlanStatusChanged`.

#### Deposit Function
- `openDeposit(uint256 planId, uint256 amount)` — public, any user:
  1. Checks `vaultManager.paused() == false`.
  2. Validates plan exists, is enabled, and amount is within min/max bounds.
  3. Pulls USDC from user → SavingCore via `safeTransferFrom`.
  4. Calculates `expectedInterest = (amount * aprBps * tenorSeconds) / (365 * 86400 * 10000)` — multiply-before-divide pattern.
  5. Creates `DepositCertificate` with snapshotted APR and penalty.
  6. Calls `vaultManager.allocateInterest(expectedInterest)` — **C2 bookkeeping**.
  7. Mints ERC721 NFT to user (token ID = `nextDepositId`).
  8. Emits `DepositOpened(depositId, owner, planId, principal, maturityAt, aprBpsAtOpen)`.

#### Events
- `PlanCreated(uint256 indexed planId, uint256 tenorDays, uint256 aprBps)`
- `PlanUpdated(uint256 indexed planId, uint256 newAprBps)`
- `PlanStatusChanged(uint256 indexed planId, bool enabled)`
- `DepositOpened(uint256 indexed depositId, address indexed owner, uint256 indexed planId, uint256 principal, uint256 maturityAt, uint256 aprBpsAtOpen)`

### Other Changes
- Updated `.gitignore` to exclude auto-generated `data/abi/` directory.
- Updated `README.md`: Section 1 (Student Info & Variant Table), Section 2 (System Architecture with Mermaid diagram, Separation of Funds proof).

### Design Decisions
- **APR snapshot at open**: If admin calls `updatePlan` later, existing deposits keep their original rate. Only new deposits use the updated rate.
- **Interest pre-calculation**: `expectedInterest` is computed once at `openDeposit` and stored. No re-calculation needed at withdrawal.
- **Principal held in SavingCore**: USDC goes to `address(this)` (SavingCore), NOT to VaultManager. This enforces separation of funds.

## 📊 Cumulative Contract State

| Contract | Status | Lines | Key Interfaces |
|---|---|---|---|
| `MockUSDC.sol` | ✅ Complete | 27 | `mint()`, `decimals()=6` |
| `VaultManager.sol` | ✅ Complete | 86 | `fundVault()`, `withdrawVault()`, `allocateInterest()`, `cancelInterest()`, `payInterest()` |
| `SavingCore.sol` | 🔨 In progress | 174 | `createPlan()`, `updatePlan()`, `enablePlan()`, `disablePlan()`, `openDeposit()` |

### What's NOT implemented yet
- `withdrawAtMaturity()` — mature withdrawal with C1 safety
- `earlyWithdraw()` — penalty-based early exit
- `renewDeposit()` / `autoRenewDeposit()` — manual and bot renewal
