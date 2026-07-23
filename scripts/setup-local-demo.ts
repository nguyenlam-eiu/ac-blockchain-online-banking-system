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
  console.log("🚀 Starting Local Hardhat Demo Setup (Phase 9)");
  console.log(`📡 Network: ${network.name} (Chain ID: ${chainId.toString()})`);
  console.log("=================================================\n");

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers available from Hardhat provider.");
  }
  const deployer = signers[0];
  const deployerAddress = await deployer.getAddress();
  const ethBalance = await ethers.provider.getBalance(deployerAddress);

  console.log(`👤 Deployer / Demo Account (#0): ${deployerAddress}`);
  console.log(`💰 Deployer ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`);

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

  // 4. Wire Permissions: VaultManager.setSavingCore
  console.log("\n4️⃣ Linking VaultManager -> SavingCore permission...");
  const setTx = await vaultManager.setSavingCore(savingCoreAddress);
  await setTx.wait();
  console.log("   ✅ VaultManager setSavingCore linked successfully.");

  // 5. Mint Demo Account Balance (10,000 USDC)
  console.log("\n5️⃣ Provisioning Demo Account MockUSDC Balance...");
  const demoAccountBalance = ethers.parseUnits("10000", 6);
  const mintDemoTx = await usdcToken.mint(deployerAddress, demoAccountBalance);
  await mintDemoTx.wait();
  console.log(`   ✅ Minted 10,000 MockUSDC to demo account (${deployerAddress}).`);

  // 6. Fund Vault Liquidity (100,000 USDC)
  console.log("\n6️⃣ Funding VaultManager Liquidity...");
  const vaultFundAmount = ethers.parseUnits("100000", 6);
  const mintVaultTx = await usdcToken.mint(deployerAddress, vaultFundAmount);
  await mintVaultTx.wait();

  const approveTx = await usdcToken.approve(vaultAddress, vaultFundAmount);
  await approveTx.wait();

  const fundTx = await vaultManager.fundVault(vaultFundAmount);
  await fundTx.wait();
  console.log(`   ✅ VaultManager funded with 100,000 MockUSDC interest liquidity.`);

  // 7. Create Short Demo Saving Plan
  console.log("\n7️⃣ Creating Short Demo Saving Plan...");
  const tenorDays = 1n;
  const aprBps = 225n; // 2.25%
  const minDeposit = ethers.parseUnits("1", 6); // 1 USDC
  const maxDeposit = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
  const penaltyBps = 400n; // 4.00%

  const planTx = await savingCore.createPlan(
    tenorDays,
    aprBps,
    minDeposit,
    maxDeposit,
    penaltyBps
  );
  await planTx.wait();
  const demoPlanId = 1n;
  console.log(`   ✅ Demo Saving Plan #${demoPlanId} created successfully.`);

  // 8. On-Chain Verification
  console.log("\n8️⃣ Performing On-Chain Verification...");

  const linkedSavingCore = await vaultManager.savingCore();
  if (linkedSavingCore.toLowerCase() !== savingCoreAddress.toLowerCase()) {
    throw new Error(
      `Verification Failure: VaultManager.savingCore mismatch. Expected ${savingCoreAddress}, got ${linkedSavingCore}`
    );
  }

  const actualDemoBalance = await usdcToken.balanceOf(deployerAddress);
  if (actualDemoBalance !== demoAccountBalance) {
    throw new Error(
      `Verification Failure: Demo account balance mismatch. Expected ${demoAccountBalance}, got ${actualDemoBalance}`
    );
  }

  const actualVaultBalance = await usdcToken.balanceOf(vaultAddress);
  if (actualVaultBalance !== vaultFundAmount) {
    throw new Error(
      `Verification Failure: Vault balance mismatch. Expected ${vaultFundAmount}, got ${actualVaultBalance}`
    );
  }

  const plan1 = await savingCore.plans(demoPlanId);
  if (
    plan1.tenorDays !== tenorDays ||
    plan1.aprBps !== aprBps ||
    plan1.minDeposit !== minDeposit ||
    plan1.maxDeposit !== maxDeposit ||
    plan1.earlyWithdrawPenaltyBps !== penaltyBps ||
    !plan1.enabled
  ) {
    throw new Error(
      `Verification Failure: Plan #${demoPlanId} details do not match expected setup config.`
    );
  }
  console.log("   ✅ On-chain verification passed successfully!");

  // 9. Generate frontend/.env.local
  console.log("\n9️⃣ Generating frontend/.env.local...");
  const envContent = [
    `VITE_CHAIN_ID=31337`,
    `VITE_NETWORK_NAME=Hardhat Localhost`,
    `VITE_MOCK_USDC_ADDRESS=${usdcAddress}`,
    `VITE_VAULT_MANAGER_ADDRESS=${vaultAddress}`,
    `VITE_SAVING_CORE_ADDRESS=${savingCoreAddress}`,
    ``,
  ].join("\n");

  const envPath = path.resolve(process.cwd(), "frontend", ".env.local");
  fs.writeFileSync(envPath, envContent, "utf-8");
  console.log(`   ✅ Successfully wrote frontend configuration to: ${envPath}`);

  console.log("\n=================================================");
  console.log("🎉 Local Demo Setup Complete!");
  console.log("=================================================");
  console.log(`• Chain ID               : ${chainId.toString()}`);
  console.log(`• Deployer / Demo Account: ${deployerAddress}`);
  console.log(`• MockUSDC Address       : ${usdcAddress}`);
  console.log(`• VaultManager Address   : ${vaultAddress}`);
  console.log(`• SavingCore Address     : ${savingCoreAddress}`);
  console.log(`• Demo USDC Balance      : ${ethers.formatUnits(actualDemoBalance, 6)} USDC`);
  console.log(`• Vault USDC Balance     : ${ethers.formatUnits(actualVaultBalance, 6)} USDC`);
  console.log(`• Demo Plan ID           : ${demoPlanId.toString()}`);
  console.log(`• Tenor                  : ${plan1.tenorDays.toString()} day(s)`);
  console.log(`• APR                    : ${plan1.aprBps.toString()} bps (${Number(plan1.aprBps) / 100}%)`);
  console.log(`• Minimum Deposit        : ${ethers.formatUnits(plan1.minDeposit, 6)} USDC`);
  console.log(`• Maximum Deposit        : ${ethers.formatUnits(plan1.maxDeposit, 6)} USDC`);
  console.log(`• Early-Withdraw Penalty : ${plan1.earlyWithdrawPenaltyBps.toString()} bps (${Number(plan1.earlyWithdrawPenaltyBps) / 100}%)`);
  console.log("=================================================");
}

main().catch((error: unknown) => {
  console.error("❌ Setup failed:", error);
  process.exitCode = 1;
});
