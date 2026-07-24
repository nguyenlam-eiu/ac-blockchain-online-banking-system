# Day 7 Progress Report

## Project

**Online Banking System — Blockchain Savings Platform**

## Date

2026-07-24

## Day 7 Goals

- Complete the remaining frontend flows.
- Add owner-only administration features.
- Improve the localhost demonstration setup.
- Align the default plan with the assigned Personal Variant.
- Review the C1 and C2 safety requirements.
- Identify remaining differences between the implementation and the assignment.

---

## 1. Frontend Features Completed

The React frontend now supports the main user journey:

- Connect MetaMask.
- Detect and validate the active blockchain network.
- Display the MockUSDC balance.
- Browse enabled saving plans.
- Approve MockUSDC spending.
- Open a saving deposit.
- View owned deposit certificates.
- Open a detailed certificate page at `/deposits/:depositId`.
- Perform early withdrawal.
- Withdraw at maturity.
- Claim deferred interest.
- Manually renew a matured deposit.
- Trigger grace-period auto-renewal.
- Transfer an ERC721 deposit certificate to another wallet.

Deposit maturity is calculated from the latest blockchain timestamp rather than `Date.now()`.

---

## 2. Administration Dashboard

An owner-only administration page is available at:

```text
/admin
```

The page includes:

- Owner-wallet verification.
- Vault balance.
- Total promised interest.
- Excess liquidity.
- Vault funding.
- Excess-liquidity withdrawal.
- Pause and unpause controls.
- Saving-plan creation.
- APR updates.
- Plan enable and disable controls.
- Fee-receiver address management.

The Administration navigation item is shown only when the connected wallet is the owner. Smart-contract access control remains the final security layer.

---

## 3. Fee Receiver Design

`feeReceiver` is a global configuration of `VaultManager`.

It is **not** stored separately for every Saving Plan.

The on-chain state stores:

```text
feeReceiver address
```

The frontend may also store a human-readable display name, such as:

```text
Bank Treasury
```

The display name is stored in browser `localStorage` only. The blockchain address remains the authoritative value.

### Demo fee-receiver flow

- Account #0 is the owner, admin, and default fee receiver.
- Account #2 is prepared as an alternative fee receiver.
- The setup script does not automatically assign Account #2.
- During the demonstration, the admin changes the fee receiver from Account #0 to Account #2 through `/admin`.
- A later early-withdrawal penalty should then be transferred to Account #2.

---

## 4. Personal Variant Configuration

The assigned parameters derived from Student ID `2231200021` are:

| Parameter | Value | Contract Representation |
|---|---:|---:|
| Grace Period | 3 days | `3 days` |
| Default APR | 2.25% | `225` bps |
| Early Withdrawal Penalty | 4.00% | `400` bps |
| Default Tenor | 90 days | `90` days |
| MockUSDC Decimals | 6 | `10^6` base units |

---

## 5. Local Saving Plans

The localhost setup should create two plans.

### Plan #1 — Personal Variant Plan

| Field | Value |
|---|---:|
| Tenor | 90 days |
| APR | 2.25% |
| APR representation | 225 bps |
| Early-withdrawal penalty | 4.00% |
| Penalty representation | 400 bps |
| Minimum deposit | 1 MockUSDC |
| Maximum deposit | 1,000,000 MockUSDC |

This is the official plan that matches the assigned Personal Variant.

### Plan #2 — Quick Demo Plan

| Field | Value |
|---|---:|
| Tenor | 1 day |
| APR | 2.25% |
| APR representation | 225 bps |
| Early-withdrawal penalty | 4.00% |
| Penalty representation | 400 bps |
| Minimum deposit | 1 MockUSDC |
| Maximum deposit | 1,000,000 MockUSDC |

This plan exists only to make maturity, withdrawal, and renewal testing practical during a localhost demonstration.

Any quick-maturity script should use:

```text
planId = 2
```

---

## 6. Local Demo Accounts

| Account | Address | Purpose | Initial MockUSDC |
|---|---|---|---:|
| Account #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Owner, admin, and default fee receiver | 10,000 |
| Account #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Secondary customer | 5,000 |
| Account #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Alternative fee receiver | 0 |

The vault should be funded with:

```text
100,000 MockUSDC
```

---

## 7. C1 — Principal Safety

C1 is implemented.

The intended mature-withdrawal behavior is:

1. The user receives principal from `SavingCore`.
2. The system attempts to pay interest from `VaultManager`.
3. If the interest payment fails, principal withdrawal is not reverted.
4. The unpaid interest is recorded in `pendingInterest`.
5. The user can later call `claimPendingInterest()` after the vault receives more liquidity.

This design separates principal safety from interest-vault availability.

---

## 8. C2 — Promised-Interest Solvency Guard

C2 is implemented.

`VaultManager` tracks:

```text
totalPromisedInterest
```

The owner may withdraw only the amount above the current promised-interest obligation.

```text
Excess Liquidity = Vault Balance - Total Promised Interest
```

A withdrawal that would reduce the vault below `totalPromisedInterest` must revert.

### Remaining design question

The current design protects promised funds from owner withdrawal, but it may not require the vault to be fully collateralized before a new deposit is opened.

Possible future improvement:

```text
Reject a new deposit when the vault cannot cover the new expected-interest obligation.
```

---

## 9. Renewal Behavior Review

### Auto Renewal

Auto renewal should preserve the original APR for customer protection.

The current implementation follows this rule.

### Manual Renewal

The assignment appears to specify:

```solidity
renewDeposit(uint256 depositId, uint256 newPlanId)
```

That interface implies:

- The completed term uses the original deposit snapshot.
- The user chooses a new plan for the renewed term.
- The renewed certificate snapshots the selected plan's current tenor, APR, and penalty.

The current implementation uses:

```solidity
renewDeposit(uint256 depositId)
```

and preserves the original plan, APR, and penalty.

This is the main remaining alignment issue.

### Files affected by a future correction

- `contracts/SavingCore.sol`
- SavingCore tests
- Frontend contract ABI
- Renewal hook
- Deposit Detail UI
- README and design documentation

Estimated implementation and verification effort:

```text
1–2 hours
```

---

## 10. Local Demo Commands

Start the local blockchain:

```bash
npm run node:local
```

In a second terminal, deploy and prepare the demo:

```bash
npm run demo:setup
```

Start the frontend:

```bash
cd frontend
npm run dev
```

For a one-day deposit test, open Plan #2 and then advance blockchain time:

```bash
npm run demo:advance
```

Restarting the Hardhat node clears all local contracts, balances, plans, deposits, and transaction state. Run `npm run demo:setup` again after every node restart.

---

## 11. Suggested Mentor Demonstration

1. Connect Account #0 and show owner access.
2. Open `/admin`.
3. Show vault balance, promised interest, and excess liquidity.
4. Connect Account #1 and open a deposit using Plan #2.
5. Demonstrate certificate ownership and the detail page.
6. Demonstrate certificate transfer between Account #0 and Account #1.
7. Demonstrate an early withdrawal and confirm that the penalty reaches Account #0.
8. Switch to Account #0 and change the fee receiver to Account #2.
9. Perform another early withdrawal and confirm that Account #2 receives the penalty.
10. Open another Plan #2 deposit.
11. Run `npm run demo:advance`.
12. Demonstrate mature withdrawal, manual renewal, or auto renewal.
13. Explain C1 and C2.
14. Mention manual renewal with `newPlanId` as the remaining assignment-alignment item.

---

## 12. End-of-Day Status

### Completed

- Main frontend user flow.
- Deposit certificate detail page.
- Certificate transfer.
- Mature and early withdrawal.
- Deferred-interest claim.
- Manual and automatic renewal UI.
- Owner administration dashboard.
- Plan administration.
- Vault administration.
- Pause controls.
- Fee-receiver administration.
- Personal Variant plan definition.
- Quick localhost demo plan definition.
- Three-account demo design.
- C1 and C2 review.
- README completion update.

### Remaining

- Review and likely change manual renewal to accept `newPlanId`.
- Update related tests, ABI, frontend UI, and documentation.
- Re-run the complete test suite after that change.
- Record or link the final demonstration video.

---

## Next Session

The next implementation task should be:

```text
Align manual renewal with renewDeposit(depositId, newPlanId).
```
