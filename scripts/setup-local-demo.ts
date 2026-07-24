import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

async function main(): Promise<void> {
  const providerNetwork = await ethers.provider.getNetwork();

  const chainId = providerNetwork.chainId;

  if (chainId !== 31337n) {
    throw new Error(
      `Invalid network chain ID: ${chainId.toString()}. setup-local-demo can only be run on chain ID 31337 (localhost).`
    );
  }

  console.log("=================================================");
  console.log("🚀 Starting Local Hardhat Demo Setup");
  console.log(`📡 Network: ${network.name} (Chain ID: ${chainId.toString()})`);
  console.log("=================================================\n");

  const signers = await ethers.getSigners();

  if (signers.length < 3) {
    throw new Error("At least three Hardhat signers are required.");
  }

  const deployer = signers[0];
  const demoAccount1 = signers[1];
  const alternativeFeeReceiver = signers[2];

  const deployerAddress = await deployer.getAddress();

  const demoAccount1Address = await demoAccount1.getAddress();

  const alternativeFeeReceiverAddress = await alternativeFeeReceiver.getAddress();

  const deployerEthBalance = await ethers.provider.getBalance(deployerAddress);

  const demoAccount1EthBalance = await ethers.provider.getBalance(demoAccount1Address);

  console.log(`👤 Deployer / Owner Account (#0): ${deployerAddress}`);
  console.log(`💰 Account #0 ETH Balance: ${ethers.formatEther(deployerEthBalance)} ETH`);

  console.log(`👤 Secondary Demo Account (#1): ${demoAccount1Address}`);
  console.log(`💰 Account #1 ETH Balance: ${ethers.formatEther(demoAccount1EthBalance)} ETH\n`);

  // 1. Deploy MockUSDC
  console.log("1️⃣ Deploying MockUSDC (ERC20, 6 Decimals)...");

  const MockUSDC = await ethers.getContractFactory("MockUSDC", deployer);

  const usdcToken = await MockUSDC.deploy("Mock USDC", "mUSDC");

  await usdcToken.waitForDeployment();

  const usdcAddress = await usdcToken.getAddress();

  console.log(`   ✅ MockUSDC deployed at: ${usdcAddress}`);

  // 2. Deploy VaultManager
  console.log("\n2️⃣ Deploying VaultManager...");

  const VaultManager = await ethers.getContractFactory("VaultManager", deployer);

  const vaultManager = await VaultManager.deploy(usdcAddress);

  await vaultManager.waitForDeployment();

  const vaultAddress = await vaultManager.getAddress();

  console.log(`   ✅ VaultManager deployed at: ${vaultAddress}`);

  // 3. Deploy SavingCore
  console.log("\n3️⃣ Deploying SavingCore...");

  const SavingCore = await ethers.getContractFactory("SavingCore", deployer);

  const savingCore = await SavingCore.deploy(usdcAddress, vaultAddress);

  await savingCore.waitForDeployment();

  const savingCoreAddress = await savingCore.getAddress();

  console.log(`   ✅ SavingCore deployed at: ${savingCoreAddress}`);

  // 4. Link VaultManager to SavingCore
  console.log("\n4️⃣ Linking VaultManager -> SavingCore permission...");

  const setSavingCoreTx = await vaultManager.setSavingCore(savingCoreAddress);

  await setSavingCoreTx.wait();

  console.log("   ✅ VaultManager setSavingCore linked successfully.");

  // 5. Mint MockUSDC to demo accounts
  console.log("\n5️⃣ Provisioning Demo Account MockUSDC Balances...");

  const account0UsdcAmount = ethers.parseUnits("10000", 6);

  const account1UsdcAmount = ethers.parseUnits("5000", 6);

  const mintAccount0Tx = await usdcToken.mint(deployerAddress, account0UsdcAmount);

  await mintAccount0Tx.wait();

  console.log(`   ✅ Minted 10,000 MockUSDC to Account #0 (${deployerAddress}).`);

  const mintAccount1Tx = await usdcToken.mint(demoAccount1Address, account1UsdcAmount);

  await mintAccount1Tx.wait();

  console.log(`   ✅ Minted 5,000 MockUSDC to Account #1 (${demoAccount1Address}).`);

  // 6. Fund VaultManager
  console.log("\n6️⃣ Funding VaultManager Liquidity...");

  const vaultFundAmount = ethers.parseUnits("100000", 6);

  const mintVaultTx = await usdcToken.mint(deployerAddress, vaultFundAmount);

  await mintVaultTx.wait();

  const approveVaultTx = await usdcToken.approve(vaultAddress, vaultFundAmount);

  await approveVaultTx.wait();

  const fundVaultTx = await vaultManager.fundVault(vaultFundAmount);

  await fundVaultTx.wait();

  console.log("   ✅ VaultManager funded with 100,000 MockUSDC interest liquidity.");

  // Shared plan parameters
  const defaultAprBps = 225n;

  const defaultPenaltyBps = 400n;

  const defaultMinDeposit = ethers.parseUnits("1", 6);

  const defaultMaxDeposit = ethers.parseUnits("1000000", 6);

  // 7. Create Personal Variant Plan
  console.log("\n7️⃣ Creating Personal Variant Saving Plan...");

  const personalPlanTenorDays = 90n;

  const personalPlanTx = await savingCore.createPlan(
    personalPlanTenorDays,
    defaultAprBps,
    defaultMinDeposit,
    defaultMaxDeposit,
    defaultPenaltyBps
  );

  await personalPlanTx.wait();

  const personalPlanId = 1n;

  console.log(`   ✅ Personal Variant Plan #${personalPlanId} created successfully.`);

  // 8. Create Quick Demo Plan
  console.log("\n8️⃣ Creating Quick Demo Saving Plan...");

  const demoPlanTenorDays = 1n;

  const demoPlanTx = await savingCore.createPlan(
    demoPlanTenorDays,
    defaultAprBps,
    defaultMinDeposit,
    defaultMaxDeposit,
    defaultPenaltyBps
  );

  await demoPlanTx.wait();

  const demoPlanId = 2n;

  console.log(`   ✅ Quick Demo Plan #${demoPlanId} created successfully.`);

  // 9. On-chain verification
  console.log("\n9️⃣ Performing On-Chain Verification...");

  const linkedSavingCore = await vaultManager.savingCore();

  if (linkedSavingCore.toLowerCase() !== savingCoreAddress.toLowerCase()) {
    throw new Error(
      `Verification Failure: VaultManager.savingCore mismatch. Expected ${savingCoreAddress}, got ${linkedSavingCore}`
    );
  }

  const actualFeeReceiver = await vaultManager.feeReceiver();

  if (actualFeeReceiver.toLowerCase() !== deployerAddress.toLowerCase()) {
    throw new Error(
      `Verification Failure: Default fee receiver mismatch. Expected admin ${deployerAddress}, got ${actualFeeReceiver}`
    );
  }

  const actualAccount0Balance = await usdcToken.balanceOf(deployerAddress);

  if (actualAccount0Balance !== account0UsdcAmount) {
    throw new Error(
      `Verification Failure: Account #0 MockUSDC balance mismatch. Expected ${account0UsdcAmount}, got ${actualAccount0Balance}`
    );
  }

  const actualAccount1Balance = await usdcToken.balanceOf(demoAccount1Address);

  if (actualAccount1Balance !== account1UsdcAmount) {
    throw new Error(
      `Verification Failure: Account #1 MockUSDC balance mismatch. Expected ${account1UsdcAmount}, got ${actualAccount1Balance}`
    );
  }

  const actualVaultBalance = await usdcToken.balanceOf(vaultAddress);

  if (actualVaultBalance !== vaultFundAmount) {
    throw new Error(
      `Verification Failure: Vault balance mismatch. Expected ${vaultFundAmount}, got ${actualVaultBalance}`
    );
  }

  const personalPlan = await savingCore.plans(personalPlanId);

  if (
    personalPlan.tenorDays !== personalPlanTenorDays ||
    personalPlan.aprBps !== defaultAprBps ||
    personalPlan.minDeposit !== defaultMinDeposit ||
    personalPlan.maxDeposit !== defaultMaxDeposit ||
    personalPlan.earlyWithdrawPenaltyBps !== defaultPenaltyBps ||
    !personalPlan.enabled
  ) {
    throw new Error(
      `Verification Failure: Personal Variant Plan #${personalPlanId} does not match the expected configuration.`
    );
  }

  const demoPlan = await savingCore.plans(demoPlanId);

  if (
    demoPlan.tenorDays !== demoPlanTenorDays ||
    demoPlan.aprBps !== defaultAprBps ||
    demoPlan.minDeposit !== defaultMinDeposit ||
    demoPlan.maxDeposit !== defaultMaxDeposit ||
    demoPlan.earlyWithdrawPenaltyBps !== defaultPenaltyBps ||
    !demoPlan.enabled
  ) {
    throw new Error(`Verification Failure: Quick Demo Plan #${demoPlanId} does not match the expected configuration.`);
  }

  console.log("   ✅ On-chain verification passed successfully!");

  // 10. Generate frontend/.env.local
  console.log("\n🔟 Generating frontend/.env.local...");

  const envContent = [
    "VITE_CHAIN_ID=31337",
    "VITE_NETWORK_NAME=Hardhat Localhost",
    `VITE_MOCK_USDC_ADDRESS=${usdcAddress}`,
    `VITE_VAULT_MANAGER_ADDRESS=${vaultAddress}`,
    `VITE_SAVING_CORE_ADDRESS=${savingCoreAddress}`,
    "",
  ].join("\n");

  const envPath = path.resolve(process.cwd(), "frontend", ".env.local");

  fs.writeFileSync(envPath, envContent, "utf-8");

  console.log(`   ✅ Successfully wrote frontend configuration to: ${envPath}`);

  console.log("\n=================================================");
  console.log("🎉 Local Demo Setup Complete!");
  console.log("=================================================");

  console.log(`• Chain ID                 : ${chainId.toString()}`);

  console.log(`• Account #0               : ${deployerAddress}`);

  console.log(`• Account #0 MockUSDC      : ${ethers.formatUnits(actualAccount0Balance, 6)} USDC`);

  console.log(`• Account #1               : ${demoAccount1Address}`);

  console.log(`• Account #1 MockUSDC      : ${ethers.formatUnits(actualAccount1Balance, 6)} USDC`);

  console.log(`• Default Fee Receiver     : ${actualFeeReceiver} (Account #0 / Admin)`);

  console.log(`• Alternative Receiver     : ${alternativeFeeReceiverAddress} (Account #2)`);

  console.log("ℹ️ Account #0 remains the default fee receiver.");

  console.log("ℹ️ Use the Admin Dashboard to assign Account #2 during the demo.");

  console.log(`• MockUSDC Address         : ${usdcAddress}`);

  console.log(`• VaultManager Address     : ${vaultAddress}`);

  console.log(`• SavingCore Address       : ${savingCoreAddress}`);

  console.log(`• Vault MockUSDC Balance   : ${ethers.formatUnits(actualVaultBalance, 6)} USDC`);

  console.log("-------------------------------------------------");

  console.log(`• Personal Plan ID         : ${personalPlanId.toString()}`);

  console.log(`• Personal Plan Tenor      : ${personalPlan.tenorDays.toString()} day(s)`);

  console.log(
    `• Personal Plan APR        : ${personalPlan.aprBps.toString()} bps (${Number(personalPlan.aprBps) / 100}%)`
  );

  console.log(
    `• Personal Plan Penalty    : ${personalPlan.earlyWithdrawPenaltyBps.toString()} bps (${
      Number(personalPlan.earlyWithdrawPenaltyBps) / 100
    }%)`
  );

  console.log("-------------------------------------------------");

  console.log(`• Quick Demo Plan ID       : ${demoPlanId.toString()}`);

  console.log(`• Quick Demo Plan Tenor    : ${demoPlan.tenorDays.toString()} day(s)`);

  console.log(`• Quick Demo Plan APR      : ${demoPlan.aprBps.toString()} bps (${Number(demoPlan.aprBps) / 100}%)`);

  console.log(
    `• Quick Demo Plan Penalty  : ${demoPlan.earlyWithdrawPenaltyBps.toString()} bps (${
      Number(demoPlan.earlyWithdrawPenaltyBps) / 100
    }%)`
  );

  console.log("=================================================");
}

main().catch((error: unknown) => {
  console.error("❌ Setup failed:", error);

  process.exitCode = 1;
});
