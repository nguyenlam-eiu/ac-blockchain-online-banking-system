# Online Banking System — Frontend

The frontend user interface for the decentralized Online Banking System built on Ethereum smart contracts (`MockUSDC`, `VaultManager`, and `SavingCore`).

---

## 1. Frontend Overview

### Purpose
The Online Banking System frontend provides a user-friendly Web3 interface for interacting with term deposit savings contracts. Users can connect their MetaMask wallet, inspect savings plans, open term deposits with MockUSDC (6 decimals), monitor active certificates, execute premature or mature withdrawals, and renew maturing deposits.

### Current Implemented Features
- **Wallet Integration**: One-click MetaMask wallet connection with real-time account and chain network validation.
- **Dashboard Overview**: Displays user MockUSDC balance, banking system active/paused status, active deposit count, total active principal, and pending deferred interest reserves.
- **Savings Plans Directory**: Interactive catalog of available term plans detailing tenor duration, APR percentage (BPS), min/max deposit limits, and early withdrawal penalty rates.
- **Deposit Certificate Management**:
  - Open new term deposits with automatic ERC20 token approval flow.
  - Track active deposit certificates (ERC721 tokens) with real-time maturity countdowns and status indicators (`Active`, `Withdrawn`, `ManualRenewed`, `AutoRenewed`).
  - Perform **Early Withdrawal** subject to early penalty rates.
  - Perform **Withdrawal at Maturity** to claim original principal plus expected interest.
  - Perform **Manual Renewal** at maturity to compound principal and accrued interest into a new term deposit.
- **Dynamic Network & Explorer Handling**: Automatically detects local (`Hardhat Localhost`) or testnet (`Sepolia`) environments, safely toggling transaction explorer links as appropriate.

### Supported User Workflows
1. **Connect & Verify**: Connect MetaMask wallet and verify network compatibility.
2. **Open Deposit**: Select a plan from **Plans**, input deposit amount, approve USDC allowance, and confirm transaction.
3. **Monitor & Manage**: Track active deposits on **My Deposits**.
4. **Withdraw or Renew**: Upon maturity (or after advancing local EVM time), withdraw funds to receive principal and interest, or renew the deposit certificate.

---

## 2. Technology Stack

- **React (`^18.3.1`)**: Component-based user interface framework.
- **TypeScript (`^5.6.3`)**: Type-safe application logic and contract interaction bindings.
- **Vite (`^5.4.10`)**: High-performance development server and production bundler.
- **Tailwind CSS (`^4.3.3`)**: Modern utility-first styling with `@tailwindcss/vite`.
- **ethers v6 (`^6.13.5`)**: Ethereum Web3 provider, contract factory, unit formatting, and signer abstraction.
- **react-router-dom (`^6.28.0`)**: Client-side application routing (`/`, `/plans`, `/deposits`).
- **lucide-react (`^1.25.0`)**: Modern icon set for UI component indicators.
- **MetaMask**: Injected Ethereum provider (`window.ethereum`) for Web3 account signing.

---

## 3. Project Structure

The codebase inside `src/` is organized into focused modular directories:

- `src/blockchain`: Smart contract ABIs, contract factory getters, strict environment configuration resolvers (`addresses.ts`), unit conversion utilities (USDC 6-decimal precision, BPS calculations, timestamp formatting).
- `src/components`: UI presentation components including page layouts (`AppLayout`, `Sidebar`, `PageHeader`), cards (`StatCard`, `PlanCard`, `DepositCard`), wallet connection controls (`WalletButton`), deposit forms (`OpenDepositForm`), and state feedback components (`StateMessage`, `LoadingCard`).
- `src/context`: React Context providers (`WalletContext.tsx`) managing global Web3 wallet connection state, signer instance, current user address, and network verification logic.
- `src/hooks`: Custom React hooks encapsulating smart contract calls and state fetching (`useWallet`, `useUsdcBalance`, `usePlans`, `useDeposits`, `useOpenDeposit`, `useDepositActions`, `useSystemStatus`, `usePendingInterest`, `useDepositSummary`).
- `src/pages`: Application route page views (`DashboardPage`, `PlansPage`, `DepositsPage`, `NotFoundPage`).
- `src/utils`: Utility helpers, including contract revert and RPC network error parser (`getErrorMessage.ts`).

---

## 4. Environment Configuration

The frontend dynamically configures its chain ID, network name, and contract addresses using Vite environment variables.

### Environment Files
- `frontend/.env.local`: Local environment file containing active deployment settings.
- `frontend/.env.example`: Reference environment template with default documented variables.

### Environment Variables
| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `VITE_CHAIN_ID` | Network Chain ID (integer) | `31337` |
| `VITE_NETWORK_NAME` | Display name of the connected network | `Hardhat Localhost` |
| `VITE_MOCK_USDC_ADDRESS` | Deployed `MockUSDC` ERC20 contract address | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `VITE_VAULT_MANAGER_ADDRESS` | Deployed `VaultManager` contract address | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `VITE_SAVING_CORE_ADDRESS` | Deployed `SavingCore` ERC721 contract address | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

### Critical Rules
- **Automatic Generation**: Running `npm run demo:setup` from the repository root automatically generates `frontend/.env.local` with the newly deployed local contract addresses.
- **Server Restart**: If `.env.local` is modified or regenerated while Vite is running, the Vite development server must be restarted to pick up the updated environment variables.
- **Git Ignore**: `frontend/.env.local` is listed in `.gitignore` and must **never** be committed into version control.
- **No Configuration Mixing**: The frontend enforces strict environment validation. If custom environment variables are provided, all 5 must be defined. The application will throw an explicit error if `VITE_CHAIN_ID=31337` (localhost) is silently combined with Sepolia default fallback contract addresses.

---

## 5. Installation and Commands

Run all commands from the `frontend` directory:

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```
