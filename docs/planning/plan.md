# 📋 Planning - Online Banking System

**Project**: Blockchain Online Banking System (Term Deposit)

**Student ID**: 2231200021

Below is the detailed plan for 7 working days (excluding Saturdays and Sundays) to complete the project in full accordance with the requirements in `Final_Assignment.docx`, including the Creative Challenges (C1, C2).

## 📅 Day 1

**Goal:** Environment setup, requirements review, personal parameters calculation, and Mock token creation.

- [x] Read and analyzed the prompt requirements (`Final_Assignment.docx`).
- [x] Calculated Personal Variant from Student ID `2231200021`:
    - [x] Grace Period: 3 days
    - [x] Default Plan APR: 225 bps (2.25%)
    - [x] Early Withdraw Penalty: 400 bps (4%)
    - [x] Default Plan Tenor: 90 days
- [x] Set up the Hardhat project and installed OpenZeppelin.
- [x] Wrote `MockUSDC.sol` contract (ERC20, 6 decimals, public mint).
- [x] Cleaned up old boilerplate files.


## 📅 Day 2

**Goal:** Complete `VaultManager.sol` — The core yield management hub.

- [x] Declared state variables, owner, and fee receiver.
- [x] Implemented funding functions (`fundVault`, `withdrawVault`).
- [x] Implemented `pause/unpause` functionality.
- [x] **Creative Challenge (C2) - Solvency Guard:** Implemented `totalPromisedInterest` tracking in VaultManager and blocked admin withdrawals if balance falls below this threshold.


## 📅 Day 3

**Goal:** Build the foundation for `SavingCore.sol` — Plan management and term deposit opening (Deposit).

- [x] Defined `SavingPlan` struct and `DepositCertificate` struct.
- [x] Implemented admin plan management functions (`createPlan`, `updatePlan`, `enablePlan`, `disablePlan`).
- [x] Inherited ERC721 to make each deposit a Transferable NFT certificate.
- [x] Implemented `openDeposit`: transfer USDC from user, mint NFT, snapshot APR/Penalty, and call VaultManager to allocate interest for C2 Solvency Guard.
- [x] Updated `README.md` Section 1 & Section 2 (Architecture, Mermaid diagram, Separation of Funds).


## 📅 Day 4

**Goal:** Complete Withdrawal logic in `SavingCore.sol`.

- [x] Implement `withdrawAtMaturity`: use stored `expectedInterest`, return principal, request interest from VaultManager, and update status.
- [x] **Creative Challenge (C1) - Principal Safety:** Handle scenario where VaultManager runs out of funds by paying principal and recording pending interest.
- [x] Implement `earlyWithdraw`: calculate penalty, return remaining principal to user, send penalty to fee receiver, and release allocated interest in VaultManager.


## 📅 Day 5

**Goal:** Complete renewal logic and start the core contract test suite.

- [x] Implement `renewDeposit(uint256 depositId)` for manual renewal:
    - [x] Require system is not paused.
    - [x] Require caller owns the deposit NFT.
    - [x] Require deposit is `Active` and already matured.
    - [x] Pay matured interest from VaultManager into `SavingCore`.
    - [x] Create a new deposit using `principal + interest` as the renewed principal.
    - [x] Preserve the original APR and penalty snapshots for the new deposit.
    - [x] Mark the old deposit as `ManualRenewed`.
    - [x] Mint a new ERC721 certificate for the renewed deposit.
- [x] Implement `autoRenewDeposit(uint256 depositId)` for bot-triggered renewal:
    - [x] Require system is not paused.
    - [x] Require deposit is `Active` and already matured.
    - [x] Require `block.timestamp <= maturityAt + GRACE_PERIOD`.
    - [x] Reuse the original APR and penalty snapshots to protect users from plan rate decreases.
    - [x] Mark the old deposit as `AutoRenewed`.
    - [x] Mint a new ERC721 certificate to the current NFT owner.
- [x] Add renewal event for manual and auto-renew flows.
- [x] Confirm C2 bookkeeping remains correct:
    - [x] Old promised interest is paid exactly once.
    - [x] New promised interest is allocated for the renewed deposit.
- [x] Start three separate contract test files instead of one combined suite:
    - [x] `MockUSDC.test.ts` — token name/symbol, 6 decimals, public mint, ERC20 transfers.
    - [x] `VaultManager.test.ts` — funding, admin withdrawal, pause/unpause, fee receiver, `onlySavingCore`, and C2 solvency guard.
    - [x] `SavingCore.test.ts` — plans, deposits, withdrawals, early withdrawals, C1 pending interest, and renewals.
- [x] Use per-file fixture setup for now:
    - [x] Deploy `MockUSDC`, `VaultManager`, and `SavingCore`.
    - [x] Link `VaultManager.setSavingCore`.
    - [x] Create the default plan: 90 days, 225 bps APR, 400 bps penalty.
    - [x] Mint/approve MockUSDC for test users and fund VaultManager.
- [x] Add first `SavingCore.test.ts` cases for Day 5 scope:
    - [x] APR and penalty snapshots survive `updatePlan`.
    - [x] Manual renewal preserves original APR.
    - [x] Auto-renew is blocked after the 3-day grace period.
    - [x] Pause blocks renewal.


## 📅 Day 6

**Goal:** Complete 100% Test Coverage and Deployment Script.

- [ ] Write full test cases covering requirements.
- [ ] Run test coverage, ensuring code coverage > 90%.
- [ ] Write deployment script.


## 📅 Day 7

**Goal:** Frontend Demo, Documentation (README), and Video Recording.

- [ ] Build Frontend using React + ethers.js.
- [ ] Complete `README.md` (fill in 7 Design Answer questions).
- [ ] Record Demo video (3–5 minutes).
