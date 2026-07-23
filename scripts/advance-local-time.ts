import { ethers } from "hardhat";

async function main(): Promise<void> {
  const providerNetwork = await ethers.provider.getNetwork();
  const chainId = providerNetwork.chainId;

  if (chainId !== 31337n) {
    throw new Error(
      `Invalid network chain ID: ${chainId.toString()}. advance-local-time can only be run on chain ID 31337 (localhost).`
    );
  }

  const envDaysStr = process.env.ADVANCE_DAYS || "2";
  const advanceDays = parseFloat(envDaysStr);

  if (isNaN(advanceDays) || advanceDays <= 0 || !isFinite(advanceDays) || advanceDays > 3650) {
    throw new Error(
      `Invalid ADVANCE_DAYS value: "${envDaysStr}". Must be a positive finite number less than or equal to 3650.`
    );
  }

  const secondsToAdvance = Math.floor(advanceDays * 24 * 60 * 60);

  const blockBefore = await ethers.provider.getBlock("latest");
  if (!blockBefore) {
    throw new Error("Unable to read current block header before time advance.");
  }
  const oldTimestamp = blockBefore.timestamp;

  console.log("=================================================");
  console.log(`⏰ Advancing Blockchain Time by ${advanceDays} day(s)...`);
  console.log(`• Previous Timestamp: ${oldTimestamp} (${new Date(oldTimestamp * 1000).toISOString()})`);

  await ethers.provider.send("evm_increaseTime", [secondsToAdvance]);
  await ethers.provider.send("evm_mine", []);

  const blockAfter = await ethers.provider.getBlock("latest");
  if (!blockAfter) {
    throw new Error("Unable to read latest block header after time advance.");
  }
  const newTimestamp = blockAfter.timestamp;
  const actualSecondsAdvanced = newTimestamp - oldTimestamp;

  console.log(`• New Timestamp     : ${newTimestamp} (${new Date(newTimestamp * 1000).toISOString()})`);
  console.log(`• Exact Advanced    : ${actualSecondsAdvanced} seconds`);
  console.log("=================================================");
}

main().catch((error: unknown) => {
  console.error("❌ Time advance failed:", error);
  process.exitCode = 1;
});
