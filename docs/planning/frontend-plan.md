# Frontend Development Plan — Online Banking System

**Project**: Blockchain Online Banking System
**Frontend Goal**: Build a minimal, professional, demo-ready React DApp for the existing smart contracts.
**Current Status**: Core frontend and local demo workflow completed.
**Target**: Reliable end-to-end demonstration on Hardhat Localhost, with Sepolia support retained.

---

## 1. Scope

The frontend supports the core user flows required for the demonstration.

### Implemented Pages

- [x] Dashboard
- [x] Savings Plans
- [x] My Deposits
- [x] Not Found page
- [ ] Deposit Detail page

> The current implementation displays full deposit information and actions directly on the My Deposits page, so a separate Deposit Detail page is not required for the current demo.

### Implemented User Flows

- [x] Connect MetaMask
- [x] Display wallet address and current network
- [x] Display MockUSDC balance
- [x] View available saving plans
- [x] Approve MockUSDC spending when allowance is insufficient
- [x] Open a deposit
- [x] View owned deposit certificates
- [x] Early withdraw before maturity
- [x] Withdraw at maturity
- [x] Manual renew after maturity
- [ ] Claim pending interest through the frontend

### Optional Admin Demo Features

These features are outside the current frontend scope.

- [ ] Display vault balance
- [ ] Fund vault through the frontend
- [ ] Pause system
- [ ] Unpause system

---

## 2. Technology Stack

The frontend uses:

- React
- TypeScript
- Vite
- Tailwind CSS
- ethers v6
- react-router-dom
- lucide-react
- MetaMask

The frontend does not use:

- Redux
- Zustand
- Axios
- Material UI
- Ant Design
- Chakra UI
- shadcn/ui
- Framer Motion
- backend APIs

---

## 3. Project Rules

### Language

Use English for:

- source code
- file names
- component names
- variable names
- comments
- UI text
- validation messages
- transaction messages
- documentation inside the repository

### MockUSDC Precision

MockUSDC uses exactly `6` decimals.

Use:

```typescript
formatUnits(value, 6);
parseUnits(value, 6);
```

Do not convert token values using:

```typescript
Number(value) / 1_000_000;
```

### Contract Behavior

The frontend preserves these contract rules:

- `SavingCore` holds user principal.
- `VaultManager` holds the interest pool.
- APR and penalty are snapshotted when a deposit is opened.
- Deposit ownership follows the ERC721 owner.
- Early withdrawal pays no interest.
- Mature withdrawal may defer unpaid interest through C1.
- Vault withdrawals must respect the C2 solvency guard.
- Withdrawals and renewals are blocked while the system is paused.
- Manual renewal marks the old deposit certificate as renewed and creates a new active certificate.

### Blockchain Time

Deposit maturity must be evaluated using the latest blockchain block timestamp.

Do not use:

```typescript
Date.now()
```

for contract maturity decisions.

The local demo advances blockchain time with:

```bash
npm run demo:advance
```

After advancing time, the My Deposits page must reload the latest block timestamp.

---

## 4. Current Frontend Structure

```text
frontend/src/
├── blockchain/
│   ├── addresses.ts
│   ├── contracts.ts
│   └── format.ts
├── components/
│   ├── AppLayout.tsx
│   ├── DepositCard.tsx
│   ├── LoadingCard.tsx
│   ├── OpenDepositForm.tsx
│   ├── PageHeader.tsx
│   ├── PlanCard.tsx
│   ├── Sidebar.tsx
│   ├── StateMessage.tsx
│   ├── StatCard.tsx
│   └── WalletButton.tsx
├── context/
│   └── WalletContext.tsx
├── hooks/
│   ├── useDepositActions.ts
│   ├── useDeposits.ts
│   ├── useDepositSummary.ts
│   ├── useOpenDeposit.ts
│   ├── usePendingInterest.ts
│   ├── usePlans.ts
│   ├── useSystemStatus.ts
│   ├── useUsdcBalance.ts
│   └── useWallet.ts
├── pages/
│   ├── DashboardPage.tsx
│   ├── DepositsPage.tsx
│   ├── NotFoundPage.tsx
│   └── PlansPage.tsx
├── utils/
│   └── getErrorMessage.ts
├── App.tsx
└── main.tsx
```

Do not reorganize this structure unless a concrete implementation problem requires it.

---

## 5. UI/UX Direction

The frontend uses a clean banking-dashboard visual style:

- white and light-slate backgrounds
- subtle borders
- dark readable text
- restrained accent colors
- consistent spacing
- rounded cards
- desktop-first responsive layout
- clear wallet and network status
- readable financial values
- loading, empty, warning, success, and error states

### Financial Display Rules

Display values like:

```text
1,000.00 USDC
2.25% APR
4.00% penalty
Matures on July 30, 2026
Active
```

Do not display raw values such as:

```text
1000000000
225 bps
1753920000
```

### Transaction States

Write actions display clear states such as:

```text
Idle
→ Waiting for wallet confirmation
→ Approving USDC
→ Opening deposit / Processing action
→ Confirming
→ Success or Error
```

Action buttons are disabled while a transaction is pending.

### Action Availability

Before maturity:

- enable `Early Withdraw`
- hide mature withdrawal
- hide manual renewal

At or after maturity:

- enable `Withdraw at Maturity`
- enable `Renew Deposit`
- hide early withdrawal

---

## 6. Implementation Status

## Phase 1 — Frontend Setup

**Goal**: Confirm the React frontend builds and runs.

- [x] Validate Vite React TypeScript setup
- [x] Install `ethers`
- [x] Install `react-router-dom`
- [x] Install and configure Tailwind CSS
- [x] Install `lucide-react`
- [x] Remove default Vite demo content
- [x] Preserve the existing `frontend/src/` folders
- [x] Create the Online Banking System application shell

### Verification

- [x] `npm run build` succeeds
- [x] Development server starts
- [x] Browser displays the application
- [x] No backend files were modified for frontend setup

---

## Phase 2 — Blockchain Utilities

**Goal**: Centralize network configuration, contracts, and value formatting.

### `addresses.ts`

- [x] Support centralized contract addresses
- [x] Support Sepolia configuration
- [x] Support Hardhat Localhost configuration through Vite environment variables
- [x] Validate chain ID and contract addresses
- [x] Prevent mixing localhost chain ID with Sepolia addresses
- [x] Hide unsupported explorer links on localhost

### `contracts.ts`

- [x] Define contract ABIs
- [x] Create contract helpers for provider and signer runners
- [x] Keep contract creation outside React components

### `format.ts`

- [x] Add `USDC_DECIMALS = 6`
- [x] Add `formatUSDC(value: bigint)`
- [x] Add `parseUSDC(value: string)`
- [x] Add `formatAddress(address: string)`
- [x] Add readable timestamp formatting
- [x] Add BPS-to-percentage formatting

### Verification

- [x] Token values use 6 decimals
- [x] Contract addresses are not hardcoded inside components
- [x] TypeScript build succeeds

---

## Phase 3 — MetaMask Connection

**Goal**: Connect a wallet and expose shared wallet state.

- [x] Detect MetaMask availability
- [x] Connect only after user action
- [x] Store connected account
- [x] Store chain ID
- [x] Store provider and signer
- [x] Listen for `accountsChanged`
- [x] Listen for `chainChanged`
- [x] Handle user rejection
- [x] Detect wrong network
- [x] Provide wallet state through `WalletContext`
- [x] Add `WalletButton`
- [x] Display formatted address and network state

### Verification

- [x] Wallet connects successfully
- [x] Account changes update the UI
- [x] Network changes update the UI
- [x] Rejected connection requests show readable errors

---

## Phase 4 — Layout and Navigation

**Goal**: Build a professional application shell.

- [x] Implement `AppLayout`
- [x] Implement `Sidebar`
- [x] Configure routes
- [x] Add navigation for Dashboard, Savings Plans, and My Deposits
- [x] Add reusable page headers
- [x] Add fallback Not Found page
- [x] Keep the layout readable on common laptop widths

---

## Phase 5 — Dashboard

**Goal**: Show a useful account overview.

- [x] MockUSDC balance
- [x] Total deposited principal
- [x] Number of active deposits
- [x] Pending interest amount
- [x] System pause status
- [x] Quick links to Savings Plans and My Deposits
- [x] Manual refresh
- [x] Disconnected-wallet state
- [x] Wrong-network state

---

## Phase 6 — Savings Plans and Open Deposit

**Goal**: Display plans and allow users to open deposits.

### Plan Data

- [x] Plan ID
- [x] Tenor days
- [x] APR percentage
- [x] Minimum deposit
- [x] Maximum deposit
- [x] Early-withdrawal penalty
- [x] Enabled/disabled status

### Open Deposit Flow

```text
Enter amount
→ validate amount
→ check MockUSDC balance
→ check allowance
→ approve only when allowance is insufficient
→ wait for approval confirmation
→ call openDeposit(planId, amount)
→ wait for deposit confirmation
→ refresh UI data
```

### Validation

- [x] Reject empty amount
- [x] Reject invalid decimal input
- [x] Enforce 6 decimal precision
- [x] Enforce minimum deposit
- [x] Enforce maximum deposit
- [x] Reject disabled plans
- [x] Reject disconnected wallet
- [x] Reject wrong network
- [x] Disable duplicate submissions

### Verification

- [x] Plans load from `SavingCore`
- [x] Approval succeeds when required
- [x] Deposit transaction succeeds
- [x] New deposit appears in My Deposits
- [x] Transaction rejection is handled

---

## Phase 7 — My Deposits and Deposit Actions

**Goal**: Display deposit certificates owned by the connected wallet and support their lifecycle.

### Deposit Data

- [x] Deposit ID
- [x] Plan ID
- [x] Principal
- [x] APR snapshot
- [x] Penalty snapshot
- [x] Start date
- [x] Maturity date
- [x] Expected interest
- [x] Status
- [x] Available actions

### Ownership

- [x] Ownership is checked through `ownerOf(depositId)`
- [x] Only certificates currently owned by the connected wallet are displayed

### Actions

- [x] Early withdrawal before maturity
- [x] Mature withdrawal at or after maturity
- [x] Manual renewal at or after maturity
- [x] Confirmation UI
- [x] Pending transaction states
- [x] Readable transaction errors
- [x] Refresh after successful actions

### Lifecycle Behavior

- [x] Early withdrawal displays the snapshotted penalty
- [x] Mature withdrawal returns principal and available interest
- [x] Manual renewal marks the old certificate as `Manually Renewed`
- [x] Manual renewal creates a new active deposit certificate
- [x] Historical certificates remain visible
- [x] Maturity decisions use blockchain block time

### Remaining Item

- [ ] Claim pending interest through the frontend

---

## Phase 8 — UX Polish and Demo Preparation

**Goal**: Make the application clear, stable, and presentation-ready.

- [x] Add reusable loading cards
- [x] Add reusable state messages
- [x] Add readable blockchain error mapping
- [x] Improve disconnected-wallet handling
- [x] Improve wrong-network handling
- [x] Improve empty states
- [x] Add retry actions
- [x] Add Not Found page
- [x] Add basic responsive and focus styling
- [x] Hide Etherscan links on localhost
- [x] Use dynamic network names in UI messages

---

## Phase 9 — Local Demo Automation

**Goal**: Make the frontend reliable for demonstration on Hardhat Localhost.

- [x] Start local Hardhat node
- [x] Deploy contracts to localhost
- [x] Generate frontend localhost configuration
- [x] Import a Hardhat account into MetaMask
- [x] Add the local Hardhat network to MetaMask
- [x] Mint MockUSDC to the demo account
- [x] Fund the vault
- [x] Create a 1-day demo saving plan
- [x] Open deposits through the frontend
- [x] Advance blockchain time using a helper script
- [x] Demonstrate mature withdrawal
- [x] Demonstrate manual renewal
- [x] Verify page refresh does not break the application
- [x] Verify maturity UI uses blockchain time
- [x] Verify clean local-node reset workflow

### Root Commands

Terminal 1:

```bash
npm run node:local
```

Terminal 2:

```bash
npm run demo:setup
```

Terminal 3:

```bash
cd frontend
npm run dev
```

Advance time:

```bash
set ADVANCE_DAYS=2
npm run demo:advance
```

See:

```text
docs/LOCAL_DEMO.md
```

for the complete procedure.

---

## 7. Final Verification Checklist

### Frontend Build

- [x] `npm run build` succeeds
- [x] No TypeScript errors
- [x] Vite production bundle succeeds

### Wallet

- [x] MetaMask connects
- [x] Correct network is detected
- [x] Account changes are handled
- [x] Network changes are handled
- [x] User rejection is handled

### Data Display

- [x] USDC uses 6 decimals
- [x] APR and penalty are shown as percentages
- [x] Dates are readable
- [x] Deposit status is clear
- [x] Maturity actions depend on blockchain time

### Transactions

- [x] Approve succeeds
- [x] Open deposit succeeds
- [x] Early-withdraw confirmation works
- [x] Mature withdraw succeeds
- [x] Manual renew succeeds
- [x] Duplicate submissions are prevented
- [ ] Pending-interest claim is available through the frontend

### UI/UX

- [x] Clear navigation
- [x] Professional banking-dashboard appearance
- [x] Clear loading and transaction feedback
- [x] Invalid actions are hidden or disabled
- [x] Errors are understandable
- [x] Localhost explorer links are hidden

### Scope Control

- [x] No unnecessary charts
- [x] No animation library
- [x] No global state library
- [x] No backend API
- [x] No unrelated smart-contract changes

---

## 8. Definition of Done

The current demo scope is complete when:

- core user flows work through the UI
- the application builds without errors
- contract addresses are configured through centralized environment-aware configuration
- MetaMask works on Sepolia and Hardhat Localhost
- MockUSDC values are formatted with 6 decimals
- transaction progress and errors are visible
- blockchain maturity uses the latest block timestamp
- the local demo can be completed reliably in 3–5 minutes
- local deployment and setup are automated
- local blockchain time can be advanced through a helper script
- browser refresh does not break the application
- frontend and local demo documentation are updated

### Current Status

```text
Frontend core scope: Completed
Local demo automation: Completed
End-to-end local rehearsal: Passed
Pending-interest claim UI: Not implemented
Optional admin UI: Not implemented
Separate deposit detail page: Not implemented
```

---

## 9. Remaining Optional Work

These items are not required for the current demonstration:

1. Claim pending interest through the frontend
2. Separate Deposit Detail page
3. Admin vault dashboard
4. Fund vault through the frontend
5. Pause and unpause controls
6. Automated frontend tests
7. CI workflow

Do not add new smart-contract features unless a confirmed frontend-blocking issue requires a contract change.
