# Local Hardhat Demo Environment Guide (Phase 9)

This document provides a step-by-step guide to running the local Hardhat demo environment for the Online Banking System.

---

## Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MetaMask Extension**: Installed in your web browser

---

## Quick Start (Three-Terminal Startup Procedure)

Running the demo environment requires three separate terminal sessions opened at the repository root:

### Terminal 1: Start the Local Blockchain Node
```bash
npm run node:local
```
> [!IMPORTANT]
> Keep Terminal 1 running. The console will print the 20 local development accounts and their private keys.
> **Account #0** (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) is the designated deployer and demo user.

### Terminal 2: Run Local Setup
```bash
npm run demo:setup
```
This single command automatically:
1. Deploys `MockUSDC`, `VaultManager`, and `SavingCore` contracts to the local chain (`chain ID 31337`).
2. Links contract permissions (`VaultManager.setSavingCore`).
3. Mints 10,000 MockUSDC to the demo account (`Account #0`).
4. Funds the `VaultManager` interest pool with 100,000 MockUSDC.
5. Creates Demo Saving Plan #1 (1-day tenor, 2.25% APR, 1 USDC min, 1,000,000 USDC max, 4% penalty).
6. Performs on-chain state verification.
7. Automatically generates `frontend/.env.local` with the newly deployed contract addresses.

> [!NOTE]
> `npm run demo:setup` must be executed **before** starting the frontend Vite dev server so Vite picks up `frontend/.env.local`. If you run setup while Vite is already running, you must restart Vite (Terminal 3).

### Terminal 3: Start the Frontend
```bash
cd frontend
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## MetaMask Setup & Import

> [!CAUTION]
> Hardhat default development accounts and private keys are intended strictly for local development on chain ID 31337. Never transfer real funds to these accounts.

### 1. Add Hardhat Localhost Network in MetaMask
In MetaMask, go to **Settings** > **Networks** > **Add a network** > **Add a network manually**:

- **Network name**: `Hardhat Localhost`
- **New RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency symbol**: `ETH`

Save and switch to the `Hardhat Localhost` network.

### 2. Import Account #0
1. Copy the private key for Account #0 printed by `npm run node:local` in Terminal 1 (or default: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`).
2. Open MetaMask account dropdown > **Import account**.
3. Paste the private key and click **Import**.
4. Confirm account address is `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.

---

## Full Demo Walkthrough Scenarios

### Scenario A: Open Two Deposits
1. Connect MetaMask to `http://localhost:5173` using imported Account #0.
2. Navigate to **Plans** page.
3. Locate **Plan #1** (1-day tenor, 2.25% APR).
4. Click **Open Deposit**:
   - Deposit 1: Enter `1,000` USDC and confirm approving + opening deposit in MetaMask.
   - Deposit 2: Enter `2,000` USDC and confirm approving + opening deposit in MetaMask.
5. Go to **My Deposits** to verify both deposits appear with `Active` status.

### Scenario B: Advance Blockchain Time
To demonstrate maturity behavior without waiting 24 real-world hours:

Open Terminal 2 and run:
```bash
set ADVANCE_DAYS=2
npm run demo:advance
```
*(On macOS/Linux bash: `ADVANCE_DAYS=2 npm run demo:advance`)*

This advances the local EVM time by 2 days (172,800 seconds) and mines a block.

### Scenario C: Withdraw Deposit #1 at Maturity
1. Refresh or view **My Deposits** page.
2. Observe that Deposit #1 status has updated from `Active` to `Matured`.
3. Click **Withdraw at Maturity** on Deposit #1.
4. Confirm transaction in MetaMask.
5. Check **Dashboard** — your USDC balance increases by the principal (1,000 USDC) plus accrued interest.

### Scenario D: Renew Deposit #2
1. Locate Deposit #2 on **My Deposits** page.
2. Click **Renew Deposit**.
3. Confirm transaction in MetaMask.
4. Observe that Deposit #2 updates to `Renewed`, and a new active deposit certificate is created with compound principal + interest.

---

## Resetting the Demo Environment

If you want to reset the environment back to clean initial state:

1. **Stop Node**: Press `Ctrl+C` in Terminal 1 to stop the Hardhat node.
2. **Restart Node**: Run `npm run node:local` in Terminal 1.
   *(Restarting the node completely wipes all deployed contracts, balances, plans, and deposits from memory).*
3. **Re-run Setup**: In Terminal 2, run:
   ```bash
   npm run demo:setup
   ```
4. **Restart Frontend**: In Terminal 3, restart the Vite server (`Ctrl+C` then `npm run dev`).

### Troubleshooting: Nonce & Tx Errors After Chain Reset
Because restarting the local node resets transaction nonces back to `0`, MetaMask may display a nonce error or pending transaction error.

**Fix in MetaMask**:
1. Go to **Settings** > **Advanced**.
2. Click **Clear activity and nonce data**.
3. Confirm. Refresh the frontend page.
