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

describe("VaultManager", function () {
  async function deployVaultFixture() {
    const [owner, savingCore, feeReceiver, user] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy("Mock USDC", "mUSDC");
    await token.waitForDeployment();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    const vault = await VaultManager.deploy(await token.getAddress());
    await vault.waitForDeployment();

    await vault.setSavingCore(savingCore.address);

    return { token, vault, owner, savingCore, feeReceiver, user };
  }

  it("sets owner as the initial fee receiver", async function () {
    const { vault, owner } = await deployVaultFixture();

    expect(await vault.feeReceiver()).to.equal(owner.address);
  });

  it("lets owner update the fee receiver", async function () {
    const { vault, feeReceiver } = await deployVaultFixture();

    await vault.setFeeReceiver(feeReceiver.address);

    expect(await vault.feeReceiver()).to.equal(feeReceiver.address);
  });

  it("funds and withdraws vault balance", async function () {
    const { token, vault, owner } = await deployVaultFixture();

    await token.mint(owner.address, usdc("1000"));
    await token.approve(await vault.getAddress(), usdc("1000"));
    await vault.fundVault(usdc("1000"));
    await vault.withdrawVault(usdc("250"));

    expect(await token.balanceOf(await vault.getAddress())).to.equal(usdc("750"));
  });

  it("blocks admin withdrawal below promised interest", async function () {
    const { token, vault, owner, savingCore } = await deployVaultFixture();

    await token.mint(owner.address, usdc("1000"));
    await token.approve(await vault.getAddress(), usdc("1000"));
    await vault.fundVault(usdc("1000"));
    await vault.connect(savingCore).allocateInterest(usdc("900"));

    await expectRevert(vault.withdrawVault(usdc("200")), "VaultManager: cannot withdraw promised interest");
  });

  it("restricts interest bookkeeping and payment to SavingCore", async function () {
    const { vault, user } = await deployVaultFixture();

    await expectRevert(vault.connect(user).allocateInterest(usdc("1")), "VaultManager: only SavingCore");
    await expectRevert(vault.connect(user).payInterest(user.address, usdc("1")), "VaultManager: only SavingCore");
  });

  it("uses pause control for funding and interest payments", async function () {
    const { token, vault, owner, savingCore, user } = await deployVaultFixture();

    await token.mint(owner.address, usdc("100"));
    await token.approve(await vault.getAddress(), usdc("100"));
    await vault.fundVault(usdc("100"));
    await vault.connect(savingCore).allocateInterest(usdc("10"));
    await vault.pause();

    await expectRevert(vault.fundVault(usdc("1")), "EnforcedPause");
    await expectRevert(vault.connect(savingCore).payInterest(user.address, usdc("10")), "EnforcedPause");
  });
});
