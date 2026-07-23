# Frontend Development Plan — Online Banking System

**Project**: Blockchain Online Banking System  
**Frontend Goal**: Build a minimal, professional, demo-ready React DApp for the existing smart contracts.  
**Target**: Complete the frontend and prepare the demo today.

---

## 1. Scope

The frontend must support the required user flows from the assignment while remaining simple enough to complete and explain during the demo.

### Required Pages

- [ ] Dashboard
- [ ] Plans
- [ ] My Deposits
- [ ] Deposit Detail

### Required User Flows

- [ ] Connect MetaMask
- [ ] Display wallet address and current network
- [ ] Display MockUSDC balance
- [ ] View available saving plans
- [ ] Approve MockUSDC spending
- [ ] Open a deposit
- [ ] View owned deposit certificates
- [ ] Early withdraw before maturity
- [ ] Withdraw at maturity
- [ ] Manual renew after maturity
- [ ] Claim pending interest when available

### Optional Admin Demo Features

Implement only if the required user flows are already complete and stable.

- [ ] Display vault balance
- [ ] Fund vault
- [ ] Pause system
- [ ] Unpause system

---

## 2. Technology Stack

Use:

- React
- TypeScript
- Vite
- Tailwind CSS
- ethers v6
- react-router-dom
- lucide-react

Do not add:

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

The frontend must preserve these contract rules:

- `SavingCore` holds user principal.
- `VaultManager` holds the interest pool.
- APR and penalty are snapshotted when a deposit is opened.
- Deposit ownership follows the ERC721 owner.
- Early withdrawal pays no interest.
- Mature withdrawal may defer unpaid interest through C1.
- Vault withdrawals must respect the C2 solvency guard.
- Withdrawals and renewals are blocked while the system is paused.

---

## 4. Suggested Folder Structure

```text
frontend/src/
├── blockchain/
│   ├── addresses.ts
│   ├── contracts.ts
│   └── format.ts
├── components/
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   ├── WalletButton.tsx
│   ├── StatCard.tsx
│   ├── PlanCard.tsx
│   ├── DepositTable.tsx
│   └── TransactionModal.tsx
├── hooks/
│   ├── useWallet.ts
│   ├── usePlans.ts
│   └── useDeposits.ts
├── pages/
│   ├── DashboardPage.tsx
│   ├── PlansPage.tsx
│   ├── DepositsPage.tsx
│   └── DepositDetailPage.tsx
├── App.tsx
└── main.tsx
```

Do not reorganize this structure unless a concrete implementation problem requires it.

---

## 5. UI/UX Direction

Use a clean banking-dashboard visual style:

- white background
- subtle gray borders
- dark text
- one blue accent color
- consistent spacing
- rounded cards
- readable financial information
- desktop-first responsive layout

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

Every write action must show a clear state:

```text
Idle
→ Waiting for wallet confirmation
→ Transaction submitted
→ Confirming
→ Success or Error
```

Disable action buttons while a transaction is pending.

### Action Availability

Before maturity:

- enable `Early Withdraw`
- disable mature withdrawal
- disable manual renewal

At or after maturity:

- enable `Withdraw`
- enable `Renew Deposit`
- disable early withdrawal

When the system is paused:

- disable withdrawal and renewal actions
- display a visible paused-system warning

---

## 6. Implementation Plan

## Phase 1 — Frontend Setup

**Goal**: Confirm the React frontend builds and runs.

- [x] Initialize or validate Vite React TypeScript setup
- [x] Install `ethers`
- [x] Install `react-router-dom`
- [x] Install and configure Tailwind CSS
- [x] Install `lucide-react`
- [x] Remove default Vite demo content
- [x] Preserve the existing `frontend/src/` folders
- [x] Create a minimal Online Banking System landing page

### Verification

```bash
cd frontend
npm run build
npm run dev
```

Success criteria:

- [x] `npm run build` succeeds
- [x] development server starts
- [x] browser displays the Online Banking System page
- [x] no backend files are modified

---

## Phase 2 — Blockchain Utilities

**Goal**: Centralize configuration and value formatting.

### `addresses.ts`

- [x] Store `MockUSDC` address
- [x] Store `VaultManager` address
- [x] Store `SavingCore` address
- [x] Store expected local network chain ID

### `contracts.ts`

- [x] Import contract ABIs
- [x] Create read-only provider helpers
- [x] Create signer-based contract helpers
- [x] Keep contract creation outside React components

### `format.ts`

- [x] Add `USDC_DECIMALS = 6`
- [x] Add `formatUSDC(value: bigint)`
- [x] Add `parseUSDC(value: string)`
- [x] Add `formatAddress(address: string)`
- [x] Add readable timestamp formatter
- [x] Add BPS-to-percentage formatter

### Verification

- [ ] Token values never use 18 decimals
- [ ] Contract addresses are not hardcoded inside components
- [ ] TypeScript build succeeds

---

## Phase 3 — MetaMask Connection

**Goal**: Connect a wallet and show basic wallet state.

### `useWallet.ts`

- [ ] Detect MetaMask availability
- [ ] Connect wallet only after user clicks `Connect Wallet`
- [ ] Store connected account
- [ ] Store chain ID
- [ ] Store provider and signer
- [ ] Listen for `accountsChanged`
- [ ] Listen for `chainChanged`
- [ ] Handle user rejection
- [ ] Detect wrong network

### UI

- [ ] Add `WalletButton`
- [ ] Display formatted wallet address
- [ ] Display current network
- [ ] Display clear wrong-network warning

### Verification

- [ ] Wallet connects successfully
- [ ] Account change updates the UI
- [ ] Network change updates the UI
- [ ] MetaMask rejection shows a clear error

---

## Phase 4 — Layout and Navigation

**Goal**: Build a professional application shell.

- [ ] Implement `AppLayout`
- [ ] Implement `Sidebar`
- [ ] Configure routes
- [ ] Add navigation for Dashboard, Plans, and My Deposits
- [ ] Add consistent page title and spacing
- [ ] Add responsive sidebar behavior if simple to implement

### Verification

- [ ] All routes render correctly
- [ ] Navigation clearly shows the active page
- [ ] Layout remains readable on common laptop widths

---

## Phase 5 — Dashboard

**Goal**: Show a useful account overview.

Display:

- [ ] MockUSDC balance
- [ ] Total deposited principal
- [ ] Number of active deposits
- [ ] Pending interest amount
- [ ] System pause status
- [ ] Quick links to Plans and My Deposits

### Verification

- [ ] All token values are formatted with 6 decimals
- [ ] Empty wallet state is handled
- [ ] Disconnected wallet state is handled

---

## Phase 6 — Plans Page

**Goal**: Display available plans from `SavingCore`.

### Plan Card Data

- [ ] Plan ID
- [ ] Tenor days
- [ ] APR percentage
- [ ] Minimum deposit
- [ ] Maximum deposit
- [ ] Early-withdraw penalty
- [ ] Enabled/disabled status

### Open Deposit Flow

```text
Enter amount
→ validate amount
→ approve MockUSDC
→ wait for approval confirmation
→ call openDeposit(planId, amount)
→ wait for deposit confirmation
→ refresh balance and deposits
```

### Validation

- [ ] Reject empty amount
- [ ] Reject zero or negative amount
- [ ] Enforce minimum deposit
- [ ] Enforce maximum deposit when non-zero
- [ ] Reject deposit when plan is disabled
- [ ] Reject when wallet is disconnected
- [ ] Reject when system is paused

### Verification

- [ ] Plan #1 displays `90 days`, `2.25% APR`, and `4.00% penalty`
- [ ] Approval transaction succeeds
- [ ] Deposit transaction succeeds
- [ ] New deposit appears in My Deposits

---

## Phase 7 — My Deposits

**Goal**: Display deposit NFTs owned by the connected wallet.

For each deposit, display:

- [ ] Deposit ID
- [ ] Plan ID
- [ ] Principal
- [ ] APR snapshot
- [ ] Penalty snapshot
- [ ] Start date
- [ ] Maturity date
- [ ] Expected interest
- [ ] Status
- [ ] Action link

### Ownership Rule

Deposit ownership must be based on the current ERC721 owner.

Do not assume the wallet still owns every deposit it originally opened.

### Verification

- [ ] Only deposits currently owned by the wallet are shown
- [ ] Raw timestamps are formatted into readable dates
- [ ] Raw token values are never shown

---

## Phase 8 — Deposit Actions

**Goal**: Support the required deposit lifecycle.

### Early Withdraw

- [ ] Available only before maturity
- [ ] Show warning: no interest will be paid
- [ ] Show estimated penalty
- [ ] Confirm transaction
- [ ] Refresh deposit and wallet data

### Withdraw at Maturity

- [ ] Available at or after maturity
- [ ] Show principal and expected interest
- [ ] Explain possible pending-interest behavior from C1
- [ ] Confirm transaction
- [ ] Refresh deposit and wallet data

### Manual Renew

- [ ] Available at or after maturity
- [ ] Explain that principal plus interest becomes the new principal
- [ ] Confirm transaction
- [ ] Refresh owned deposits

### Claim Pending Interest

- [ ] Display only when pending interest is greater than zero
- [ ] Confirm transaction
- [ ] Refresh pending interest and wallet balance

### Verification

- [ ] Invalid actions are disabled
- [ ] Transaction states are visible
- [ ] Duplicate submissions are prevented
- [ ] Successful transactions refresh the UI

---

## Phase 9 — Demo Preparation

**Goal**: Make the frontend reliable for tomorrow’s demonstration.

- [ ] Start local Hardhat node
- [ ] Deploy contracts to localhost
- [ ] Update frontend contract addresses
- [ ] Import a Hardhat account into MetaMask
- [ ] Add the local Hardhat network to MetaMask
- [ ] Mint MockUSDC to the demo account
- [ ] Fund the vault
- [ ] Open a deposit through the frontend
- [ ] Advance blockchain time using a demo helper script
- [ ] Demonstrate mature withdrawal or renewal
- [ ] Verify page refresh does not break the application

### Suggested Commands

```bash
npx hardhat node
npm run deploy:localhost
cd frontend
npm run dev
```

---

## 7. Final Verification Checklist

### Frontend Build

- [ ] `npm run build` succeeds
- [ ] No TypeScript errors
- [ ] No unused critical files or broken imports

### Wallet

- [ ] MetaMask connects
- [ ] Correct network is detected
- [ ] Account changes are handled
- [ ] User rejection is handled

### Data Display

- [ ] USDC uses 6 decimals
- [ ] APR and penalty are shown as percentages
- [ ] Dates are readable
- [ ] Deposit status is clear

### Transactions

- [ ] Approve succeeds
- [ ] Open deposit succeeds
- [ ] Early withdraw succeeds
- [ ] Mature withdraw succeeds
- [ ] Manual renew succeeds
- [ ] Pending-interest claim succeeds when applicable

### UI/UX

- [ ] Clear navigation
- [ ] Professional banking dashboard appearance
- [ ] Clear loading and transaction feedback
- [ ] Invalid actions are disabled
- [ ] Errors are understandable

### Scope Control

- [ ] No unnecessary charts
- [ ] No animation library
- [ ] No global state library
- [ ] No backend API
- [ ] No unrelated smart-contract changes

---

## 8. Definition of Done

The frontend is complete when:

- all required user flows work through the UI
- the application builds without errors
- contract addresses are configured correctly
- MetaMask works on the local Hardhat network
- MockUSDC values are formatted with 6 decimals
- transaction progress is visible
- the demo can be completed reliably in 3–5 minutes
- `docs/planning/plan.md` is updated
- `docs/progress/day7.md` is created using the daily-progress skill

---

## 9. Recommended Priority for Today

1. Frontend setup and Tailwind
2. MetaMask connection
3. Contract utilities and addresses
4. Plans page
5. Open Deposit flow
6. My Deposits page
7. Withdraw and Renew actions
8. Dashboard summary
9. Demo verification
10. README and Day 7 progress update

Do not add new smart-contract features unless a confirmed frontend-blocking bug requires a contract change.
