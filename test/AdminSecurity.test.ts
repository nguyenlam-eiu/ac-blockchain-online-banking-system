import { expect } from "chai";
import { ethers } from "hardhat";

const usdc = (amount: string) => ethers.parseUnits(amount, 6);

async function expectRevert(action: Promise<unknown>, reason: string) {
  try {
    await action;
  } catch (error) {
    expect((error as Error).message).to.include(reason);
    return;
  }

  expect.fail(`Expected revert: ${reason}`);
}

describe("Admin Security and Audit Log", function () {
  async function deployFixture() {
    const [admin, attacker, feeReceiver, savingCoreAccount] =
      await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy("Mock USDC", "mUSDC");
    await token.waitForDeployment();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    const vault = await VaultManager.deploy(await token.getAddress());
    await vault.waitForDeployment();

    const SavingCore = await ethers.getContractFactory("SavingCore");
    const savingCore = await SavingCore.deploy(
      await token.getAddress(),
      await vault.getAddress()
    );
    await savingCore.waitForDeployment();

    await vault.setSavingCore(await savingCore.getAddress());

    return {
      admin,
      attacker,
      feeReceiver,
      savingCoreAccount,
      token,
      vault,
      savingCore,
    };
  }

  async function readEvent(
    transaction: Awaited<ReturnType<typeof ethers.provider.getTransaction>> | any,
    contract: any,
    eventName: string
  ) {
    const receipt = await transaction.wait();
    if (!receipt) {
      throw new Error("Missing transaction receipt");
    }

    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === eventName) {
          return { parsed, receipt };
        }
      } catch {
        // Ignore logs emitted by other contracts.
      }
    }

    throw new Error(`Missing ${eventName} event`);
  }

  async function blockTimestamp(blockNumber: number): Promise<bigint> {
    const block = await ethers.provider.getBlock(blockNumber);
    if (!block) {
      throw new Error("Missing transaction block");
    }
    return BigInt(block.timestamp);
  }

  it("audits plan creation with actor, plan data, and timestamp", async function () {
    const { admin, savingCore } = await deployFixture();

    const tx = await savingCore.createPlan(
      90,
      225,
      usdc("1"),
      usdc("1000000"),
      400
    );
    const { parsed, receipt } = await readEvent(tx, savingCore, "PlanCreated");

    expect(parsed.args.planId).to.equal(1n);
    expect(parsed.args.actor).to.equal(admin.address);
    expect(parsed.args.tenorDays).to.equal(90n);
    expect(parsed.args.aprBps).to.equal(225n);
    expect(parsed.args.minDeposit).to.equal(usdc("1"));
    expect(parsed.args.maxDeposit).to.equal(usdc("1000000"));
    expect(parsed.args.earlyWithdrawPenaltyBps).to.equal(400n);
    expect(parsed.args.timestamp).to.equal(
      await blockTimestamp(receipt.blockNumber)
    );
  });

  it("audits plan updates and status changes", async function () {
    const { admin, savingCore } = await deployFixture();

    await savingCore.createPlan(90, 225, usdc("1"), 0, 400);

    const updateTx = await savingCore.updatePlan(1, 300);
    const { parsed: updated } = await readEvent(
      updateTx,
      savingCore,
      "PlanUpdated"
    );
    expect(updated.args.actor).to.equal(admin.address);
    expect(updated.args.previousAprBps).to.equal(225n);
    expect(updated.args.newAprBps).to.equal(300n);

    const disableTx = await savingCore.disablePlan(1);
    const { parsed: disabled } = await readEvent(
      disableTx,
      savingCore,
      "PlanStatusChanged"
    );
    expect(disabled.args.actor).to.equal(admin.address);
    expect(disabled.args.planId).to.equal(1n);
    expect(disabled.args.enabled).to.equal(false);

    const enableTx = await savingCore.enablePlan(1);
    const { parsed: enabled } = await readEvent(
      enableTx,
      savingCore,
      "PlanStatusChanged"
    );
    expect(enabled.args.enabled).to.equal(true);
  });

  it("audits vault funding and withdrawal", async function () {
    const { admin, token, vault } = await deployFixture();

    await token.mint(admin.address, usdc("1000"));
    await token.approve(await vault.getAddress(), usdc("1000"));

    const fundTx = await vault.fundVault(usdc("1000"));
    const { parsed: funded } = await readEvent(fundTx, vault, "VaultFunded");
    expect(funded.args.actor).to.equal(admin.address);
    expect(funded.args.amount).to.equal(usdc("1000"));

    const withdrawTx = await vault.withdrawVault(usdc("250"));
    const { parsed: withdrawn } = await readEvent(
      withdrawTx,
      vault,
      "VaultWithdrawn"
    );
    expect(withdrawn.args.actor).to.equal(admin.address);
    expect(withdrawn.args.amount).to.equal(usdc("250"));
  });

  it("audits fee receiver changes and pause state", async function () {
    const { admin, feeReceiver, vault } = await deployFixture();

    const previousFeeReceiver = await vault.feeReceiver();
    const receiverTx = await vault.setFeeReceiver(feeReceiver.address);
    const { parsed: receiverChanged } = await readEvent(
      receiverTx,
      vault,
      "FeeReceiverSet"
    );
    expect(receiverChanged.args.actor).to.equal(admin.address);
    expect(receiverChanged.args.previousFeeReceiver).to.equal(previousFeeReceiver);
    expect(receiverChanged.args.newFeeReceiver).to.equal(feeReceiver.address);

    const pauseTx = await vault.pause();
    const { parsed: paused } = await readEvent(pauseTx, vault, "SystemPaused");
    expect(paused.args.actor).to.equal(admin.address);

    const unpauseTx = await vault.unpause();
    const { parsed: unpaused } = await readEvent(
      unpauseTx,
      vault,
      "SystemUnpaused"
    );
    expect(unpaused.args.actor).to.equal(admin.address);
  });

  it("prevents non-admin accounts from using all administrative controls", async function () {
    const { attacker, feeReceiver, vault, savingCore } = await deployFixture();

    await expectRevert(
      savingCore.connect(attacker).createPlan(90, 225, usdc("1"), 0, 400),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      savingCore.connect(attacker).updatePlan(1, 300),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      savingCore.connect(attacker).enablePlan(1),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      savingCore.connect(attacker).disablePlan(1),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      vault.connect(attacker).fundVault(usdc("1")),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      vault.connect(attacker).withdrawVault(usdc("1")),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      vault.connect(attacker).setFeeReceiver(feeReceiver.address),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      vault.connect(attacker).pause(),
      "OwnableUnauthorizedAccount"
    );
    await expectRevert(
      vault.connect(attacker).unpause(),
      "OwnableUnauthorizedAccount"
    );
  });
});
