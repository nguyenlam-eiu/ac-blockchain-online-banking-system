---

name: frontend-development
description: Build and modify the React frontend for the Online Banking System while preserving contract behavior, professional UI/UX, and demo reliability
-----------------------------------------------------------------------------------------------------------------------------------------------------------

# Frontend Development Skill

Use this skill for all frontend work inside:

```text
frontend/
```

## Project Context

This frontend connects to the existing Online Banking System smart contracts:

* `MockUSDC.sol`
* `VaultManager.sol`
* `SavingCore.sol`

Student-specific configuration:

* Grace Period: `3 days`
* Default APR: `225 bps` (`2.25%`)
* Early Withdrawal Penalty: `400 bps` (`4.00%`)
* Default Tenor: `90 days`
* MockUSDC decimals: `6`

Never assume ERC20 tokens use 18 decimals.

## Core Goal

Build a minimal but professional React DApp for the project demonstration.

The frontend must be:

* easy to understand
* visually consistent
* responsive enough for desktop demonstration
* clear about blockchain transaction states
* faithful to the deployed smart contracts
* free from unnecessary abstractions and features

## Technology

Use:

* React
* TypeScript
* Vite
* ethers v6
* react-router-dom
* plain CSS or CSS modules

Do not add UI frameworks, state-management libraries, backend APIs, or additional dependencies unless explicitly requested.

## Current Frontend Structure

```text
frontend/src/
├── blockchain/
├── components/
├── hooks/
└── pages/
```

Do not reorganize the existing structure unless explicitly requested.

## Language Rules

Use English for:

* source code
* file names
* variable names
* function names
* component names
* comments
* UI text
* validation messages
* transaction messages

Vietnamese may be used only in discussion with the user, not in project source files.

## Blockchain Rules

### USDC formatting

All MockUSDC values use exactly `6` decimals.

Use ethers helpers:

```typescript
formatUnits(value, 6);
parseUnits(value, 6);
```

Do not use:

```typescript
Number(value) / 1_000_000;
```

Avoid converting blockchain `bigint` values into JavaScript `number` unless the value is proven safe.

### Contract addresses

Store contract addresses in one centralized configuration file.

Do not hardcode contract addresses inside React components or hooks.

### Contract interaction

Separate read and write operations clearly.

For write transactions, always follow this lifecycle:

```text
Idle
→ Waiting for wallet confirmation
→ Transaction submitted
→ Confirming
→ Success or Error
```

Wait for transaction confirmation with:

```typescript
await transaction.wait();
```

Refresh affected blockchain data after confirmation.

### Wallet behavior

The application must handle:

* MetaMask unavailable
* wallet disconnected
* user rejecting connection
* account change
* network change
* wrong network
* empty account balance

Do not request wallet connection automatically when the page loads. Let the user click `Connect Wallet`.

## Smart Contract Behavior

The frontend must respect contract rules instead of duplicating or changing them.

### Open deposit

Flow:

```text
Enter amount
→ validate amount
→ approve MockUSDC
→ wait for approval confirmation
→ call openDeposit(planId, amount)
→ wait for deposit confirmation
→ refresh balances and deposits
```

### Deposit actions

Display only actions that are valid for the current deposit state.

Before maturity:

* allow `Early Withdraw`
* disable mature withdrawal
* disable manual renewal

At or after maturity:

* allow `Withdraw`
* allow `Renew`
* disable early withdrawal

When the system is paused:

* disable withdrawal and renewal actions
* show a visible paused-system message

### NFT ownership

Deposit actions belong to the current ERC721 owner, not necessarily the original depositor.

Do not use the wallet’s historical deposit creation events as proof of current ownership.

## UI/UX Rules

The frontend should use a clean banking-dashboard layout.

Minimum pages:

* Dashboard
* Plans
* My Deposits
* Deposit Detail

Minimum reusable components:

* App layout
* Navigation/sidebar
* Wallet button
* Stat card
* Plan card
* Deposit table
* Transaction status feedback

### Financial information

Always display:

* amount with `USDC`
* APR as a percentage
* penalty as a percentage
* maturity as a readable date
* deposit status as a clear badge

Examples:

```text
1,000.00 USDC
2.25% APR
4.00% penalty
Matures on July 30, 2026
Active
```

Never display raw values such as:

```text
1000000000
225 bps
1753920000
```

unless inside a developer/debug section.

### Action clarity

Buttons must use clear action labels:

* `Connect Wallet`
* `Approve USDC`
* `Open Deposit`
* `Early Withdraw`
* `Withdraw`
* `Renew Deposit`
* `Claim Interest`

Disable buttons while a transaction is pending to prevent duplicate submissions.

### Error feedback

Convert technical errors into short user-facing messages where possible.

Do not display long raw RPC or Solidity error objects directly in the main interface.

Technical details may be logged to the browser console.

## Scope Control

For the initial project demo, do not implement:

* charts
* animations
* dark mode
* complex NFT artwork
* backend services
* transaction indexing
* authentication systems
* global state libraries
* advanced mobile optimization
* speculative admin features

Prioritize working contract flows over visual extras.

## Implementation Procedure

For each frontend task:

1. Inspect the existing files before editing.
2. State the task’s success criteria.
3. Make only the required changes.
4. Preserve existing project structure and style.
5. Run:

```bash
npm run build
```

6. Fix all TypeScript and build errors.
7. Report:

   * files created
   * files modified
   * behavior implemented
   * verification result
   * remaining limitations

## Completion Requirements

A frontend task is complete only when:

* TypeScript compiles without errors
* `npm run build` succeeds
* no unrelated backend files were modified
* blockchain values use 6-decimal-safe formatting
* transaction states are visible
* invalid user actions are disabled or clearly handled
* the implemented flow matches the actual contracts
