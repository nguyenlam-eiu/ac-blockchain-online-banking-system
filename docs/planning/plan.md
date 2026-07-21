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

-  Implement `withdrawAtMaturity`: calculate interest (multiplying before dividing to prevent precision loss), transfer principal + interest to user, update status.
-  **Creative Challenge (C1) - Principal Safety:** Handle scenario where VaultManager runs out of funds (pay principal, record pending interest).
-  Implement `earlyWithdraw`: calculate penalty, return remaining principal to user, send penalty to fee receiver, and release allocated interest in VaultManager.


## 📅 Day 5

**Goal:** Renewals logic and Start Test Suite.

- [ ] Implement `renewDeposit` (Manual): calculate new principal (old principal + interest), mint new NFT, mark old status.
- [ ] Implement `autoRenewDeposit` (Bot): check Grace Period (3 days), reuse snapshotted APR.
- [ ] Begin setting up `SavingSystem.test.ts` test file.


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
