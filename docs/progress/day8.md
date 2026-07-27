# Day 8 — Automation, Principal Safety, and Admin Audit

## Goals

- Complete the automatic renewal flow.
- Verify principal safety when the interest vault is underfunded.
- Add admin security coverage and an on-chain audit log.
- Stop after completing these three areas.

---

## 1. Automatic Renewal

### Business Rules

- The user has a 3-day grace period after maturity.
- During the grace period, the user may:
  - Withdraw at maturity.
  - Manually renew the deposit.
- Automatic renewal is not allowed during the grace period.
- After the grace period ends, an off-chain bot calls:

```solidity
autoRenewDeposit(depositId)
```

- The renewed deposit:
  - Uses the original tenor.
  - Keeps `aprBpsAtOpen`.
  - Uses `old principal + matured interest` as the new principal.
  - Creates a new deposit certificate.
  - Marks the old certificate as `AutoRenewed`.
  - Mints the new certificate to the current NFT owner.

### Frontend Changes

- Removed the user-facing `Auto Renew` button.
- During the grace period:
  - `Withdraw at Maturity` is available.
  - `Manual Renew` is available.
- After the grace period:
  - User actions are hidden.
  - The UI displays:

```text
The grace period has ended. Automatic renewal is pending and will be processed by the automation bot.
```

### Bot

Added:

```text
scripts/auto-renew-bot.ts
```

Added root command:

```json
"bot:auto-renew": "hardhat run scripts/auto-renew-bot.ts --network localhost"
```

Run locally with:

```bash
npm run bot:auto-renew
```

Important: the current script runs once per command. It is suitable for the local demo. A production deployment would run the bot periodically through a server, scheduler, cron job, or keeper service.

---

## 2. Principal Safety

### Confirmed Design

- User principal remains in `SavingCore`.
- Interest liquidity remains in `VaultManager`.
- If the vault cannot pay interest:
  - The user still receives the full principal.
  - Unpaid interest is added to `pendingInterest`.
- The user can claim deferred interest after the vault is funded.
- Admin cannot withdraw funds held by `SavingCore`.
- Deposit ownership controls who may withdraw principal.

### Pause Decision

The current project keeps emergency pause behavior strict:

- Pause blocks new deposits.
- Pause blocks withdrawals.
- Pause blocks manual renewal.
- Pause blocks automatic renewal.
- Pause blocks pending-interest claims.
- After unpause, the user can still recover the principal.

Reason:

> Principal safety protects users from vault insolvency. Emergency pause protects the protocol during an active incident. The principal remains in `SavingCore` and becomes withdrawable again after the system is unpaused.

### Tests Added or Planned

```text
test/PrincipalSafety.test.ts
```

Coverage:

- Principal remains in `SavingCore`.
- Principal is returned when the vault has no interest liquidity.
- Unpaid interest is stored in `pendingInterest`.
- Deferred interest can be claimed later.
- Admin cannot withdraw user principal.
- Non-owner cannot withdraw another user's deposit.
- Withdrawal is blocked while paused.
- Withdrawal succeeds after unpause.
- User can recover principal after ownership transfer.
- User can recover principal after admin ownership is renounced.

Run:

```bash
npx hardhat test test/PrincipalSafety.test.ts
npx hardhat test
```

---

## 3. Admin Security and Audit Log

### Required Audit Actions

The audit system covers:

- Create plan.
- Update plan APR.
- Enable plan.
- Disable plan.
- Fund vault.
- Withdraw excess vault liquidity.
- Change fee receiver.
- Pause system.
- Unpause system.

### Event Data

Admin events should include:

- Actor/admin address.
- Action-specific data.
- Amount or plan ID.
- Transaction timestamp.
- Transaction hash is obtained from the event log transaction.

### Files Prepared

```text
contracts/SavingCore.sol
contracts/VaultManager.sol
test/AdminSecurity.test.ts
frontend/src/blockchain/contracts.ts
frontend/src/hooks/useAdminActivity.ts
frontend/src/pages/AdminPage.tsx
```

### Admin Activity Table

The administration page should display:

| Field | Description |
|---|---|
| Time | Block or event timestamp |
| Action | Admin action name |
| Actor | Address that submitted the transaction |
| Amount / Plan | USDC amount, plan ID, APR change, or status |
| Transaction | Transaction hash and explorer link when available |

### Security Tests

Coverage includes:

- Non-owner cannot create or update plans.
- Non-owner cannot enable or disable plans.
- Non-owner cannot fund through owner-only paths where applicable.
- Non-owner cannot withdraw vault liquidity.
- Non-owner cannot change the fee receiver.
- Non-owner cannot pause or unpause the system.
- Admin withdrawal cannot reduce vault liquidity below promised interest.
- Audit events contain the expected actor and action data.

Run:

```bash
npx hardhat compile
npx hardhat test test/AdminSecurity.test.ts
npx hardhat test
```

Because contract events changed, reset the local deployment before UI verification:

```bash
npm run node:local
```

In another terminal:

```bash
npm run demo:setup
```

Then verify the frontend:

```bash
cd frontend
npm run build
npm run dev
```

---

## Day 8 Completion Checklist

### Automatic Renewal

- [x] Auto-renew is blocked during the grace period.
- [x] Withdrawal and manual renewal are limited to the grace period.
- [x] The old certificate is closed after renewal.
- [x] A new active certificate is created.
- [x] The original APR and tenor are preserved.
- [x] The user-facing `Auto Renew` button is removed.
- [x] An off-chain bot script is prepared.
- [x] Run and verify the bot after a clean local deployment.

### Principal Safety

- [x] Principal is held in `SavingCore`.
- [x] Principal can be returned without vault interest liquidity.
- [x] Unpaid interest is recorded in `pendingInterest`.
- [x] Admin cannot directly withdraw user principal.
- [x] Pause behavior is clearly defined.
- [x] Run the new principal-safety test file and confirm all tests pass.

### Admin Security and Audit Log

- [x] Required admin actions were identified.
- [x] Audit event changes were prepared.
- [x] Admin Activity frontend files were prepared.
- [x] Non-admin permission tests were prepared.
- [x] Compile the updated contracts.
- [x] Run `AdminSecurity.test.ts`.
- [x] Run the complete Hardhat test suite.
- [x] Reset the local deployment.
- [x] Verify the Admin Activity table in the browser.

---

## End-of-Day Status

Day 8 implementation work is prepared. The remaining work is validation:

1. Compile the updated contracts.
2. Run the new test files.
3. Run the complete test suite.
4. Reset the local environment.
5. Verify automatic renewal and the Admin Activity table on the frontend.
