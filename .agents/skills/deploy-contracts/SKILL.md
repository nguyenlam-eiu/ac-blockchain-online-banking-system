---
name: deploy-contracts
description: Procedure for deploying MockUSDC, VaultManager, and SavingCore contracts locally or to Sepolia testnet
---

# Contract Deployment Skill

Use this skill when deploying the smart contract ecosystem to a local Hardhat node or to the Sepolia testnet.

## Deployment Order & Dependencies

1. **Deploy `MockUSDC`**:
   - Constructor requires name (`Mock USDC`) and symbol (`mUSDC`).
2. **Deploy `VaultManager`**:
   - Constructor requires `MockUSDC` contract address.
3. **Deploy `SavingCore`**:
   - Constructor requires `MockUSDC` address and `VaultManager` address.
4. **Wire Connections**:
   - Call `vaultManager.setSavingCore(savingCoreAddress)` to grant `SavingCore` permissions to allocate and release interest.

## Execution

### Local Node Deployment
```bash
npm run deploy:localhost
# or
npx hardhat run scripts/deploy.ts --network localhost
```

### Sepolia Testnet Deployment
```bash
npm run deploy:sepolia
# or
npx hardhat run scripts/deploy.ts --network sepolia
```

> **Note**: `scripts/deploy.ts` automatically wires `vaultManager.setSavingCore`, creates default Plan #1 (Student ID `2231200021`), and funds `VaultManager` with 100,000 USDC interest liquidity on local networks.

## Verification Checklist
- [ ] Confirm `savingCore` state variable is set inside `VaultManager`.
- [ ] Confirm default saving plan is created using Student ID variant values (Grace Period: 3 days, APR: 225 bps, Penalty: 400 bps, Tenor: 90 days).
