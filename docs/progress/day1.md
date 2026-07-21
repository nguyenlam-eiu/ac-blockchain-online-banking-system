# 📅 Progress Log: Day 1

## 🛠️ Accomplished Tasks

### Requirements Analysis
- Analyzed `Final_Assignment.docx` prompt in full.
- Computed **Personal Variant** from Student ID `2231200021`:
  - **Grace Period**: `3 days` (used in auto-renewal window)
  - **Default Plan APR**: `225 bps` (2.25%)
  - **Early Withdraw Penalty**: `400 bps` (4.00%)
  - **Default Plan Tenor**: `90 days`

### Environment Setup
- Initialized Hardhat project with Solidity `0.8.28`, EVM target `paris`.
- Installed OpenZeppelin Contracts v5.x (`@openzeppelin/contracts`).
- Configured `hardhat.config.ts` with solidity compiler optimizer (1000 runs).

### Contract: `MockUSDC.sol` (27 lines)
- Inherits `ERC20` from OpenZeppelin.
- Constructor: `constructor(string memory name_, string memory symbol_)`.
- Overrides `decimals()` → returns `6` (strictly 6, not 18).
- Public `mint(address to, uint256 amount)` — unrestricted, for testing only.
- No access control — intentionally permissionless for local/testnet usage.

### Cleanup
- Removed Hardhat boilerplate files (`Lock.sol`, `deploy.ts`, `Lock.ts`).

## 📊 Cumulative Contract State

| Contract | Status | Lines | Key Interfaces |
|---|---|---|---|
| `MockUSDC.sol` | ✅ Complete | 27 | `mint()`, `decimals()=6` |
| `VaultManager.sol` | ❌ Not started | — | — |
| `SavingCore.sol` | ❌ Not started | — | — |
