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

  it("unpauses and allows operations again", async function () {
    const { token, vault, owner, savingCore } = await deployVaultFixture();

    await vault.pause();
    await vault.unpause();

    await token.mint(owner.address, usdc("50"));
    await token.approve(await vault.getAddress(), usdc("50"));
    await vault.fundVault(usdc("50"));

    expect(await vault.paused()).to.equal(false);
  });

  it("reverts constructor with zero token address", async function () {
    const VaultManager = await ethers.getContractFactory("VaultManager");
    await expectRevert(VaultManager.deploy(ethers.ZeroAddress), "VaultManager: invalid token");
  });

  it("reverts setFeeReceiver with zero address", async function () {
    const { vault } = await deployVaultFixture();
    await expectRevert(vault.setFeeReceiver(ethers.ZeroAddress), "VaultManager: invalid address");
  });

  it("reverts setSavingCore with zero address", async function () {
    const { vault } = await deployVaultFixture();
    await expectRevert(vault.setSavingCore(ethers.ZeroAddress), "VaultManager: invalid address");
  });

  it("reverts withdrawVault when balance is insufficient", async function () {
    const { vault } = await deployVaultFixture();
    await expectRevert(vault.withdrawVault(usdc("1")), "VaultManager: insufficient balance");
  });

  it("cancels allocated interest correctly", async function () {
    const { token, vault, owner, savingCore } = await deployVaultFixture();

    await token.mint(owner.address, usdc("100"));
    await token.approve(await vault.getAddress(), usdc("100"));
    await vault.fundVault(usdc("100"));
    await vault.connect(savingCore).allocateInterest(usdc("20"));
    await vault.connect(savingCore).cancelInterest(usdc("10"));

    expect(await vault.totalPromisedInterest()).to.equal(usdc("10"));
  });

  it("reverts cancelInterest on underflow", async function () {
    const { vault, savingCore } = await deployVaultFixture();
    await expectRevert(vault.connect(savingCore).cancelInterest(usdc("1")), "VaultManager: underflow");
  });

  it("reverts payInterest when vault has insufficient balance", async function () {
    const { vault, savingCore, user } = await deployVaultFixture();

    // Allocate interest but fund nothing — vault balance is 0
    await vault.connect(savingCore).allocateInterest(usdc("5"));
    await expectRevert(
      vault.connect(savingCore).payInterest(user.address, usdc("5")),
      "VaultManager: insufficient vault balance"
    );
  });

  it("reverts payInterest when promised interest tracking is mismatched", async function () {
    const { token, vault, owner, savingCore, user } = await deployVaultFixture();

    await token.mint(owner.address, usdc("100"));
    await token.approve(await vault.getAddress(), usdc("100"));
    await vault.fundVault(usdc("100"));

    // totalPromisedInterest is 0, but try to pay 10
    await expectRevert(
      vault.connect(savingCore).payInterest(user.address, usdc("10")),
      "VaultManager: interest tracking error"
    );
  });

  it("pays interest successfully when vault is funded and interest is allocated", async function () {
    const { token, vault, owner, savingCore, user } = await deployVaultFixture();

    await token.mint(owner.address, usdc("100"));
    await token.approve(await vault.getAddress(), usdc("100"));
    await vault.fundVault(usdc("100"));
    await vault.connect(savingCore).allocateInterest(usdc("10"));

    await vault.connect(savingCore).payInterest(user.address, usdc("10"));

    expect(await token.balanceOf(user.address)).to.equal(usdc("10"));
    expect(await vault.totalPromisedInterest()).to.equal(usdc("0"));
  });

  it("reverts pause and unpause when called by non-owner", async function () {
    const { vault, user } = await deployVaultFixture();
    await expectRevert(vault.connect(user).pause(), "OwnableUnauthorizedAccount");
    await expectRevert(vault.connect(user).unpause(), "OwnableUnauthorizedAccount");
  });

  it("reverts setSavingCore when called by non-owner", async function () {
    const { vault, user } = await deployVaultFixture();
    await expectRevert(vault.connect(user).setSavingCore(user.address), "OwnableUnauthorizedAccount");
  });
});
