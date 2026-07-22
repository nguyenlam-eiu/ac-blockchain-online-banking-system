import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const DAY = 24 * 60 * 60;
const DEFAULT_TENOR_DAYS = 90;
const DEFAULT_APR_BPS = 225n;
const DEFAULT_PENALTY_BPS = 400n;
const GRACE_PERIOD = 3 * DAY;

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

function expectedInterest(principal: bigint, aprBps: bigint = DEFAULT_APR_BPS, tenorDays = DEFAULT_TENOR_DAYS) {
  return (principal * aprBps * BigInt(tenorDays * DAY)) / BigInt(365 * DAY * 10000);
}

describe("SavingCore", function () {
  async function deploySavingFixture(options?: { fundVault?: boolean }) {
    const [owner, user, otherUser, feeReceiver] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy("Mock USDC", "mUSDC");
    await token.waitForDeployment();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    const vault = await VaultManager.deploy(await token.getAddress());
    await vault.waitForDeployment();

    const SavingCore = await ethers.getContractFactory("SavingCore");
    const savingCore = await SavingCore.deploy(await token.getAddress(), await vault.getAddress());
    await savingCore.waitForDeployment();

    await vault.setSavingCore(await savingCore.getAddress());
    await vault.setFeeReceiver(feeReceiver.address);
    await savingCore.createPlan(DEFAULT_TENOR_DAYS, DEFAULT_APR_BPS, usdc("1"), usdc("1000000"), DEFAULT_PENALTY_BPS);

    await token.mint(user.address, usdc("10000"));
    await token.connect(user).approve(await savingCore.getAddress(), usdc("10000"));

    await token.mint(owner.address, usdc("10000"));
    await token.approve(await vault.getAddress(), usdc("10000"));
    if (options?.fundVault !== false) {
      await vault.fundVault(usdc("10000"));
    }

    return { token, vault, savingCore, owner, user, otherUser, feeReceiver };
  }

  it("opens a deposit and snapshots APR and penalty", async function () {
    const { token, vault, savingCore, user } = await deploySavingFixture();
    const principal = usdc("1000");

    await savingCore.connect(user).openDeposit(1, principal);
    await savingCore.updatePlan(1, 100n);

    const deposit = await savingCore.deposits(1);

    expect(await savingCore.ownerOf(1)).to.equal(user.address);
    expect(await token.balanceOf(await savingCore.getAddress())).to.equal(principal);
    expect(deposit.principal).to.equal(principal);
    expect(deposit.aprBpsAtOpen).to.equal(DEFAULT_APR_BPS);
    expect(deposit.earlyWithdrawPenaltyBpsAtOpen).to.equal(DEFAULT_PENALTY_BPS);
    expect(deposit.expectedInterest).to.equal(expectedInterest(principal));
    expect(await vault.totalPromisedInterest()).to.equal(expectedInterest(principal));
  });

  it("withdraws matured deposits with principal from SavingCore and interest from VaultManager", async function () {
    const { token, vault, savingCore, user } = await deploySavingFixture();
    const principal = usdc("1000");
    const interest = expectedInterest(principal);

    await savingCore.connect(user).openDeposit(1, principal);
    await time.increase(DEFAULT_TENOR_DAYS * DAY);

    const beforeUser = await token.balanceOf(user.address);
    await savingCore.connect(user).withdrawAtMaturity(1);
    const deposit = await savingCore.deposits(1);

    expect(await token.balanceOf(user.address)).to.equal(beforeUser + principal + interest);
    expect(await token.balanceOf(await savingCore.getAddress())).to.equal(0n);
    expect(await vault.totalPromisedInterest()).to.equal(0n);
    expect(deposit.status).to.equal(1n);
  });

  it("early withdrawal gives zero interest and sends penalty to feeReceiver", async function () {
    const { token, vault, savingCore, user, feeReceiver } = await deploySavingFixture();
    const principal = usdc("1000");
    const penalty = (principal * DEFAULT_PENALTY_BPS) / 10000n;

    await savingCore.connect(user).openDeposit(1, principal);
    const beforeUser = await token.balanceOf(user.address);
    await savingCore.connect(user).earlyWithdraw(1);
    const deposit = await savingCore.deposits(1);

    expect(await token.balanceOf(user.address)).to.equal(beforeUser + principal - penalty);
    expect(await token.balanceOf(feeReceiver.address)).to.equal(penalty);
    expect(await vault.totalPromisedInterest()).to.equal(0n);
    expect(deposit.status).to.equal(1n);
  });

  it("records pending interest when the vault cannot pay at maturity", async function () {
    const { token, vault, savingCore, user } = await deploySavingFixture({ fundVault: false });
    const principal = usdc("1000");
    const interest = expectedInterest(principal);

    await savingCore.connect(user).openDeposit(1, principal);
    await time.increase(DEFAULT_TENOR_DAYS * DAY);

    const beforeUser = await token.balanceOf(user.address);
    await savingCore.connect(user).withdrawAtMaturity(1);

    expect(await token.balanceOf(user.address)).to.equal(beforeUser + principal);
    expect(await savingCore.pendingInterest(user.address)).to.equal(interest);
    expect(await vault.totalPromisedInterest()).to.equal(interest);
  });

  it("manually renews a matured deposit and preserves original APR", async function () {
    const { token, vault, savingCore, user } = await deploySavingFixture();
    const principal = usdc("1000");
    const firstInterest = expectedInterest(principal);
    const renewedPrincipal = principal + firstInterest;
    const renewedInterest = expectedInterest(renewedPrincipal);

    await savingCore.connect(user).openDeposit(1, principal);
    await savingCore.updatePlan(1, 100n);
    await time.increase(DEFAULT_TENOR_DAYS * DAY);

    await savingCore.connect(user).renewDeposit(1);
    const oldDeposit = await savingCore.deposits(1);
    const newDeposit = await savingCore.deposits(2);

    expect(oldDeposit.status).to.equal(2n);
    expect(await savingCore.ownerOf(2)).to.equal(user.address);
    expect(await token.balanceOf(await savingCore.getAddress())).to.equal(renewedPrincipal);
    expect(newDeposit.principal).to.equal(renewedPrincipal);
    expect(newDeposit.aprBpsAtOpen).to.equal(DEFAULT_APR_BPS);
    expect(newDeposit.earlyWithdrawPenaltyBpsAtOpen).to.equal(DEFAULT_PENALTY_BPS);
    expect(newDeposit.expectedInterest).to.equal(renewedInterest);
    expect(await vault.totalPromisedInterest()).to.equal(renewedInterest);
  });

  it("auto-renews within grace period to the current NFT owner", async function () {
    const { savingCore, user, otherUser } = await deploySavingFixture();
    const principal = usdc("1000");

    await savingCore.connect(user).openDeposit(1, principal);
    await savingCore.connect(user).transferFrom(user.address, otherUser.address, 1);
    await time.increase(DEFAULT_TENOR_DAYS * DAY + DAY);

    await savingCore.autoRenewDeposit(1);
    const oldDeposit = await savingCore.deposits(1);
    const newDeposit = await savingCore.deposits(2);

    expect(oldDeposit.status).to.equal(3n);
    expect(await savingCore.ownerOf(2)).to.equal(otherUser.address);
    expect(newDeposit.aprBpsAtOpen).to.equal(DEFAULT_APR_BPS);
  });

  it("blocks auto-renewal after the grace period", async function () {
    const { savingCore, user } = await deploySavingFixture();

    await savingCore.connect(user).openDeposit(1, usdc("1000"));
    await time.increase(DEFAULT_TENOR_DAYS * DAY + GRACE_PERIOD + 1);

    await expectRevert(savingCore.autoRenewDeposit(1), "SavingCore: grace period expired");
  });

  it("blocks withdrawals and renewals while paused", async function () {
    const { vault, savingCore, user } = await deploySavingFixture();

    await savingCore.connect(user).openDeposit(1, usdc("1000"));
    await time.increase(DEFAULT_TENOR_DAYS * DAY);
    await vault.pause();

    await expectRevert(savingCore.connect(user).withdrawAtMaturity(1), "SavingCore: system is paused");
    await expectRevert(savingCore.connect(user).renewDeposit(1), "SavingCore: system is paused");
    await expectRevert(savingCore.autoRenewDeposit(1), "SavingCore: system is paused");
  });
});
