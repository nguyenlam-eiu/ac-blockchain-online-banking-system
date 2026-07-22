import { ethers, network } from "hardhat";

async function main() {
  console.log("=================================================");
  console.log("🚀 Starting Smart Contract Deployment Protocol");
  console.log(`📡 Target Network: ${network.name}`);
  console.log("=================================================\n");

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`👤 Deployer Address: ${deployerAddress}`);
  console.log(`💰 Deployer ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

  // 1. Deploy MockUSDC
  console.log("1️⃣  Deploying MockUSDC (ERC20, 6 Decimals)...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdcToken = await MockUSDC.deploy("Mock USDC", "mUSDC");
  await usdcToken.waitForDeployment();
  const usdcAddress = await usdcToken.getAddress();
  console.log(`   ✅ MockUSDC deployed at: ${usdcAddress}`);

  // 2. Deploy VaultManager
  console.log("\n2️⃣  Deploying VaultManager...");
  const VaultManager = await ethers.getContractFactory("VaultManager");
  const vaultManager = await VaultManager.deploy(usdcAddress);
  await vaultManager.waitForDeployment();
  const vaultAddress = await vaultManager.getAddress();
  console.log(`   ✅ VaultManager deployed at: ${vaultAddress}`);

  // 3. Deploy SavingCore
  console.log("\n3️⃣  Deploying SavingCore...");
  const SavingCore = await ethers.getContractFactory("SavingCore");
  const savingCore = await SavingCore.deploy(usdcAddress, vaultAddress);
  await savingCore.waitForDeployment();
  const savingCoreAddress = await savingCore.getAddress();
  console.log(`   ✅ SavingCore deployed at: ${savingCoreAddress}`);

  // 4. Wire Permissions: VaultManager.setSavingCore
  console.log("\n4️⃣  Wiring Permissions (VaultManager.setSavingCore)...");
  const setTx = await vaultManager.setSavingCore(savingCoreAddress);
  await setTx.wait();
  console.log("   ✅ VaultManager setSavingCore permission linked successfully.");

  // 5. Initialize Default Term Plan (Student ID: 2231200021 Variant)
  // Grace Period: 3 days | APR: 225 bps (2.25%) | Penalty: 400 bps (4.00%) | Tenor: 90 days
  console.log("\n5️⃣  Initializing Default Term Deposit Plan (Student ID: 2231200021)...");
  const tenorDays = 90;
  const aprBps = 225; // 2.25%
  const minDeposit = ethers.parseUnits("1", 6); // 1 USDC
  const maxDeposit = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
  const penaltyBps = 400; // 4.00%

  const planTx = await savingCore.createPlan(
    tenorDays,
    aprBps,
    minDeposit,
    maxDeposit,
    penaltyBps
  );
  await planTx.wait();
  console.log("   ✅ Default Saving Plan #1 Created:");
  console.log(`      • Tenor: ${tenorDays} days`);
  console.log(`      • APR: ${aprBps} bps (${aprBps / 100}%)`);
  console.log(`      • Min Deposit: ${ethers.formatUnits(minDeposit, 6)} USDC`);
  console.log(`      • Max Deposit: ${ethers.formatUnits(maxDeposit, 6)} USDC`);
  console.log(`      • Early Withdraw Penalty: ${penaltyBps} bps (${penaltyBps / 100}%)`);

  // 6. Local Network Liquidity Provisioning
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("\n6️⃣  Local Network Liquidity Setup...");
    const initialFunding = ethers.parseUnits("100000", 6); // 100,000 USDC

    // Mint test USDC to deployer
    const mintTx = await usdcToken.mint(deployerAddress, initialFunding);
    await mintTx.wait();

    // Approve VaultManager
    const approveTx = await usdcToken.approve(vaultAddress, initialFunding);
    await approveTx.wait();

    // Fund VaultManager
    const fundTx = await vaultManager.fundVault(initialFunding);
    await fundTx.wait();

    console.log(`   ✅ VaultManager funded with ${ethers.formatUnits(initialFunding, 6)} USDC interest liquidity.`);
  }

  console.log("\n=================================================");
  console.log("🎉 Deployment & Setup Complete!");
  console.log("=================================================");
  console.log(`• MockUSDC     : ${usdcAddress}`);
  console.log(`• VaultManager : ${vaultAddress}`);
  console.log(`• SavingCore   : ${savingCoreAddress}`);
  console.log("=================================================");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
