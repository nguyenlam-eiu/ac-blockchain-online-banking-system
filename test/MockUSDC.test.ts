import { expect } from "chai";
import { ethers } from "hardhat";

const usdc = (amount: string) => ethers.parseUnits(amount, 6);

describe("MockUSDC", function () {
  async function deployTokenFixture() {
    const [owner, user, recipient] = await ethers.getSigners();
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy("Mock USDC", "mUSDC");
    await token.waitForDeployment();

    return { token, owner, user, recipient };
  }

  it("uses USDC-style metadata and 6 decimals", async function () {
    const { token } = await deployTokenFixture();

    expect(await token.name()).to.equal("Mock USDC");
    expect(await token.symbol()).to.equal("mUSDC");
    expect(await token.decimals()).to.equal(6n);
  });

  it("allows public minting for test setup", async function () {
    const { token, user } = await deployTokenFixture();

    await token.connect(user).mint(user.address, usdc("100"));

    expect(await token.balanceOf(user.address)).to.equal(usdc("100"));
  });

  it("supports normal ERC20 transfers", async function () {
    const { token, user, recipient } = await deployTokenFixture();

    await token.mint(user.address, usdc("100"));
    await token.connect(user).transfer(recipient.address, usdc("25"));

    expect(await token.balanceOf(user.address)).to.equal(usdc("75"));
    expect(await token.balanceOf(recipient.address)).to.equal(usdc("25"));
  });
});
