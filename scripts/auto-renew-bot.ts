import fs from "fs";
import path from "path";
import { setTimeout as sleep } from "node:timers/promises";
import { ethers, network } from "hardhat";

const ACTIVE_STATUS = 0n;
const SCAN_INTERVAL_MS = 5_000;

function readSavingCoreAddress(): string {
  const envPath = path.resolve(
    process.cwd(),
    "frontend",
    ".env.local"
  );

  if (!fs.existsSync(envPath)) {
    throw new Error(
      "frontend/.env.local was not found. Run npm run demo:setup first."
    );
  }

  const envContent = fs.readFileSync(envPath, "utf-8");

  const line = envContent
    .split(/\r?\n/)
    .find(
      (item) =>
        item.startsWith("VITE_SAVING_CORE_ADDRESS=") ||
        item.startsWith("VITE_SAVING_CORE=")
    );

  if (!line) {
    throw new Error(
      "SavingCore address was not found in frontend/.env.local."
    );
  }

  const address = line
    .split("=")
    .slice(1)
    .join("=")
    .trim();

  if (!ethers.isAddress(address)) {
    throw new Error(
      `Invalid SavingCore address: ${address}`
    );
  }

  return address;
}

async function getBlockchainTimestamp(): Promise<bigint> {
  const latestBlock = await ethers.provider.getBlock("latest");

  if (!latestBlock) {
    throw new Error("Unable to read latest block.");
  }

  return BigInt(latestBlock.timestamp);
}

async function scanDeposits(
  savingCore: any
): Promise<void> {
  const nextDepositId: bigint =
    await savingCore.nextDepositId();

  const gracePeriod: bigint =
    await savingCore.GRACE_PERIOD();

  const now = await getBlockchainTimestamp();

  let renewed = 0;
  let skipped = 0;
  let failed = 0;

  console.log("");
  console.log("========================================");
  console.log(`Scan started: ${new Date().toISOString()}`);
  console.log(`Blockchain timestamp: ${now}`);
  console.log(`Grace period: ${gracePeriod} seconds`);
  console.log(
    `Deposits to scan: ${nextDepositId > 1n ? nextDepositId - 1n : 0n}`
  );
  console.log("========================================");

  for (
    let depositId = 1n;
    depositId < nextDepositId;
    depositId++
  ) {
    try {
      const deposit =
        await savingCore.deposits(depositId);

      const maturityAt = BigInt(deposit.maturityAt);
      const status = BigInt(deposit.status);

      const autoRenewAt =
        maturityAt + gracePeriod;

      const isExpiredBeyondGracePeriod =
        status === ACTIVE_STATUS &&
        now >= autoRenewAt;

      if (!isExpiredBeyondGracePeriod) {
        skipped++;
        continue;
      }

      console.log("");
      console.log(
        `Deposit #${depositId} passed the grace period.`
      );
      console.log(`Maturity timestamp: ${maturityAt}`);
      console.log(`Auto-renew timestamp: ${autoRenewAt}`);
      console.log(`Current timestamp: ${now}`);

      /*
       * Store nextDepositId before the transaction.
       * This lets us check whether a new certificate was created.
       */
      const beforeNextDepositId: bigint =
        await savingCore.nextDepositId();

      const tx =
        await savingCore.autoRenewDeposit(depositId);

      console.log(
        `Transaction submitted: ${tx.hash}`
      );

      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error(
          `No receipt returned for deposit #${depositId}.`
        );
      }

      console.log(
        `Transaction confirmed in block ${receipt.blockNumber}.`
      );

      const oldDeposit =
        await savingCore.deposits(depositId);

      console.log(
        `Old certificate #${depositId} status: ${oldDeposit.status}`
      );

      /*
       * Prefer reading the newDepositId from an event.
       * Supported event names:
       * - DepositRenewed
       * - Renewed
       */
      let eventNewDepositId: bigint | null = null;

      for (const log of receipt.logs) {
        try {
          const parsedLog =
            savingCore.interface.parseLog(log);

          if (
            parsedLog &&
            (
              parsedLog.name === "DepositRenewed" ||
              parsedLog.name === "Renewed"
            )
          ) {
            const value =
              parsedLog.args.newDepositId ??
              parsedLog.args[1];

            if (value !== undefined) {
              eventNewDepositId = BigInt(value);
              break;
            }
          }
        } catch {
          // Ignore logs emitted by other contracts.
        }
      }

      const afterNextDepositId: bigint =
        await savingCore.nextDepositId();

      let newDepositId: bigint | null =
        eventNewDepositId;

      /*
       * Fallback for contracts where the event cannot be parsed.
       * Safe enough for a local demo with one automation bot.
       */
      if (
        newDepositId === null &&
        afterNextDepositId > beforeNextDepositId
      ) {
        newDepositId =
          afterNextDepositId - 1n;
      }

      if (newDepositId !== null) {
        const newDeposit =
          await savingCore.deposits(newDepositId);

        console.log(
          `New certificate #${newDepositId} status: ${newDeposit.status}`
        );
        console.log(
          `New certificate maturity: ${newDeposit.maturityAt}`
        );
      } else {
        console.log(
          "No new certificate was detected."
        );
      }

      renewed++;
    } catch (error) {
      failed++;

      console.error("");
      console.error(
        `Failed to auto-renew deposit #${depositId}:`
      );
      console.error(error);
    }
  }

  console.log("");
  console.log(
    `Scan completed. Renewed: ${renewed}, skipped: ${skipped}, failed: ${failed}`
  );
}

async function main(): Promise<void> {
  const chain =
    await ethers.provider.getNetwork();

  const [botSigner] =
    await ethers.getSigners();

  const botAddress =
    await botSigner.getAddress();

  const savingCoreAddress =
    readSavingCoreAddress();

  const savingCore =
    await ethers.getContractAt(
      "SavingCore",
      savingCoreAddress,
      botSigner
    );

  console.log("========================================");
  console.log("Auto-renew bot started");
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${chain.chainId}`);
  console.log(`SavingCore: ${savingCoreAddress}`);
  console.log(`Bot address: ${botAddress}`);
  console.log(
    `Scan interval: ${SCAN_INTERVAL_MS / 1_000} seconds`
  );
  console.log("Press Ctrl+C to stop the bot.");
  console.log("========================================");

  while (true) {
    try {
      await scanDeposits(savingCore);
    } catch (error) {
      /*
       * A general scan failure does not stop the bot.
       * It will retry after five seconds.
       */
      console.error("Scan failed:", error);
    }

    await sleep(SCAN_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error("Auto-renew bot stopped:");
  console.error(error);
  process.exitCode = 1;
});
