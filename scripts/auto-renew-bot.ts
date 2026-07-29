import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";

const ACTIVE_STATUS = 0n;

function readSavingCoreAddress(): string {
  const envPath = path.resolve(process.cwd(), "frontend", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("frontend/.env.local was not found. Run npm run demo:setup first.");
  }
  const envContent = fs.readFileSync(envPath, "utf-8");
  const line = envContent
    .split(/\r?\n/)
    .find((item) => item.startsWith("VITE_SAVING_CORE_ADDRESS=") || item.startsWith("VITE_SAVING_CORE="));
  if (!line) throw new Error("SavingCore address was not found in frontend/.env.local.");
  const address = line.split("=").slice(1).join("=").trim();
  if (!ethers.isAddress(address)) throw new Error(`Invalid SavingCore address: ${address}`);
  return address;
}

async function main(): Promise<void> {
  const chain = await ethers.provider.getNetwork();
  const [botSigner] = await ethers.getSigners();
  const savingCoreAddress = readSavingCoreAddress();
  const savingCore = await ethers.getContractAt("SavingCore", savingCoreAddress, botSigner);
  const nextDepositId: bigint = await savingCore.nextDepositId();
  const gracePeriod: bigint = await savingCore.GRACE_PERIOD();
  const latestBlock = await ethers.provider.getBlock("latest");
  if (!latestBlock) throw new Error("Unable to read latest block.");
  const now = BigInt(latestBlock.timestamp);

  console.log(`Auto-renew bot on ${network.name} (${chain.chainId})`);
  console.log(`SavingCore: ${savingCoreAddress}`);

  let renewed = 0;
  let skipped = 0;
  let failed = 0;

  for (let depositId = 1n; depositId < nextDepositId; depositId++) {
    const deposit = await savingCore.deposits(depositId);

    const eligible = deposit.status === ACTIVE_STATUS && now >= deposit.maturityAt + gracePeriod;

    if (!eligible) {
      skipped++;
      continue;
    }

    try {
      console.log(`Deposit #${depositId} is eligible`);

      const tx = await savingCore.autoRenewDeposit(depositId);

      console.log(`Transaction hash: ${tx.hash}`);

      const receipt = await tx.wait();

      console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);

      const oldDeposit = await savingCore.deposits(depositId);

      const updatedNextDepositId: bigint = await savingCore.nextDepositId();

      const newDepositId = updatedNextDepositId - 1n;

      const newDeposit = await savingCore.deposits(newDepositId);

      console.log(`Old certificate #${depositId} status: ${oldDeposit.status}`);

      console.log(`New certificate #${newDepositId} status: ${newDeposit.status}`);

      renewed++;
    } catch (error) {
      failed++;

      console.error(`Failed to auto-renew deposit #${depositId}:`, error);
    }
  }

  console.log(`Done. Renewed: ${renewed}, skipped: ${skipped}, failed: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
